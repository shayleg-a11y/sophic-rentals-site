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
# ---- Business contact (single source of truth; site.js reads data-* set from these) ----
PHONE = '+18406997077'  # Google Voice business line (texts forward to Gmail; ops bot replies)
PHONE_DISPLAY = '(840) 699-7077'
EMAIL = 'Sophicrentals@gmail.com'
HOURS = 'Texts answered 8am–9pm, 7 days'
ORANGE_ADDR = '393 N Cypress St, Orange, CA 92866'
SMS_BODY = "Hi Sophic, I'm interested in renting a Tesla for rideshare. Is a car available this week?"
def sms_href():
    from urllib.parse import quote
    return f'sms:{PHONE}?&body={quote(SMS_BODY)}' if PHONE else f'mailto:{EMAIL}?subject={quote("Tesla rental availability")}'
def text_label():
    return 'Text us' if PHONE else 'Email us'

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
LOGO_MARK = '<span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg></span>'
def ico(name, cls='ico'):
    return f'<span class="{cls}" aria-hidden="true">{ICONS[name]}</span>'

FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%2322E3A9'/%3E%3Ctext x='50%25' y='52' font-family='Arial,sans-serif' font-size='44' font-weight='900' text-anchor='middle' fill='%23062018'%3ES%3C/text%3E%3C/svg%3E"

def hreflang(p):
    alt = p.get('alt')
    if not alt: return ''
    en, es = (p['path'], alt) if p.get('lang','en') == 'en' else (alt, p['path'])
    return f'<link rel="alternate" hreflang="en" href="{DOMAIN}{en}" />\n<link rel="alternate" hreflang="es" href="{DOMAIN}{es}" />\n<link rel="alternate" hreflang="x-default" href="{DOMAIN}{en}" />'

