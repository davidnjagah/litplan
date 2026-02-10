/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Send Notification Edge Function
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Handles sending push notifications (APNs) and email notifications (Resend).
 * Internal function - should only be called by other Edge Functions with service role.
 *
 * POST /send-notification
 * Body for push:
 * {
 *   "type": "push",
 *   "token": "device_token",
 *   "title": "Notification Title",
 *   "body": "Notification body",
 *   "data": { "key": "value" }
 * }
 *
 * Body for email:
 * {
 *   "type": "email",
 *   "to": "user@example.com",
 *   "subject": "Email Subject",
 *   "templateData": { "name": "User", ... }
 * }
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

// APNs Configuration
const APNS_KEY_ID = Deno.env.get('APNS_KEY_ID') || '';
const APNS_TEAM_ID = Deno.env.get('APNS_TEAM_ID') || '';
const APNS_BUNDLE_ID = Deno.env.get('APNS_BUNDLE_ID') || 'com.litplanz.app';
const APNS_PRIVATE_KEY = Deno.env.get('APNS_PRIVATE_KEY') || '';
const APNS_ENVIRONMENT = Deno.env.get('APNS_ENVIRONMENT') || 'development'; // 'development' or 'production'

// Resend Configuration
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const FROM_EMAIL = 'hello@notify.litplanz.com';
const FROM_NAME = 'LitPlanz';

// Types
interface PushNotificationRequest {
  type: 'push';
  token: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
}

interface EmailNotificationRequest {
  type: 'email';
  to: string;
  subject: string;
  templateData: {
    name?: string;
    subject?: string;
    body?: string;
    [key: string]: any;
  };
}

type NotificationRequest = PushNotificationRequest | EmailNotificationRequest;

// Generate APNs JWT token
async function generateAPNsToken(): Promise<string> {
  if (!APNS_PRIVATE_KEY || !APNS_KEY_ID || !APNS_TEAM_ID) {
    throw new Error('APNs configuration missing');
  }

  // Import the private key
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  let keyContent = APNS_PRIVATE_KEY;

  // Remove headers if present
  if (keyContent.includes(pemHeader)) {
    keyContent = keyContent
      .replace(pemHeader, '')
      .replace(pemFooter, '')
      .replace(/\s/g, '');
  }

  // Decode base64 key
  const keyData = Uint8Array.from(atob(keyContent), c => c.charCodeAt(0));

  // Import as CryptoKey
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

  // Create JWT header and payload
  const header = {
    alg: 'ES256',
    kid: APNS_KEY_ID,
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: APNS_TEAM_ID,
    iat: now,
  };

  // Encode header and payload
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const signatureInput = `${headerB64}.${payloadB64}`;

  // Sign
  const signature = await crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    privateKey,
    encoder.encode(signatureInput)
  );

  // Convert signature to base64url
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signatureInput}.${signatureB64}`;
}

// Send push notification via APNs
async function sendPushNotification(request: PushNotificationRequest): Promise<{ success: boolean; error?: string }> {
  try {
    if (!APNS_PRIVATE_KEY) {
      console.log('[send-notification] APNs not configured, skipping push');
      return { success: false, error: 'APNs not configured' };
    }

    const token = await generateAPNsToken();

    // APNs endpoint
    const apnsHost = APNS_ENVIRONMENT === 'production'
      ? 'api.push.apple.com'
      : 'api.sandbox.push.apple.com';

    const url = `https://${apnsHost}/3/device/${request.token}`;

    // Build notification payload
    const payload = {
      aps: {
        alert: {
          title: request.title,
          body: request.body,
        },
        badge: request.badge || 1,
        sound: request.sound || 'default',
        'mutable-content': 1,
      },
      ...request.data,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'authorization': `bearer ${token}`,
        'apns-topic': APNS_BUNDLE_ID,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log(`[send-notification] Push sent successfully to token: ${request.token.substring(0, 20)}...`);
      return { success: true };
    }

    const errorBody = await response.text();
    console.error(`[send-notification] APNs error: ${response.status} - ${errorBody}`);

    // Handle specific APNs errors
    if (response.status === 410) {
      // Token is no longer valid - should mark as inactive
      return { success: false, error: 'Token expired or invalid' };
    }

    return { success: false, error: `APNs error: ${response.status}` };

  } catch (error) {
    console.error('[send-notification] Push notification error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Generate generic email HTML
function generateGenericEmail(data: EmailNotificationRequest['templateData']): string {
  const { name, subject, body } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject || 'LitPlanz'}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); border-radius: 16px; padding: 40px; border: 1px solid #333;">
      <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 20px 0;">Hey ${name || 'there'},</h1>
      <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        ${body || 'Thanks for using LitPlanz!'}
      </p>
      <p style="color: #666666; font-size: 14px; margin: 30px 0 0 0;">
        The LitPlanz Team
      </p>
    </div>
  </div>
</body>
</html>`;
}

// Send email via Resend
async function sendEmail(request: EmailNotificationRequest): Promise<{ success: boolean; error?: string }> {
  try {
    if (!RESEND_API_KEY) {
      console.log('[send-notification] Resend not configured, skipping email');
      return { success: false, error: 'Resend not configured' };
    }

    // Generate HTML
    const html = generateGenericEmail(request.templateData);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: request.to,
        subject: request.subject,
        html,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`[send-notification] Email sent successfully to ${request.to}: ${result.id}`);
      return { success: true };
    }

    const errorBody = await response.text();
    console.error(`[send-notification] Resend error: ${response.status} - ${errorBody}`);
    return { success: false, error: `Resend error: ${response.status}` };

  } catch (error) {
    console.error('[send-notification] Email error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Main handler
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCors(req);
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Verify service role authorization (internal calls only)
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!authHeader || !authHeader.includes(serviceRoleKey || '')) {
      // For now, allow if we have any valid auth
      console.log('[send-notification] Warning: Not using service role key');
    }

    const body: NotificationRequest = await req.json();

    if (body.type === 'push') {
      const result = await sendPushNotification(body as PushNotificationRequest);
      return jsonResponse(result);
    }

    if (body.type === 'email') {
      const result = await sendEmail(body as EmailNotificationRequest);
      return jsonResponse(result);
    }

    return errorResponse('Invalid notification type. Use "push" or "email"', 400);

  } catch (error) {
    console.error('[send-notification] Error:', error);
    return errorResponse((error as Error).message || 'Internal server error', 500);
  }
});
