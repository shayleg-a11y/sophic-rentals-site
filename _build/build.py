#!/usr/bin/env python3
"""Sophic Rentals static site builder.
Run:  python3 _build/build.py   (from the website/ folder)
Reads page bodies from _build/pages/*.html and writes finished pages to website/.
"""
import os, re, json, datetime, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = pathlib.Path(__file__).resolve().parent / 'pages'
DOMAIN = 'https://sophicrentals.com'
TODAY = datetime.date.today().isoformat()
FEE = '9.99'

ICONS = {
 'bolt': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
 'calendar': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
 'shield': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>',
 'wrench': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
 'check': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>',
 'rocket': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
 'chat': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
 'phone': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
 'car': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14M3 11l1.5-5A2 2 0 0 1 6.4 4.5h11.2a2 2 0 0 1 1.9 1.5L21 11v6a1 1 0 0 1-1 1h-1a2 2 0 0 1-4 0H9a2 2 0 0 1-4 0H4a1 1 0 0 1-1-1z"/><circle cx="7" cy="17" r="1"/><circle cx="17" cy="17" r="1"/><path d="M3 11h18"/></svg>',
 'cash': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg>',
 'chev': '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
}
def ico(name, cls='ico'):
    return f'<span class="{cls}" aria-hidden="true">{ICONS[name]}</span>'

FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%2322E3A9'/%3E%3Ctext x='50%25' y='52' font-family='Arial,sans-serif' font-size='44' font-weight='900' text-anchor='middle' fill='%23062018'%3ES%3C/text%3E%3C/svg%3E"

def head(p):
    url = DOMAIN + p['path']
    og_img = DOMAIN + '/images/og-card.jpg'
    robots = '<meta name="robots" content="noindex,nofollow" />' if p.get('noindex') else ''
    ld = ''.join(f'<script type="application/ld+json">{json.dumps(x, separators=(",",":"))}</script>\n' for x in p.get('ld', []))
    preload = '<link rel="preload" as="image" href="/images/hero.webp" type="image/webp" />' if p.get('hero') else ''
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<title>{p['title']}</title>
<meta name="description" content="{p['desc']}" />
<link rel="canonical" href="{url}" />
{robots}
<meta property="og:title" content="{p.get('og_title', p['title'])}" />
<meta property="og:description" content="{p['desc']}" />
<meta property="og:type" content="website" />
<meta property="og:locale" content="en_US" />
<meta property="og:site_name" content="Sophic Rentals" />
<meta property="og:url" content="{url}" />
<meta property="og:image" content="{og_img}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{p.get('og_title', p['title'])}" />
<meta name="twitter:description" content="{p['desc']}" />
<meta name="twitter:image" content="{og_img}" />
<meta name="theme-color" content="#0A0C0F" />
<link rel="icon" href="{FAVICON}" />
{preload}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css?v={p['v']}">
{ld}</head>
<body data-app-type="{p.get('app_type','rental')}">
<a href="#main" class="skip">Skip to content</a>
'''

def header(active=''):
    def a(href, label, key):
        cur = ' aria-current="page"' if key == active else ''
        return f'<a href="{href}"{cur}>{label}</a>'
    return f'''<header class="site" id="hdr">
  <div class="wrap">
    <nav class="main" aria-label="Main">
      <a class="logo" href="/"><span class="mark" aria-hidden="true">S</span>Sophic&nbsp;<span class="lt">Rentals</span></a>
      <div class="nav-links">
        {a('/#fleet','Fleet','fleet')}
        {a('/#cost','Pricing','cost')}
        {a('/#locations','Locations','locations')}
        {a('/#how','How it works','how')}
        {a('/#faq','FAQ','faq')}
        {a('/drive','Drive for us','drive')}
      </div>
      <div class="nav-cta">
        <a class="btn btn-ghost btn-sm" data-contact="sms" data-label-email="Email us">{ico('chat')} Text us</a>
        <button class="btn btn-primary btn-sm" data-apply><span class="long">Apply now — $9.99</span><span class="short">Apply</span></button>
        <button class="menu-btn" id="menuBtn" aria-label="Open menu" aria-expanded="false" aria-controls="mobileMenu"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
      </div>
    </nav>
  </div>
  <div class="mobile-menu" id="mobileMenu">
    <a href="/#fleet">Fleet</a><a href="/#cost">Pricing &amp; what you keep</a><a href="/#locations">Pickup locations</a><a href="/#how">How it works</a><a href="/#faq">FAQ</a><a href="/drive">Drive for us</a><a data-contact="sms" data-label-email="Email us" href="#">Text us</a>
  </div>
