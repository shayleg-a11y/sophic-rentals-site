// POST /api/sign-upload — returns a one-time signed URL to upload a license/supporting document
// directly to private Supabase Storage. Body: {application_id, slot, filename}
const SLOTS = { license_front: 1, license_back: 1, supporting: 1 };
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const id = String(b.application_id || '').replace(/[^a-zA-Z0-9-]/g, '');
    const slot = b.slot;
    if (!id || !SLOTS[slot]) { res.status(400).json({ error: 'bad_request' }); return; }
    const safe = String(b.filename || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'file';
    const path = `${id}/${slot}/${Date.now()}_${safe}`;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    const r = await fetch(`${url}/storage/v1/object/upload/sign/applicant-documents/${path}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: 'Bearer ' + key }
    });
    const data = await r.json();
    if (!r.ok) { res.status(500).json({ error: 'sign_failed', detail: JSON.stringify(data).slice(0, 200) }); return; }
    // data.url => /object/upload/sign/applicant-documents/<path>?token=...
    res.status(200).json({ path, uploadUrl: url + '/storage/v1' + data.url });
  } catch (e) { res.status(500).json({ error: String(e).slice(0, 200) }); }
}