def head(p):
    url = DOMAIN + p['path']
    og_img = DOMAIN + '/images/og-card.jpg'
    robots = '<meta name="robots" content="noindex,nofollow" />' if p.get('noindex') else ''
    ld = ''.join(f'<script type="application/ld+json">{json.dumps(x, separators=(",",":"))}</script>\n' for x in p.get('ld', []))
    preload = '<link rel="preload" as="image" href="/images/hero.webp" type="image/webp" />' if p.get('hero') else ''
    return f'''<!DOCTYPE html>
<html lang="{p.get('lang','en')}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<title>{p['title']}</title>
<meta name="description" content="{p['desc']}" />
<link rel="canonical" href="{url}" />
{hreflang(p)}
{robots}
<meta property="og:title" content="{p.get('og_title', p['title'])}" />
<meta property="og:description" content="{p['desc']}" />
<meta property="og:type" content="website" />
<meta property="og:locale" content="{'es_US' if p.get('lang')=='es' else 'en_US'}" />
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

def header(active='', alt='/es'):
    def a(href, label, key):
        cur = ' aria-current="page"' if key == active else ''
        return f'<a href="{href}"{cur}>{label}</a>'
    return f'''<header class="site" id="hdr">
  <div class="wrap">
    <nav class="main" aria-label="Main">
      <a class="logo" href="/" aria-label="Sophic Rentals home">{LOGO_MARK}Sophic&nbsp;<span class="lt">Rentals</span></a>
      <div class="nav-links">
        {a('/rent-to-own','Rent to own','rto')}
        {a('/#fleet','Fleet','fleet')}
        {a('/#cost','Pricing','cost')}
        {a('/#locations','Locations','locations')}
        {a('/#how','How it works','how')}
        {a('/insurance','Insurance','insurance')}
        {a('/#faq','FAQ','faq')}
        <a href="{alt}" hreflang="es" lang="es" class="lang-toggle" data-lang-toggle>Español</a>
      </div>
      <div class="nav-cta">
        <a class="btn btn-ghost btn-sm" data-contact="sms" href="{sms_href()}">{ico('chat')} {text_label()}</a>
        <button class="btn btn-primary btn-sm" data-apply><span class="long">Check availability</span><span class="short">Apply</span></button>
        <button class="menu-btn" id="menuBtn" aria-label="Open menu" aria-expanded="false" aria-controls="mobileMenu"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
      </div>
    </nav>
  </div>
  <div class="mobile-menu" id="mobileMenu">
    <a href="/rent-to-own">Rent to own</a><a href="/#fleet">Fleet</a><a href="/#cost">Pricing &amp; what you keep</a><a href="/#locations">Pickup locations</a><a href="/#how">How it works</a><a href="/#faq">FAQ</a><a href="/insurance">Insurance help</a><a href="{alt}" hreflang="es" lang="es" data-lang-toggle>Español</a><a data-contact="sms" href="{sms_href()}">{text_label()}{(' ' + PHONE_DISPLAY) if PHONE_DISPLAY else ''}</a>
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
        <a class="logo" href="/" aria-label="Sophic Rentals home">{LOGO_MARK}Sophic&nbsp;<span class="lt">Rentals</span></a>
        <p>Long-term Tesla rentals for Uber, Lyft and delivery drivers across Los Angeles &amp; Orange County. Sophic Rentals, a California LLC, based in Orange County.</p>
        <p class="small" style="margin-top:8px">Main office: {ORANGE_ADDR} (next to Chapman University). Also near LAX and near John Wayne Airport (SNA) — exact address texted with your pickup time. {HOURS}.</p>
      </div>
      <div><h4>Drive</h4><a href="/rent-to-own">Rent to own — keep the car</a><a href="/#fleet">Available Teslas</a><a href="/#cost">Pricing &amp; what you keep</a><a href="/#how">How it works</a><a href="/insurance">Get insured in 24 hours</a><a href="/policies">Deposit &amp; policies</a><a href="/#faq">FAQ</a><a href="/tesla-vs-gas-for-uber">Tesla vs. gas: the weekly math</a></div>
      <div><h4>Areas we serve</h4><a href="/tesla-rental-anaheim">Anaheim</a><a href="/tesla-rental-santa-ana">Santa Ana</a><a href="/tesla-rental-irvine">Irvine</a><a href="/tesla-rental-long-beach">Long Beach</a><a href="/tesla-rental-los-angeles">Los Angeles</a></div>
      <div><h4>Contact</h4>{f'<a data-contact="tel" href="tel:{PHONE}">{PHONE_DISPLAY or PHONE}</a>' if PHONE else ''}<a data-contact="sms" href="{sms_href()}">{text_label()}</a><a href="mailto:{EMAIL}">{EMAIL}</a><span class="small muted" style="display:block;padding:6px 0">{HOURS}</span><a href="/#locations">Pickup locations</a></div>
    </div>
    <div class="copy"><span>© <span id="yr"></span> Sophic Rentals LLC. All rights reserved.</span><span><a href="/privacy" style="display:inline;padding:0">Privacy</a> · <a href="/terms" style="display:inline;padding:0">Terms</a> · <a href="/policies" style="display:inline;padding:0">Deposit &amp; fee policy</a></span></div>
  </div>