</header>
<main id="main">
'''

def footer():
    return f'''</main>
<footer class="site">
  <div class="wrap">
    <div class="foot">
      <div>
        <a class="logo" href="/"><span class="mark" aria-hidden="true">S</span>Sophic&nbsp;<span class="lt">Rentals</span></a>
        <p>Long-term Tesla rentals for Uber, Lyft and DoorDash drivers across Los Angeles &amp; Orange County. Sophic Rentals, a California LLC.</p>
        <p class="small" style="margin-top:8px">Pickup near LAX, near John Wayne Airport (SNA), or next to Chapman University in Orange.</p>
      </div>
      <div><h4>Rent</h4><a href="/#fleet">Available Teslas</a><a href="/#cost">Pricing &amp; what you keep</a><a href="/#how">How it works</a><a href="/#faq">FAQ</a><a href="/tesla-vs-gas-for-uber">Tesla vs. gas: the weekly math</a></div>
      <div><h4>Locations</h4><a href="/tesla-rental-anaheim">Anaheim</a><a href="/tesla-rental-santa-ana">Santa Ana</a><a href="/tesla-rental-irvine">Irvine</a><a href="/tesla-rental-long-beach">Long Beach</a><a href="/tesla-rental-los-angeles">Los Angeles</a></div>
      <div><h4>Contact</h4><a data-contact="phone-text" href="#"></a><a data-contact="sms" data-label-email="Email us" href="#">Text us</a><a href="mailto:Sophicrentals@gmail.com">Sophicrentals@gmail.com</a><a href="/#locations">Pickup locations</a><a href="/drive">Drive on our Uber fleet</a></div>
    </div>
    <div class="copy"><span>© <span id="yr"></span> Sophic Rentals LLC. All rights reserved.</span><span><a href="/privacy" style="display:inline;padding:0">Privacy</a> · <a href="/terms" style="display:inline;padding:0">Terms</a> · <a href="/terms#fee" style="display:inline;padding:0">Application fee policy</a></span></div>
  </div>
</footer>
<div class="mbar"><a class="btn btn-ghost" data-contact="sms" data-label-email="Email us">{ico('chat')} Text us</a><button class="btn btn-primary" data-apply>Apply now — $9.99</button></div>
<div id="toast" class="toast" role="status" aria-live="polite"></div>
'''

def apply_fields(prefix, driver):
    """Shared application fields (used by the modal and the inline hero form)."""
    f = lambda k: f'{prefix}{k}'
    plat = f'<div class="field"><label for="{f("platform")}">Which platform?</label><select id="{f("platform")}" name="platform"><option>Uber</option><option>Lyft</option><option>Uber + Lyft</option><option>DoorDash</option><option>Multiple</option><option>Other / not yet</option></select></div>'
    if driver:
        second = f'<div class="field"><label for="{f("hours")}">Hours you want to drive</label><select id="{f("hours")}" name="weekly_hours"><option>Under 20 / week</option><option>20–35 / week</option><option>35–50 / week</option><option>50+ / week</option></select></div>'
        third = f'<div class="row2"><div class="field"><label for="{f("exp")}">Rideshare experience</label><select id="{f("exp")}" name="rideshare_experience"><option>None yet</option><option>Under 1 year</option><option>1–3 years</option><option>3+ years</option></select></div><div class="field"><label for="{f("license")}">Valid California license?</label><select id="{f("license")}" name="has_license"><option>Yes</option><option>Out-of-state license</option><option>No</option></select></div></div>'
    else:
        second = f'<div class="field"><label for="{f("car")}">Preferred car</label><select id="{f("car")}" name="car" data-car-select><option value="">First available</option></select></div>'
        third = f'<div class="row2"><div class="field"><label for="{f("insurance")}">Auto insurance</label><select id="{f("insurance")}" name="insurance_status"><option>Full coverage</option><option>Liability only</option><option>Not yet</option></select></div><div class="field"><label for="{f("license")}">Valid license?</label><select id="{f("license")}" name="has_license"><option>Yes — California</option><option>Yes — another state</option><option>No</option></select></div></div>'
    return f'''
        <div class="row2">
          <div class="field"><label for="{f("first")}">First name</label><input id="{f("first")}" required name="first_name" autocomplete="given-name" /></div>
          <div class="field"><label for="{f("last")}">Last name</label><input id="{f("last")}" required name="last_name" autocomplete="family-name" /></div>
        </div>
        <div class="row2">
          <div class="field"><label for="{f("phone")}">Mobile number</label><input id="{f("phone")}" required name="phone" type="tel" inputmode="tel" placeholder="(714) 555-0123" autocomplete="tel" data-phone /></div>
          <div class="field"><label for="{f("email")}">Email</label><input id="{f("email")}" required name="email" type="email" placeholder="you@email.com" autocomplete="email" /></div>
        </div>
        <div class="row2">{plat}{second}</div>
        {third}
        <div class="hp" aria-hidden="true"><label for="{f("website")}">Website</label><input id="{f("website")}" name="website" tabindex="-1" autocomplete="off" /></div>
        <div class="fee-box"><span>Application fee<small>One time · non-refundable · covers verification</small></span><b class="accent">${FEE}</b></div>
        <div class="fstatus" id="{f("status")}" role="status" aria-live="polite"></div>
        <button class="btn btn-primary" type="submit" id="{f("submit")}">{'Apply to drive' if driver else 'Apply now'} — pay ${FEE} →</button>
        <p class="fineprint">Secure payment by Stripe. Next you'll upload photos of your license — have it handy. You must be 21+. By applying you agree to be contacted by text and email. <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></p>'''

