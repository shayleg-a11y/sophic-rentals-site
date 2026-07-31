// POST /api/finalize — records uploaded document paths onto an application.
// Body: {application_id, license_front_path, license_back_path, supporting_doc_paths[]}
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    let id = String(b.application_id || '').replace(/[^a-zA-Z0-9-]/g, '');
    // Allow lookup by reference_number (used by the post-payment upload page)
    if (!id && b.reference) {
      const url0 = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key0 = process.env.SUPABASE_SECRET_KEY;
      const ref = String(b.reference).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40);
      if (ref) {
        const lr = await fetch(url0 + '/rest/v1/applications?select=id&reference_number=eq.' + encodeURIComponent(ref) + '&limit=1', {
          headers: { apikey: key0, Authorization: 'Bearer ' + key0 }
        });
        const rows = lr.ok ? await lr.json() : [];
        if (Array.isArray(rows) && rows[0]) id = String(rows[0].id);
      }
    }
    if (!id) { res.status(400).json({ error: 'bad_request' }); return; }
    const patch = {};
    if (b.license_front_path) patch.license_front_path = String(b.license_front_path).slice(0, 300);
    if (b.license_back_path) patch.license_back_path = String(b.license_back_path).slice(0, 300);
    if (Array.isArray(b.supporting_doc_paths)) patch.supporting_doc_paths = b.supporting_doc_paths.map(p => String(p).slice(0, 300)).slice(0, 10);
    patch.updated_at = new Date().toISOString();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    const r = await fetch(url + '/rest/v1/applications?id=eq.' + id, {
      method: 'PATCH',
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(patch)
    });
    if (!r.ok) { const t = await r.text(); res.status(500).json({ error: 'update_failed', detail: t.slice(0, 200) }); return; }
    res.status(200).json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e).slice(0, 200) }); }
}
