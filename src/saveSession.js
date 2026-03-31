/**
 * saveSession.js — Run this ONCE to log in manually and save cookies.
 * After this, the main agent runs headlessly without logging in each time.
 *
 * Usage: node src/saveSession.js
 */

const { chromium } = require('playwright');
const config = require('../config/profile');

(async () => {
  console.log('🔐 Opening browser for manual login...');
  console.log('   Log in to LinkedIn, then close the browser window.');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page    = await context.newPage();

  await page.goto('https://www.linkedin.com/login');
  console.log('   Waiting for you to log in...');

  // Wait until redirected to feed (login complete)
  await page.waitForURL('**/feed/**', { timeout: 120000 });
  console.log('✅ Logged in! Saving session...');

  await context.storageState({ path: config.sessionFile });
  console.log(`💾 Session saved to ${config.sessionFile}`);
  console.log('   You can now run: npm start');

  await browser.close();
})();
