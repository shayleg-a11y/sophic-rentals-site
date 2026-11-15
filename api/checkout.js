// /api/checkout — starts the $9.99 Tesla reservation payment.
//   POST {reference}                 -> {url, mode:'session'}           (hosted Stripe Checkout)
//   POST {reference, embedded:true}  -> {client_secret, mode:'embedded'} (Stripe Embedded Checkout on our page)
//   GET  ?ref=XXXX        -> 302 redirect to Stripe (used in email/SMS links)
// With STRIPE_SECRET_KEY set: creates a Checkout Session whose success_url carries the reference,
// so /thanks always knows which application to attach license photos to (works across browsers/devices).
// The amount is fixed here at $9.99 (999 cents) via price_data, so no Stripe price/link edit can change it.
// No Payment Link fallback: if Stripe is unavailable we return an error rather than risk a wrong amount.
import { configured, findByRef, cleanRef, update } from './_lib/db.js';

const SITE = process.env.SITE_URL || 'https://sophicrentals.com';
const FEE_CENTS = 999;            // $9.99 — never changes per applicant
const PRODUCT = 'prod_Uisy75W6A3K8h4'; // existing "application fee" product (keeps Stripe reporting grouped)

const LOGO = SITE + '/images/logo-dark.png';
const ICON = SITE + '/images/icon-512.png';

// embedded=true -> Stripe Embedded Checkout (paid on our page; needs the publishable key on the client)
async function createSession(app, embedded) {
  const key = process.env.STRIPE_SECRET_KEY; if (!key) return null;
  const es = String(app.source || '').startsWith('/es');
  const p = new URLSearchParams();
  p.set('mode', 'payment');
  p.set('line_items[0][price_data][currency]', 'usd');
  p.set('line_items[0][price_data][unit_amount]', String(FEE_CENTS));
  p.set('line_items[0][price_data][product]', PRODUCT);
  p.set('line_items[0][quantity]', '1');
  const back = `${SITE}/thanks?ref=${app.reference_number}&session_id={CHECKOUT_SESSION_ID}`;
  if (embedded) { p.set('ui_mode', 'embedded_page'); p.set('return_url', back); }
  else { p.set('success_url', back); p.set('cancel_url', `${SITE}/${es ? 'es' : ''}?resume=${app.reference_number}`); p.set('after_expiration[recovery][enabled]', 'true'); }
  p.set('client_reference_id', app.reference_number);
  if (app.email) p.set('customer_email', app.email);
  p.set('metadata[reference]', app.reference_number); p.set('metadata[application_type]', app.application_type || 'rental'); p.set('metadata[plan]', app.plan || '');
  p.set('payment_intent_data[description]', 'Sophic Rentals — Tesla reservation (credited to first week) — ref ' + app.reference_number);
  p.set('payment_intent_data[metadata][reference]', app.reference_number);
  p.set('submit_type', 'pay');
  p.set('locale', es ? 'es' : 'en');
  // Wallets (Apple Pay / Google Pay) ride on "card". Drop pay-later/crypto options that make no sense for $9.99.
  ['klarna', 'afterpay_clearpay', 'affirm', 'crypto', 'zip'].forEach((t, i) => p.set(`excluded_payment_method_types[${i}]`, t));
  p.set('branding_settings[display_name]', 'Sophic Rentals');
  p.set('branding_settings[button_color]', '#0FBF8C');
  p.set('branding_settings[icon][type]', 'url'); p.set('branding_settings[icon][url]', ICON);
  p.set('branding_settings[logo][type]', 'url'); p.set('branding_settings[logo][url]', LOGO);
  p.set('custom_text[submit][message]', es
    ? 'Esto aparta tu Tesla. Los $9.99 se abonan a tu primera semana y no son reembolsables. Después subes fotos de tu licencia (30 segundos).'
    : 'This reserves your Tesla. The $9.99 is credited to your first week and is non-refundable. Next you\'ll snap photos of your license (30 seconds).');
  let r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/x-www-form-urlencoded' }, body: p.toString() });
  let d = await r.json();
  if (!r.ok && /branding|excluded_payment_method_types/.test(JSON.stringify(d.error || ''))) {
    // Never let cosmetics block a payment: retry without them.
    for (const k of [...p.keys()]) if (/^branding_settings|^excluded_payment_method_types/.test(k)) p.delete(k);
    r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/x-www-form-urlencoded' }, body: p.toString() });
    d = await r.json();
  }
  if (!r.ok || !(embedded ? d.client_secret : d.url)) throw new Error('stripe_session_failed:' + JSON.stringify(d.error || d).slice(0, 300));
  try { await update('applications', 'id=eq.' + app.id, { stripe_session_id: d.id, updated_at: new Date().toISOString() }); } catch (_) {}
  return embedded ? { client_secret: d.client_secret, id: d.id } : { url: d.url, id: d.id };
}

export default async function handler(req, res) {
  if (!configured()) { res.status(500).json({ error: 'Server not configured' }); return; }
  try {
    let ref = '', embedded = false;
    if (req.method === 'GET') ref = cleanRef(req.query && req.query.ref);
    else if (req.method === 'POST') { const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); ref = cleanRef(b.reference || b.ref); embedded = b.embedded === true; }
    else { res.status(405).json({ error: 'Method not allowed' }); return; }
    const app = ref ? await findByRef(ref) : null;
    if (!app) { if (req.method === 'GET') { res.writeHead(302, { Location: SITE + '/?apply=1' }); res.end(); return; } res.status(404).json({ error: 'not_found' }); return; }
    if (app.payment_status === 'paid') { const u = `${SITE}/thanks?ref=${app.reference_number}`; if (req.method === 'GET') { res.writeHead(302, { Location: u }); res.end(); return; } res.status(200).json({ url: u, mode: 'already_paid' }); return; }

    let out = null;
    try { out = await createSession(app, embedded); } catch (e) { console.error(e); }
    if (!out && embedded) { try { out = await createSession(app, false); embedded = false; } catch (e) { console.error(e); } }
    if (!out) { if (req.method === 'GET') { res.writeHead(302, { Location: SITE + '/?resume=' + app.reference_number }); res.end(); return; } res.status(502).json({ error: 'Payment is temporarily unavailable — text us and we\'ll hold your car.' }); return; }
    if (req.method === 'GET') { res.writeHead(302, { Location: out.url }); res.end(); return; }
    res.status(200).json(embedded ? { client_secret: out.client_secret, mode: 'embedded' } : { url: out.url, mode: 'session' });
  } catch (e) { res.status(500).json({ error: String(e).slice(0, 200) }); }
}
