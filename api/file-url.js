// GET /api/file-url?path=... — admin-only. Returns a short-lived signed URL to view a stored document.
import crypto from 'crypto';
function safeEqual(a, b) { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); }
export default async function handler(req, res) {
  const pw = req.headers['x-admin-password'] || '';
  if (!process.env.ADMIN_PASSWORD || !safeEqual(pw, process.env.ADMIN_PASSWORD)) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const path = String((req.query && req.query.path) || '').replace(/^\/+/, '');
    if (!path) { res.status(400).json({ error: 'missing_path' }); return; }
    if (path.includes('..') || !/^[0-9a-fA-F-]+\/(license_front|license_back|supporting)\/[^/]+$/.test(path)) { res.status(400).json({ error: 'invalid_path' }); return; }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
    const r = await fetch(url + '/storage/v1/object/sign/applicant-documents/' + path, { method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 300 }) });
    const data = await r.json();
    if (!r.ok) { res.status(500).json({ error: 'sign_failed', detail: JSON.stringify(data).slice(0, 200) }); return; }
    res.status(200).json({ url: url + '/storage/v1' + data.signedURL });
  } catch (e) { res.status(500).json({ error: String(e).slice(0, 200) }); }
}
