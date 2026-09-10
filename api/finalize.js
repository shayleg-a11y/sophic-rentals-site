// POST /api/finalize — records uploaded document paths onto an application.
// Body: {application_id | reference, license_front_path?, license_back_path?, supporting_doc_paths?[]}
import { findByRef, cleanRef, update } from './_lib/db.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    let id = String(b.application_id || '').replace(/[^a-zA-Z0-9-]/g, '');
    if (!id && b.reference) { const app = await findByRef(cleanRef(b.reference)); if (app) id = app.id; }
    if (!id) { res.status(400).json({ error: 'bad_request' }); return; }
    const patch = { updated_at: new Date().toISOString() };
    if (b.license_front_path) patch.license_front_path = String(b.license_front_path).slice(0, 300);
    if (b.license_back_path) patch.license_back_path = String(b.license_back_path).slice(0, 300);
    if (Array.isArray(b.supporting_doc_paths)) patch.supporting_doc_paths = b.supporting_doc_paths.map((p) => String(p).slice(0, 300)).slice(0, 10);
    await update('applications', 'id=eq.' + id, patch);
    res.status(200).json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e).slice(0, 200) }); }
}
