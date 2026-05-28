/**
 * App Store Server Notifications V2 — webhook
 *
 * Apple POSTs a signed notification (JWS) here whenever a subscription changes
 * server-side: renew, expire, enter/exit grace period, refund, revoke, etc.
 * This keeps the Subscription table accurate even when the app is never opened.
 *
 * PUBLIC endpoint: Apple calls it with no user JWT, so this function must be
 * deployed with `--no-verify-jwt`. Trust is established by verifying Apple's
 * JWS signature (x5c leaf certificate), NOT by Supabase auth.
 *
 * Configure the URL in App Store Connect → App → App Information →
 * "App Store Server Notifications" (Production + Sandbox URLs):
 *   https://<ref>.supabase.co/functions/v1/subscription-notifications
 *
 * Rows are matched by originalTransactionId (written by /subscription/verify).
 * TODO(hardening): also verify the x5c chain up to Apple Root CA G3, and prefer
 * matching on appAccountToken once the app sets it = Supabase user id at purchase.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import * as jose from 'https://esm.sh/jose@5.9.6';
import rs from 'https://esm.sh/jsrsasign@11.1.0';
import { createServiceClient } from '../_shared/supabase-client.ts';

const { X509, KJUR, b64tohex } = rs as any;

// SHA-256 fingerprint of "Apple Root CA - G3" (the trust anchor for ASSN v2 JWS).
const APPLE_ROOT_G3_SHA256 =
  '63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179';

// Pinned roots — override via ASSN_PINNED_ROOTS (comma-sep sha256 hex) for testing.
const PINNED_ROOTS = (Deno.env.get('ASSN_PINNED_ROOTS') ?? APPLE_ROOT_G3_SHA256)
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

// Chain verification is ON by default (fail-closed). Break-glass: ASSN_REQUIRE_CHAIN=false
// instantly falls back to leaf-only signature verification if a real Apple notification
// is ever wrongly rejected (then investigate via the `detail` field + function logs).
const REQUIRE_CHAIN = (Deno.env.get('ASSN_REQUIRE_CHAIN') ?? 'true').toLowerCase() !== 'false';

/**
 * Verify the x5c certificate chain: every cert must be signed by the next one up,
 * and the root (top of chain) must be a pinned Apple root. This is what stops an
 * attacker from signing a forged notification with their own self-issued cert.
 */
function verifyAppleChain(x5c: string[]): void {
  if (x5c.length < 2) throw new Error('certificate chain too short');
  const certs = x5c.map((b64) => {
    const c = new X509();
    c.readCertHex(b64tohex(b64));
    return c;
  });
  for (let i = 0; i < certs.length - 1; i++) {
    if (!certs[i].verifySignature(certs[i + 1].getPublicKey())) {
      throw new Error(`certificate chain link ${i} signature invalid`);
    }
  }
  const root = certs[certs.length - 1];
  const fp = KJUR.crypto.Util.hashHex(root.hex, 'sha256').toLowerCase();
  if (!PINNED_ROOTS.includes(fp)) {
    throw new Error(`root certificate not pinned (fp=${fp})`);
  }
}

/** Decode + fully verify an Apple JWS: x5c chain → Apple root pin → leaf ES256 signature. */
async function verifyAppleJWS(jws: string): Promise<Record<string, unknown>> {
  const header = jose.decodeProtectedHeader(jws);
  const x5c = (header as { x5c?: string[] }).x5c;
  if (!x5c || x5c.length === 0) {
    throw new Error('JWS missing x5c certificate chain');
  }
  if (REQUIRE_CHAIN) verifyAppleChain(x5c);
  const leafPem =
    `-----BEGIN CERTIFICATE-----\n${x5c[0].match(/.{1,64}/g)!.join('\n')}\n-----END CERTIFICATE-----`;
  const publicKey = await jose.importX509(leafPem, 'ES256');
  const { payload } = await jose.compactVerify(jws, publicKey);
  return JSON.parse(new TextDecoder().decode(payload));
}

