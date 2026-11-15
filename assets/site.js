/* Sophic Rentals — shared behaviour (v3, Nov 2026: reserve flow, embedded Stripe, pickup map, first-party funnel tracking) */
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
  // Public ids (Stripe publishable key, GA4, Meta Pixel) come from /api/config so they can change without a deploy.
  function loadScript(src, attrs){ var s=document.createElement('script'); s.async=true; s.src=src; if(attrs) Object.keys(attrs).forEach(function(k){ s.setAttribute(k, attrs[k]); }); document.head.appendChild(s); return s; }
  function store(kind){ try { var s = window[kind]; var k = '__t'; s.setItem(k, '1'); s.removeItem(k); return s; } catch (_) { return null; } }
  var LS = store('localStorage'), SS = store('sessionStorage');
  function rid(){ return (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).toUpperCase(); }
  var VID = (LS && LS.getItem('sophic_vid')) || rid(); if (LS) LS.setItem('sophic_vid', VID);
  var SID = (SS && SS.getItem('sophic_sid')) || rid(); if (SS) SS.setItem('sophic_sid', SID);
  // Attribution: a new campaign/click in the URL replaces the stored one; otherwise first touch is kept.
  var ATTR = (function(){
    var q = new URLSearchParams(location.search), saved = null;
    try { saved = JSON.parse((LS && LS.getItem('sophic_attr')) || 'null'); } catch (_) {}
    var ref = document.referrer && !/sophicrentals\.com|stripe\.com/.test(document.referrer) ? document.referrer.slice(0, 300) : '';
    var fresh = q.get('utm_source') || q.get('fbclid') || q.get('gclid') || (!saved && true);
    if (fresh) {
      saved = { utm_source: q.get('utm_source') || (q.get('fbclid') ? 'facebook' : q.get('gclid') ? 'google' : ''), utm_medium: q.get('utm_medium') || (q.get('fbclid') || q.get('gclid') ? 'paid' : ''),
        utm_campaign: q.get('utm_campaign') || '', referrer: ref || (saved && saved.referrer) || '', landing_page: (location.pathname + location.search).slice(0, 300),
        click_id: q.get('fbclid') || q.get('gclid') || '', t: Date.now() };
      try { if (LS) LS.setItem('sophic_attr', JSON.stringify(saved)); } catch (_) {}
    }
    return saved || {};
  })();
  window.SOPHIC_ATTR = ATTR; window.SOPHIC_VID = VID;

  // First-party funnel log -> /api/track (batched; survives page exits via sendBeacon)
  var FP = ['page_view','form_start','lead_submit','details_submit','checkout_open','stripe_redirect','payment_complete','apply_open','contact_click','faq_open','resume_open','pickup_select','map_open','license_knockout','docs_uploaded','details_saved','pay_error'];
  var fpq = [], fpt = null;
  function fpFlush(){ clearTimeout(fpt); fpt = null; if (!fpq.length) return; var body = JSON.stringify({ v: VID, s: SID, a: ATTR, events: fpq.splice(0, 20) });
    try { if (navigator.sendBeacon && navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }))) return; } catch (_) {}
    try { fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true }); } catch (_) {} }
  function fpPush(name, params){ if (FP.indexOf(name) < 0) return; var p = params || {}; fpq.push({ name: name, path: location.pathname, ref: p.ref || '', props: p }); if (!fpt) fpt = setTimeout(fpFlush, 600); }
  addEventListener('pagehide', fpFlush); document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'hidden') fpFlush(); });

  function initThirdParty(){
    if (SITE.ga4 && !window.gtag) {
      loadScript('https://www.googletagmanager.com/gtag/js?id=' + SITE.ga4);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function(){ window.dataLayer.push(arguments); };
      window.gtag('js', new Date()); window.gtag('config', SITE.ga4, { anonymize_ip: true, user_id: VID });
    }
    if (SITE.metaPixel && !window.fbq) {
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', SITE.metaPixel, { external_id: VID }); window.fbq('track', 'PageView');
    }
    if (SITE.clarity && !window.clarity) {
      (function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,'clarity','script',SITE.clarity);
    }
  }
  // Vercel Web Analytics (no-op until enabled in the Vercel dashboard)
  window.va = window.va || function(){ (window.vaq = window.vaq || []).push(arguments); };
  loadScript('/_vercel/insights/script.js', { defer: 'defer' });

  // Funnel events -> standard Meta events so they can be used for ads optimisation / retargeting audiences
  var META_STD = { lead_submit: 'Lead', details_submit: 'InitiateCheckout', payment_complete: 'Purchase', contact_click: 'Contact' };
  var tpq = []; var cfgReady = false;
  function sendThirdParty(name, params, opts){
    try { if (window.gtag) window.gtag('event', name === 'payment_complete' ? 'purchase' : name, name === 'payment_complete' ? Object.assign({ transaction_id: (opts && opts.eventID) || params.ref }, params) : params); } catch(e){}
    try { if (window.fbq) { var o = opts && opts.eventID ? { eventID: opts.eventID } : undefined; if (META_STD[name]) window.fbq('track', META_STD[name], params, o); else window.fbq('trackCustom', name, params, o); } } catch(e){}
    try { if (window.clarity) window.clarity('event', name); } catch(e){}
    try { if (window.va) window.va('event', { name: name, data: params }); } catch(e){}
  }
  var track = window.track = function(name, params, opts){
    params = params || {};
    fpPush(name, params);
    if (cfgReady) sendThirdParty(name, params, opts); else tpq.push([name, params, opts]);
  };
  var CONFIG = fetch('/api/config').then(function(r){ return r.ok ? r.json() : {}; }).catch(function(){ return {}; }).then(function(c){
    c = c || {}; if (c.stripe_pk) SITE.stripePk = c.stripe_pk; if (c.ga4) SITE.ga4 = SITE.ga4 || c.ga4; if (c.meta_pixel) SITE.metaPixel = SITE.metaPixel || c.meta_pixel;
    initThirdParty(); cfgReady = true; tpq.splice(0).forEach(function(a){ sendThirdParty(a[0], a[1], a[2]); }); return c;
  });
  setTimeout(function(){ if (!cfgReady) { initThirdParty(); cfgReady = true; tpq.splice(0).forEach(function(a){ sendThirdParty(a[0], a[1], a[2]); }); } }, 2500);

  // ---------- i18n (English default; Spanish pages have <html lang="es">) ----------
  var ES = (document.documentElement.lang || '').slice(0, 2) === 'es';
  var STR = ES ? {
    avail: 'Disponible esta semana', wait: 'Lista de espera', check: 'Ver disponibilidad', joinWait: function(m){ return 'Lista de espera del ' + m; },
    week: '/ semana', ready: function(n){ return n + ' carro' + (n === 1 ? '' : 's') + ' listo' + (n === 1 ? '' : 's') + ' para recoger esta semana en nuestras tres ubicaciones. Aplica y te asignamos el más cercano.'; },
    none: 'Todos los carros están en la calle ahorita. Aplica y te damos el próximo que regrese.', reserving: 'Apartando: ', quick: 'Toma 30 segundos · sin revisión de crédito',
    last: 'Último paso: aparta tu Tesla', saving: 'Guardando…', restart: 'Empieza otra vez — escribe tu nombre y número.', opening: 'Abriendo pago seguro…', openingBtn: 'Abriendo…',
    tooMany: 'Demasiados intentos desde esta conexión. Intenta en una hora o escríbenos.', conn: 'No se pudo continuar — revisa tu conexión y vuelve a intentar. Tus respuestas siguen aquí.',
    trims: { 'Model 3': 'El favorito para rideshare', 'Model Y': 'Espacio y comodidad SUV', 'Model X': 'Premium de 6 asientos' },
    feats: { 'Model 3': ['5 asientos', '~270 mi de autonomía', 'Autopilot'], 'Model Y': ['5 asientos', 'Cajuela de SUV', 'Doble motor'], 'Model X': ['Puertas de halcón', '6 asientos', 'Interior blanco'] }
  } : {
    avail: 'Available this week', wait: 'Waitlist', check: 'Check availability', joinWait: function(m){ return 'Join the ' + m + ' waitlist'; },
    week: '/ week', ready: function(n){ return n + ' car' + (n === 1 ? '' : 's') + ' ready for pickup this week across our three locations. Apply now and we match you to the nearest one.'; },
    none: 'Every car is on the road right now. Apply and you get the next one back.', reserving: 'Reserving: ', quick: 'Takes 30 seconds · no credit check',
    last: 'Last step: reserve your Tesla', saving: 'Saving…', restart: 'Please start again — enter your name and number.', opening: 'Opening secure checkout…', openingBtn: 'Opening checkout…',
    tooMany: 'Too many attempts from this connection. Please try again in an hour or text us.', conn: 'Couldn\'t continue — check your connection and tap again. Your answers are still here.'
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
    var rows = order.map(function(m){ var d = (data && data.models && data.models[m]) || {}; var meta = FLEET_META[m]; return { name: 'Tesla ' + m, model: m, trim: (STR.trims && STR.trims[m]) || meta.trim, img: meta.img, feats: (STR.feats && STR.feats[m]) || meta.feats, rate: d.weekly_rate || meta.rate, available: d.available || 0, total: d.total || 0 }; });
    FLEET.length = 0; rows.forEach(function(r){ FLEET.push(r); });
    grid.innerHTML = rows.map(function(c){
      var avail = c.available > 0;
      var badge = avail ? '<span class="badge avail"><span class="dot"></span>' + STR.avail + '</span>' : '<span class="badge soon">' + STR.wait + '</span>';
      var btn = avail ? '<button class="btn btn-primary" data-apply data-car="' + c.name + '">' + STR.check + '</button>' : '<button class="btn wait" data-apply data-car="' + c.name + ' (waitlist)">' + STR.joinWait(c.model) + '</button>';
      return '<div class="car reveal"><div class="img">' + pic(c.img, c.name + ', ' + c.trim) + badge + '</div><div class="body"><h3>' + c.name + '</h3><div class="meta">' + c.trim + '</div><div class="feats">' + c.feats.map(function(f){ return '<span>' + f + '</span>'; }).join('') + '</div><div class="price"><b>$' + c.rate + '</b><small>' + STR.week + '</small></div>' + btn + '</div></div>';
    }).join('');
    $$('[data-car-select]').forEach(function(sel){ var cur = sel.value; sel.innerHTML = '<option value="">First available</option>' + rows.map(function(c){ return '<option>' + c.name + (c.available ? '' : ' (waitlist)') + '</option>'; }).join(''); if (cur) sel.value = cur; });
    var availTotal = rows.reduce(function(a, c){ return a + c.available; }, 0), fleetTotal = rows.reduce(function(a, c){ return a + c.total; }, 0);
    $$('[data-live="available"]').forEach(function(e){ e.textContent = availTotal; });
    var line = $('#availLine'); if (line) line.textContent = availTotal ? STR.ready(availTotal) : STR.none;
    renderLocAvail(data); wireApplyButtons(); initReveal();
  }
  function loadFleet(){
    if (!$('#fleetGrid') && !$('[data-live]')) return;
    var fallback = { models: { 'Model 3': { available: 3, total: 11, weekly_rate: 500 }, 'Model Y': { available: 0, total: 2, weekly_rate: 600 }, 'Model X': { available: 0, total: 1, weekly_rate: 700 } } };
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

  // ---------- Rent-to-own calculator ----------
  function wireRtoCalc(){
    var root = $('[data-rto-calc]'); if (!root) return;
    var ids = ['rc-down','rc-week','rc-value','rc-hours','rc-rate','rc-ins'], el = {};
    ids.forEach(function(i){ el[i] = document.getElementById(i); });
    function fmt(n){ return (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString(); }
    var WK = ES ? '/sem' : '/wk', RENTAL_WEEKLY = 500, MAINT = 15;
    function calc(){
      var down = +el['rc-down'].value, wk = +el['rc-week'].value, val = +el['rc-value'].value, h = +el['rc-hours'].value, r = +el['rc-rate'].value, ins = +el['rc-ins'].value;
      var total = down + wk * 52, rent = RENTAL_WEEKLY * 52, charge = h * 18 * 0.04, gross = h * r;
      var take = gross - wk - charge - ins - MAINT, after = gross - charge - ins - MAINT;
      $('#rc-down-out').textContent = fmt(down); $('#rc-week-out').textContent = fmt(wk); $('#rc-value-out').textContent = fmt(val);
      $('#rc-hours-out').textContent = h + ' hrs'; $('#rc-rate-out').textContent = fmt(r) + '/hr'; $('#rc-ins-out').textContent = fmt(ins) + WK;
      $('#rr-pickup').textContent = fmt(down + wk); $('#rr-total').textContent = fmt(total); $('#rr-rent').textContent = fmt(rent);
      $('#rr-extra').textContent = fmt(total - rent); $('#rr-value').textContent = fmt(val);
      $('#rr-take').textContent = fmt(take) + WK; $('#rr-after').textContent = fmt(after) + WK;
    }
    ids.forEach(function(i){ el[i].addEventListener('input', calc); el[i].addEventListener('change', function(){ track('rto_calc_change', { down: el['rc-down'].value, wk: el['rc-week'].value }); }); });
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
    if (car) { if (pick) pick.textContent = STR.reserving + car; setCar(car); }
    else if (pick) pick.textContent = STR.quick;
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
    if (n === 2) { var pb = form.querySelector('[data-paybox]'), sf = form.querySelector('.s2-fields'); if (pb && pb.hidden === false && !embedded) { pb.hidden = true; if (sf) sf.hidden = false; } }
    if (n === 2) { var em = form.querySelector('[name="email"]'); if (em) setTimeout(function(){ em.focus({ preventScroll: true }); }, 80); var hd = $('#applyHeading'); if (hd && form.id === 'applyForm') hd.textContent = STR.last; }
  }
  function saved(){ try { return JSON.parse(sessionStorage.getItem('sophic_app') || 'null'); } catch (_) { return null; } }
  function remember(o){ try { sessionStorage.setItem('sophic_app', JSON.stringify(o)); } catch (_) {} }
  function pickupVal(form){ var r = form.querySelector('[data-pickup]:checked'); return r ? r.value : ''; }

  // ---------- Pickup location (chips in every form + map + location cards stay in sync) ----------
  function setPickup(v, from){
    v = v || '';
    $$('[data-pickup]').forEach(function(r){ r.checked = r.value === v; });
    $$('[data-ploc]').forEach(function(b){ var on = b.getAttribute('data-ploc') === v; b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); });
    if (window._mapSel) window._mapSel(v);
    try { sessionStorage.setItem('sophic_pickup', v); } catch (_) {}
    if (from) track('pickup_select', { pickup: v || 'any', from: from });
  }
  function wirePickup(){
    $$('[data-pickup]').forEach(function(r){ r.addEventListener('change', function(){ if (r.checked) setPickup(r.value, 'form'); }); });
    $$('[data-ploc]').forEach(function(b){ b.addEventListener('click', function(){ setPickup(b.getAttribute('data-ploc'), 'list'); }); });
    $$('.map-link').forEach(function(a){ a.addEventListener('click', function(){ closeApply(); }); });
    var sv = ''; try { sv = sessionStorage.getItem('sophic_pickup') || ''; } catch (_) {}
    if (sv) setPickup(sv);
  }
  function setCar(car){ $$('[data-car-input]').forEach(function(i){ i.value = car || ''; }); }

  // ---------- Step 2 helpers: license knock-out + insurance note ----------
  function step2Notes(form){
    var lic = form.querySelector('[data-license]'), ins = form.querySelector('[data-insurance]');
    var ln = form.querySelector('[data-lic-note]'), inn = form.querySelector('[data-ins-note]'), pay = form.querySelector('[data-step-btn="2"]');
    var noLic = !!(lic && lic.value === 'No');
    if (ln) ln.hidden = !noLic;
    if (pay) pay.disabled = noLic;
    if (inn) inn.hidden = !(ins && /Liability|No insurance/.test(ins.value));
    return !noLic;
  }
  function wireStep2(){
    $$('[data-apply-form]').forEach(function(f){
      $$('[data-license],[data-insurance]', f).forEach(function(el){ el.addEventListener('change', function(){ var ok = step2Notes(f); if (!ok && el.hasAttribute('data-license')) track('license_knockout', {}); }); });
      step2Notes(f);
    });
  }

  // ---------- Stripe: embedded checkout on the page when the publishable key is configured ----------
  var stripeJs = null, embedded = null;
  function loadStripe(){
    if (stripeJs) return stripeJs;
    stripeJs = new Promise(function(res, rej){
      if (window.Stripe) return res(window.Stripe);
      var s = loadScript('https://js.stripe.com/v3/'); s.onload = function(){ res(window.Stripe); }; s.onerror = rej;
      setTimeout(function(){ if (!window.Stripe) rej(new Error('stripe_timeout')); }, 12000);
    });
    stripeJs.catch(function(){ stripeJs = null; });
    return stripeJs;
  }
  function closeEmbedded(){ if (embedded) { try { embedded.destroy(); } catch (_) {} embedded = null; } }
  async function startPayment(form, ref){
    var pk = SITE.stripePk || '';
    if (!pk) { try { var cfg = await CONFIG; pk = (cfg && cfg.stripe_pk) || ''; } catch (_) {} }
    var c = await postJSON('/api/checkout', { reference: ref, application_type: TYPE, embedded: !!pk });
    if (c.mode !== 'embedded' && c.url) { track('stripe_redirect', { type: TYPE, mode: c.mode || 'session', ref: ref }); location.href = c.url; return 'redirect'; }
    if (c.mode === 'embedded' && c.client_secret) {
      try {
        var S = await loadStripe(); var stripe = S(pk);
        closeEmbedded();
        var box = form.querySelector('[data-paybox]'), fields = form.querySelector('.s2-fields'), mount = form.querySelector('[data-paymount]');
        mount.innerHTML = ''; fields.hidden = true; box.hidden = false;
        embedded = await stripe.initEmbeddedCheckout({ fetchClientSecret: function(){ return Promise.resolve(c.client_secret); } });
        embedded.mount(mount);
        var m = form.closest('.modal'); if (m) m.scrollTop = 0; else box.scrollIntoView({ behavior: 'smooth', block: 'start' });
        track('checkout_open', { type: TYPE, mode: 'embedded', ref: ref });
        return 'embedded';
      } catch (e) {
        track('pay_error', { stage: 'embedded', msg: String((e && e.message) || e).slice(0, 80) });
        var h = await postJSON('/api/checkout', { reference: ref, application_type: TYPE });
        track('stripe_redirect', { type: TYPE, mode: 'fallback', ref: ref }); location.href = h.url; return 'redirect';
      }
    }
    throw new Error(STR.conn);
  }
  function wirePayBack(){
    $$('[data-pay-back]').forEach(function(b){ b.addEventListener('click', function(){
      var f = b.closest('form'); closeEmbedded();
      f.querySelector('[data-paybox]').hidden = true; f.querySelector('.s2-fields').hidden = false;
      var bt = f.querySelector('[data-step-btn="2"]'); if (bt) { bt.disabled = false; if (bt._label) bt.innerHTML = bt._label; }
      var st = f.querySelector('.fstep[data-step="2"] .fstatus'); if (st) st.textContent = '';
    }); });
  }

  async function submitApply(e){
    e.preventDefault();
    var form = e.currentTarget, step = +(form.getAttribute('data-at') || 1), box = form.querySelector('.fstep[data-step="' + step + '"]');
    var btn = box.querySelector('button[type=submit]'), st = box.querySelector('.fstatus');
    if (step === 2 && !step2Notes(form)) { track('license_knockout', { at: 'submit' }); return; }
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (!btn._label) btn._label = btn.innerHTML;
    var label = btn._label;
    st.className = 'fstatus'; btn.disabled = true; btn.textContent = STR.saving;
    try {
      if (step === 1) {
        var payload = { stage: 'lead', application_type: TYPE, first_name: fval(form,'first_name'), last_name: fval(form,'last_name'), phone: fval(form,'phone'), plan: fval(form,'plan') || 'rental',
          pickup_location: pickupVal(form), car: fval(form,'car'), website: fval(form,'website'), source: location.pathname + location.search,
          utm_source: ATTR.utm_source, utm_medium: ATTR.utm_medium, utm_campaign: ATTR.utm_campaign, landing_page: ATTR.landing_page, referrer: ATTR.referrer, click_id: ATTR.click_id, visitor_id: VID };
        var d = await postJSON('/api/apply', payload);
        remember({ id: d.id, ref: d.reference_number, t: Date.now() });
        $$('[data-apply-form]').forEach(function(f){ f.setAttribute('data-ref', d.reference_number); });
        track('lead_submit', { type: TYPE, plan: payload.plan, pickup: payload.pickup_location || 'any', ref: d.reference_number }, { eventID: 'lead-' + d.reference_number });
        btn.disabled = false; btn.innerHTML = label; st.textContent = '';
        setStep(form, 2); return;
      }
      var ref = form.getAttribute('data-ref') || (saved() || {}).ref;
      if (!ref) { setStep(form, 1); throw new Error(STR.restart); }
      var det = { stage: 'details', ref: ref, email: fval(form,'email'), insurance_status: fval(form,'insurance_status'), has_license: fval(form,'has_license'), pickup_location: pickupVal(form) };
      await postJSON('/api/apply', det);
      track('details_submit', { type: TYPE, insurance: det.insurance_status, value: 9.99, currency: 'USD', ref: ref }, { eventID: 'checkout-' + ref });
      st.textContent = STR.opening; btn.textContent = STR.openingBtn;
      var how = await startPayment(form, ref);
      if (how === 'embedded') { btn.disabled = false; btn.innerHTML = label; st.textContent = ''; }
    } catch (err) {
      st.className = 'fstatus bad';
      if (err.message === 'no_license') { step2Notes(form); st.textContent = ''; btn.innerHTML = label; return; }
      st.textContent = err.status === 429 ? STR.tooMany : (err.status === 400 && err.message ? err.message : (err.message && !err.status ? err.message : STR.conn));
      btn.disabled = false; btn.innerHTML = label;
      track('pay_error', { step: step, status: err.status || 0 });
    }
  }
  function wireFormStart(){
    $$('[data-apply-form]').forEach(function(f){ f.addEventListener('focusin', function(){ if (f._started) return; f._started = true; track('form_start', { type: TYPE, where: f.id === 'applyForm' ? 'modal' : 'inline' }); }); });
  }
  function wireApplyButtons(){ $$('[data-apply]').forEach(function(b){ if (b._wired) return; b._wired = true; b.addEventListener('click', function(ev){ ev.preventDefault(); var pl = b.getAttribute('data-plan'); if (pl) $$('[data-plan-select]').forEach(function(s){ s.value = pl; }); var card = $('.apply-card'); if (card && innerWidth < 940) { var car = b.getAttribute('data-car') || ''; if (car) setCar(car); card.scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(function(){ var f = $('#h-first'); if (f) f.focus({ preventScroll: true }); }, 500); track('apply_open', { type: TYPE, car: car, inline: true }); return; } openApply(b.getAttribute('data-car') || ''); }); }); }
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

  // ---------- Pickup map (Leaflet + OpenStreetMap/CARTO tiles, loaded only when scrolled near) ----------
  var PLOCS = {
    lax: { ll: [33.9535, -118.3965], name: ES ? 'Cerca de LAX' : 'Near LAX', approx: true },
    sna: { ll: [33.6810, -117.8650], name: ES ? 'Cerca de John Wayne (SNA)' : 'Near John Wayne Airport', approx: true },
    orange: { ll: [33.7925, -117.8531], name: ES ? 'Orange · junto a Chapman' : 'Orange · next to Chapman', approx: false }
  };
  function initMap(){
    var el = $('#pickupMap'); if (!el) return;
    var started = false;
    function boot(){
      if (started) return; started = true;
      var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(css);
      var s = loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
      s.onerror = function(){ el.innerHTML = '<div class="map-fallback">' + (ES ? 'No se pudo cargar el mapa — elige abajo.' : 'Map unavailable — pick a location below.') + '</div>'; };
      s.onload = function(){
        var L = window.L; el.innerHTML = '';
        var map = L.map(el, { scrollWheelZoom: false, zoomControl: true, attributionControl: true, tap: true });
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, className: 'dark-tiles', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
        var marks = {}, bounds = [];
        Object.keys(PLOCS).forEach(function(k){
          var p = PLOCS[k]; bounds.push(p.ll);
          if (p.approx) L.circle(p.ll, { radius: 1600, color: '#22E3A9', weight: 1, dashArray: '4 4', fillOpacity: .06 }).addTo(map);
          var icon = L.divIcon({ className: 'pin-wrap', html: '<div class="pin" data-pin="' + k + '"><span></span></div>', iconSize: [30, 40], iconAnchor: [15, 38] });
          var m = L.marker(p.ll, { icon: icon, keyboard: true, title: p.name }).addTo(map);
          m.bindTooltip(p.name, { direction: 'top', offset: [0, -34], permanent: innerWidth > 700, className: 'pin-tip' });
          m.on('click', function(){ setPickup(k, 'map'); });
          marks[k] = m;
        });
        map.fitBounds(bounds, { padding: [40, 40] });
        window._mapSel = function(v){ $$('.pin', el).forEach(function(pn){ pn.classList.toggle('on', pn.getAttribute('data-pin') === v); }); if (v && PLOCS[v]) map.panTo(PLOCS[v].ll, { animate: true }); };
        var cur = $('[data-pickup]:checked'); window._mapSel(cur ? cur.value : '');
        track('map_open', {});
      };
    }
    if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function(en){ if (en[0].isIntersecting) { io.disconnect(); boot(); } }, { rootMargin: '400px' }); io.observe(el); }
    else boot();
  }
  function renderLocAvail(data){
    var loc = data && data.locations; if (!loc) return;
    Object.keys(PLOCS).forEach(function(k){
      var n = loc[k] && loc[k].available, el = $('[data-ploc-avail="' + k + '"]'); if (!el || n == null) return;
      el.textContent = n > 0 ? (ES ? n + ' listo' + (n === 1 ? '' : 's') : n + ' ready') : (ES ? 'Lista de espera' : 'Waitlist');
      el.className = 'ploc-avail ' + (n > 0 ? 'ok' : 'wait');
    });
  }

  window.openApply = openApply; window.closeApply = closeApply;
  document.addEventListener('DOMContentLoaded', function(){ track('page_view', { title: document.title.slice(0, 80) }); wireContact(); wireNav(); wireFaq(); wireForms(); wirePickup(); wireStep2(); wirePayBack(); loadFleet(); wireCalc(); wireRtoCalc(); initMap(); initReveal(); });
})();
