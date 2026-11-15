// GET /api/config — public, non-secret site config (Stripe publishable key, GA4 id, Meta Pixel id).
// Lives in agent_settings.site_public_config so it can change without a deploy. Never put secrets here.
import { getSetting } from './_lib/settings.js';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  const c = (await getSetting('site_public_config')) || {};
  const pk = /^pk_(live|test)_[A-Za-z0-9]+$/.test(c.stripe_pk || '') ? c.stripe_pk : '';
  const ga4 = /^G-[A-Z0-9]+$/.test(c.ga4 || '') ? c.ga4 : '';
  const px = /^\d{6,20}$/.test(String(c.meta_pixel || '')) ? String(c.meta_pixel) : '';
  res.status(200).json({ stripe_pk: pk, ga4, meta_pixel: px });
}
