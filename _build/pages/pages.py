# Page registry for build.py
FEE = '9.99'
DOMAIN = 'https://sophicrentals.com'

BIZ = {"@context":"https://schema.org","@type":"AutoRental","name":"Sophic Rentals","description":"Long-term Tesla rentals for Uber, Lyft and DoorDash drivers in Los Angeles and Orange County.","url":DOMAIN+"/","email":"Sophicrentals@gmail.com","image":DOMAIN+"/images/og-card.jpg","priceRange":"$500-$700 / week","address":{"@type":"PostalAddress","streetAddress":"393 N Cypress St","addressLocality":"Orange","addressRegion":"CA","postalCode":"92866","addressCountry":"US"},"geo":{"@type":"GeoCoordinates","latitude":33.7925,"longitude":-117.8531},"areaServed":[{"@type":"City","name":"Los Angeles"},{"@type":"AdministrativeArea","name":"Orange County"}],"location":[{"@type":"Place","name":"Sophic Rentals — Orange (next to Chapman University)","address":{"@type":"PostalAddress","streetAddress":"393 N Cypress St","addressLocality":"Orange","addressRegion":"CA","postalCode":"92866"}},{"@type":"Place","name":"Sophic Rentals — near John Wayne Airport (SNA)","address":{"@type":"PostalAddress","addressLocality":"Irvine","addressRegion":"CA"}},{"@type":"Place","name":"Sophic Rentals — near LAX","address":{"@type":"PostalAddress","addressLocality":"Los Angeles","addressRegion":"CA"}}],"makesOffer":[{"@type":"Offer","name":"Tesla Model 3 weekly rental for rideshare","priceCurrency":"USD","price":"500","priceSpecification":{"@type":"UnitPriceSpecification","price":"500","priceCurrency":"USD","unitText":"week"}},{"@type":"Offer","name":"Tesla Model Y weekly rental for rideshare","priceCurrency":"USD","price":"600"},{"@type":"Offer","name":"Tesla Model X weekly rental for rideshare","priceCurrency":"USD","price":"700"}]}

HOME_FAQ = {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
 {"@type":"Question","name":"What does it cost?","acceptedAnswer":{"@type":"Answer","text":"Model 3 is $500/week, Model Y $600, Model X $700. Add a refundable deposit equal to one week's rent, a one-time $9.99 non-refundable application fee, and charging (about $20 per 500 miles, billed automatically through Tesla fleet management). Insurance is your own full-coverage policy. Minimum term is one month."}},
 {"@type":"Question","name":"Is the $9.99 application fee refundable?","acceptedAnswer":{"@type":"Answer","text":"No. It covers license and insurance verification and is not refunded if you're declined or change your mind."}},
 {"@type":"Question","name":"What insurance do I need?","acceptedAnswer":{"@type":"Answer","text":"Your own full-coverage auto policy (liability, comprehensive and collision) that extends to a rental vehicle, with Sophic Rentals listed as an additional interest. We verify it with your carrier before pickup."}},
 {"@type":"Question","name":"What do I need to qualify?","acceptedAnswer":{"@type":"Answer","text":"21 or older, a valid unsuspended U.S. driver's license, and active insurance. No credit check."}},
 {"@type":"Question","name":"How fast can I start?","acceptedAnswer":{"@type":"Answer","text":"Most drivers are verified within 24-48 hours of uploading their license, then pick up at whichever of our three offices has their car."}},
 {"@type":"Question","name":"Is there a mileage limit?","acceptedAnswer":{"@type":"Answer","text":"5,000 miles per week are included; $1 per mile over."}},
 {"@type":"Question","name":"Where do I pick up the car?","acceptedAnswer":{"@type":"Answer","text":"One of three Sophic offices: near LAX, near John Wayne Airport (SNA), or next to Chapman University in Orange, depending on where your car is."}}]}

