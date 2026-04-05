const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch({ headless: false }); // visible so you can see
  const page = await browser.newPage();
  
  await page.goto('https://jobicy.com/jobs/141591-customer-success-engineer-2', 
    { waitUntil: 'domcontentloaded', timeout: 15000 });
  
  // Listen for new pages/popups
  const [newPage] = await Promise.all([
    browser.waitForEvent('page').catch(() => null),
    page.click('a:has-text("Apply now")').catch(() => 
      page.click('a:has-text("Apply")'))
  ]);
  
  await page.waitForTimeout(3000);
  
  const finalUrl = newPage ? newPage.url() : page.url();
  console.log('After clicking Apply:', finalUrl);
  
  await browser.close();
}

test().catch(console.error);