# Page registry for build.py
FEE = '9.99'
DOMAIN = 'https://sophicrentals.com'

BIZ = {"@context":"https://schema.org","@type":"AutoRental","name":"Sophic Rentals","description":"Long-term Tesla rentals for Uber, Lyft and delivery drivers in Los Angeles and Orange County.","founder":{"@type":"Person","name":"Shayle Gupta"},"url":DOMAIN+"/","email":"Sophicrentals@gmail.com","image":DOMAIN+"/images/og-card.jpg","priceRange":"$500-$700 / week","address":{"@type":"PostalAddress","streetAddress":"393 N Cypress St","addressLocality":"Orange","addressRegion":"CA","postalCode":"92866","addressCountry":"US"},"geo":{"@type":"GeoCoordinates","latitude":33.7925,"longitude":-117.8531},"areaServed":[{"@type":"City","name":"Los Angeles"},{"@type":"AdministrativeArea","name":"Orange County"}],"location":[{"@type":"Place","name":"Sophic Rentals — Orange (next to Chapman University)","address":{"@type":"PostalAddress","streetAddress":"393 N Cypress St","addressLocality":"Orange","addressRegion":"CA","postalCode":"92866"}},{"@type":"Place","name":"Sophic Rentals — near John Wayne Airport (SNA)","address":{"@type":"PostalAddress","addressLocality":"Irvine","addressRegion":"CA"}},{"@type":"Place","name":"Sophic Rentals — near LAX","address":{"@type":"PostalAddress","addressLocality":"Los Angeles","addressRegion":"CA"}}],"makesOffer":[{"@type":"Offer","name":"Tesla Model 3 weekly rental for rideshare","priceCurrency":"USD","price":"500","priceSpecification":{"@type":"UnitPriceSpecification","price":"500","priceCurrency":"USD","unitText":"week"}},{"@type":"Offer","name":"Tesla Model Y weekly rental for rideshare","priceCurrency":"USD","price":"600"},{"@type":"Offer","name":"Tesla Model X weekly rental for rideshare","priceCurrency":"USD","price":"700"}]}

HOME_FAQ = {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
 {"@type":"Question","name":"What does it cost?","acceptedAnswer":{"@type":"Answer","text":"Model 3 is $500/week, Model Y $600, Model X $700. At pickup you pay a refundable deposit equal to one week's rent plus the first week: $1,000 for a Model 3. Applying is free; a $9.99 verification fee is charged when you finish your application and is credited to your first week. Charging is about $20 per 500 miles, billed automatically. Insurance is your own full-coverage policy. Minimum term is one month."}},
 {"@type":"Question","name":"Does it cost anything to apply?","acceptedAnswer":{"@type":"Answer","text":"Checking availability is free. A $9.99 verification fee is charged when you finish your application and is credited toward your first week's rent. It is not refunded if you are declined."}},
 {"@type":"Question","name":"What insurance do I need?","acceptedAnswer":{"@type":"Answer","text":"Your own full-coverage auto policy (liability, comprehensive and collision) that extends to a rental vehicle, with Sophic Rentals listed as an additional interest. We verify it with your carrier before pickup."}},
 {"@type":"Question","name":"What do I need to qualify?","acceptedAnswer":{"@type":"Answer","text":"21 or older, a valid unsuspended U.S. driver's license, and active insurance. No credit check."}},
 {"@type":"Question","name":"How fast can I start?","acceptedAnswer":{"@type":"Answer","text":"Most drivers are verified within 24-48 hours of uploading their license, then pick up at whichever of our three offices has their car."}},
 {"@type":"Question","name":"Is there a mileage limit?","acceptedAnswer":{"@type":"Answer","text":"5,000 miles per week are included; $1 per mile over."}},
 {"@type":"Question","name":"Where do I pick up the car?","acceptedAnswer":{"@type":"Answer","text":"One of three Sophic offices: near LAX, near John Wayne Airport (SNA), or next to Chapman University in Orange, depending on where your car is."}}]}

