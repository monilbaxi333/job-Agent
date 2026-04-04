const { BasePlatform } = require('./base');

class GreenhouseApplier extends BasePlatform {
  constructor(context, config, logger) {
    super(context, config, logger);
    this.name = 'Greenhouse';
  }

  async searchJobs() {
    const jobs = [];
    const keywords = this.config.keywords.map(k => k.toLowerCase());

    // Jobicy free API — no auth, has entry-level roles
    const jobicyTags = ['node', 'react', 'javascript', 'typescript', 'backend'];
    for (const tag of jobicyTags) {
      try {
        const res = await fetch(`https://jobicy.com/api/v2/remote-jobs?tag=${tag}&count=20&geo=usa`);
        const data = await res.json();
        for (const job of (data.jobs || [])) {
          const score = this.scoreJob({ title: job.jobTitle, description: job.jobDescription });
          if (score === 0) continue;
          jobs.push({
            id: `jobicy-${job.id}`, title: job.jobTitle, company: job.companyName,
            location: job.jobGeo || 'Remote', link: job.url, platform: 'Greenhouse', matchScore: score,
          });
        }
        this.logger.info(`Jobicy [${tag}]: ${(data.jobs || []).length} raw jobs`);
      } catch (err) { this.logger.error(`Jobicy fetch error (${kw}): ${err.message}`); }
    }

    // Arbeitnow fallback
    try {
      const res = await fetch('https://arbeitnow.com/api/job-board-api');
      const data = await res.json();
      for (const job of (data.data || []).slice(0, 100)) {
        const combined = (job.title + ' ' + (job.description || '')).toLowerCase();
        if (!keywords.some(k => combined.includes(k))) continue;
        const score = this.scoreJob({ title: job.title, description: job.description });
        if (score === 0) continue;
        jobs.push({
          id: job.slug || job.url, title: job.title, company: job.company_name,
          location: job.location, link: job.url, platform: 'Greenhouse', matchScore: score,
        });
      }
    } catch (err) { this.logger.error(`Arbeitnow fetch error: ${err.message}`); }

    const seen = new Set();
    return jobs.filter(j => seen.has(j.id) ? false : seen.add(j.id))
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  async apply(job, coverLetter) {
    const page = await this.context.newPage();
    const p = this.config.profile;
    try {
      await page.goto(job.link, { waitUntil: 'domcontentloaded', timeout: 15000 });
      //await page.goto(job.link, { waitUntil: 'domcontentloaded', timeout: 15000 });
      this.logger.info(`🔗 Applying at: ${job.link}`);
      await this.safeType(page, '#first_name', p.firstName);
      await this.safeType(page, '#last_name', p.lastName);
      await this.safeType(page, '#email', p.email);
      await this.safeType(page, '#phone', p.phone);
      await this.safeType(page, '#job_application_answers_attributes_0_text_value', coverLetter);
      await this.safeType(page, 'input[placeholder*="LinkedIn"]', p.linkedIn);
      const upload = page.locator('input[type="file"]').first();
      if (await upload.isVisible({ timeout: 2000 }).catch(() => false)) {
        await upload.setInputFiles(this.config.resumePath);
        await page.waitForTimeout(1500);
      }
      const btn = page.locator('#submit_app, input[type="submit"], button[type="submit"]').first();
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn.click(); await page.waitForTimeout(2000); return true;
      }
    } catch (err) { this.logger.error(`Greenhouse apply error: ${err.message}`); }
    finally { await page.close(); }
    return false;
  }

  async safeType(page, selector, value) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 2000 })) await el.fill(String(value ?? ''));
    } catch (_) { }
  }
}

class LeverApplier extends BasePlatform {
  constructor(context, config, logger) {
    super(context, config, logger);
    this.name = 'Lever';
  }

  async searchJobs() {
    const jobs = [];

    // Remotive free API
    const remotiveTags = ['node', 'react', 'full-stack', 'backend', 'javascript'];
    for (const tag of remotiveTags) {
      try {
        const res = await fetch(`https://remotive.com/api/remote-jobs?search=${tag}&limit=20`);
        const data = await res.json();
        for (const job of (data.jobs || [])) {
          const score = this.scoreJob({ title: job.title, description: job.description });
          if (score === 0) continue;
          jobs.push({
            id: `remotive-${job.id}`, title: job.title, company: job.company_name,
            location: job.candidate_required_location || 'Remote', link: job.url,
            platform: 'Lever', matchScore: score,
          });
        }
        this.logger.info(`Remotive [${tag}]: ${(data.jobs || []).length} raw jobs`);
      } catch (err) { this.logger.error(`Remotive fetch error (${kw}): ${err.message}`); }
    }

    const seen = new Set();
    return jobs.filter(j => seen.has(j.id) ? false : seen.add(j.id))
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  async apply(job, coverLetter) {
    const page = await this.context.newPage();
    const p = this.config.profile;
    try {
      const applyUrl = job.link.replace(/\?.*$/, '') + '/apply';
      await page.goto(applyUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await this.safeType(page, 'input[name="name"]', `${p.firstName} ${p.lastName}`);
      await this.safeType(page, 'input[name="email"]', p.email);
      await this.safeType(page, 'input[name="phone"]', p.phone);
      await this.safeType(page, 'input[name="urls[LinkedIn]"]', p.linkedIn);
      await this.safeType(page, 'textarea[name="comments"]', coverLetter);
      const upload = page.locator('input[type="file"]').first();
      if (await upload.isVisible({ timeout: 2000 }).catch(() => false)) {
        await upload.setInputFiles(this.config.resumePath);
        await page.waitForTimeout(1500);
      }
      const btn = page.locator('button[type="submit"]').first();
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn.click(); await page.waitForTimeout(2000); return true;
      }
    } catch (err) { this.logger.error(`Lever apply error: ${err.message}`); }
    finally { await page.close(); }
    return false;
  }

  async safeType(page, selector, value) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 2000 })) await el.fill(String(value ?? ''));
    } catch (_) { }
  }
}

module.exports = { GreenhouseApplier, LeverApplier };