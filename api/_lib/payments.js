// Shared payment-recording logic for the $9.99 application fee.
// Used by the Stripe webhook and by /api/verify-payment (the /thanks page check),
// so a payment is recorded even if one of the two paths fails.
import { select, update, findByRef, cleanRef } from './db.js';
import { notifyApplicant } from './notify.js';

const STRIPE = 'https://api.stripe.com/v1';

export async function stripeGet(path) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('stripe_not_configured');
  const r = await fetch(STRIPE + path, { headers: { Authorization: 'Bearer ' + key } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('stripe_get_failed:' + r.status);
  return d;
}

// sess = a Stripe Checkout Session object. Returns the updated application row, or null.
export async function markPaidFromSession(sess) {
  if (!sess || sess.payment_status !== 'paid') return null;
  const ref = cleanRef(sess.client_reference_id || (sess.metadata && sess.metadata.reference));
  const now = new Date().toISOString();
  const patch = { payment_status: 'paid', status: 'paid', paid_at: now, submitted_at: now, updated_at: now,
    stripe_session_id: String(sess.id || '').slice(0, 120) || null, stripe_payment_intent: String(sess.payment_intent || '').slice(0, 120) || null };

  let rows = [];
  if (ref) {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F-]{27,}$/.test(ref);
    const col = isUuid ? 'id' : 'reference_number';
    // Only touch rows not already marked paid (idempotent: webhook + thanks page can both fire).
    try { rows = await update('applications', col + '=eq.' + encodeURIComponent(ref) + '&payment_status=neq.paid', Object.assign({ stage: 'reserve' }, patch), true) || []; } catch (e) { console.error('patch by ref failed', e); }
    if (!rows.length) { const existing = await select('applications', 'select=id&' + col + '=eq.' + encodeURIComponent(ref) + '&payment_status=eq.paid&limit=1').catch(() => []); if (existing[0]) return existing[0]; }
  }
  if (!rows.length) {
    const email = String((sess.customer_details && sess.customer_details.email) || sess.customer_email || '').toLowerCase().slice(0, 200);
    if (email) {
      const found = await select('applications', 'select=id&email=eq.' + encodeURIComponent(email) + '&payment_status=eq.unpaid&order=created_at.desc&limit=1');
      if (found[0]) { try { rows = await update('applications', 'id=eq.' + found[0].id, Object.assign({ stage: 'reserve' }, patch), true) || []; } catch (e) { console.error('patch by email failed', e); } }
    }
  }
  const app = rows[0] || null;
  if (app && !(app.license_front_path && app.license_back_path)) { try { await notifyApplicant(app, 'uploadDocs'); } catch (_) {} }
  return app;
}

// Look up an application by reference and, if Stripe says its checkout is paid, record it.
export async function syncPaymentByRef(reference, sessionId) {
  const app = await findByRef(cleanRef(reference));
  if (!app) return { found: false, paid: false };
  if (app.payment_status === 'paid') return { found: true, paid: true };
  const sid = String(sessionId || app.stripe_session_id || '').replace(/[^a-zA-Z0-9_]/g, '');
  if (!sid.startsWith('cs_')) return { found: true, paid: false };
  const sess = await stripeGet('/checkout/sessions/' + sid);
  const ref = cleanRef(sess.client_reference_id || (sess.metadata && sess.metadata.reference));
  if (ref && ref !== app.reference_number) return { found: true, paid: false }; // session belongs to another application
  const updated = await markPaidFromSession(sess);
  return { found: true, paid: !!updated };
}