CITIES = [
 dict(slug='anaheim', name='Anaheim', office='our office next to Chapman University in Orange', drive='about 10 minutes', hotspots='Disneyland and the Anaheim Resort, Angel Stadium and Honda Center on game nights, the Platinum Triangle, and airport runs to SNA and LAX', why="Anaheim drivers work some of the most predictable demand in Southern California — park and resort traffic all day, arena events at night."),
 dict(slug='santa-ana', name='Santa Ana', office='our office near John Wayne Airport', drive='about 10 minutes', hotspots='downtown Santa Ana and the Civic Center, MainPlace, South Coast Metro and the 55/5 corridor into Irvine and Costa Mesa', why="Santa Ana sits in the middle of Orange County, which means short deadhead miles between fares in every direction."),
 dict(slug='irvine', name='Irvine', office='our office near John Wayne Airport', drive='about 10 minutes', hotspots='John Wayne Airport (SNA), the Irvine Spectrum, UC Irvine, and the business parks along Jamboree and the 405', why="Irvine riders skew toward airport runs and business travel — long, clean trips where a quiet Tesla earns better ratings and tips."),
 dict(slug='long-beach', name='Long Beach', office='our office near LAX', drive='about 25 minutes', hotspots='the Long Beach Airport, the port and downtown waterfront, Cal State Long Beach, Belmont Shore and the cruise terminal', why="Long Beach gives you a second airport, a cruise terminal and a dense downtown without LA-level congestion."),
 dict(slug='los-angeles', name='Los Angeles', office='our office near LAX', drive='minutes', hotspots='LAX, Downtown LA, Hollywood, Santa Monica and the Westside, USC and the stadiums', why="Los Angeles has the most rides in the country, and the most miles. That's exactly where the gas-versus-charging math swings hardest in your favor."),
]

def city_body(c):
    return f'''  <section class="page-hero"><div class="wrap">
    <span class="eyebrow">Tesla rental for rideshare · {c['name']}, CA</span>
    <h1 style="font-size:clamp(34px,5.4vw,58px);margin-top:12px;max-width:18ch">Rent a Tesla for Uber &amp; Lyft in <span class="accent">{c['name']}</span></h1>
    <p class="muted" style="font-size:18px;max-width:60ch;margin-top:16px">Flat $500/week for a Model 3, charging around $20 per 500 miles, no credit check, pickup {c['drive']} from {c['name']} at {c['office']}. {c['why']}</p>
    <div class="hero-cta" style="margin-top:26px"><button class="btn btn-primary" data-apply>Apply now — $9.99 →</button><a class="btn btn-ghost" href="/#cost">See what you keep</a></div>
    <p class="hero-note">$9.99 one-time application fee · Verified in 24–48 hrs · No credit check</p>
  </div></section>

  <section class="pad-sm"><div class="wrap">
    <div class="why-grid">
      <div class="why reveal"><div class="ic">{{{{icon:car}}}}</div><h3>Where {c['name']} drivers earn</h3><p>{c['hotspots'][0].upper()+c['hotspots'][1:]}. A Model 3 is approved on Uber and Lyft and qualifies for Comfort-tier rides.</p></div>
      <div class="why reveal"><div class="ic">{{{{icon:bolt}}}}</div><h3>Charging near you</h3><p>Superchargers are dense across {c['name']} and the surrounding freeways. Charging is tracked through Tesla's fleet system and billed automatically — about $20 per 500 miles across our fleet.</p></div>
      <div class="why reveal"><div class="ic">{{{{icon:calendar}}}}</div><h3>Pickup close by</h3><p>{c['office'][0].upper()+c['office'][1:]} is {c['drive']} from {c['name']}. One trip to pick up, and the car lives with you. We also have offices near LAX, SNA and Chapman — you're assigned the one with your car.</p></div>
    </div>
  </div></section>

  <section class="pad-sm band"><div class="wrap">
    <div class="shead left reveal" style="margin-bottom:24px"><span class="eyebrow">Pricing</span><h2>What it costs — nothing hidden</h2></div>
    <div class="prose" style="margin:0"><div class="tbl"><table>
      <tr><th>Item</th><th>Model 3</th><th>Model Y</th><th>Model X</th></tr>
      <tr><td>Weekly rent</td><td>$500</td><td>$600</td><td>$700</td></tr>
      <tr><td>Refundable deposit (one week)</td><td>$500</td><td>$600</td><td>$700</td></tr>
      <tr><td>Application fee (one time, non-refundable)</td><td colspan="3">$9.99</td></tr>
      <tr><td>Charging</td><td colspan="3">Pay for what you use — about $20 per 500 miles, billed automatically</td></tr>
      <tr><td>Insurance</td><td colspan="3">Your own full-coverage policy (comprehensive + collision)</td></tr>
      <tr><td>Mileage</td><td colspan="3">5,000 miles/week included</td></tr>
    </table></div></div>
    <p class="muted small">One-month minimum. No credit check. Full terms in the <a href="/terms" style="color:var(--accent)">rental terms</a>.</p>
  </div></section>

  <section class="pad-sm"><div class="wrap">
    <div class="shead left reveal" style="margin-bottom:20px"><span class="eyebrow">Available now</span><h2>Cars ready this week</h2><p id="availLine"></p></div>
    <div class="fleet-grid" id="fleetGrid"></div>
  </div></section>

  <section class="pad-sm"><div class="wrap">
    <div class="cta-band reveal"><h2>Driving in {c['name']} this week?</h2><p>Apply in two minutes for $9.99. Verified in 24–48 hours.</p><button class="btn" data-apply>Apply now →</button></div>
  </div></section>
'''