</footer>
<div class="mbar"><a class="btn btn-ghost" data-contact="sms" href="{sms_href()}">{ico('chat')} {text_label()}</a><button class="btn btn-primary" data-apply>Apply now</button></div>
<div id="toast" class="toast" role="status" aria-live="polite"></div>
'''

def apply_fields(prefix, driver):
    """Two-step application. Step 1 = free lead (name, phone, platform, car/hours). Step 2 = details + $9.99."""
    f = lambda k: f'{prefix}{k}'
    plat = f'<div class="field"><label for="{f("platform")}">Which apps?</label><select id="{f("platform")}" name="platform"><option>Uber</option><option>Lyft</option><option>Uber + Lyft</option><option>Delivery (DoorDash, Uber Eats, Instacart)</option><option>Rideshare + delivery</option><option>Not driving yet</option></select></div>'
    if driver:
        pick = f'<div class="field"><label for="{f("hours")}">Hours you want to drive</label><select id="{f("hours")}" name="weekly_hours"><option>Under 20 / week</option><option>20–35 / week</option><option>35–50 / week</option><option>50+ / week</option></select></div>'
        s2 = f'<div class="row2"><div class="field"><label for="{f("exp")}">Rideshare experience</label><select id="{f("exp")}" name="rideshare_experience"><option>None yet</option><option>Under 1 year</option><option>1–3 years</option><option>3+ years</option></select></div><div class="field"><label for="{f("license")}">Valid California license?</label><select id="{f("license")}" name="has_license"><option>Yes</option><option>Out-of-state license</option><option>No</option></select></div></div>'
        fee_line = f'<span>Verification fee<small>One time · covers license &amp; driving-record check</small></span><b class="accent">${FEE}</b>'
        upfront = ''
        planf = ''
    else:
        planf = f'<div class="field"><label for="{f("plan")}">How do you want to drive?</label><select id="{f("plan")}" name="plan" data-plan-select><option value="rent-to-own">Rent to own — the car is yours in 12 months</option><option value="rental">Weekly rental — no down payment</option></select></div>'
        pick = f'<div class="field"><label for="{f("car")}">Car you want</label><select id="{f("car")}" name="car" data-car-select><option value="">First available</option></select></div>'
        s2 = f'<div class="row2"><div class="field"><label for="{f("insurance")}">Your auto insurance today</label><select id="{f("insurance")}" name="insurance_status"><option>Full coverage + rideshare endorsement</option><option>Full coverage, no rideshare add-on yet</option><option>Liability only (I\'ll upgrade)</option><option>No insurance yet — help me</option></select></div><div class="field"><label for="{f("license")}">Valid license?</label><select id="{f("license")}" name="has_license"><option>Yes — California</option><option>Yes — another state</option><option>No</option></select></div></div><p class="fineprint" style="margin-top:-4px">Not fully covered yet? Apply anyway — <a href="/insurance">here&rsquo;s how drivers get insured in 24 hours</a>.</p>'
        fee_line = f'<span>Verification fee<small>Credited to your first week\'s rent</small></span><b class="accent">${FEE}</b>'
        upfront = '<p class="fineprint upfront"><b>Due at pickup (Model 3):</b> rent to own = $2,000 down + first week ($500). Weekly rental = first week ($500) + a refundable deposit equal to your insurance deductible. Your $9.99 is credited either way. No credit check.</p>'
    return f'''
        <div class="fstep" data-step="1">
          <div class="row2">
            <div class="field"><label for="{f("first")}">First name</label><input id="{f("first")}" required name="first_name" autocomplete="given-name" /></div>
            <div class="field"><label for="{f("last")}">Last name</label><input id="{f("last")}" required name="last_name" autocomplete="family-name" /></div>
          </div>
          {planf}
          <div class="field"><label for="{f("phone")}">Mobile number</label><input id="{f("phone")}" required name="phone" type="tel" inputmode="tel" placeholder="(714) 555-0123" autocomplete="tel" data-phone /></div>
          <div class="row2">{plat}{pick}</div>
          <div class="hp" aria-hidden="true"><label for="{f("website")}">Website</label><input id="{f("website")}" name="website" tabindex="-1" autocomplete="off" /></div>
          <div class="fstatus" role="status" aria-live="polite"></div>
          <button class="btn btn-primary" type="submit" data-step-btn="1">{'Check my spot' if driver else 'Check availability'} →</button>
          <p class="fineprint">No credit check. We text you back within minutes (8am–9pm). 21+. By continuing you agree to texts and email about your application; reply STOP to opt out. <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></p>
        </div>
        <div class="fstep" data-step="2" hidden>
          <p class="step2-head"><b>✓ You're on the list.</b> Finish now to get verified and hold {'your spot' if driver else 'a car'}:</p>
          <div class="field"><label for="{f("email")}">Email</label><input id="{f("email")}" name="email" type="email" placeholder="you@email.com" autocomplete="email" data-req2 /></div>
          {s2}
          <div class="fee-box">{fee_line}</div>
          {upfront}
          <div class="fstatus" role="status" aria-live="polite"></div>
          <button class="btn btn-primary" type="submit" data-step-btn="2">Verify me — pay ${FEE} securely →</button>
          <p class="fineprint">Paid by Stripe. Next you'll snap photos of your license. Not ready? You can close this — we already have your number and will text you.</p>
        </div>'''

def modal(app_type='rental'):
    driver = app_type == 'driver'
    return f'''<div class="overlay" id="overlay">
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="applyHeading">
    <div id="formWrap">
      <div class="mhead">
        <div><h3 id="applyHeading">{'Apply to drive' if driver else 'Check Tesla availability'}</h3><p id="carPick">Takes 30 seconds · no credit check</p></div>
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