/** Map an Apple notificationType/subtype to our SubscriptionStatus enum (or null = no status change). */
function statusFor(
  notificationType: string,
  subtype: string | undefined,
  txnOfferType: number | undefined,
): string | null {
  switch (notificationType) {
    case 'SUBSCRIBED':
    case 'DID_RENEW':
    case 'OFFER_REDEEMED':
    case 'DID_CHANGE_RENEWAL_PREF':
      // offerType 1 = introductory (free trial); subtype FREE_TRIAL on first subscribe.
      return subtype === 'FREE_TRIAL' || txnOfferType === 1 ? 'TRIAL' : 'PRO';
    case 'GRACE_PERIOD':
    case 'DID_FAIL_TO_RENEW':
      return 'GRACE_PERIOD';
    case 'EXPIRED':
    case 'GRACE_PERIOD_EXPIRED':
      return 'EXPIRED';
    case 'REFUND':
    case 'REVOKE':
      return 'CANCELLED';
    case 'DID_CHANGE_RENEWAL_STATUS':
    default:
      return null; // autoRenew may still change; status untouched
  }
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const signedPayload = body.signedPayload;
    if (!signedPayload || typeof signedPayload !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing signedPayload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1) Verify + decode the outer notification.
    const notification = await verifyAppleJWS(signedPayload);
    const notificationType = String(notification.notificationType ?? '');
    const subtype = notification.subtype ? String(notification.subtype) : undefined;
    const data = (notification.data ?? {}) as Record<string, unknown>;

    // 2) Verify + decode the inner transaction / renewal info.
    let txn: Record<string, unknown> = {};
    if (typeof data.signedTransactionInfo === 'string') {
      txn = await verifyAppleJWS(data.signedTransactionInfo);
    }
    let renewal: Record<string, unknown> = {};
    if (typeof data.signedRenewalInfo === 'string') {
      renewal = await verifyAppleJWS(data.signedRenewalInfo);
    }

    // appAccountToken (= Supabase user id, set at purchase) is the most robust match key.
    const appAccountToken = (txn.appAccountToken as string) ?? undefined;
    const originalTransactionId =
      (txn.originalTransactionId as string) ?? (renewal.originalTransactionId as string);
    if (!appAccountToken && !originalTransactionId) {
      return new Response(JSON.stringify({ error: 'No appAccountToken or originalTransactionId in notification' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3) Build the update.
    const expiresMs = txn.expiresDate as number | undefined;
    const expiresIso = expiresMs ? new Date(expiresMs).toISOString() : null;
    const autoRenewRaw = renewal.autoRenewStatus as number | undefined;
    const autoRenew = autoRenewRaw === 1 ? true : autoRenewRaw === 0 ? false : undefined;
    const status = statusFor(notificationType, subtype, txn.offerType as number | undefined);

    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (status) update.status = status;
    if (expiresIso) {
      update.expiresDate = expiresIso;
      update.expiryDate = expiresIso;
    }
    if (autoRenew !== undefined) update.autoRenew = autoRenew;

    // 4) Apply to the matching subscription row. Prefer appAccountToken (→ userId);
    //    fall back to originalTransactionId for purchases made before appAccountToken shipped.
    const supabase = createServiceClient();
    let query = supabase.from('Subscription').update(update);
    query = appAccountToken
      ? query.eq('userId', appAccountToken.toLowerCase())
      : query.eq('originalTransactionId', String(originalTransactionId));
    const { data: updated, error } = await query.select('id, userId, status, expiresDate');

    if (error) {
      console.error('[assn] DB update error:', error);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(
      `[assn] ${notificationType}/${subtype ?? '-'} ` +
        `match=${appAccountToken ? 'appAccountToken' : 'origTxn'} ` +
        `→ ${JSON.stringify(update)} matched ${updated?.length ?? 0} row(s)`,
    );

    // Always 200 so Apple doesn't retry indefinitely; unmatched rows are logged.
    return new Response(JSON.stringify({ success: true, matched: updated?.length ?? 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    // Signature/chain failures or malformed payloads land here → 400 (reject, don't trust).
    // `detail` is non-sensitive (cert/verification info) and helps diagnose real notifications.
    const detail = (e as Error)?.message ?? String(e);
    console.error('[assn] verification/parse error:', detail);
    return new Response(JSON.stringify({ error: 'Invalid notification', detail }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
