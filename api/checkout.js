// /api/checkout — starts the $9.99 application-fee payment.
//   POST {reference}      -> {url, mode}
//   GET  ?ref=XXXX        -> 302 redirect to Stripe (used in email/SMS links)
// With STRIPE_SECRET_KEY set: creates a Checkout Session whose success_url carries the reference,
// so /thanks always knows which application to attach license photos to (works across browsers/devices).
// The amount is fixed here at $9.99 (999 cents) via price_data, so no Stripe price/link edit can change it.
// No Payment Link fallback: if Stripe is unavailable we return an error rather than risk a wrong amount.
import { configured, findByRef, cleanRef, update } from './_lib/db.js';

const SITE = process.env.SITE_URL || 'https://sophicrentals.com';
const FEE_CENTS = 999;            // $9.99 — never changes per applicant
const PRODUCT = 'prod_Uisy75W6A3K8h4'; // existing "application fee" product (keeps Stripe reporting grouped)

async function createSession(app) {
  const key = process.env.STRIPE_SECRET_KEY; if (!key) return null;
  const p = new URLSearchParams();
  p.set('mode', 'payment');
  p.set('line_items[0][price_data][currency]', 'usd');
  p.set('line_items[0][price_data][unit_amount]', String(FEE_CENTS));
  p.set('line_items[0][price_data][product]', PRODUCT);
  p.set('line_items[0][quantity]', '1');
  p.set('success_url', `${SITE}/thanks?ref=${app.reference_number}&session_id={CHECKOUT_SESSION_ID}`);
  p.set('cancel_url', `${SITE}/${app.application_type === 'driver' ? 'drive' : ''}?resume=${app.reference_number}`);
  p.set('client_reference_id', app.reference_number);
  if (app.email) p.set('customer_email', app.email);
  p.set('metadata[reference]', app.reference_number); p.set('metadata[application_type]', app.application_type || 'rental');
  p.set('payment_intent_data[description]', 'Sophic Rentals verification fee (credited to first week) — ref ' + app.reference_number);
  p.set('submit_type', 'pay');
  p.set('phone_number_collection[enabled]', 'false');
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/x-www-form-urlencoded' }, body: p.toString() });
  const d = await r.json();
  if (!r.ok || !d.url) throw new Error('stripe_session_failed:' + JSON.stringify(d.error || d).slice(0, 200));
  try { await update('applications', 'id=eq.' + app.id, { stripe_session_id: d.id, updated_at: new Date().toISOString() }); } catch (_) {}
  return d.url;
}

export default async function handler(req, res) {
  if (!configured()) { res.status(500).json({ error: 'Server not configured' }); return; }
  try {
    let ref = '';
    if (req.method === 'GET') ref = cleanRef(req.query && req.query.ref);
    else if (req.method === 'POST') { const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); ref = cleanRef(b.reference || b.ref); }
    else { res.status(405).json({ error: 'Method not allowed' }); return; }
    const app = ref ? await findByRef(ref) : null;
    if (!app) { if (req.method === 'GET') { res.writeHead(302, { Location: SITE + '/?apply=1' }); res.end(); return; } res.status(404).json({ error: 'not_found' }); return; }
    if (app.payment_status === 'paid') { const u = `${SITE}/thanks?ref=${app.reference_number}`; if (req.method === 'GET') { res.writeHead(302, { Location: u }); res.end(); return; } res.status(200).json({ url: u, mode: 'already_paid' }); return; }

    let url = null, mode = 'session';
    try { url = await createSession(app); } catch (e) { console.error(e); }
    if (!url) { if (req.method === 'GET') { res.writeHead(302, { Location: SITE + '/?resume=' + app.reference_number }); res.end(); return; } res.status(502).json({ error: 'Payment is temporarily unavailable — text us and we\'ll hold your spot.' }); return; }
    if (req.method === 'GET') { res.writeHead(302, { Location: url }); res.end(); return; }
    res.status(200).json({ url, mode });
  } catch (e) { res.status(500).json({ error: String(e).slice(0, 200) }); }
}