CITIES = [
 dict(slug='anaheim', name='Anaheim', short='Chapman University (Orange)', office='our office next to Chapman University in Orange', drive='about 10 minutes', hotspots='Disneyland and the Anaheim Resort, Angel Stadium and Honda Center on game nights, the Platinum Triangle, and airport runs to SNA and LAX', why="Anaheim drivers work some of the most predictable demand in Southern California — park and resort traffic all day, arena events at night."),
 dict(slug='santa-ana', name='Santa Ana', short='John Wayne Airport (SNA)', office='our office near John Wayne Airport', drive='about 10 minutes', hotspots='downtown Santa Ana and the Civic Center, MainPlace, South Coast Metro and the 55/5 corridor into Irvine and Costa Mesa', why="Santa Ana sits in the middle of Orange County, which means short deadhead miles between fares in every direction."),
 dict(slug='irvine', name='Irvine', short='John Wayne Airport (SNA)', office='our office near John Wayne Airport', drive='about 10 minutes', hotspots='John Wayne Airport (SNA), the Irvine Spectrum, UC Irvine, and the business parks along Jamboree and the 405', why="Irvine riders skew toward airport runs and business travel — long, clean trips where a quiet Tesla earns better ratings and tips."),
 dict(slug='long-beach', name='Long Beach', short='LAX', office='our office near LAX', drive='about 25 minutes', hotspots='the Long Beach Airport, the port and downtown waterfront, Cal State Long Beach, Belmont Shore and the cruise terminal', why="Long Beach gives you a second airport, a cruise terminal and a dense downtown without LA-level congestion."),
 dict(slug='los-angeles', name='Los Angeles', short='LAX', office='our office near LAX', drive='a short drive', hotspots='LAX, Downtown LA, Hollywood, Santa Monica and the Westside, USC and the stadiums', why="Los Angeles has the most rides in the country, and the most miles. That's exactly where the gas-versus-charging math swings hardest in your favor."),
]

def city_body(c):
    return f'''  <section class="page-hero"><div class="wrap">
    <span class="eyebrow">Serving {c['name']} · pickup near {c['short']}</span>
    <h1 style="font-size:clamp(34px,5.4vw,58px);margin-top:12px;max-width:20ch">Tesla rentals for {c['name']} drivers — <span class="accent">pickup near {c['short']}</span>, {c['drive']} away</h1>
    <p class="muted" style="font-size:18px;max-width:60ch;margin-top:16px">We don't have an office in {c['name']}; {c['name']} drivers pick up at {c['office']}, {c['drive']} away, once — then the car lives with you. Flat $500/week for a Model 3, charging around $20 per 500 miles, no credit check. {c['why']}</p>
    <div class="hero-cta" style="margin-top:26px"><button class="btn btn-primary" data-apply>Check availability — free →</button><a class="btn btn-ghost" href="/#cost">See what you keep</a></div>
    <p class="hero-note">Free to apply · No credit check · Upfront at pickup: $500 deposit + $500 first week</p>
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
      <tr><td>Due at pickup (deposit + first week)</td><td>$1,000</td><td>$1,200</td><td>$1,400</td></tr>
      <tr><td>Verification fee (when you finish applying)</td><td colspan="3">$9.99 — credited to your first week</td></tr>
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
    <div class="cta-band reveal"><h2>Driving in {c['name']} this week?</h2><p>Check availability free in 30 seconds. We text you back.</p><button class="btn" data-apply>Check availability — free →</button></div>
  </div></section>
'''

def city_page(c):
    return dict(path=f"/tesla-rental-{c['slug']}", src=None, body=city_body(c), active='fleet',
        title=f"Tesla rental for Uber & Lyft serving {c['name']} — pickup near {c['short']} | Sophic Rentals",
        desc=f"Tesla rentals for {c['name']} rideshare and delivery drivers with pickup near {c['short']}, {c['drive']} away. Model 3 from $500/week, no credit check, free to apply.",
        og_title=f"Serving {c['name']}: Tesla rental for rideshare, pickup near {c['short']}",
        ld=[dict(BIZ, areaServed=[{"@type":"City","name":c['name']}])], priority='0.8')

