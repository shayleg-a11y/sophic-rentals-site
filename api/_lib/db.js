// Minimal Supabase REST helpers (server-side, uses the secret key).
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY;

export function configured() { return !!(URL && KEY); }
function headers(extra) { return Object.assign({ apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, extra || {}); }

export async function select(table, query) {
  const r = await fetch(`${URL}/rest/v1/${table}?${query}`, { headers: headers() });
  const d = await r.json().catch(() => []);
  if (!r.ok) throw new Error('select_failed:' + JSON.stringify(d).slice(0, 200));
  return d;
}
export async function insert(table, row) {
  const r = await fetch(`${URL}/rest/v1/${table}`, { method: 'POST', headers: headers({ Prefer: 'return=representation' }), body: JSON.stringify(row) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('insert_failed:' + JSON.stringify(d).slice(0, 300));
  return Array.isArray(d) ? d[0] : d;
}
export async function update(table, query, patch, returning) {
  const r = await fetch(`${URL}/rest/v1/${table}?${query}`, { method: 'PATCH', headers: headers({ Prefer: returning ? 'return=representation' : 'return=minimal' }), body: JSON.stringify(patch) });
  if (!r.ok) { const t = await r.text(); throw new Error('update_failed:' + t.slice(0, 300)); }
  return returning ? r.json() : null;
}
export async function findByRef(ref) {
  const rows = await select('applications', 'select=*&reference_number=eq.' + encodeURIComponent(ref) + '&limit=1');
  return rows[0] || null;
}
export function cleanRef(v) { return String(v || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40); }
