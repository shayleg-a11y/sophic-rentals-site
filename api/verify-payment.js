// POST /api/verify-payment — called by /thanks after Stripe redirects back.
// Body: {reference, session_id?}. Checks the Checkout Session with Stripe and records the payment
// if the webhook hasn't already. Safe to call repeatedly.
import { syncPaymentByRef } from './_lib/payments.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    if (!b.reference) { res.status(400).json({ error: 'bad_request' }); return; }
    const r = await syncPaymentByRef(b.reference, b.session_id);
    res.status(200).json({ paid: r.paid });
  } catch (e) { console.error('verify-payment', e); res.status(200).json({ paid: false }); }
}
