// GET /api/fleet — public availability summary from the vehicles table (no PII).
// Archived rows are ignored. agent_settings.site_availability (e.g. {"Model 3": 3}) overrides the
// "available" count per model, so availability can be set without changing individual car statuses.
import { configured, select } from './_lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
  if (!configured()) { res.status(200).json({ models: null }); return; }
  try {
    const rows = await select('vehicles', 'select=model,status,weekly_rate&status=neq.archived');
    const models = {};
    for (const v of rows) {
      const m = String(v.model || '').trim(); if (!m) continue;
      const st = String(v.status || '').toLowerCase();
      models[m] = models[m] || { total: 0, available: 0, rented: 0, weekly_rate: null };
      models[m].total++;
      if (st === 'available') models[m].available++;
      if (st === 'rented') models[m].rented++;
      if (v.weekly_rate && !models[m].weekly_rate) models[m].weekly_rate = Number(v.weekly_rate);
    }
    try {
      const s = await select('agent_settings', 'select=value&key=eq.site_availability&limit=1');
      const o = s[0] && s[0].value;
      if (o && typeof o === 'object') for (const [m, n] of Object.entries(o)) {
        models[m] = models[m] || { total: 0, available: 0, rented: 0, weekly_rate: null };
        models[m].available = Math.max(0, Number(n) || 0);
      }
    } catch (_) {}
    // Optional per-pickup availability, e.g. {"lax":{"Model 3":1},"sna":{"Model 3":2},"orange":{}} (set by ops; null = not shown)
    let locations = null;
    try {
      const l = await select('agent_settings', 'select=value&key=eq.site_availability_by_location&limit=1');
      const o = l[0] && l[0].value;
      if (o && typeof o === 'object') { locations = {}; for (const k of ['lax', 'sna', 'orange']) { const m = o[k] || {}; locations[k] = { available: Object.values(m).reduce((a, n) => a + (Number(n) || 0), 0), models: m }; } }
    } catch (_) {}
    res.status(200).json({ models, locations, updated_at: new Date().toISOString() });
  } catch (e) { res.status(200).json({ models: null, error: String(e).slice(0, 100) }); }
}
