// POST /api/stripe-webhook — Stripe webhook receiver.
// Marks applications paid when the application-fee checkout completes, then sends the license-upload link.
// Fixed 2026-11-14: endpoint had been disabled + pointed at an old vercel.app path. If the signing secret
// doesn't match, the event is re-fetched from Stripe by id (authoritative), so a secret mismatch can't drop payments.
// Setup (Stripe Dashboard → Developers → Webhooks):
//   endpoint https://sophicrentals.com/api/stripe-webhook, event checkout.session.completed,
//   signing secret -> Vercel env STRIPE_WEBHOOK_SECRET.
// NOTE (fixed 2026-09-10): previously set status='submitted', which the DB check constraint rejected,
// so no application was ever marked paid. status is now 'paid' (allowed) — and the constraint now allows 'submitted' too.
import crypto from 'crypto';
import { markPaidFromSession, stripeGet } from './_lib/payments.js';

export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => { const c = []; req.on('data', (x) => c.push(x)); req.on('end', () => resolve(Buffer.concat(c))); req.on('error', reject); });
}
function verifyStripeSignature(rawBody, sigHeader, secret, toleranceSec = 300) {
  if (!sigHeader) return false;
  const parts = {};
  for (const kv of sigHeader.split(',')) { const [k, v] = kv.split('='); if (k === 't') parts.t = v; else if (k === 'v1') (parts.v1 = parts.v1 || []).push(v); }
  if (!parts.t || !parts.v1 || !parts.v1.length) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(parts.t));
  if (!Number.isFinite(age) || age > toleranceSec) return false;
  const expected = crypto.createHmac('sha256', secret).update(parts.t + '.' + rawBody.toString('utf8'), 'utf8').digest('hex');
  const expBuf = Buffer.from(expected, 'utf8');
  return parts.v1.some((sig) => { const b = Buffer.from(String(sig), 'utf8'); return b.length === expBuf.length && crypto.timingSafeEqual(b, expBuf); });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) { res.status(500).json({ error: 'Server not configured' }); return; }
  try {
    const raw = await readRawBody(req);
    const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event = null;
    if (whSecret && verifyStripeSignature(raw, req.headers['stripe-signature'], whSecret)) {
      event = JSON.parse(raw.toString('utf8'));
    } else {
      // Signature didn't verify: trust nothing in the body except the event id, and fetch the real event from Stripe.
      let id = '';
      try { id = String(JSON.parse(raw.toString('utf8')).id || ''); } catch (_) {}
      if (!/^evt_[A-Za-z0-9]+$/.test(id) || !process.env.STRIPE_SECRET_KEY) { res.status(400).json({ error: 'invalid_signature' }); return; }
      try { event = await stripeGet('/events/' + id); } catch (_) { res.status(400).json({ error: 'invalid_signature' }); return; }
    }
    const handled = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];
    if (!handled.includes(event.type)) { res.status(200).json({ received: true, ignored: event.type }); return; }
    const sess = (event.data && event.data.object) || {};
    if (sess.payment_status !== 'paid') { res.status(200).json({ received: true, ignored: 'unpaid_session' }); return; }
    const app = await markPaidFromSession(sess);
    res.status(200).json({ received: true, matched: app ? 1 : 0 });
  } catch (e) { console.error('stripe-webhook', e); res.status(500).json({ error: String(e).slice(0, 200) }); }
}
