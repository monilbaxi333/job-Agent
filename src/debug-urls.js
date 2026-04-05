/**
 * Debug: show what apply URLs the job APIs actually return
 * Run with: node src/debug-urls.js
 */

async function checkJobicy() {
  console.log('\n=== JOBICY ===');
  const tags = ['engineer', 'backend', 'fullstack', 'typescript'];
  for (const tag of tags) {
    try {
      const res = await fetch(`https://jobicy.com/api/v2/remote-jobs?tag=${tag}&count=10&geo=usa`);
      const data = await res.json();
      for (const job of (data.jobs || []).slice(0, 3)) {
        const applyUrl = job.jobApplyUrl || job.url;
        const domain = new URL(applyUrl).hostname;
        console.log(`[${tag}] ${job.jobTitle} @ ${job.companyName}`);
        console.log(`  applyUrl: ${applyUrl}`);
        console.log(`  domain:   ${domain}`);
      }
    } catch (e) { console.error(`Jobicy [${tag}] error:`, e.message); }
  }
}

async function checkRemotive() {
  console.log('\n=== REMOTIVE ===');
  const tags = ['react', 'full-stack', 'backend'];
  for (const tag of tags) {
    try {
      const res = await fetch(`https://remotive.com/api/remote-jobs?search=${tag}&limit=5`);
      const data = await res.json();
      for (const job of (data.jobs || []).slice(0, 3)) {
        const domain = new URL(job.url).hostname;
        console.log(`[${tag}] ${job.title} @ ${job.company_name}`);
        console.log(`  url:    ${job.url}`);
        console.log(`  domain: ${domain}`);
      }
    } catch (e) { console.error(`Remotive [${tag}] error:`, e.message); }
  }
}

checkJobicy().then(checkRemotive).catch(console.error);