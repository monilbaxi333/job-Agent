const { BasePlatform } = require('./base');

const SUPPORTED_ATS = [
  'greenhouse.io',
  'lever.co',
  'ashbyhq.com',
  'jobs.ashby',
  'workable.com',
  'smartrecruiters.com',
];

function isSupported(link) {
  return SUPPORTED_ATS.some(ats => link.includes(ats));
}

class GreenhouseApplier extends BasePlatform {
  constructor(context, config, logger) {
    super(context, config, logger);
    this.name = 'Greenhouse';
  }

  async searchJobs() {
    const jobs = [];
    const keywords = this.config.keywords.map(k => k.toLowerCase());

    const jobicyTags = ['node', 'react', 'javascript', 'typescript', 'backend',
                        'fullstack', 'software-engineer', 'engineer'];
    for (const tag of jobicyTags) {
      try {
        const res = await fetch(`https://jobicy.com/api/v2/remote-jobs?tag=${tag}&count=20&geo=usa`);
        const data = await res.json();
        for (const job of (data.jobs || [])) {
          const score = this.scoreJob({ title: job.jobTitle, description: job.jobDescription });
          if (score === 0) continue;
          const applyLink = job.jobApplyUrl || job.url;
          jobs.push({
            id: `jobicy-${job.id}`,
            title: job.jobTitle,
            company: job.companyName,
            location: job.jobGeo || 'Remote',
            link: applyLink,
            listingUrl: job.url,
            platform: 'Greenhouse',
            matchScore: score,
          });
        }
        this.logger.info(`Jobicy [${tag}]: ${(data.jobs||[]).length} raw jobs`);
      } catch (err) { this.logger.error(`Jobicy fetch error (${tag}): ${err.message}`); }
    }

    // Arbeitnow — links go directly to company apply pages
    try {
      const res = await fetch('https://arbeitnow.com/api/job-board-api');
      const data = await res.json();
      for (const job of (data.data || []).slice(0, 100)) {
        const combined = (job.title + ' ' + (job.description || '')).toLowerCase();
        if (!keywords.some(k => combined.includes(k))) continue;
        const score = this.scoreJob({ title: job.title, description: job.description });
        if (score === 0) continue;
        jobs.push({
          id: job.slug || job.url,
          title: job.title,
          company: job.company_name,
          location: job.location,
          link: job.url,
          platform: 'Greenhouse',
          matchScore: score,
        });
      }
    } catch (err) { this.logger.error(`Arbeitnow fetch error: ${err.message}`); }

    // Deduplicate
    const seen = new Set();
    const unique = jobs.filter(j => seen.has(j.id) ? false : seen.add(j.id));

    // Only keep jobs on supported ATS platforms
    const supported = unique.filter(j => isSupported(j.link));
    this.logger.info(`Greenhouse: ${unique.length} total, ${supported.length} on supported ATS`);
    return supported.sort((a, b) => b.matchScore - a.matchScore);
  }

  async apply(job, coverLetter) {
    const page = await this.context.newPage();
    const p = this.config.profile;
    try {
      await page.goto(job.link, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const url = page.url();
      this.logger.info(`🔗 Apply page: ${url}`);

      if (url.includes('greenhouse.io') || url.includes('boards.greenhouse.io')) {
        return await this._applyGreenhouse(page, p, coverLetter);
      } else if (url.includes('lever.co')) {
        return await this._applyLever(page, p, coverLetter);
      } else if (url.includes('ashbyhq.com') || url.includes('jobs.ashby')) {
        return await this._applyAshby(page, p, coverLetter);
      } else if (url.includes('workable.com')) {
        return await this._applyWorkable(page, p, coverLetter);
      } else if (url.includes('smartrecruiters.com')) {
        return await this._applySmartRecruiters(page, p, coverLetter);
      } else {
        return await this._applyGeneric(page, p, coverLetter);
      }
    } catch (err) {
      this.logger.error(`Greenhouse apply error: ${err.message}`);
    } finally {
      await page.close();
    }
    return false;
  }

  async _applyGreenhouse(page, p, coverLetter) {
    await this.safeType(page, '#first_name', p.firstName);
    await this.safeType(page, '#last_name', p.lastName);
    await this.safeType(page, '#email', p.email);
    await this.safeType(page, '#phone', p.phone);
    await this.safeType(page, '#job_application_answers_attributes_0_text_value', coverLetter);
    await this.safeType(page, 'input[placeholder*="LinkedIn"]', p.linkedIn);
    await this._uploadResume(page);
    const btn = page.locator('#submit_app, button[type="submit"]').first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click(); await page.waitForTimeout(2000); return true;
    }
    return false;
  }

