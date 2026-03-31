/**
 * Greenhouse Applier
 * Handles jobs hosted on boards.greenhouse.io
 */

const { BasePlatform } = require('./base');

class GreenhouseApplier extends BasePlatform {
  constructor(context, config, logger) {
    super(context, config, logger);
    this.name = 'Greenhouse';
  }

  async searchJobs() {
    // Greenhouse doesn't have a central search — jobs are per-company.
    // This searches via Google for Greenhouse-hosted listings matching our keywords.
    const page = await this.context.newPage();
    const jobs = [];

    try {
      const query = encodeURIComponent(
        `site:boards.greenhouse.io ${this.config.keywords.slice(0,3).join(' ')} ${this.config.location}`
      );
      await page.goto(`https://www.google.com/search?q=${query}&num=30`);
      await page.waitForSelector('#search', { timeout: 8000 });

      const results = await page.$$eval('#search a[href*="boards.greenhouse.io"]', (links) =>
        links.map((a) => ({
          link:    a.href,
          title:   a.innerText.trim().split('\n')[0],
          company: a.href.match(/boards\.greenhouse\.io\/([^/]+)/)?.[1] || 'Unknown',
        }))
      );

      for (const r of results) {
        r.id        = Buffer.from(r.link).toString('base64').slice(0, 16);
        r.platform  = 'Greenhouse';
        r.matchScore = this.scoreJob(r);
        jobs.push(r);
      }
    } finally {
      await page.close();
    }

    return jobs;
  }

  async apply(job, coverLetter) {
    const page = await this.context.newPage();
    const p    = this.config.profile;

    try {
      await page.goto(job.link, { waitUntil: 'domcontentloaded', timeout: 15000 });

      // Greenhouse standard form fields
      await this.safeType(page, '#first_name',   p.firstName);
      await this.safeType(page, '#last_name',    p.lastName);
      await this.safeType(page, '#email',        p.email);
      await this.safeType(page, '#phone',        p.phone);
      await this.safeType(page, '#job_application_answers_attributes_0_text_value', coverLetter);

      // Resume upload
      const upload = page.locator('input[type="file"]').first();
      if (await upload.isVisible()) {
        await upload.setInputFiles(this.config.resumePath);
        await page.waitForTimeout(1500);
      }

      // LinkedIn URL field (common on Greenhouse)
      await this.safeType(page, 'input[placeholder*="LinkedIn"]', p.linkedIn);

      // Submit
      await page.click('#submit_app');
      await page.waitForURL(/confirmation|thank/i, { timeout: 10000 });
      return true;
    } catch (err) {
      this.logger.error(`Greenhouse apply error: ${err.message}`);
      return false;
    } finally {
      await page.close();
    }
  }

  async safeType(page, selector, value) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 2000 })) await el.fill(String(value ?? ''));
    } catch (_) {}
  }
}


/**
 * Lever Applier
 * Handles jobs hosted on jobs.lever.co
 */

class LeverApplier extends BasePlatform {
  constructor(context, config, logger) {
    super(context, config, logger);
    this.name = 'Lever';
  }

  async searchJobs() {
    const page = await this.context.newPage();
    const jobs = [];

    try {
      const query = encodeURIComponent(
        `site:jobs.lever.co ${this.config.keywords.slice(0,3).join(' ')}`
      );
      await page.goto(`https://www.google.com/search?q=${query}&num=30`);
      await page.waitForSelector('#search', { timeout: 8000 });

      const results = await page.$$eval('#search a[href*="jobs.lever.co"]', (links) =>
        links.map((a) => ({
          link:    a.href,
          title:   a.innerText.trim().split('\n')[0],
          company: a.href.match(/jobs\.lever\.co\/([^/]+)/)?.[1] || 'Unknown',
        }))
      );

      for (const r of results) {
        r.id         = Buffer.from(r.link).toString('base64').slice(0, 16);
        r.platform   = 'Lever';
        r.matchScore = this.scoreJob(r);
        jobs.push(r);
      }
    } finally {
      await page.close();
    }

    return jobs;
  }

  async apply(job, coverLetter) {
    const page = await this.context.newPage();
    const p    = this.config.profile;

    try {
      // Lever apply page is /apply appended to job URL
      const applyUrl = job.link.replace(/\?.*$/, '') + '/apply';
      await page.goto(applyUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

      await this.safeType(page, 'input[name="name"]',       `${p.firstName} ${p.lastName}`);
      await this.safeType(page, 'input[name="email"]',      p.email);
      await this.safeType(page, 'input[name="phone"]',      p.phone);
      await this.safeType(page, 'input[name="urls[LinkedIn]"]', p.linkedIn);
      await this.safeType(page, 'textarea[name="comments"]', coverLetter);

      // Resume
      const upload = page.locator('input[type="file"]').first();
      if (await upload.isVisible()) {
        await upload.setInputFiles(this.config.resumePath);
        await page.waitForTimeout(1500);
      }

      await page.click('button[type="submit"]');
      await page.waitForSelector('.thanks, .confirmation, h1:has-text("Thank")', { timeout: 10000 });
      return true;
    } catch (err) {
      this.logger.error(`Lever apply error: ${err.message}`);
      return false;
    } finally {
      await page.close();
    }
  }

  async safeType(page, selector, value) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 2000 })) await el.fill(String(value ?? ''));
    } catch (_) {}
  }
}

module.exports = { GreenhouseApplier, LeverApplier };
