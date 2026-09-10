// POST /api/stripe-webhook — Stripe webhook receiver.
// Marks applications paid when the application-fee checkout completes, then sends the license-upload link.
// Setup (Stripe Dashboard → Developers → Webhooks):
//   endpoint https://sophicrentals.com/api/stripe-webhook, event checkout.session.completed,
//   signing secret -> Vercel env STRIPE_WEBHOOK_SECRET.
// NOTE (fixed 2026-09-10): previously set status='submitted', which the DB check constraint rejected,
// so no application was ever marked paid. status is now 'paid' (allowed) — and the constraint now allows 'submitted' too.
import crypto from 'crypto';
import { select, update } from './_lib/db.js';
import { notifyApplicant } from './_lib/notify.js';

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
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!whSecret || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) { res.status(500).json({ error: 'Server not configured' }); return; }
  try {
    const raw = await readRawBody(req);
    if (!verifyStripeSignature(raw, req.headers['stripe-signature'], whSecret)) { res.status(400).json({ error: 'invalid_signature' }); return; }
    const event = JSON.parse(raw.toString('utf8'));
    if (event.type !== 'checkout.session.completed') { res.status(200).json({ received: true, ignored: event.type }); return; }
    const sess = (event.data && event.data.object) || {};
    if (sess.payment_status && sess.payment_status !== 'paid') { res.status(200).json({ received: true, ignored: 'unpaid_session' }); return; }
    const ref = String(sess.client_reference_id || (sess.metadata && sess.metadata.reference) || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40);
    const now = new Date().toISOString();
    const patch = { payment_status: 'paid', status: 'paid', stage: 'reserve', paid_at: now, submitted_at: now, updated_at: now,
      stripe_session_id: String(sess.id || '').slice(0, 120) || null, stripe_payment_intent: String(sess.payment_intent || '').slice(0, 120) || null };

    let rows = [];
    if (ref) {
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F-]{27,}$/.test(ref);
      const col = isUuid ? 'id' : 'reference_number';
      try { rows = await update('applications', col + '=eq.' + encodeURIComponent(ref), patch, true) || []; } catch (e) { console.error('patch by ref failed', e); }
    }
    if (!rows.length) {
      // Fallback: most recent unpaid application with the payer's email
      const email = String((sess.customer_details && sess.customer_details.email) || sess.customer_email || '').toLowerCase().slice(0, 200);
      if (email) {
        const found = await select('applications', 'select=id&email=eq.' + encodeURIComponent(email) + '&payment_status=eq.unpaid&order=created_at.desc&limit=1');
        if (found[0]) { try { rows = await update('applications', 'id=eq.' + found[0].id, patch, true) || []; } catch (e) { console.error('patch by email failed', e); } }
      }
    }
    const app = rows[0];
    if (app && !(app.license_front_path && app.license_back_path)) { try { await notifyApplicant(app, 'uploadDocs'); } catch (_) {} }
    res.status(200).json({ received: true, matched: rows.length });
  } catch (e) { res.status(500).json({ error: String(e).slice(0, 200) }); }
}
