/* Sophic Rentals — shared behaviour (v2, Sep 2026) */
(function(){
  'use strict';
  document.documentElement.classList.add('js');

  // ---------- Site config (edit here) ----------
  var SITE = window.SITE = Object.assign({
    domain: 'https://sophicrentals.com',
    phone: '',                    // set in _build/build.py (PHONE) — links are rendered server-side
    email: 'Sophicrentals@gmail.com',
    ga4: '',                      // e.g. 'G-XXXXXXX'
    metaPixel: '',                // e.g. '123456789012345'
    clarity: '',                  // Microsoft Clarity project id, e.g. 'abcd1234ef'
    fee: 9.99,
    deposit: 500,
    // Fallback Stripe Payment Links (used only if /api/checkout is unavailable)
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
  if (SITE.clarity) {
    (function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,'clarity','script',SITE.clarity);
  }
  // Vercel Web Analytics (no-op until enabled in the Vercel dashboard)
  window.va = window.va || function(){ (window.vaq = window.vaq || []).push(arguments); };
  loadScript('/_vercel/insights/script.js', { defer: 'defer' });

  // Funnel events -> standard Meta events so they can be used for ads optimisation / retargeting audiences
  var META_STD = { lead_submit: 'Lead', details_submit: 'InitiateCheckout', payment_complete: 'Purchase', contact_click: 'Contact' };
  var track = window.track = function(name, params){
    params = params || {};
    try { if (window.gtag) window.gtag('event', name, params); } catch(e){}
    try { if (window.fbq) { if (META_STD[name]) window.fbq('track', META_STD[name], params); else window.fbq('trackCustom', name, params); } } catch(e){}
    try { if (window.clarity) window.clarity('event', name); } catch(e){}
    try { if (window.va) window.va('event', { name: name, data: params }); } catch(e){}
  };

  // ---------- Helpers ----------
  var $ = function(s, r){ return (r||document).querySelector(s); };
  var $$ = function(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
  function val(id){ var el=document.getElementById(id); return el ? el.value.trim() : ''; }
  function toast(msg){ var t=$('#toast'); if(!t){ t=document.createElement('div'); t.id='toast'; t.className='toast'; document.body.appendChild(t);} t.textContent=msg; t.classList.add('show'); clearTimeout(t._h); t._h=setTimeout(function(){ t.classList.remove('show'); }, 3200); }

  // ---------- Contact links ----------
  function wireContact(){
    $$('[data-contact]').forEach(function(a){ a.addEventListener('click', function(){ track('contact_click', { kind: a.getAttribute('data-contact'), href: (a.getAttribute('href') || '').slice(0, 4) }); }); });
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
      var btn = avail ? '<button class="btn btn-primary" data-apply data-car="' + c.name + '">Check availability — free</button>' : '<button class="btn wait" data-apply data-car="' + c.name + ' (waitlist)">Join the ' + c.model + ' waitlist — free</button>';
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
    var hours = $('#c-hours'), rate = $('#c-rate'), model = $('#c-model'), ins = $('#c-ins'); if (!hours) return;
    var RENT = { 'Model 3': 500, 'Model Y': 600, 'Model X': 700 };
    function fmt(n){ return '$' + Math.round(n).toLocaleString(); }
    function calc(){
      var h = +hours.value, r = +rate.value, rent = RENT[model.value] || 500, insurance = ins ? +ins.value : 0;
      var gross = h * r;
      var miles = h * 18;                         // ~18 miles per driving hour incl. deadhead
      var charge = miles * 0.04;                  // Sophic fleet average: about $20 per 500 miles
      var net = gross - rent - charge - insurance;
      var gas = miles / 25 * 6;                   // 25 mpg at ~$6.00/gal (CA)
      $('#c-hours-out').textContent = h + ' hrs'; $('#c-rate-out').textContent = fmt(r) + '/hr';
      if (ins) $('#c-ins-out').textContent = fmt(insurance) + '/wk';
      $('#r-gross').textContent = fmt(gross); $('#r-rent').textContent = '−' + fmt(rent); $('#r-charge').textContent = '−' + fmt(charge);
      var ri = $('#r-ins'); if (ri) ri.textContent = '−' + fmt(insurance);
      $('#r-net').textContent = fmt(net); $('#r-miles').textContent = Math.round(miles).toLocaleString() + ' mi';
      $('#r-gas').textContent = fmt(gas);
      var sv = $('#r-save'); if (sv) sv.textContent = fmt(gas - charge) + '/wk';
    }
    [hours, rate, model, ins].filter(Boolean).forEach(function(el){ el.addEventListener('input', calc); el.addEventListener('change', function(){ track('calc_change', { h: hours.value, r: rate.value, m: model.value }); }); });
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
    var mf = $('#applyForm'), sv = saved();
    if (mf && mf.getAttribute('data-at') !== '2' && sv && sv.ref && Date.now() - (sv.t || 0) < 864e5) { mf.setAttribute('data-ref', sv.ref); setStep(mf, 2); }
    var m = $('.overlay .modal'); if (m) m.scrollTop = 0;
    var pick = $('#carPick');
    if (car) { if (pick) pick.textContent = 'Reserving: ' + car; var sel = $('#f-car'); if (sel) { for (var i = 0; i < sel.options.length; i++) if (sel.options[i].text === car) sel.value = sel.options[i].value; } }
    else if (pick) pick.textContent = 'Free to start · 30 seconds · no credit check';
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
  function setStep(form, n){
    $$('.fstep', form).forEach(function(st){ var on = st.getAttribute('data-step') === String(n); st.hidden = !on; $$('input,select', st).forEach(function(i){ if (i._req == null) i._req = i.required || i.hasAttribute('data-req2'); i.required = on && i._req; }); });
    form.setAttribute('data-at', n);
    if (n === 2) { var em = form.querySelector('[name="email"]'); if (em) setTimeout(function(){ em.focus({ preventScroll: true }); }, 80); var hd = $('#applyHeading'); if (hd && form.id === 'applyForm') hd.textContent = 'Last step: get verified'; }
  }
  function saved(){ try { return JSON.parse(sessionStorage.getItem('sophic_app') || 'null'); } catch (_) { return null; } }
  function remember(o){ try { sessionStorage.setItem('sophic_app', JSON.stringify(o)); } catch (_) {} }
  async function submitApply(e){
    e.preventDefault();
    var form = e.currentTarget, step = +(form.getAttribute('data-at') || 1), box = form.querySelector('.fstep[data-step="' + step + '"]');
    var btn = box.querySelector('button[type=submit]'), st = box.querySelector('.fstatus');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var label = btn.textContent;
    st.className = 'fstatus'; btn.disabled = true; btn.textContent = 'Saving…';
    try {
      if (step === 1) {
        var payload = { stage: 'lead', application_type: TYPE, first_name: fval(form,'first_name'), last_name: fval(form,'last_name'), phone: fval(form,'phone'), platform: fval(form,'platform'), car: fval(form,'car'), weekly_hours: fval(form,'weekly_hours'), website: fval(form,'website'), source: location.pathname + location.search };
        var d = await postJSON('/api/apply', payload);
        remember({ id: d.id, ref: d.reference_number, t: Date.now() });
        form.setAttribute('data-ref', d.reference_number);
        track('lead_submit', { type: TYPE, platform: payload.platform, car: payload.car });
        btn.disabled = false; btn.textContent = label; st.textContent = '';
        setStep(form, 2); return;
      }
      var ref = form.getAttribute('data-ref') || (saved() || {}).ref;
      if (!ref) { setStep(form, 1); throw new Error('Please start again — enter your name and number.'); }
      var det = { stage: 'details', ref: ref, email: fval(form,'email'), insurance_status: fval(form,'insurance_status'), has_license: fval(form,'has_license'), rideshare_experience: fval(form,'rideshare_experience') };
      await postJSON('/api/apply', det);
      track('details_submit', { type: TYPE, insurance: det.insurance_status, value: 9.99, currency: 'USD' });
      st.textContent = 'Opening secure checkout…'; btn.textContent = 'Opening checkout…';
      var c = await postJSON('/api/checkout', { reference: ref, application_type: TYPE });
      track('stripe_redirect', { type: TYPE, mode: c.mode || 'session' });
      location.href = c.url; return;
    } catch (err) {
      st.className = 'fstatus bad';
      st.textContent = err.status === 429 ? 'Too many attempts from this connection. Please try again in an hour or text us.' : (err.status === 400 && err.message ? err.message : (err.message && !err.status ? err.message : 'Couldn\'t continue — check your connection and tap again. Your answers are still here.'));
      btn.disabled = false; btn.textContent = label;
    }
  }
  function wireFormStart(){
    $$('[data-apply-form]').forEach(function(f){ f.addEventListener('focusin', function(){ if (f._started) return; f._started = true; track('form_start', { type: TYPE, where: f.id === 'applyForm' ? 'modal' : 'inline' }); }); });
  }
  function wireApplyButtons(){ $$('[data-apply]').forEach(function(b){ if (b._wired) return; b._wired = true; b.addEventListener('click', function(ev){ ev.preventDefault(); var card = $('.apply-card'); if (card && innerWidth < 940) { var car = b.getAttribute('data-car') || ''; var sel = $('#h-car'); if (car && sel) { for (var i = 0; i < sel.options.length; i++) if (sel.options[i].text === car) sel.value = sel.options[i].value; } card.scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(function(){ var f = $('#h-first'); if (f) f.focus({ preventScroll: true }); }, 500); track('apply_open', { type: TYPE, car: car, inline: true }); return; } openApply(b.getAttribute('data-car') || ''); }); }); }
  function wireForms(){
    $$('[data-apply-form]').forEach(function(f){ setStep(f, 1); f.addEventListener('submit', submitApply); });
    wireFormStart();
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
    if (resume && /^[A-Za-z0-9-]{4,40}$/.test(resume)) {
      remember({ ref: resume, t: Date.now() });
      var target = innerWidth < 940 ? $('.inline-form') : $('#applyForm');
      if (!target) target = $('#applyForm') || $('.inline-form');
      if (target) { target.setAttribute('data-ref', resume); setStep(target, 2); if (target.id === 'applyForm') openApply(); else target.scrollIntoView({ block: 'start' }); track('resume_open', { type: TYPE }); }
    }
    if (q.get('apply') || location.hash === '#apply') openApply();
    wireApplyButtons();
  }

  window.openApply = openApply; window.closeApply = closeApply;
  document.addEventListener('DOMContentLoaded', function(){ wireContact(); wireNav(); wireFaq(); wireForms(); loadFleet(); wireCalc(); initReveal(); });
})();
