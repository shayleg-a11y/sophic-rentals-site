// POST /api/apply — application stages.
//   stage "lead"    : FREE step 1 (name, phone, platform, car). Creates (or refreshes) a row; returns {id, reference_number}.
//                     A DB trigger on applications texts the lead + alerts the owner (see migration lead_texting_funnel).
//   stage "details" : step 2 (email, license, insurance) on the row identified by ref; then the client opens /api/checkout.
//   stage "reserve" : after payment, adds DOB + address (thanks page).
// Spam protection: honeypot field "website", per-IP rate limit (hashed IP), 24h dedupe by email+type.
import crypto from 'crypto';
import { configured, select, insert, update, findByRef, cleanRef } from './_lib/db.js';
import { notifyApplicant, notifyAdmin } from './_lib/notify.js';

const s = (v, n) => (v == null ? '' : String(v)).trim().slice(0, n);
const RATE_LIMIT = 6;              // submissions per IP per hour
const DEDUPE_HOURS = 24;

function ipOf(req) {
  const xf = req.headers['x-forwarded-for'];
  return (xf ? String(xf).split(',')[0] : req.socket?.remoteAddress || '').trim();
}
function ipHash(ip) { return crypto.createHash('sha256').update((process.env.IP_HASH_SALT || 'sophic') + '|' + ip).digest('hex').slice(0, 32); }
function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); }
function validPhone(p) { const d = p.replace(/\D/g, ''); return d.length === 10 || (d.length === 11 && d[0] === '1'); }

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  if (!configured()) { res.status(500).json({ error: 'Server not configured' }); return; }
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    // Honeypot: bots fill every field. Pretend success, store nothing.
    if (s(b.website, 200)) { res.status(200).json({ ok: true, id: crypto.randomUUID(), reference_number: 'OK' + Date.now().toString(36).toUpperCase().slice(-6) }); return; }

    const stage = ['reserve', 'details'].includes(b.stage) ? b.stage : 'lead';
    const type = b.application_type === 'driver' ? 'driver' : 'rental';
    const hash = ipHash(ipOf(req));

    // ---- Rate limit (per hashed IP, last hour)
    try {
      const since = new Date(Date.now() - 3600e3).toISOString();
      const hits = await select('applications', 'select=id&ip_hash=eq.' + hash + '&created_at=gte.' + encodeURIComponent(since) + '&limit=' + (RATE_LIMIT + 1));
      if (hits.length >= RATE_LIMIT && stage === 'lead') { res.status(429).json({ error: 'rate_limited' }); return; }
    } catch (_) { /* best effort */ }

    if (stage === 'details') {
      const ref = cleanRef(b.ref);
      const app = ref ? await findByRef(ref) : null;
      if (!app) { res.status(404).json({ error: 'not_found' }); return; }
      const email = s(b.email, 200).toLowerCase();
      if (!validEmail(email)) { res.status(400).json({ error: 'Please enter a valid email address' }); return; }
      const lic = s(b.has_license, 40);
      const patch = { email, stage: 'details', updated_at: new Date().toISOString() };
      if (app.application_type !== 'driver' && s(b.insurance_status, 60)) patch.insurance_status = s(b.insurance_status, 60);
      if (s(b.rideshare_experience, 60)) patch.rideshare_experience = s(b.rideshare_experience, 60);
      if (lic) patch.reviewer_notes = ((app.reviewer_notes || '').replace(/License: [^\n]*/,'').trim() + '\nLicense: ' + lic).trim();
      if (app.payment_status !== 'paid') patch.status = 'pending_payment';
      await update('applications', 'id=eq.' + app.id, patch);
      try { await notifyAdmin('Step 2 done (going to pay): ' + app.first_name + ' ' + app.last_name, ['Ref: ' + app.reference_number, 'Email: ' + email, 'Insurance: ' + (patch.insurance_status || ''), 'License: ' + lic]); } catch (_) {}
      res.status(200).json({ ok: true, id: app.id, reference_number: app.reference_number });
      return;
    }

    if (stage === 'reserve') {
      const ref = cleanRef(b.ref);
      const app = ref ? await findByRef(ref) : null;
      if (!app) { res.status(404).json({ error: 'not_found' }); return; }
      const patch = {
        date_of_birth: s(b.date_of_birth, 20) || null,
        address_line1: s(b.address_line1, 200) || null,
        address_line2: s(b.address_line2, 200) || null,
        city: s(b.city, 100) || null,
        state: s(b.state, 40) || null,
        zip_code: s(b.zip_code, 20) || null,
        stage: 'reserve',
        updated_at: new Date().toISOString()
      };
      for (const k of ['date_of_birth', 'address_line1', 'city', 'state', 'zip_code']) if (!patch[k]) { res.status(400).json({ error: 'Missing required field: ' + k }); return; }
      if (app.payment_status !== 'paid') patch.status = 'pending_payment';
      await update('applications', 'id=eq.' + app.id, patch);
      res.status(200).json({ ok: true, id: app.id, reference_number: app.reference_number });
      return;
    }

    // ---- Lead stage
    const rec = {
      first_name: s(b.first_name, 100), last_name: s(b.last_name, 100),
      email: s(b.email, 200).toLowerCase(), phone: s(b.phone, 40),
      platform: s(b.platform, 40) || null,
      preferred_car: s(b.car, 80) || null,
      insurance_status: type === 'driver' ? 'Fleet policy' : (s(b.insurance_status, 60) || null),
      rideshare_experience: s(b.rideshare_experience, 60) || null,
      weekly_hours: s(b.weekly_hours, 60) || null,
      application_type: type,
      plan: b.plan === 'rent-to-own' ? 'rent-to-own' : 'rental',
      source: s(b.source, 200) || null,
      ip_hash: hash,
      stage: 'lead',
      status: 'lead',
      payment_status: 'unpaid'
    };
    const lic = s(b.has_license, 40);
    if (lic) rec.reviewer_notes = 'License: ' + lic;
    for (const k of ['first_name', 'last_name', 'phone']) if (!rec[k]) { res.status(400).json({ error: 'Missing required field: ' + k }); return; }
    if (!rec.email) delete rec.email;                       // email is collected in step 2
    else if (!validEmail(rec.email)) { res.status(400).json({ error: 'Please enter a valid email address' }); return; }
    if (!validPhone(rec.phone)) { res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' }); return; }

    // ---- Dedupe: same phone (or email) + type, unpaid, within 24h -> refresh that row instead of creating another
    let row = null, deduped = false;
    try {
      const since = new Date(Date.now() - DEDUPE_HOURS * 3600e3).toISOString();
      const digits = rec.phone.replace(/\D/g, '').slice(-10);
      const who = rec.email ? 'or=(email.eq.' + encodeURIComponent(rec.email) + ',phone.ilike.*' + digits.slice(-4) + '*)' : 'phone=ilike.*' + digits.slice(-4) + '*';
      const cand = await select('applications', 'select=id,reference_number,first_name,email,phone,application_type&' + who + '&application_type=eq.' + type + '&payment_status=eq.unpaid&created_at=gte.' + encodeURIComponent(since) + '&order=created_at.desc&limit=10');
      const dup = cand.filter((c) => (c.phone || '').replace(/\D/g, '').slice(-10) === digits || (rec.email && c.email === rec.email));
      if (dup[0]) {
        const patch = Object.assign({}, rec, { updated_at: new Date().toISOString() });
        delete patch.status; delete patch.payment_status; delete patch.stage;
        await update('applications', 'id=eq.' + dup[0].id, patch);
        row = Object.assign({}, dup[0], rec); deduped = true;
      }
    } catch (_) {}
    if (!row) row = await insert('applications', rec);

    // ---- Notifications (best effort, before responding so the function isn't frozen mid-send)
    if (!deduped) {
      try { await notifyAdmin('New ' + type + ' lead: ' + rec.first_name + ' ' + rec.last_name, [
        'Ref: ' + row.reference_number, 'Phone: ' + rec.phone, 'Email: ' + rec.email, 'Platform: ' + rec.platform, 'Car: ' + rec.preferred_car,
        'Insurance: ' + rec.insurance_status, 'License: ' + lic, 'Experience: ' + rec.rideshare_experience, 'Hours: ' + rec.weekly_hours, 'Source: ' + rec.source,
        'Admin: https://sophicrentals.com/admin']); } catch (_) {}
    }
    res.status(200).json({ ok: true, id: row.id, reference_number: row.reference_number, deduped });
  } catch (e) { if (!res.headersSent) res.status(500).json({ error: String(e).slice(0, 200) }); }
}
