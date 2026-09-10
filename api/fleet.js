// GET /api/fleet — public availability summary from the vehicles table (no PII).
import { configured, select } from './_lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  if (!configured()) { res.status(200).json({ models: null }); return; }
  try {
    const rows = await select('vehicles', 'select=model,status,weekly_rate');
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
    res.status(200).json({ models, updated_at: new Date().toISOString() });
  } catch (e) { res.status(200).json({ models: null, error: String(e).slice(0, 100) }); }
}
