// POST /api/apply — creates a rental application (KYC) in Supabase. Returns {id, reference_number}.
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const s = (v, n) => (v == null ? '' : String(v)).trim().slice(0, n);
    const rec = {
      first_name: s(b.first_name, 100),
      last_name: s(b.last_name, 100),
      email: s(b.email, 200),
      phone: s(b.phone, 40),
      date_of_birth: s(b.date_of_birth, 20),
      address_line1: s(b.address_line1, 200),
      address_line2: s(b.address_line2, 200) || null,
      city: s(b.city, 100),
      state: s(b.state, 40),
      zip_code: s(b.zip_code, 20),
      license_number: s(b.license_number, 40),
      insurance_status: s(b.insurance_status, 60) || null,
      plan: b.plan === 'rent-to-own' ? 'rent-to-own' : 'rental',
      status: 'pending_payment',
      payment_status: 'unpaid'
    };
    const required = ['first_name','last_name','email','phone','date_of_birth','address_line1','city','state','zip_code','license_number'];
    for (const k of required) { if (!rec[k]) { res.status(400).json({ error: 'Missing required field: ' + k }); return; } }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) { res.status(500).json({ error: 'Server not configured' }); return; }
    const r = await fetch(url + '/rest/v1/applications', {
      method: 'POST',
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(rec)
    });
    const data = await r.json();
    if (!r.ok) { res.status(500).json({ error: 'store_failed', detail: JSON.stringify(data).slice(0, 300) }); return; }
    const row = Array.isArray(data) ? data[0] : data;
    res.status(200).json({ ok: true, id: row.id, reference_number: row.reference_number });
  } catch (e) { res.status(500).json({ error: String(e).slice(0, 200) }); }
}
