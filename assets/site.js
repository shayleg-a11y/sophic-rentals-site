/* Sophic Rentals — shared behaviour (v2, Sep 2026) */
(function(){
  'use strict';
  document.documentElement.classList.add('js');

  // ---------- Site config (edit here) ----------
  var SITE = window.SITE = Object.assign({
    domain: 'https://sophicrentals.com',
    phone: '',                    // e.g. '+17145550123' — leave blank until the business line exists
    email: 'Sophicrentals@gmail.com',
    ga4: '',                      // e.g. 'G-XXXXXXX'
    metaPixel: '',                // e.g. '123456789012345'
    fee: 9.99,
    deposit: 500,
    // Fallback Stripe Payment Links (used only if /api/checkout is unavailable)
    linkRental: 'https://buy.stripe.com/3cIdR8ag9ce10LMgmYbo42x',
    linkDriver: 'https://buy.stripe.com/eVqdR8fAtce11PQ6Mobo42E'
  }, window.SITE || {});

  // ---------- Analytics ----------
  function loadScript(src, attrs){ var s=document.createElement('script'); s.async=true; s.src=src; if(attrs) Object.keys(attrs).forEach(function(k){ s.setAttribute(k, attrs[k]); }); document.head.appendChild(s); return s; }
  if (SITE.ga4) {
    loadScript('https://www.googletagmanager.com/gtag/js?id=' + SITE.ga4);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };
    window.gtag('js', new Date()); window.gtag('config', SITE.ga4, { anonymize_ip: true });
  }
  if (SITE.metaPixel) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', SITE.metaPixel); window.fbq('track', 'PageView');
  }
  // Vercel Web Analytics (no-op until enabled in the Vercel dashboard)
  window.va = window.va || function(){ (window.vaq = window.vaq || []).push(arguments); };
  loadScript('/_vercel/insights/script.js', { defer: 'defer' });

  var track = window.track = function(name, params){
    params = params || {};
    try { if (window.gtag) window.gtag('event', name, params); } catch(e){}
    try { if (window.fbq) window.fbq('trackCustom', name, params); } catch(e){}
    try { if (window.va) window.va('event', { name: name, data: params }); } catch(e){}
  };

  // ---------- Helpers ----------
  var $ = function(s, r){ return (r||document).querySelector(s); };
  var $$ = function(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
  function val(id){ var el=document.getElementById(id); return el ? el.value.trim() : ''; }
  function toast(msg){ var t=$('#toast'); if(!t){ t=document.createElement('div'); t.id='toast'; t.className='toast'; document.body.appendChild(t);} t.textContent=msg; t.classList.add('show'); clearTimeout(t._h); t._h=setTimeout(function(){ t.classList.remove('show'); }, 3200); }

  // ---------- Contact links ----------
  function wireContact(){
    var tel = SITE.phone ? 'tel:' + SITE.phone : '';
    var sms = SITE.phone ? 'sms:' + SITE.phone + '?&body=' + encodeURIComponent('Hi Sophic — I\'m interested in renting a Tesla for rideshare. Do you have a car available this week?') : '';
    $$('[data-contact]').forEach(function(a){
      var kind = a.getAttribute('data-contact');
      if (kind === 'sms') { if (sms) { a.href = sms; } else { a.href = 'mailto:' + SITE.email + '?subject=' + encodeURIComponent('Tesla rental availability'); if (a.hasAttribute('data-label-email')) a.textContent = a.getAttribute('data-label-email'); } }
      if (kind === 'tel') { if (tel) { a.href = tel; } else { a.hidden = true; } }
      if (kind === 'phone-text') { if (SITE.phone) { a.textContent = SITE.phoneDisplay || SITE.phone; a.href = tel; } else { a.hidden = true; } }
      a.addEventListener('click', function(){ track('contact_click', { kind: kind }); });
    });
  }

  // ---------- Nav ----------
  function wireNav(){
    var hdr = $('header.site'); if (!hdr) return;
    addEventListener('scroll', function(){ hdr.classList.toggle('scrolled', scrollY > 10); }, { passive: true });
    var m = $('#mobileMenu'), b = $('#menuBtn');
    if (b && m) {
      b.addEventListener('click', function(){ var open = m.classList.toggle('open'); b.setAttribute('aria-expanded', open ? 'true' : 'false'); });
      $$('a', m).forEach(function(a){ a.addEventListener('click', function(){ m.classList.remove('open'); b.setAttribute('aria-expanded','false'); }); });
    }
    var yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();
  }

  // ---------- Reveal ----------
  function initReveal(){
    var els = $$('.reveal:not(.in)');
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) { els.forEach(function(e){ e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function(ents){ ents.forEach(function(en){ if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, { threshold: .08 });
    els.forEach(function(e){ io.observe(e); });
    // Safety net: nothing stays hidden if the observer never fires (print, odd embeds, full-page captures)
    setTimeout(function(){ els.forEach(function(e){ e.classList.add('in'); }); }, 1500);
  }

  // ---------- FAQ ----------
  function wireFaq(){
    $$('.qa button').forEach(function(btn){
      btn.addEventListener('click', function(){ var qa = btn.parentElement, open = qa.classList.toggle('open'); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); if (open) track('faq_open', { q: btn.textContent.trim().slice(0,60) }); });
    });
  }

  // ---------- Live fleet ----------
  var FLEET_META = {
    'Model 3': { trim: 'Rideshare favorite', img: '/images/m3-front', feats: ['5 seats', '~270 mi range', 'Autopilot'], rate: 500 },
    'Model Y': { trim: 'SUV space & comfort', img: '/images/my-front', feats: ['5 seats', 'SUV cargo', 'Dual motor'], rate: 600 },
    'Model X': { trim: 'Premium 6-seater', img: '/images/mx-front', feats: ['Falcon doors', '6 seats', 'White interior'], rate: 700 }
  };
  var FLEET = window.FLEET = [];
  function pic(base, alt){ return '<picture><source srcset="' + base + '.webp" type="image/webp"><img src="' + base + '.jpg" width="900" height="600" alt="' + alt + '" loading="lazy" decoding="async"></picture>'; }
  function renderFleet(data){
    var grid = $('#fleetGrid'); if (!grid) return;
    var order = ['Model 3', 'Model Y', 'Model X'];
    var rows = order.map(function(m){ var d = (data && data.models && data.models[m]) || {}; var meta = FLEET_META[m]; return { name: 'Tesla ' + m, model: m, trim: meta.trim, img: meta.img, feats: meta.feats, rate: d.weekly_rate || meta.rate, available: d.available || 0, total: d.total || 0 }; });
    FLEET.length = 0; rows.forEach(function(r){ FLEET.push(r); });
    grid.innerHTML = rows.map(function(c){
      var avail = c.available > 0;
      var badge = avail ? '<span class="badge avail"><span class="dot"></span>Available this week</span>' : '<span class="badge soon">Waitlist</span>';
      var btn = avail ? '<button class="btn btn-primary" data-apply data-car="' + c.name + '">Apply for a ' + c.model + ' — $9.99</button>' : '<button class="btn wait" data-apply data-car="' + c.name + ' (waitlist)">Apply for the ' + c.model + ' waitlist</button>';
      return '<div class="car reveal"><div class="img">' + pic(c.img, c.name + ', ' + c.trim) + badge + '</div><div class="body"><h3>' + c.name + '</h3><div class="meta">' + c.trim + '</div><div class="feats">' + c.feats.map(function(f){ return '<span>' + f + '</span>'; }).join('') + '</div><div class="price"><b>$' + c.rate + '</b><small>/ week</small></div>' + btn + '</div></div>';
    }).join('');
    $$('[data-car-select]').forEach(function(sel){ var cur = sel.value; sel.innerHTML = '<option value="">First available</option>' + rows.map(function(c){ return '<option>' + c.name + (c.available ? '' : ' (waitlist)') + '</option>'; }).join(''); if (cur) sel.value = cur; });
    var availTotal = rows.reduce(function(a, c){ return a + c.available; }, 0), fleetTotal = rows.reduce(function(a, c){ return a + c.total; }, 0);
    $$('[data-live="available"]').forEach(function(e){ e.textContent = availTotal; });
    var line = $('#availLine'); if (line) line.textContent = availTotal ? availTotal + ' car' + (availTotal === 1 ? '' : 's') + ' ready for pickup this week across our three locations. Apply now and we match you to the nearest one.' : 'Every car is on the road right now. Apply and you get the next one back.';
    wireApplyButtons(); initReveal();
  }
  function loadFleet(){
    if (!$('#fleetGrid') && !$('[data-live]')) return;
    var fallback = { models: { 'Model 3': { available: 4, total: 10, weekly_rate: 500 }, 'Model Y': { available: 0, total: 2, weekly_rate: 600 }, 'Model X': { available: 0, total: 1, weekly_rate: 700 } } };
    renderFleet(fallback);
    fetch('/api/fleet', { cache: 'no-store' }).then(function(r){ return r.ok ? r.json() : null; }).then(function(d){ if (d && d.models) renderFleet(d); }).catch(function(){});
  }

  // ---------- Earnings calculator ----------
  function wireCalc(){
    var hours = $('#c-hours'), rate = $('#c-rate'), model = $('#c-model'); if (!hours) return;
    var RENT = { 'Model 3': 500, 'Model Y': 600, 'Model X': 700 };
    function fmt(n){ return '$' + Math.round(n).toLocaleString(); }
    function calc(){
      var h = +hours.value, r = +rate.value, rent = RENT[model.value] || 500;
      var gross = h * r;
      var miles = h * 18;                         // ~18 miles per driving hour incl. deadhead
      var charge = miles * 0.04;                  // Sophic fleet average: about $20 per 500 miles, billed through Tesla Fleet
      var net = gross - rent - charge;
      $('#c-hours-out').textContent = h + ' hrs'; $('#c-rate-out').textContent = fmt(r) + '/hr';
      $('#r-gross').textContent = fmt(gross); $('#r-rent').textContent = '−' + fmt(rent); $('#r-charge').textContent = '−' + fmt(charge);
      $('#r-net').textContent = fmt(net); $('#r-miles').textContent = Math.round(miles).toLocaleString() + ' mi';
      var gas = miles / 28 * 4.9;                 // 28 mpg at ~$4.90/gal (CA regular, 2026)
      $('#r-gas').textContent = fmt(gas - charge);
    }
    [hours, rate, model].forEach(function(el){ el.addEventListener('input', calc); el.addEventListener('change', function(){ track('calc_change', { h: hours.value, r: rate.value, m: model.value }); }); });
    calc();
  }

  // ---------- One-step application (modal + inline hero form) ----------
  var TYPE = document.body.getAttribute('data-app-type') || 'rental';
  var lastFocus = null;
  function openApply(car){
    var ov = $('#overlay'); if (!ov) return;
    lastFocus = document.activeElement;
    ov.classList.add('show'); document.body.style.overflow = 'hidden';
    $('#formWrap').style.display = 'block'; $('#success').classList.remove('show');
    var m = $('.overlay .modal'); if (m) m.scrollTop = 0;
    var pick = $('#carPick');
    if (car) { if (pick) pick.textContent = 'Reserving: ' + car; var sel = $('#f-car'); if (sel) { for (var i = 0; i < sel.options.length; i++) if (sel.options[i].text === car) sel.value = sel.options[i].value; } }
    else if (pick) pick.textContent = 'Two minutes. Verified within 24–48 hours.';
    track('apply_open', { type: TYPE, car: car || '' });
    setTimeout(function(){ var n = $('#f-first'); if (n && n.offsetParent) n.focus(); }, 60);
  }
  function closeApply(){ var ov = $('#overlay'); if (!ov) return; ov.classList.remove('show'); document.body.style.overflow = ''; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  async function postJSON(url, body){
    var r, d;
    for (var attempt = 0; attempt < 2; attempt++) {
      try { r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); d = await r.json().catch(function(){ return {}; }); break; }
      catch (e) { if (attempt === 1) throw e; await new Promise(function(res){ setTimeout(res, 1200); }); }
    }
    if (!r.ok) { var err = new Error((d && d.error) || 'request failed'); err.status = r.status; throw err; }
    return d;
  }
  function fval(form, name){ var el = form.querySelector('[name="' + name + '"]'); return el ? el.value.trim() : ''; }
  async function submitApply(e){
    e.preventDefault();
    var form = e.currentTarget, btn = form.querySelector('button[type=submit]'), st = form.querySelector('.fstatus');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var label = btn.textContent;
    st.className = 'fstatus'; st.textContent = 'Saving your application…'; btn.disabled = true; btn.textContent = 'Saving…';
    var payload = { stage: 'lead', application_type: TYPE, first_name: fval(form,'first_name'), last_name: fval(form,'last_name'), phone: fval(form,'phone'), email: fval(form,'email'), platform: fval(form,'platform'), car: fval(form,'car'), insurance_status: fval(form,'insurance_status'), has_license: fval(form,'has_license'), rideshare_experience: fval(form,'rideshare_experience'), weekly_hours: fval(form,'weekly_hours'), website: fval(form,'website'), source: location.pathname + location.search };
    try {
      var d = await postJSON('/api/apply', payload);
      try { sessionStorage.setItem('sophic_app', JSON.stringify({ id: d.id, ref: d.reference_number, email: payload.email, t: Date.now() })); } catch (_) {}
      track('apply_submit', { type: TYPE, platform: payload.platform, insurance: payload.insurance_status });
      st.textContent = 'Opening secure checkout…'; btn.textContent = 'Opening checkout…';
      var c = await postJSON('/api/checkout', { reference: d.reference_number, application_type: TYPE });
      track('stripe_redirect', { type: TYPE, mode: c.mode || 'session' });
      location.href = c.url; return;
    } catch (err) {
      st.className = 'fstatus bad';
      st.textContent = err.status === 429 ? 'Too many attempts from this connection. Please try again in an hour or text us.' : (err.status === 400 && err.message ? err.message : 'Couldn\'t continue — check your connection and tap again. Your answers are still here.');
      btn.disabled = false; btn.textContent = label;
    }
  }
  function wireApplyButtons(){ $$('[data-apply]').forEach(function(b){ if (b._wired) return; b._wired = true; b.addEventListener('click', function(ev){ ev.preventDefault(); var card = $('.apply-card'); if (card && innerWidth < 940) { var car = b.getAttribute('data-car') || ''; var sel = $('#h-car'); if (car && sel) { for (var i = 0; i < sel.options.length; i++) if (sel.options[i].text === car) sel.value = sel.options[i].value; } card.scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(function(){ var f = $('#h-first'); if (f) f.focus({ preventScroll: true }); }, 500); track('apply_open', { type: TYPE, car: car, inline: true }); return; } openApply(b.getAttribute('data-car') || ''); }); }); }
  function wireForms(){
    $$('[data-apply-form]').forEach(function(f){ f.addEventListener('submit', submitApply); });
    $$('[data-phone]').forEach(function(ph){ ph.addEventListener('input', function(){ var d = ph.value.replace(/\D/g, '').slice(0, 10); ph.value = d.length > 6 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : d.length > 3 ? '(' + d.slice(0, 3) + ') ' + d.slice(3) : d; }); });
    var ov = $('#overlay');
    if (ov) {
      ov.addEventListener('click', function(ev){ if (ev.target === ov) closeApply(); });
      $$('[data-close]').forEach(function(b){ b.addEventListener('click', closeApply); });
      document.addEventListener('keydown', function(e){
        var open = ov.classList.contains('show');
        if (e.key === 'Escape' && open) { closeApply(); return; }
        if (e.key === 'Tab' && open) {
          var f = $$('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled])', $('.modal', ov)).filter(function(el){ return el.offsetParent !== null; });
          if (!f.length) return; var first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
    }
    // Resume from an email/SMS link: /?resume=REF goes straight back to checkout
    var q = new URLSearchParams(location.search), resume = q.get('resume');
    if (resume && /^[A-Za-z0-9-]{4,40}$/.test(resume)) { location.replace('/api/checkout?ref=' + encodeURIComponent(resume)); return; }
    if (q.get('apply') || location.hash === '#apply') openApply();
    wireApplyButtons();
  }

  window.openApply = openApply; window.closeApply = closeApply;
  document.addEventListener('DOMContentLoaded', function(){ wireContact(); wireNav(); wireFaq(); wireForms(); loadFleet(); wireCalc(); initReveal(); });
})();
