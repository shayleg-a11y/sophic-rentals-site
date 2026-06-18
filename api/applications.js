// GET /api/applications — returns all applications. Requires admin password.
// Header: x-admin-password: <ADMIN_PASSWORD>
export default async function handler(req, res) {
  const pw = req.headers['x-admin-password'] || '';
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected || pw !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    const r = await fetch(url + '/rest/v1/applications?select=*&order=created_at.desc', {
      headers: { apikey: key, Authorization: 'Bearer ' + key }
    });
    const data = await r.json();
    if (!r.ok) {
      res.status(500).json({ error: 'fetch_failed', detail: data });
      return;
    }
    res.status(200).json({ count: Array.isArray(data) ? data.length : 0, applications: data });
  } catch (e) {
    res.status(500).json({ error: String(e).slice(0, 200) });
  }
}