def modal(app_type='rental'):
    driver = app_type == 'driver'
    return f'''<div class="overlay" id="overlay">
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="applyHeading">
    <div id="formWrap">
      <div class="mhead">
        <div><h3 id="applyHeading">{'Apply to drive' if driver else 'Apply to rent a Tesla'}</h3><p id="carPick">Two minutes. Verified within 24–48 hours.</p></div>
        <button class="mclose" aria-label="Close" data-close>×</button>
      </div>
      <form id="applyForm" data-apply-form novalidate>{apply_fields('f-', driver)}</form>
    </div>
    <div class="success" id="success">
      <div class="check" aria-hidden="true">✓</div>
      <h3>Got it — we'll be in touch</h3>
      <p id="successText"></p>
      <button class="btn btn-ghost" style="margin-top:22px" data-close>Done</button>
    </div>
  </div>
</div>
'''

def scripts(v):
    return f'<script src="/assets/site.js?v={v}" defer></script>\n</body>\n</html>\n'

def build_page(p, v):
    p = dict(p, v=v)
    body = (PAGES / p['src']).read_text() if p.get('src') else p['body']
    body = body.replace('{{APPLY_FIELDS}}', apply_fields('h-', p.get('app_type')=='driver')).replace('{{FEE}}', FEE).replace('{{TODAY}}', TODAY)
    body = re.sub(r'\{\{ico:(\w+)\}\}', lambda m: ico(m.group(1)), body)
    body = re.sub(r'\{\{icon:(\w+)\}\}', lambda m: ICONS[m.group(1)], body)
    html = head(p) + header(p.get('active','')) + body + footer() + (modal(p.get('app_type','rental')) if p.get('modal', True) else '') + scripts(v)
    out = ROOT / (p['path'].strip('/') or 'index')
    out = out.with_suffix('.html') if not str(out).endswith('.html') else out
    out.write_text(html)
    return out

if __name__ == '__main__':
    import sys
    sys.path.insert(0, str(PAGES))
    from pages import PAGES as PAGE_LIST
    v = datetime.datetime.now().strftime('%Y%m%d%H%M')
    urls = []
    for p in PAGE_LIST:
        out = build_page(p, v)
        print('wrote', out.relative_to(ROOT))
        if not p.get('noindex'):
            urls.append((p['path'], p.get('priority', '0.7'), p.get('changefreq', 'monthly')))
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path, pr, cf in urls:
        sm.append(f'  <url><loc>{DOMAIN}{path}</loc><lastmod>{TODAY}</lastmod><changefreq>{cf}</changefreq><priority>{pr}</priority></url>')
    sm.append('</urlset>')
    (ROOT / 'sitemap.xml').write_text('\n'.join(sm) + '\n')
    (ROOT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /ops\nDisallow: /thanks\nDisallow: /api/\n\nSitemap: {DOMAIN}/sitemap.xml\n')
    print('sitemap:', len(urls), 'urls')