ES_SMS = "Hola Sophic, me interesa la renta con opción a compra de un Tesla para rideshare. ¿Tienen carro disponible esta semana?"
def sms_href_es():
    from urllib.parse import quote
    return f'sms:{PHONE}?&body={quote(ES_SMS)}' if PHONE else f'mailto:{EMAIL}'
def text_label_es():
    return 'Escríbenos' if PHONE else 'Mándanos un email'
HOURS_ES = 'Respondemos mensajes de 8am a 9pm, los 7 días'

def header_es(active='', alt='/'):
    def a(href, label, key):
        cur = ' aria-current="page"' if key == active else ''
        return f'<a href="{href}"{cur}>{label}</a>'
    return f'''<header class="site" id="hdr">
  <div class="wrap">
    <nav class="main" aria-label="Principal">
      <a class="logo" href="/es" aria-label="Sophic Rentals inicio">{LOGO_MARK}Sophic&nbsp;<span class="lt">Rentals</span></a>
      <div class="nav-links">
        {a('/es/rent-to-own','Renta para ser dueño','rto')}
        {a('/es#fleet','Carros','fleet')}
        {a('/es#cost','Precios','cost')}
        {a('/es#locations','Ubicaciones','locations')}
        {a('/es#how','Cómo funciona','how')}
        {a('/es#faq','Preguntas','faq')}
        <a href="{alt}" hreflang="en" lang="en" class="lang-toggle" data-lang-toggle>English</a>
      </div>
      <div class="nav-cta">
        <a class="btn btn-ghost btn-sm" data-contact="sms" href="{sms_href_es()}">{ico('chat')} {text_label_es()}</a>
        <button class="btn btn-primary btn-sm" data-apply><span class="long">Ver disponibilidad</span><span class="short">Aplicar</span></button>
        <button class="menu-btn" id="menuBtn" aria-label="Abrir menú" aria-expanded="false" aria-controls="mobileMenu"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
      </div>
    </nav>
  </div>
  <div class="mobile-menu" id="mobileMenu">
    <a href="/es/rent-to-own">Renta para ser dueño</a><a href="/es#fleet">Carros</a><a href="/es#cost">Precios</a><a href="/es#locations">Ubicaciones</a><a href="/es#how">Cómo funciona</a><a href="/es#faq">Preguntas</a><a href="/insurance">Ayuda con el seguro (inglés)</a><a href="{alt}" hreflang="en" lang="en" data-lang-toggle>English</a><a data-contact="sms" href="{sms_href_es()}">{text_label_es()}{(' ' + PHONE_DISPLAY) if PHONE_DISPLAY else ''}</a>
  </div>
</header>
<main id="main">
'''

def footer_es():
    return f'''</main>
<footer class="site">
  <div class="wrap">
    <div class="foot">
      <div>
        <a class="logo" href="/es" aria-label="Sophic Rentals inicio">{LOGO_MARK}Sophic&nbsp;<span class="lt">Rentals</span></a>
        <p>Teslas en renta con opción a compra y renta semanal para choferes de Uber, Lyft y delivery en Los Ángeles y Orange County. Sophic Rentals, una LLC de California con base en Orange County.</p>
        <p class="small" style="margin-top:8px">Oficina principal: {ORANGE_ADDR} (junto a Chapman University). También cerca de LAX y del aeropuerto John Wayne (SNA) — te mandamos la dirección exacta con tu hora de entrega. {HOURS_ES}.</p>
      </div>
      <div><h4>Manejar</h4><a href="/es/rent-to-own">Renta para ser dueño</a><a href="/es#fleet">Teslas disponibles</a><a href="/es#cost">Precios</a><a href="/es#how">Cómo funciona</a><a href="/es#faq">Preguntas</a></div>
      <div><h4>Más info (en inglés)</h4><a href="/insurance">Cómo conseguir seguro</a><a href="/policies">Políticas y depósito</a><a href="/terms">Términos</a><a href="/privacy">Privacidad</a></div>
      <div><h4>Contacto</h4>{f'<a data-contact="tel" href="tel:{PHONE}">{PHONE_DISPLAY or PHONE}</a>' if PHONE else ''}<a data-contact="sms" href="{sms_href_es()}">{text_label_es()}</a><a href="mailto:{EMAIL}">{EMAIL}</a><span class="small muted" style="display:block;padding:6px 0">{HOURS_ES}</span></div>
    </div>
    <div class="copy"><span>© <span id="yr"></span> Sophic Rentals LLC. Todos los derechos reservados.</span><span><a href="/" style="display:inline;padding:0" hreflang="en" lang="en">English</a></span></div>
  </div>
</footer>
<div class="mbar"><a class="btn btn-ghost" data-contact="sms" href="{sms_href_es()}">{ico('chat')} {text_label_es()}</a><button class="btn btn-primary" data-apply>Aplicar</button></div>
<div id="toast" class="toast" role="status" aria-live="polite"></div>
'''

