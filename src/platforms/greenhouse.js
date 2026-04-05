const { BasePlatform } = require('./base');

// Companies with public Greenhouse job boards
const GREENHOUSE_COMPANIES = [
  'stripe', 'notion', 'linear', 'supabase', 'retool', 'rippling',
  'vercel', 'render', 'railway', 'neon', 'clerk', 'resend',
  'brex', 'ramp', 'mercury', 'deel', 'remote', 'gusto', 'justworks',
  'figma', 'loom', 'miro', 'coda',
  'datadog', 'grafana', 'sentry', 'highlight', 'axiom',
  'prisma', 'temporal', 'inngest',
  'openai', 'anthropic', 'cohere', 'replicate', 'modal',
  'gitlab', 'postman',
  'algolia', 'elastic', 'mongodb',
  'hashicorp', 'pulumi',
  'auth0', 'okta', 'stytch',
  'twilio', 'sendgrid',
  'cloudflare', 'fastly',
  'airtable', 'webflow', 'framer',
  'intercom', 'front', 'helpscout',
  'amplitude', 'mixpanel', 'posthog', 'heap',
  'segment', 'rudderstack', 'census', 'hightouch',
  'contentful', 'sanity',
  'zapier', 'make',
  'liveblocks', 'ably', 'pusher',
  'netlify', 'fly',
];

// Companies with public Lever job boards
const LEVER_COMPANIES = [
  'netflix', 'lyft', 'doordash', 'instacart',
  'robinhood', 'coinbase', 'kraken', 'gemini',
  'plaid', 'modern-treasury', 'increase',
  'scale', 'labelbox', 'huggingface',
  'airtable', 'webflow', 'framer',
  'intercom', 'front', 'plain', 'helpscout',
  'amplitude', 'mixpanel', 'posthog', 'june', 'heap',
  'segment', 'rudderstack', 'census', 'hightouch',
  'contentful', 'sanity', 'storyblok',
  'zapier', 'tray', 'activepieces',
  'liveblocks', 'ably', 'pusher',
  'vercel', 'netlify', 'fly', 'railway',
  'brex', 'ramp', 'mercury', 'airbase',
  'lattice', 'deel', 'remote', 'gusto',
  'figma', 'loom', 'miro',
  'datadog', 'sentry', 'highlight',
  'algolia', 'elastic',
  'cloudflare', 'fastly',
  'stripe', 'plaid', 'finix',
];

class GreenhouseApplier extends BasePlatform {
  constructor(context, config, logger) {
    super(context, config, logger);
    this.name = 'Greenhouse';
  }

  async searchJobs() {
    const jobs = [];
    const keywords = this.config.keywords.map(k => k.toLowerCase());
    let checked = 0;

    for (const company of GREENHOUSE_COMPANIES) {
      try {
        const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`);
        if (!res.ok) continue;
        const data = await res.json();
        checked++;

        for (const job of (data.jobs || [])) {
          const combined = (job.title + ' ' + (job.content || '')).toLowerCase();
          if (!keywords.some(k => combined.includes(k))) continue;
          const score = this.scoreJob({ title: job.title, description: job.content });
          if (score === 0) continue;
          jobs.push({
            id: `gh-${job.id}`,
            title: job.title,
            company: data.name || company,
            location: job.location?.name || 'Remote',
            link: job.absolute_url,
            platform: 'Greenhouse',
            matchScore: score,
          });
        }
      } catch (_) {}
    }

    this.logger.info(`Greenhouse: checked ${checked} companies, found ${jobs.length} matching jobs`);
    const seen = new Set();
    return jobs.filter(j => seen.has(j.id) ? false : seen.add(j.id))
               .sort((a, b) => b.matchScore - a.matchScore);
  }

  async apply(job, coverLetter) {
    const page = await this.context.newPage();
    const p = this.config.profile;
    try {
      await page.goto(job.link, { waitUntil: 'domcontentloaded', timeout: 20000 });
      this.logger.info(`🔗 Apply page: ${page.url()}`);

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

      const btn = page.locator('#submit_app, button[type="submit"]').first();
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn.click();
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
    const jobs = [];
    const keywords = this.config.keywords.map(k => k.toLowerCase());
    let checked = 0;

    for (const company of LEVER_COMPANIES) {
      try {
        const res = await fetch(`https://api.lever.co/v0/postings/${company}?mode=json`);
        if (!res.ok) continue;
        const data = await res.json();
        checked++;

        for (const job of (Array.isArray(data) ? data : [])) {
          const combined = ((job.text || '') + ' ' + (job.descriptionPlain || '')).toLowerCase();
          if (!keywords.some(k => combined.includes(k))) continue;
          const score = this.scoreJob({ title: job.text, description: job.descriptionPlain });
          if (score === 0) continue;
          jobs.push({
            id: `lever-${job.id}`,
            title: job.text,
            company: company,
            location: job.categories?.location || 'Remote',
            link: job.hostedUrl,
            platform: 'Lever',
            matchScore: score,
          });
        }
      } catch (_) {}
    }

    this.logger.info(`Lever: checked ${checked} companies, found ${jobs.length} matching jobs`);
    const seen = new Set();
    return jobs.filter(j => seen.has(j.id) ? false : seen.add(j.id))
               .sort((a, b) => b.matchScore - a.matchScore);
  }

  async apply(job, coverLetter) {
    const page = await this.context.newPage();
    const p = this.config.profile;
    try {
      const applyUrl = job.link.replace(/\?.*$/, '') + '/apply';
      await page.goto(applyUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      this.logger.info(`🔗 Apply page: ${page.url()}`);

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
        await btn.click();
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