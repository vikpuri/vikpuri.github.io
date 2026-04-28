const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await ctx.newPage();
  await page.route('**/*.{png,jpg,jpeg,gif,webp,woff,woff2,mp4}', r => r.abort());
  await page.goto(
    'https://www.redfin.com/zipcode/85339/filter/min-price=800000,min-baths=2,min-sqft=2000,min-lot-size=5000-sqft,property-type=house+townhouse',
    { waitUntil: 'domcontentloaded', timeout: 45000 }
  );
  await page.waitForTimeout(4000);

  // 1. Check for embedded JSON
  const embedded = await page.evaluate(function() {
    var scripts = Array.from(document.querySelectorAll('script:not([src])'));
    for (var s of scripts) {
      var t = s.textContent || '';
      if (t.includes('reactInitialState') || t.includes('"homes"') || t.includes('"latitude"')) {
        return t.slice(0, 600);
      }
    }
    return null;
  });
  console.log('Embedded JSON found:', embedded ? embedded.slice(0, 300) : 'none');

  // 2. Get full HTML of first HomeCardContainer
  const cardHtml = await page.evaluate(function() {
    var c = document.querySelector('.HomeCardContainer');
    return c ? c.innerHTML.slice(0, 1200) : 'none';
  });
  console.log('\nFirst card HTML:\n', cardHtml);

  // 3. Get all cards with full text
  const allCards = await page.evaluate(function() {
    return Array.from(document.querySelectorAll('.HomeCardContainer')).map(function(el) {
      var a = el.querySelector('a[href*="/home/"]');
      return {
        href: a ? a.href : null,
        text: el.innerText.trim().slice(0, 300),
      };
    }).filter(function(c) { return c.href; });
  });
  console.log('\nAll cards (', allCards.length, '):');
  allCards.forEach(function(c, i) { console.log(i, c.href.slice(0,80)); console.log('  ', c.text.slice(0,100)); });

  await browser.close();
})().catch(e => console.error('Fatal:', e.message));