def apply_fields_es(prefix):
    f = lambda k: f'{prefix}{k}'
    return f'''
        <div class="fstep" data-step="1">
          <div class="row2">
            <div class="field"><label for="{f("first")}">Nombre</label><input id="{f("first")}" required name="first_name" autocomplete="given-name" /></div>
            <div class="field"><label for="{f("last")}">Apellido</label><input id="{f("last")}" required name="last_name" autocomplete="family-name" /></div>
          </div>
          <div class="field"><label for="{f("plan")}">¿Cómo quieres manejar?</label><select id="{f("plan")}" name="plan" data-plan-select><option value="rent-to-own">Renta para ser dueño — el carro es tuyo en 12 meses</option><option value="rental">Renta semanal — sin enganche</option></select></div>
          <div class="field"><label for="{f("phone")}">Celular</label><input id="{f("phone")}" required name="phone" type="tel" inputmode="tel" placeholder="(714) 555-0123" autocomplete="tel" data-phone /></div>
          <div class="row2"><div class="field"><label for="{f("platform")}">¿Qué apps manejas?</label><select id="{f("platform")}" name="platform"><option value="Uber">Uber</option><option value="Lyft">Lyft</option><option value="Uber + Lyft">Uber + Lyft</option><option value="Delivery (DoorDash, Uber Eats, Instacart)">Delivery (DoorDash, Uber Eats, Instacart)</option><option value="Rideshare + delivery">Rideshare + delivery</option><option value="Not driving yet">Todavía no manejo</option></select></div><div class="field"><label for="{f("car")}">Carro que quieres</label><select id="{f("car")}" name="car" data-car-select><option value="">El primero disponible</option></select></div></div>
          <div class="hp" aria-hidden="true"><label for="{f("website")}">Website</label><input id="{f("website")}" name="website" tabindex="-1" autocomplete="off" /></div>
          <div class="fstatus" role="status" aria-live="polite"></div>
          <button class="btn btn-primary" type="submit" data-step-btn="1">Ver disponibilidad →</button>
          <p class="fineprint">Sin revisión de crédito. Te escribimos en minutos (8am–9pm). Mayores de 21. Al continuar aceptas recibir mensajes y emails sobre tu solicitud; responde STOP para no recibir más. <a href="/privacy">Privacidad</a> · <a href="/terms">Términos</a></p>
        </div>
        <div class="fstep" data-step="2" hidden>
          <p class="step2-head"><b>✓ Ya estás en la lista.</b> Termina ahora para verificarte y apartar un carro:</p>
          <div class="field"><label for="{f("email")}">Email</label><input id="{f("email")}" name="email" type="email" placeholder="tu@email.com" autocomplete="email" data-req2 /></div>
          <div class="row2"><div class="field"><label for="{f("insurance")}">Tu seguro de auto hoy</label><select id="{f("insurance")}" name="insurance_status"><option value="Full coverage + rideshare endorsement">Cobertura completa + endoso de rideshare</option><option value="Full coverage, no rideshare add-on yet">Cobertura completa, sin endoso de rideshare</option><option value="Liability only (I'll upgrade)">Solo responsabilidad civil (voy a subirlo)</option><option value="No insurance yet — help me">Todavía no tengo seguro — ayúdenme</option></select></div><div class="field"><label for="{f("license")}">¿Licencia válida?</label><select id="{f("license")}" name="has_license"><option value="Yes — California">Sí — California</option><option value="Yes — another state">Sí — de otro estado</option><option value="No">No</option></select></div></div>
          <div class="fee-box"><span>Cuota de verificación<small>Se abona a tu primer pago semanal</small></span><b class="accent">${FEE}</b></div>
          <p class="fineprint upfront"><b>Al recoger (Model 3):</b> renta para ser dueño = $2,000 de enganche + primera semana ($500). Renta semanal = primera semana ($500) + depósito reembolsable igual al deducible de tu seguro. Tus $9.99 se abonan en ambos casos. Sin revisión de crédito.</p>
          <div class="fstatus" role="status" aria-live="polite"></div>
          <button class="btn btn-primary" type="submit" data-step-btn="2">Verificarme — pagar ${FEE} seguro →</button>
          <p class="fineprint">Pago seguro con Stripe. Después tomas fotos de tu licencia. ¿No estás listo? Puedes cerrar esto — ya tenemos tu número y te vamos a escribir.</p>
        </div>'''

