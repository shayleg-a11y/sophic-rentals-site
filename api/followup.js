// GET /api/followup — scheduled by Vercel Cron (see vercel.json). Also callable manually with the same secret.
// 1) Unpaid leads/reservations 1h–72h old, nudged at most twice, ≥20h apart -> "finish your application"
// 2) Paid but missing license photos, ≥1h since payment, not yet reminded -> "upload your license"
// Auth: Authorization: Bearer <CRON_SECRET>  (Vercel sets this automatically for cron invocations)
import { configured, select, update } from './_lib/db.js';
import { notifyApplicant, emailConfigured, smsConfigured } from './_lib/notify.js';

export default async function handler(req, res) {
  const auth = req.headers['authorization'] || '';
  if (!process.env.CRON_SECRET || auth !== 'Bearer ' + process.env.CRON_SECRET) { res.status(401).json({ error: 'Unauthorized' }); return; }
  if (!configured()) { res.status(500).json({ error: 'Server not configured' }); return; }
  if (!emailConfigured() && !smsConfigured()) { res.status(200).json({ ok: true, skipped: 'no email/sms provider configured' }); return; }
  const out = { nudged: [], docs: [], errors: [] };
  const now = Date.now(), iso = (ms) => new Date(ms).toISOString();
  try {
    const unpaid = await select('applications', 'select=*&payment_status=eq.unpaid&followup_count=lt.2&created_at=gte.' + encodeURIComponent(iso(now - 72 * 3600e3)) + '&created_at=lte.' + encodeURIComponent(iso(now - 3600e3)) + '&order=created_at.asc&limit=50');
    for (const a of unpaid) {
      if (a.last_followup_at && now - Date.parse(a.last_followup_at) < 20 * 3600e3) continue;
      if (/e2etest|\+test/.test(a.email || '')) continue;
      try { await notifyApplicant(a, 'finishPayment'); await update('applications', 'id=eq.' + a.id, { followup_count: (a.followup_count || 0) + 1, last_followup_at: iso(now) }); out.nudged.push(a.reference_number); }
      catch (e) { out.errors.push(a.reference_number + ':' + String(e).slice(0, 80)); }
    }
    const paidNoDocs = await select('applications', 'select=*&payment_status=eq.paid&docs_reminded_at=is.null&or=(license_front_path.is.null,license_back_path.is.null)&paid_at=lte.' + encodeURIComponent(iso(now - 3600e3)) + '&limit=50');
    for (const a of paidNoDocs) {
      try { await notifyApplicant(a, 'docsReminder'); await update('applications', 'id=eq.' + a.id, { docs_reminded_at: iso(now) }); out.docs.push(a.reference_number); }
      catch (e) { out.errors.push(a.reference_number + ':' + String(e).slice(0, 80)); }
    }
    res.status(200).json(Object.assign({ ok: true }, out));
  } catch (e) { res.status(500).json({ error: String(e).slice(0, 200), partial: out }); }
}
