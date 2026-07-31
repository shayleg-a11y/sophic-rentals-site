// POST /api/stripe-webhook — Stripe webhook receiver.
// Marks applications paid when a $9.99 / $10 application checkout completes.
// Setup (one time, Stripe Dashboard → Developers → Webhooks):
//   1. Add endpoint: https://sophic-rentals.vercel.app/api/stripe-webhook
//   2. Subscribe to event: checkout.session.completed
//   3. Copy the signing secret (whsec_...) into Vercel env var STRIPE_WEBHOOK_SECRET
// The payment links already pass client_reference_id = the application's reference_number,
// so this matches the Stripe payment back to the Supabase applications row.
import crypto from 'crypto';

export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function verifyStripeSignature(rawBody, sigHeader, secret, toleranceSec = 300) {
  if (!sigHeader) return false;
  const parts = {};
  for (const kv of sigHeader.split(',')) {
    const [k, v] = kv.split('=');
    if (k === 't') parts.t = v;
    else if (k === 'v1') (parts.v1 = parts.v1 || []).push(v);
  }
  if (!parts.t || !parts.v1 || !parts.v1.length) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(parts.t));
  if (!Number.isFinite(age) || age > toleranceSec) return false;
  const expected = crypto.createHmac('sha256', secret)
    .update(parts.t + '.' + rawBody.toString('utf8'), 'utf8')
    .digest('hex');
  const expBuf = Buffer.from(expected, 'utf8');
  return parts.v1.some((sig) => {
    const sigBuf = Buffer.from(String(sig), 'utf8');
    return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!whSecret || !url || !key) { res.status(500).json({ error: 'Server not configured' }); return; }
  try {
    const raw = await readRawBody(req);
    if (!verifyStripeSignature(raw, req.headers['stripe-signature'], whSecret)) {
      res.status(400).json({ error: 'invalid_signature' });
      return;
    }
    const event = JSON.parse(raw.toString('utf8'));
    if (event.type !== 'checkout.session.completed') {
      res.status(200).json({ received: true, ignored: event.type });
      return;
    }
    const sess = (event.data && event.data.object) || {};
    const ref = String(sess.client_reference_id || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40);
    const patch = {
      payment_status: 'paid',
      status: 'submitted',
      stripe_session_id: String(sess.id || '').slice(0, 120) || null,
      stripe_payment_intent: String(sess.payment_intent || '').slice(0, 120) || null,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    // Match by reference_number (uuid ids also accepted since apply.js falls back to id)
    let matched = 0;
    if (ref) {
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F-]{27,}$/.test(ref);
      const col = isUuid ? 'id' : 'reference_number';
      const r = await fetch(url + '/rest/v1/applications?' + col + '=eq.' + encodeURIComponent(ref), {
        method: 'PATCH',
        headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(patch)
      });
      const rows = r.ok ? await r.json() : [];
      matched = Array.isArray(rows) ? rows.length : 0;
    }
    // Fallback: match the most recent unpaid application by customer email
    if (!matched) {
      const email = String((sess.customer_details && sess.customer_details.email) || sess.customer_email || '').slice(0, 200);
      if (email) {
        const q = url + '/rest/v1/applications?select=id&email=eq.' + encodeURIComponent(email)
          + '&payment_status=eq.unpaid&order=created_at.desc&limit=1';
        const fr = await fetch(q, { headers: { apikey: key, Authorization: 'Bearer ' + key } });
        const found = fr.ok ? await fr.json() : [];
        if (Array.isArray(found) && found[0]) {
          await fetch(url + '/rest/v1/applications?id=eq.' + found[0].id, {
            method: 'PATCH',
            headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
            body: JSON.stringify(patch)
          });
          matched = 1;
        }
      }
    }
    res.status(200).json({ received: true, matched });
  } catch (e) {
    res.status(500).json({ error: String(e).slice(0, 200) });
  }
}
