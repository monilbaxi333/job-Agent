/**
 * Greenhouse — uses Arbeitnow free API (no Google scraping)
 * Lever     — uses Remotive free API (no Google scraping)
 */

const { BasePlatform } = require('./base');

class GreenhouseApplier extends BasePlatform {
  constructor(context, config, logger) {
    super(context, config, logger);
    this.name = 'Greenhouse';
  }

  async searchJobs() {
    const page = await this.context.newPage();
    const jobs = [];
    try {
      await page.goto('https://arbeitnow.com/api/job-board-api', {
        waitUntil: 'domcontentloaded', timeout: 15000
      });
      const text = await page.textContent('body');
      const data = JSON.parse(text);
      const keywords = this.config.keywords.map(k => k.toLowerCase());
      for (const job of (data.data || []).slice(0, 100)) {
        const combined = (job.title + ' ' + job.description).toLowerCase();
        if (!keywords.some(k => combined.includes(k))) continue;
        jobs.push({
          id:         job.slug || job.url,
          title:      job.title,
          company:    job.company_name,
          location:   job.location,
          link:       job.url,
          platform:   'Greenhouse',
          matchScore: this.scoreJob({ title: job.title, description: job.description }),
        });
      }
    } catch (err) {
      this.logger.error(`Greenhouse API error: ${err.message}`);
    } finally {
      await page.close();
    }
    return jobs.sort((a, b) => b.matchScore - a.matchScore);
  }

  async apply(job, coverLetter) {
    const page = await this.context.newPage();
    const p = this.config.profile;
    try {
      await page.goto(job.link, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await this.safeType(page, '#first_name', p.firstName);
      await this.safeType(page, '#last_name',  p.lastName);
      await this.safeType(page, '#email',      p.email);
      await this.safeType(page, '#phone',      p.phone);
      await this.safeType(page, '#job_application_answers_attributes_0_text_value', coverLetter);
      await this.safeType(page, 'input[placeholder*="LinkedIn"]', p.linkedIn);
      const upload = page.locator('input[type="file"]').first();
      if (await upload.isVisible({ timeout: 2000 }).catch(() => false)) {
        await upload.setInputFiles(this.config.resumePath);
        await page.waitForTimeout(1500);
      }
      const submitBtn = page.locator('#submit_app, input[type="submit"], button[type="submit"]').first();
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
        return true;
      }
    } catch (err) {
      this.logger.error(`Greenhouse apply error: ${err.message}`);
    } finally {
      await page.close();
    }
    return false;
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
    const page = await this.context.newPage();
    const jobs = [];
    try {
      const keyword = encodeURIComponent(this.config.keywords[0] || 'software engineer');
      await page.goto(`https://remotive.com/api/remote-jobs?search=${keyword}&limit=50`, {
        waitUntil: 'domcontentloaded', timeout: 15000
      });
      const text = await page.textContent('body');
      const data = JSON.parse(text);
      for (const job of (data.jobs || [])) {
        jobs.push({
          id:         String(job.id),
          title:      job.title,
          company:    job.company_name,
          location:   job.candidate_required_location || 'Remote',
          link:       job.url,
          platform:   'Lever',
          matchScore: this.scoreJob({ title: job.title, description: job.description }),
        });
      }
    } catch (err) {
      this.logger.error(`Remotive API error: ${err.message}`);
    } finally {
      await page.close();
    }
    return jobs.sort((a, b) => b.matchScore - a.matchScore);
  }

  async apply(job, coverLetter) {
    const page = await this.context.newPage();
    const p = this.config.profile;
    try {
      const applyUrl = job.link.replace(/\?.*$/, '') + '/apply';
      await page.goto(applyUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await this.safeType(page, 'input[name="name"]',            `${p.firstName} ${p.lastName}`);
      await this.safeType(page, 'input[name="email"]',           p.email);
      await this.safeType(page, 'input[name="phone"]',           p.phone);
      await this.safeType(page, 'input[name="urls[LinkedIn]"]',  p.linkedIn);
      await this.safeType(page, 'textarea[name="comments"]',     coverLetter);
      const upload = page.locator('input[type="file"]').first();
      if (await upload.isVisible({ timeout: 2000 }).catch(() => false)) {
        await upload.setInputFiles(this.config.resumePath);
        await page.waitForTimeout(1500);
      }
      const submitBtn = page.locator('button[type="submit"]').first();
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
        return true;
      }
    } catch (err) {
      this.logger.error(`Lever apply error: ${err.message}`);
    } finally {
      await page.close();
    }
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