ARTICLE_LD = {"@context":"https://schema.org","@type":"Article","headline":"Tesla vs. gas car for Uber in Orange County: the weekly math","author":{"@type":"Organization","name":"Sophic Rentals"},"publisher":{"@type":"Organization","name":"Sophic Rentals"},"datePublished":"2026-09-10","mainEntityOfPage":DOMAIN+"/tesla-vs-gas-for-uber"}

PAGES = [
 dict(path='/', src='index.body.html', active='', hero=True, priority='1.0', changefreq='weekly',
      title='Rent a Tesla for Uber & Lyft in LA & Orange County — $500/week | Sophic Rentals',
      og_title='Sophic Rentals — Rent a Tesla for rideshare. No car payment. No gas.',
      desc='Long-term Tesla rentals for Uber, Lyft & delivery drivers in Los Angeles and Orange County. Free to apply, no credit check, Model 3 from $500/week, pickup near LAX, SNA or Chapman, on the road in 48 hours.',
      ld=[BIZ, HOME_FAQ]),
 dict(path='/drive', src='drive.body.html', active='drive', app_type='driver', hero=True, priority='0.9', changefreq='weekly',
      title='Drive a Tesla on our Uber fleet — no car, no insurance to buy | Sophic Rentals',
      og_title='No car? Drive ours. Keep what you earn after the weekly target.',
      desc="Sophic's fleet driver program: we provide the Tesla, insurance and maintenance. Half your earnings go toward the car until the weekly target, then you keep 100%. Apply in two minutes.",
      ld=[dict(BIZ, name='Sophic Rentals — Fleet Driver Program')]),
 dict(path='/thanks', src='thanks.body.html', active='', noindex=True, modal=False,
      title='Last step — upload your license | Sophic Rentals', desc='Finish your Sophic Rentals application by uploading photos of your license.'),
 dict(path='/privacy', src='privacy.body.html', active='', priority='0.3', title='Privacy Policy | Sophic Rentals', desc='What Sophic Rentals collects when you apply, why, who we share it with, and your California privacy rights.'),
 dict(path='/terms', src='terms.body.html', active='', priority='0.3', title='Terms of Service & Application Fee Policy | Sophic Rentals', desc='Verification fee policy, eligibility, and a plain-English summary of Sophic Rentals rental and fleet-driver terms.'),
 dict(path='/tesla-vs-gas-for-uber', src='article.body.html', active='', priority='0.7', title='Tesla vs. gas car for Uber in Orange County: the weekly math | Sophic Rentals', og_title='Tesla vs. gas for Uber: the weekly math', desc='A full-time rideshare driver in Orange County spends about $126/week on gas in a 28-mpg sedan. The same miles in a Sophic Tesla cost about $29 — here is the arithmetic, with the assumptions shown.', ld=[ARTICLE_LD]),
 dict(path='/insurance', src='insurance.body.html', active='insurance', priority='0.8', title='How to get rideshare insurance for a rental Tesla in 24 hours | Sophic Rentals', og_title='Get rideshare-ready insurance in 24 hours', desc='Exactly what insurance you need to rent a Tesla for Uber or Lyft in California, what to ask your carrier, which insurers sell rideshare endorsements, and a 24-hour checklist.'),
 dict(path='/policies', src='policies.body.html', active='', priority='0.5', title='Deposit, maintenance & approval policies | Sophic Rentals', desc='How you get your deposit back, what maintenance Sophic covers, how the $9.99 verification fee works, and what happens if you are not approved.'),
 dict(path='/404', src='404.body.html', active='', noindex=True, title='Page not found | Sophic Rentals', desc='That page does not exist.'),
] + [city_page(c) for c in CITIES]
