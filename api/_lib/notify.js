// Email (Resend) + SMS (Twilio). Each is a no-op until its env vars exist.
//   RESEND_API_KEY, NOTIFY_FROM_EMAIL (e.g. "Sophic Rentals <hello@sophicrentals.com>")
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM (E.164) or TWILIO_MESSAGING_SERVICE_SID
//   NOTIFY_ADMIN_EMAIL — internal alert on every new lead (optional)
const SITE = process.env.SITE_URL || 'https://sophicrentals.com';
const FEE = '9.99';

export function emailConfigured() { return !!process.env.RESEND_API_KEY; }
export function smsConfigured() { return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && (process.env.TWILIO_FROM || process.env.TWILIO_MESSAGING_SERVICE_SID)); }

export async function sendEmail(to, subject, html, text) {
  if (!emailConfigured() || !to) return false;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.NOTIFY_FROM_EMAIL || 'Sophic Rentals <onboarding@resend.dev>', to: [to], subject, html, text })
  });
  return r.ok;
}

export async function sendSMS(to, body) {
  if (!smsConfigured() || !to) return false;
  const digits = String(to).replace(/\D/g, '');
  const e164 = digits.length === 10 ? '+1' + digits : (digits.length === 11 && digits[0] === '1' ? '+' + digits : null);
  if (!e164) return false;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const params = new URLSearchParams({ To: e164, Body: body });
  if (process.env.TWILIO_MESSAGING_SERVICE_SID) params.set('MessagingServiceSid', process.env.TWILIO_MESSAGING_SERVICE_SID); else params.set('From', process.env.TWILIO_FROM);
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(sid + ':' + process.env.TWILIO_AUTH_TOKEN).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  return r.ok;
}

function wrap(title, bodyHtml) {
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111"><div style="font-weight:800;font-size:18px;margin-bottom:16px">Sophic <span style="color:#666;font-weight:500">Rentals</span></div><h2 style="font-size:20px;margin:0 0 12px">${title}</h2>${bodyHtml}<p style="color:#777;font-size:12px;margin-top:28px">Sophic Rentals LLC · 393 N Cypress St, Orange, CA 92866 · Reply to this email or text us with questions.</p></div>`;
}
function btn(href, label) { return `<p style="margin:20px 0"><a href="${href}" style="background:#0B8F6C;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px;display:inline-block">${label}</a></p>`; }

// Templates ------------------------------------------------------------
export const T = {
  leadSaved(app) {
    const driver = app.application_type === 'driver';
    const pay = `${SITE}/api/checkout?ref=${app.reference_number}`;
    const subject = driver ? 'Your Sophic fleet-driver application (ref ' + app.reference_number + ')' : 'Your Sophic Tesla application (ref ' + app.reference_number + ')';
    const html = wrap(`Thanks, ${app.first_name} — we've got your info`, `
      <p>We'll text you within one business day about ${driver ? 'the fleet driver program' : 'what\'s available this week'}. Your reference is <b>${app.reference_number}</b>.</p>
      <p>Want to lock it in now? Reserve ${driver ? 'your spot' : 'a car'} with the one-time $${FEE} application fee (non-refundable — it covers verification), then upload your license and we'll verify you within 24–48 hours.</p>
      ${btn(pay, 'Reserve now — $' + FEE)}
      <p style="color:#555;font-size:14px">${driver ? 'Insurance and maintenance are included in the driver program.' : 'Reminder: you\'ll need your own auto policy with a rideshare (TNC) endorsement before pickup. Not there yet? Reply and we\'ll tell you what to ask your carrier for.'}</p>`);
    const sms = `Sophic Rentals: thanks ${app.first_name}! We got your info (ref ${app.reference_number}) and will text you within 1 business day. Reserve now for $${FEE}: ${pay}  Reply STOP to opt out.`;
    return { subject, html, sms };
  },
  finishPayment(app) {
    const pay = `${SITE}/api/checkout?ref=${app.reference_number}`;
    const subject = 'Finish your Sophic application — one step left';
    const html = wrap('One step left', `<p>Hi ${app.first_name}, your application (ref <b>${app.reference_number}</b>) is saved but not reserved yet. The $${FEE} application fee starts verification and holds a car for you.</p>${btn(pay, 'Finish — $' + FEE)}<p style="color:#555;font-size:14px">Not ready? Just reply to this email with any questions — a real person answers.</p>`);
    const sms = `Sophic Rentals: hi ${app.first_name}, your application (${app.reference_number}) is saved but not reserved. Finish here ($${FEE}): ${pay}  Questions? Just reply. STOP to opt out.`;
    return { subject, html, sms };
  },
  uploadDocs(app) {
    const link = `${SITE}/thanks?ref=${app.reference_number}`;
    const subject = 'Payment received — upload your license to get verified';
    const html = wrap('Payment received — last step', `<p>Thanks ${app.first_name}! To verify you we need photos of your driver's license, front and back. Takes 30 seconds on your phone.</p>${btn(link, 'Upload license photos')}<p style="color:#555;font-size:14px">Reference ${app.reference_number}. We verify within 24–48 hours, then text you to confirm your car and pickup time.</p>`);
    const sms = `Sophic Rentals: payment received (${app.reference_number}). Last step — upload license photos here: ${link}  We verify in 24–48h.`;
    return { subject, html, sms };
  },
  docsReminder(app) {
    const link = `${SITE}/thanks?ref=${app.reference_number}`;
    const subject = 'Still need your license photos — 30 seconds';
    const html = wrap('We can\'t verify you yet', `<p>Hi ${app.first_name}, we have your payment but not your license photos, so verification hasn't started.</p>${btn(link, 'Upload license photos')}<p style="color:#555;font-size:14px">Or reply to this email with the photos attached.</p>`);
    const sms = `Sophic Rentals: we still need your license photos to verify you (${app.reference_number}). Upload: ${link} — or reply to this text with the photos.`;
    return { subject, html, sms };
  }
};

export async function notifyApplicant(app, tpl) {
  const m = T[tpl](app);
  const [e, s] = await Promise.all([sendEmail(app.email, m.subject, m.html, m.sms).catch(() => false), sendSMS(app.phone, m.sms).catch(() => false)]);
  return { email: e, sms: s };
}

export async function notifyAdmin(subject, lines) {
  const to = process.env.NOTIFY_ADMIN_EMAIL; if (!to) return false;
  return sendEmail(to, subject, wrap(subject, '<pre style="font:13px/1.5 Menlo,monospace;white-space:pre-wrap">' + lines.join('\n') + '</pre>'), lines.join('\n')).catch(() => false);
}
