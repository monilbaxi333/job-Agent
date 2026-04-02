/**
 * LinkedIn Easy Apply Automation
 * Searches jobs and submits via the "Easy Apply" button
 */

const { BasePlatform } = require('./base');

class LinkedInApplier extends BasePlatform {
  constructor(context, config, logger) {
    super(context, config, logger);
    this.name = 'LinkedIn';
    this.baseUrl = 'https://www.linkedin.com';
  }

  async login() {
    const page = await this.context.newPage();
    await page.goto('https://www.linkedin.com/login');
    await page.fill('#username', this.config.credentials.linkedin.email);
    await page.fill('#password', this.config.credentials.linkedin.password);
    await page.click('[data-litms-control-urn="login-submit"]');
    await page.waitForURL('**/feed/**', { timeout: 15000 });
    this.logger.info('✅ LinkedIn logged in');
    await page.close();
  }

  async searchJobs() {
    const page = await this.context.newPage();
    const jobs = [];

    try {
      const keywords = encodeURIComponent(this.config.keywords.join(' '));
      const location = encodeURIComponent(this.config.location);

      // f_AL = Easy Apply filter, f_WT=2 = Remote
      const url =
        `${this.baseUrl}/jobs/search/?keywords=${keywords}` +
        `&location=${location}&f_AL=true&f_WT=2&sortBy=DD`;

      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-job-id], [data-occludable-job-id]', { timeout: 10000 });

      // Scroll to load more listings
      await this.autoScroll(page);

      const listings = await page.$$eval(
        'li.jobs-search-results__list-item, li.scaffold-layout__list-item',
        (items) =>
          items.map((el) => ({
            id: el.querySelector('[data-job-id]')?.dataset.jobId ||
              el.querySelector('[data-occludable-job-id]')?.dataset.occludableJobId,
            title: el.querySelector('.job-card-list__title, .job-card-container__link')?.innerText?.trim(),
            company: el.querySelector('.job-card-container__company-name, .job-card-container__primary-description')?.innerText?.trim(),
            location: el.querySelector('.job-card-container__metadata-item')?.innerText?.trim(),
            link: el.querySelector('a[href*="/jobs/view"]')?.href,
          }))
            .filter((j) => j.id && j.title && j.link)
      )

      // Score each job against profile
      for (const job of listings) {
        job.platform = 'LinkedIn';
        job.matchScore = this.scoreJob(job);
        jobs.push(job);
      }
    } finally {
      await page.close();
    }

    return jobs.sort((a, b) => b.matchScore - a.matchScore);
  }

  async apply(job, coverLetter) {
    const page = await this.context.newPage();

    try {
      await page.goto(job.link, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.jobs-apply-button--top-card', { timeout: 8000 });

      // Click Easy Apply
      await page.click('.jobs-apply-button--top-card');
      await page.waitForSelector('.jobs-easy-apply-content', { timeout: 8000 });

      // Step through multi-page Easy Apply modal
      let steps = 0;
      while (steps < 10) {
        steps++;

        await this.fillContactInfo(page);
        await this.fillWorkExperience(page);
        await this.fillScreeningQuestions(page);
        await this.uploadResumeIfNeeded(page);
        await this.fillCoverLetterIfNeeded(page, coverLetter);

        // Check for Next / Review / Submit buttons
        const submitBtn = page.locator('button[aria-label="Submit application"]');
        const nextBtn = page.locator('button[aria-label="Continue to next step"]');
        const reviewBtn = page.locator('button[aria-label="Review your application"]');

        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForTimeout(2000);
          return true; // Successfully submitted
        } else if (await reviewBtn.isVisible()) {
          await reviewBtn.click();
        } else if (await nextBtn.isVisible()) {
          await nextBtn.click();
        } else {
          break; // No navigation button found, bail out
        }

        await page.waitForTimeout(1500);
      }

      return false;
    } catch (err) {
      this.logger.error(`LinkedIn apply failed for ${job.title}: ${err.message}`);
      // Close any open modal
      const closeBtn = page.locator('button[aria-label="Dismiss"]');
      if (await closeBtn.isVisible()) await closeBtn.click();
      return false;
    } finally {
      await page.close();
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  async fillContactInfo(page) {
    const p = this.config.profile;
    await this.safeType(page, 'input[id*="phoneNumber"]', p.phone);
    await this.safeType(page, 'input[id*="city"]', p.city);
  }

  async fillWorkExperience(page) {
    // LinkedIn sometimes asks years of experience per skill
    const questions = await page.$$('label:has-text("years of experience")');
    for (const label of questions) {
      const input = await label.$('xpath=following-sibling::input');
      if (input) await input.fill(String(this.config.profile.yearsOfExperience));
    }
  }

  async fillScreeningQuestions(page) {
    // Yes/No radio buttons — default to "Yes" for positive questions
    const yesRadios = await page.$$('input[type="radio"][value="Yes"]');
    for (const r of yesRadios) await r.check().catch(() => { });

    // Dropdowns — pick first non-empty option if unanswered
    const selects = await page.$$('select');
    for (const sel of selects) {
      const val = await sel.inputValue();
      if (!val) {
        const options = await sel.$$('option:not([value=""])');
        if (options.length) await sel.selectOption({ index: 1 });
      }
    }
  }

  async uploadResumeIfNeeded(page) {
    const upload = page.locator('input[type="file"]');
    if (await upload.isVisible()) {
      await upload.setInputFiles(this.config.resumePath);
    }
  }

  async fillCoverLetterIfNeeded(page, coverLetter) {
    const textarea = page.locator('textarea[id*="cover"]');
    if (await textarea.isVisible()) {
      await textarea.fill(coverLetter);
    }
  }

  async autoScroll(page) {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let total = 0;
        const distance = 400;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          total += distance;
          if (total >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 200);
      });
    });
  }

  async safeType(page, selector, value) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible()) {
        await el.fill(String(value));
      }
    } catch (_) { }
  }
}

module.exports = { LinkedInApplier };