def city_page(c):
    return dict(path=f"/tesla-rental-{c['slug']}", src=None, body=city_body(c), active='fleet',
        title=f"Rent a Tesla for Uber & Lyft in {c['name']}, CA — $500/week | Sophic Rentals",
        desc=f"Tesla rental for rideshare drivers in {c['name']}: Model 3 from $500/week, charging about $20 per 500 miles, no credit check, pickup {c['drive']} away. Apply in two minutes.",
        og_title=f"Rent a Tesla for rideshare in {c['name']} — $500/week",
        ld=[dict(BIZ, areaServed=[{"@type":"City","name":c['name']}])], priority='0.8')

ARTICLE_LD = {"@context":"https://schema.org","@type":"Article","headline":"Tesla vs. gas car for Uber in Orange County: the weekly math","author":{"@type":"Organization","name":"Sophic Rentals"},"publisher":{"@type":"Organization","name":"Sophic Rentals"},"datePublished":"2026-09-10","mainEntityOfPage":DOMAIN+"/tesla-vs-gas-for-uber"}

PAGES = [
 dict(path='/', src='index.body.html', active='', hero=True, priority='1.0', changefreq='weekly',
      title='Rent a Tesla for Uber & Lyft in LA & Orange County — $500/week | Sophic Rentals',
      og_title='Sophic Rentals — Rent a Tesla for rideshare. No car payment. No gas.',
      desc='Long-term Tesla rentals for Uber, Lyft & DoorDash drivers in Los Angeles and Orange County. 53 Teslas, three pickup locations (LAX, SNA, Chapman), Model 3 from $500/week, no credit check, on the road in 48 hours.',
      ld=[BIZ, HOME_FAQ]),
 dict(path='/drive', src='drive.body.html', active='drive', app_type='driver', hero=True, priority='0.9', changefreq='weekly',
      title='Drive a Tesla on our Uber fleet — no car, no insurance to buy | Sophic Rentals',
      og_title='No car? Drive ours. Keep what you earn after the weekly target.',
      desc="Sophic's fleet driver program: we provide the Tesla, insurance and maintenance. Half your earnings go toward the car until the weekly target, then you keep 100%. Apply in two minutes.",
      ld=[dict(BIZ, name='Sophic Rentals — Fleet Driver Program')]),
 dict(path='/thanks', src='thanks.body.html', active='', noindex=True, modal=False,
      title='Last step — upload your license | Sophic Rentals', desc='Finish your Sophic Rentals application by uploading photos of your license.'),
 dict(path='/privacy', src='privacy.body.html', active='', priority='0.3', title='Privacy Policy | Sophic Rentals', desc='What Sophic Rentals collects when you apply, why, who we share it with, and your California privacy rights.'),
 dict(path='/terms', src='terms.body.html', active='', priority='0.3', title='Terms of Service & Application Fee Policy | Sophic Rentals', desc='Application fee policy (non-refundable), eligibility, and a plain-English summary of Sophic Rentals rental and fleet-driver terms.'),
 dict(path='/tesla-vs-gas-for-uber', src='article.body.html', active='', priority='0.7', title='Tesla vs. gas car for Uber in Orange County: the weekly math | Sophic Rentals', og_title='Tesla vs. gas for Uber: the weekly math', desc='A full-time rideshare driver in Orange County spends about $126/week on gas in a 28-mpg sedan. The same miles in a Sophic Tesla cost about $29 — here is the arithmetic, with the assumptions shown.', ld=[ARTICLE_LD]),
 dict(path='/404', src='404.body.html', active='', noindex=True, title='Page not found | Sophic Rentals', desc='That page does not exist.'),
] + [city_page(c) for c in CITIES]
