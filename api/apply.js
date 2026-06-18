// POST /api/apply — stores a rental application in Supabase.
// Public endpoint (no auth) — used by the booking form. Service key stays server-side.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const s = (v, n) => (v == null ? '' : String(v)).slice(0, n);
    const rec = {
      name: s(b.name, 200),
      phone: s(b.phone, 40),
      email: s(b.email, 200),
      platform: s(b.platform, 40),
      preferred_car: s(b.car, 120),
      license_state: s(b.license, 40),
      license_number: s(b.license_number, 40),
      has_insurance: s(b.insurance, 60),
      source: 'website'
    };
    if (!rec.name || !rec.email || !rec.phone || !rec.license_number) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) {
      res.status(500).json({ error: 'Server not configured' });
      return;
    }
    const r = await fetch(url + '/rest/v1/applications', {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(rec)
    });
    if (!r.ok) {
      const t = await r.text();
      res.status(500).json({ error: 'store_failed', detail: t.slice(0, 300) });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e).slice(0, 200) });
  }
}