  async _applyLever(page, p, coverLetter) {
    const applyUrl = page.url().replace(/\?.*$/, '') + '/apply';
    await page.goto(applyUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await this.safeType(page, 'input[name="name"]', `${p.firstName} ${p.lastName}`);
    await this.safeType(page, 'input[name="email"]', p.email);
    await this.safeType(page, 'input[name="phone"]', p.phone);
    await this.safeType(page, 'input[name="urls[LinkedIn]"]', p.linkedIn);
    await this.safeType(page, 'textarea[name="comments"]', coverLetter);
    await this._uploadResume(page);
    const btn = page.locator('button[type="submit"]').first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click(); await page.waitForTimeout(2000); return true;
    }
    return false;
  }

  async _applyAshby(page, p, coverLetter) {
    await this.safeType(page, 'input[name="name"], input[placeholder*="Name"]', `${p.firstName} ${p.lastName}`);
    await this.safeType(page, 'input[name="email"], input[placeholder*="Email"]', p.email);
    await this.safeType(page, 'input[name="phone"], input[placeholder*="Phone"]', p.phone);
    await this._uploadResume(page);
    const btn = page.locator('button[type="submit"]').first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click(); await page.waitForTimeout(2000); return true;
    }
    return false;
  }

  async _applyWorkable(page, p, coverLetter) {
    await this.safeType(page, 'input[name="firstname"]', p.firstName);
    await this.safeType(page, 'input[name="lastname"]', p.lastName);
    await this.safeType(page, 'input[name="email"]', p.email);
    await this.safeType(page, 'input[name="phone"]', p.phone);
    await this._uploadResume(page);
    const btn = page.locator('button[type="submit"]').first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click(); await page.waitForTimeout(2000); return true;
    }
    return false;
  }

  async _applySmartRecruiters(page, p, coverLetter) {
    await this.safeType(page, 'input[id="firstName"]', p.firstName);
    await this.safeType(page, 'input[id="lastName"]', p.lastName);
    await this.safeType(page, 'input[id="email"]', p.email);
    await this.safeType(page, 'input[id="phoneNumber"]', p.phone);
    await this._uploadResume(page);
    const btn = page.locator('button[data-ui="submit-btn"], button[type="submit"]').first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click(); await page.waitForTimeout(2000); return true;
    }
    return false;
  }

  async _applyGeneric(page, p, coverLetter) {
    await this.safeType(page, 'input[name*="first"], input[id*="first"]', p.firstName);
    await this.safeType(page, 'input[name*="last"], input[id*="last"]', p.lastName);
    await this.safeType(page, 'input[type="email"], input[name*="email"]', p.email);
    await this.safeType(page, 'input[type="tel"], input[name*="phone"]', p.phone);
    await this.safeType(page, 'textarea', coverLetter);
    await this._uploadResume(page);
    const btn = page.locator('button[type="submit"], input[type="submit"]').first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click(); await page.waitForTimeout(2000); return true;
    }
    return false;
  }

  async _uploadResume(page) {
    const upload = page.locator('input[type="file"]').first();
    if (await upload.isVisible({ timeout: 2000 }).catch(() => false)) {
      await upload.setInputFiles(this.config.resumePath);
      await page.waitForTimeout(1500);
    }
  }

  async safeType(page, selector, value) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 2000 })) await el.fill(String(value ?? ''));
    } catch (_) {}
  }
}


