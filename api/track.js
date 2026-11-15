// POST /api/track — first-party funnel events (works with no ad-blocker-sensitive third parties).
// Body: {events:[{name, path, ref, props, t}], v (visitor id), s (session id), a (first-touch attribution)}
// Sent with navigator.sendBeacon, so the body may arrive as a string.
import { configured, insert } from './_lib/db.js';
const ALLOWED = new Set(['page_view','form_start','lead_submit','details_submit','checkout_open','stripe_redirect','payment_complete','apply_open','contact_click','faq_open','calc_change','rto_calc_change','resume_open','pickup_select','map_open','license_knockout','upload_done','details_saved','pay_error']);
const s = (v, n) => (v == null ? '' : String(v)).slice(0, n);
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return; }
  if (!configured()) { res.status(204).end(); return; }
  try {
    let b = req.body; if (typeof b === 'string') b = JSON.parse(b || '{}'); b = b || {};
    const a = b.a || {}; const ua = String(req.headers['user-agent'] || '');
    if (/bot|crawl|spider|slurp|preview|headless|lighthouse/i.test(ua)) { res.status(204).end(); return; }
    const evs = (Array.isArray(b.events) ? b.events : []).slice(0, 20).filter((e) => e && ALLOWED.has(e.name));
    for (const e of evs) {
      let props = e.props && typeof e.props === 'object' ? e.props : null;
      if (props && JSON.stringify(props).length > 1500) props = null;
      await insert('site_events', {
        visitor_id: s(b.v, 64) || null, session_id: s(b.s, 64) || null, name: e.name, path: s(e.path, 300) || null, ref: s(e.ref, 40) || null, props,
        utm_source: s(a.utm_source, 80) || null, utm_medium: s(a.utm_medium, 80) || null, utm_campaign: s(a.utm_campaign, 120) || null, referrer: s(a.referrer, 300) || null,
        mobile: /Mobi|Android|iPhone/i.test(ua)
      }).catch(() => {});
    }
    res.status(204).end();
  } catch (_) { res.status(204).end(); }
}
