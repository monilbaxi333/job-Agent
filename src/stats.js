/**
 * stats.js — prints a markdown summary of today's run
 * Output goes to GitHub Actions step summary ($GITHUB_STEP_SUMMARY)
 */

const fs   = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../logs/applications.jsonl');

if (!fs.existsSync(logFile)) {
  console.log('## Job Agent Summary\nNo applications logged yet.');
  process.exit(0);
}

const today = new Date().toISOString().slice(0, 10);
const lines = fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean);
const entries = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

const todayEntries = entries.filter(e => e.timestamp?.startsWith(today));
const applied   = todayEntries.filter(e => e.status === 'applied');
const failed    = todayEntries.filter(e => e.status === 'failed');
const platforms = {};
applied.forEach(e => { platforms[e.platform] = (platforms[e.platform] || 0) + 1; });

const avgMatch = applied.length
  ? Math.round(applied.reduce((s, e) => s + (e.matchScore || 0), 0) / applied.length)
  : 0;

const top10 = applied.slice(-10).reverse();

console.log(`## 🤖 Job Agent Run — ${today}`);
console.log('');
console.log(`| Metric | Value |`);
console.log(`|--------|-------|`);
console.log(`| ✅ Applied | **${applied.length}** |`);
console.log(`| ❌ Failed  | ${failed.length} |`);
console.log(`| 🎯 Avg match score | ${avgMatch}% |`);
console.log(`| 📅 Total all-time  | ${entries.filter(e => e.status === 'applied').length} |`);
console.log('');
console.log('### By platform');
Object.entries(platforms).sort((a,b) => b[1]-a[1]).forEach(([p,n]) => {
  console.log(`- **${p}**: ${n}`);
});
console.log('');
console.log('### Last 10 applications');
console.log('| Title | Company | Platform | Match |');
console.log('|-------|---------|----------|-------|');
top10.forEach(e => {
  console.log(`| ${e.title} | ${e.company} | ${e.platform} | ${e.matchScore}% |`);
});