def modal_es():
    return f'''<div class="overlay" id="overlay">
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="applyHeading">
    <div id="formWrap">
      <div class="mhead">
        <div><h3 id="applyHeading">Ver disponibilidad de Teslas</h3><p id="carPick">Toma 30 segundos · sin revisión de crédito</p></div>
        <button class="mclose" aria-label="Cerrar" data-close>×</button>
      </div>
      <form id="applyForm" data-apply-form novalidate>{apply_fields_es('f-')}</form>
    </div>
    <div class="success" id="success">
      <div class="check" aria-hidden="true">✓</div>
      <h3>Listo — te vamos a escribir</h3>
      <p id="successText"></p>
      <button class="btn btn-ghost" style="margin-top:22px" data-close>Cerrar</button>
    </div>
  </div>
</div>
'''

def scripts(v):
    return f'<script src="/assets/site.js?v={v}" defer></script>\n</body>\n</html>\n'

def build_page(p, v):
    p = dict(p, v=v)
    body = (PAGES / p['src']).read_text() if p.get('src') else p['body']
    es = p.get('lang') == 'es'
    body = body.replace('{{APPLY_FIELDS}}', apply_fields_es('h-') if es else apply_fields('h-', p.get('app_type')=='driver')).replace('{{FEE}}', FEE).replace('{{TODAY}}', TODAY).replace('{{SMS_HREF}}', sms_href_es() if es else sms_href()).replace('{{TEXT_LABEL}}', text_label_es() if es else text_label()).replace('{{PHONE_DISPLAY}}', PHONE_DISPLAY).replace('{{HOURS}}', HOURS_ES if es else HOURS).replace('{{ORANGE_ADDR}}', ORANGE_ADDR)
    body = re.sub(r'\{\{ico:(\w+)\}\}', lambda m: ico(m.group(1)), body)
    body = re.sub(r'\{\{icon:(\w+)\}\}', lambda m: ICONS[m.group(1)], body)
    if es: html = head(p) + header_es(p.get('active',''), p.get('alt','/')) + body + footer_es() + (modal_es() if p.get('modal', True) else '') + scripts(v)
    else: html = head(p) + header(p.get('active',''), p.get('alt','/es')) + body + footer() + (modal(p.get('app_type','rental')) if p.get('modal', True) else '') + scripts(v)
    out = ROOT / (p['path'].strip('/') or 'index')
    out = out.with_suffix('.html') if not str(out).endswith('.html') else out
    out.parent.mkdir(parents=True, exist_ok=True)
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
    ai_bots = ['OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'PerplexityBot', 'Perplexity-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'Google-Extended', 'Applebot-Extended', 'Bingbot']
    rules = 'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /ops\nDisallow: /thanks\nDisallow: /api/\n\n'
    rules += ''.join(f'User-agent: {b}\nAllow: /\nDisallow: /admin\nDisallow: /ops\nDisallow: /thanks\n\n' for b in ai_bots)
    (ROOT / 'robots.txt').write_text(rules + f'Sitemap: {DOMAIN}/sitemap.xml\n')
    (ROOT / 'llms.txt').write_text((pathlib.Path(__file__).resolve().parent / 'llms.txt').read_text().replace('{{TODAY}}', TODAY))
    print('sitemap:', len(urls), 'urls')