class LeverApplier extends BasePlatform {
  constructor(context, config, logger) {
    super(context, config, logger);
    this.name = 'Lever';
  }

  async searchJobs() {
    const jobs = [];

    const remotiveTags = ['node', 'react', 'full-stack', 'backend', 'javascript',
                          'typescript', 'software-engineer', 'web-developer'];
    for (const tag of remotiveTags) {
      try {
        const res = await fetch(`https://remotive.com/api/remote-jobs?search=${tag}&limit=20`);
        const data = await res.json();
        for (const job of (data.jobs || [])) {
          const score = this.scoreJob({ title: job.title, description: job.description });
          if (score === 0) continue;
          jobs.push({
            id: `remotive-${job.id}`,
            title: job.title,
            company: job.company_name,
            location: job.candidate_required_location || 'Remote',
            link: job.url,
            platform: 'Lever',
            matchScore: score,
          });
        }
        this.logger.info(`Remotive [${tag}]: ${(data.jobs||[]).length} raw jobs`);
      } catch (err) { this.logger.error(`Remotive fetch error (${tag}): ${err.message}`); }
    }

    // Deduplicate
    const seen = new Set();
    const unique = jobs.filter(j => seen.has(j.id) ? false : seen.add(j.id));

    // Only keep jobs on supported ATS platforms
    const supported = unique.filter(j => isSupported(j.link));
    this.logger.info(`Lever: ${unique.length} total, ${supported.length} on supported ATS`);
    return supported.sort((a, b) => b.matchScore - a.matchScore);
  }

  async apply(job, coverLetter) {
    const page = await this.context.newPage();
    const p = this.config.profile;
    try {
      await page.goto(job.link, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const url = page.url();
      this.logger.info(`🔗 Apply page: ${url}`);

      if (url.includes('lever.co')) {
        const applyUrl = url.replace(/\?.*$/, '') + '/apply';
        await page.goto(applyUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await this.safeType(page, 'input[name="name"]', `${p.firstName} ${p.lastName}`);
        await this.safeType(page, 'input[name="email"]', p.email);
        await this.safeType(page, 'input[name="phone"]', p.phone);
        await this.safeType(page, 'input[name="urls[LinkedIn]"]', p.linkedIn);
        await this.safeType(page, 'textarea[name="comments"]', coverLetter);
      } else if (url.includes('greenhouse.io')) {
        await this.safeType(page, '#first_name', p.firstName);
        await this.safeType(page, '#last_name', p.lastName);
        await this.safeType(page, '#email', p.email);
        await this.safeType(page, '#phone', p.phone);
        await this.safeType(page, '#job_application_answers_attributes_0_text_value', coverLetter);
        await this.safeType(page, 'input[placeholder*="LinkedIn"]', p.linkedIn);
      } else if (url.includes('ashbyhq.com') || url.includes('jobs.ashby')) {
        await this.safeType(page, 'input[name="name"], input[placeholder*="Name"]', `${p.firstName} ${p.lastName}`);
        await this.safeType(page, 'input[name="email"], input[placeholder*="Email"]', p.email);
        await this.safeType(page, 'input[name="phone"], input[placeholder*="Phone"]', p.phone);
      } else if (url.includes('workable.com')) {
        await this.safeType(page, 'input[name="firstname"]', p.firstName);
        await this.safeType(page, 'input[name="lastname"]', p.lastName);
        await this.safeType(page, 'input[name="email"]', p.email);
        await this.safeType(page, 'input[name="phone"]', p.phone);
      } else {
        await this.safeType(page, 'input[type="email"]', p.email);
        await this.safeType(page, 'input[type="tel"]', p.phone);
        await this.safeType(page, 'textarea', coverLetter);
      }

      const upload = page.locator('input[type="file"]').first();
      if (await upload.isVisible({ timeout: 2000 }).catch(() => false)) {
        await upload.setInputFiles(this.config.resumePath);
        await page.waitForTimeout(1500);
      }

      const btn = page.locator('button[type="submit"], input[type="submit"]').first();
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
    } catch (_) {}
  }
}

module.exports = { GreenhouseApplier, LeverApplier };