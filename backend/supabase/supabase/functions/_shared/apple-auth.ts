/**
 * Apple Sign In Auth Utilities
 * Handles client secret generation, auth code exchange, and token revocation
 * Required for App Store compliance (TN3194)
 */

// Apple Sign In configuration from environment
const APPLE_KEY_ID = Deno.env.get('APPLE_SIGN_IN_KEY_ID') || '';
const APPLE_TEAM_ID = Deno.env.get('APPLE_SIGN_IN_TEAM_ID') || '';
const APPLE_PRIVATE_KEY = Deno.env.get('APPLE_SIGN_IN_PRIVATE_KEY') || '';
const APPLE_CLIENT_ID = Deno.env.get('APPLE_SIGN_IN_CLIENT_ID') || 'com.litplanz.app';

/**
 * Generate an Apple client_secret JWT (ES256-signed)
 * Same pattern as APNs JWT in send-notification/index.ts
 * See: https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens
 */
export async function generateAppleClientSecret(): Promise<string> {
  if (!APPLE_PRIVATE_KEY || !APPLE_KEY_ID || !APPLE_TEAM_ID) {
    throw new Error('Apple Sign In configuration missing (KEY_ID, TEAM_ID, or PRIVATE_KEY)');
  }

  // Parse the private key
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  let keyContent = APPLE_PRIVATE_KEY;

  if (keyContent.includes(pemHeader)) {
    keyContent = keyContent
      .replace(pemHeader, '')
      .replace(pemFooter, '')
      .replace(/\s/g, '');
  }

  const keyData = Uint8Array.from(atob(keyContent), c => c.charCodeAt(0));

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    false,
    ['sign']
  );

  // JWT header
  const header = {
    alg: 'ES256',
    kid: APPLE_KEY_ID,
  };

  // JWT payload - Apple requires iss=team_id, sub=client_id, aud=https://appleid.apple.com
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: APPLE_TEAM_ID,
    iat: now,
    exp: now + 15777000, // 6 months (max allowed by Apple)
    aud: 'https://appleid.apple.com',
    sub: APPLE_CLIENT_ID,
  };

  // Encode header and payload as base64url
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const signatureInput = `${headerB64}.${payloadB64}`;

  // Sign with ES256
  const signature = await crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    privateKey,
    encoder.encode(signatureInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signatureInput}.${signatureB64}`;
}

/**
 * Exchange an Apple authorization code for a refresh token
 * See: https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens
 */
export async function exchangeAppleAuthCode(authorizationCode: string): Promise<string> {
  const clientSecret = await generateAppleClientSecret();

  const params = new URLSearchParams({
    client_id: APPLE_CLIENT_ID,
    client_secret: clientSecret,
    code: authorizationCode,
    grant_type: 'authorization_code',
  });

  const response = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Apple token exchange failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();

  if (!data.refresh_token) {
    throw new Error('Apple token exchange response missing refresh_token');
  }

  return data.refresh_token;
}

/**
 * Revoke an Apple refresh token (required before account deletion per TN3194)
 * See: https://developer.apple.com/documentation/sign_in_with_apple/revoke_tokens
 */
export async function revokeAppleToken(refreshToken: string): Promise<void> {
  const clientSecret = await generateAppleClientSecret();

  const params = new URLSearchParams({
    client_id: APPLE_CLIENT_ID,
    client_secret: clientSecret,
    token: refreshToken,
    token_type_hint: 'refresh_token',
  });

  const response = await fetch('https://appleid.apple.com/auth/revoke', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Apple token revocation failed (${response.status}): ${errorBody}`);
  }
}
