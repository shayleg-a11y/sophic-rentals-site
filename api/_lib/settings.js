// Small cached reader for agent_settings rows (config that can change without a deploy).
import { select } from './db.js';
const cache = new Map();
export async function getSetting(key, ttlMs = 60e3) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < ttlMs) return hit.v;
  let v = null;
  try { const rows = await select('agent_settings', 'select=value&key=eq.' + encodeURIComponent(key) + '&limit=1'); v = rows[0] ? rows[0].value : null; } catch (_) {}
  cache.set(key, { v, t: Date.now() });
  return v;
}
