# Sophic Rentals website — operator guide

*Rebuilt 2026-09-10 (v2). Live at https://sophicrentals.com (Vercel project `sophic-rentals`, Cloudflare in front).*

## How the site is built
- Pages are generated: edit `_build/pages/*.body.html` (content) or `_build/build.py` (header/footer/modal), then run `python3 _build/build.py` from this folder. It writes `index.html`, `drive.html`, `thanks.html`, `privacy.html`, `terms.html`, the five `tesla-rental-<city>.html` pages, `tesla-vs-gas-for-uber.html`, `404.html`, `sitemap.xml`, `robots.txt`.
- Shared styling/behaviour: `assets/site.css`, `assets/site.js`. Site settings (phone number, analytics IDs) are at the top of `site.js`.
- Local preview: `MOCK=1 node _build/devserver.mjs` → http://localhost:8787 (mock API). Without `MOCK=1` it runs the real API handlers using env vars from your shell.
- Deploy: push to `main` of github.com/shayleg-a11y/sophic-rentals-site (auto-deploys) or `vercel deploy --prod` from this folder.

## The funnel (v2.1 — one step, pay first)
1. **Apply now — $9.99**: inline form on the home page hero (and a modal everywhere else): name, phone, email, platform, preferred car, insurance, license → `POST /api/apply {stage:"lead"}` → immediately `POST /api/checkout` → Stripe Checkout Session (`success_url=/thanks?ref=REF`). Admin gets an email alert if `NOTIFY_ADMIN_EMAIL` is set.
2. Stripe webhook `checkout.session.completed` → `payment_status=paid, status=paid` → sends the license-upload link.
3. `/thanks?ref=REF` → license photos (signed upload → `finalize`) + DOB/address (`stage:"reserve"`).
4. Daily cron `/api/followup` (9am PT): nudges unpaid applications (max 2, ≥20h apart, within 72h) and paid-without-docs (once).

Fee: **$9.99, non-refundable**. Insurance: **driver's own full-coverage policy (comprehensive + collision)** for rentals; **Sophic's commercial policy** for fleet drivers. Charging: ~$20 per 500 miles, auto-billed via Tesla Fleet. Maintenance on Sophic except wear items (tires, brake pads, wipers). Pickup: near LAX, near SNA, or next to Chapman University (assigned by car location). Fleet count on site: 53 (static; the `vehicles` table only holds 12 cars, so the fleet stat is not pulled live — availability badges are).

## Vercel environment variables
| Var | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY` | yes (exists) | Supabase project tjnwxntvbyfjektubwso |
| `ADMIN_PASSWORD` | yes (exists) | /admin |
| `STRIPE_WEBHOOK_SECRET` | yes (exists) | webhook endpoint https://sophicrentals.com/api/stripe-webhook |
| `STRIPE_SECRET_KEY` | **add** | enables Checkout Sessions (reference survives across devices/browsers). Without it the site falls back to the old Payment Links — set the Payment Link's after-payment redirect to `https://sophicrentals.com/thanks` in that case. |
| `STRIPE_PRICE_APPLICATION` | optional | defaults to the live $9.99 price `price_1TjRCbBa78mPz5InXoqZEuxq` |
| `CRON_SECRET` | **add** | any long random string; Vercel sends it to /api/followup |
| `RESEND_API_KEY`, `NOTIFY_FROM_EMAIL` | add for email | e.g. `Sophic Rentals <hello@sophicrentals.com>` (verify the domain in Resend) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` or `TWILIO_MESSAGING_SERVICE_SID` | add for SMS | A2P 10DLC registration required before US SMS sends |
| `NOTIFY_ADMIN_EMAIL` | optional | you get an email on every new lead |
| `IP_HASH_SALT` | optional | salt for the hashed-IP rate limit |
| `SITE_URL` | optional | defaults to https://sophicrentals.com |

## Settings in `assets/site.js`
- `phone` — once you have a business number (E.164, e.g. `+17145550123`), set it and every "Text us" button becomes a real SMS link; until then they fall back to email.
- `ga4` — GA4 measurement ID. `metaPixel` — Meta pixel ID. Vercel Analytics turns on from the Vercel dashboard (Analytics tab) with no code change.

## Events tracked (GA4 / Meta / Vercel)
`apply_open`, `apply_lead`, `apply_reserve`, `stripe_redirect`, `apply_skip_payment`, `payment_complete`, `docs_uploaded`, `contact_click`, `calc_change`, `faq_open`.

## Still on Sean
- Add `STRIPE_SECRET_KEY` + `CRON_SECRET` in Vercel; add Resend + Twilio when ready.
- Buy a business number (OpenPhone/Twilio) and put it in `site.js`.
- Create the Google Business Profile for 393 N Cypress St and link it once reviews exist.
- Cloudflare DNS: add a `www` record (CNAME → `cname.vercel-dns.com`) so www.sophicrentals.com resolves; the site redirects it to the apex.
- Google Search Console: add sophicrentals.com, submit `/sitemap.xml`.
