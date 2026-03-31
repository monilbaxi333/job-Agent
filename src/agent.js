/**
 * JobAgent AI - Main Orchestrator
 * Auto-applies to jobs using Playwright browser automation
 */

const { chromium } = require('playwright');
const { LinkedInApplier } = require('./platforms/linkedin');
const { GreenhouseApplier, LeverApplier } = require('./platforms/greenhouse');
const { CoverLetterGenerator } = require('./coverLetter');
const { Logger } = require('./logger');
const config = require('../config/profile');

class JobAgent {
  constructor() {
    this.logger = new Logger();
    this.applied = 0;
    this.skipped = 0;
    this.failed = 0;
    this.dailyTarget = config.dailyTarget || 1000;
    this.browser = null;
    this.context = null;
  }

  async init() {
    this.logger.info('🤖 JobAgent starting...');

    this.browser = await chromium.launch({
      headless: config.headless ?? true,   // set false to watch it work
      slowMo: config.slowMo ?? 50,          // ms between actions (human-like)
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    // Only load session if file exists and is valid JSON
let storageState = undefined;
const fs = require('fs');
if (config.sessionFile && fs.existsSync(config.sessionFile)) {
  try {
    const raw = fs.readFileSync(config.sessionFile, 'utf8').trim();
    if (raw && raw.startsWith('{')) {
      JSON.parse(raw); // validate
      storageState = config.sessionFile;
      this.logger.info('✅ Session file loaded');
    } else {
      this.logger.info('⚠️  Session file empty — will log in fresh');
    }
  } catch (e) {
    this.logger.info('⚠️  Session file corrupt — will log in fresh');
  }
} else {
  this.logger.info('⚠️  No session file — will log in fresh');
}

this.context = await this.browser.newContext({
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/120.0.0.0 Safari/537.36',
  viewport: { width: 1280, height: 800 },
  storageState,
});

    this.coverLetterGen = new CoverLetterGenerator(config.profile);
    this.logger.info('✅ Browser initialized');
  }

  async run() {
    await this.init();
    // Log in to platforms
    const linkedIn = new LinkedInApplier(this.context, config, this.logger);
    await linkedIn.login();
    const platforms = [
      new LinkedInApplier(this.context, config, this.logger),
      new GreenhouseApplier(this.context, config, this.logger),
      new LeverApplier(this.context, config, this.logger),
    ];

    this.logger.info(`🎯 Target: ${this.dailyTarget} applications today`);

    while (this.applied < this.dailyTarget) {
      for (const platform of platforms) {
        if (this.applied >= this.dailyTarget) break;

        try {
          const jobs = await platform.searchJobs();
          this.logger.info(`📋 Found ${jobs.length} jobs on ${platform.name}`);

          for (const job of jobs) {
            if (this.applied >= this.dailyTarget) break;

            const shouldApply = await this.evaluateJob(job);
            if (!shouldApply) { this.skipped++; continue; }

            const coverLetter = await this.coverLetterGen.generate(job);
            const success = await platform.apply(job, coverLetter);

            if (success) {
              this.applied++;
              this.logger.success(`✅ [${this.applied}/${this.dailyTarget}] ${job.title} @ ${job.company}`);
              this.logger.logApplication(job, 'applied');
            } else {
              this.failed++;
              this.logger.logApplication(job, 'failed');
            }

            // Human-like delay between applications (2–8 seconds)
            await this.randomDelay(2000, 8000);
          }
        } catch (err) {
          this.logger.error(`Platform error on ${platform.name}: ${err.message}`);
          await this.randomDelay(10000, 20000); // back off on error
        }
      }

      // Pause between search rounds to avoid rate limiting
      this.logger.info('⏳ Cooling down before next search round...');
      await this.randomDelay(30000, 60000);
    }

    await this.finish();
  }

  async evaluateJob(job) {
    // Skip if already applied (deduplication)
    if (this.logger.hasApplied(job.id)) {
      this.logger.info(`⏭  Skipping (already applied): ${job.title} @ ${job.company}`);
      return false;
    }

    // Skip if match score below threshold
    if (job.matchScore < config.minMatchScore) {
      this.logger.info(`⏭  Low match (${job.matchScore}%): ${job.title}`);
      return false;
    }

    // Skip blacklisted companies
    if (config.blacklist?.includes(job.company.toLowerCase())) {
      this.logger.info(`⏭  Blacklisted: ${job.company}`);
      return false;
    }

    return true;
  }

  async randomDelay(min, max) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(r => setTimeout(r, ms));
  }

  async finish() {
    this.logger.info(`\n📊 Session complete:`);
    this.logger.info(`   ✅ Applied:  ${this.applied}`);
    this.logger.info(`   ⏭  Skipped:  ${this.skipped}`);
    this.logger.info(`   ❌ Failed:   ${this.failed}`);

    // Save session cookies for next run (stay logged in)
    await this.context.storageState({ path: config.sessionFile });
    await this.browser.close();
  }
}

// Run
const agent = new JobAgent();
agent.run().catch(console.error);
