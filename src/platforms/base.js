/**
 * Base platform class — shared logic for all job boards
 */

class BasePlatform {
  constructor(context, config, logger) {
    this.context = context;
    this.config = config;
    this.logger = logger;
    this.name = 'Base';
  }

  /**
   * Score a job listing against the candidate profile (0–100)
   */
  scoreJob(job) {
    const text = `${job.title} ${job.description || ''}`.toLowerCase();
    const title = (job.title || '').toLowerCase();
    const keywords = this.config.keywords.map(k => k.toLowerCase());

    const blocklist = this.config.titleBlocklist || [];
    const blocked = blocklist.find(b => title.includes(b));
    if (blocked) {
      this.logger.info(`🚫 Blocked "${job.title}" — matched blocklist: "${blocked}"`);
      return 0;
    }
    // Add to the hard filters section, after the existing blocklist check:
    const titleBlockPatterns = [
      /\bstaff\b/, /\btech lead\b/, /\btechnical lead/,
      /\brust\b/, /\biOS\b/, /\bandroid\b/, /\bmachine learning\b/,
      /\bdata engineer\b/, /\bdevops\b/, /\bsecurity engineer\b/,
      /\bcapacity\b/, /\bsubstation\b/, /\bcustomer success\b/,
    ];
    if (titleBlockPatterns.some(p => p.test(title))) return 0;

    if (this.config.requireVisa) {
      const visaKws = this.config.visaKeywords || [];
      const mentionsVisa = visaKws.some(v => text.includes(v));
      if (!mentionsVisa) {
        this.logger.info(`🚫 Skipped "${job.title}" — no visa mention`);
        return 0;
      }
    }

    // ── Scoring ───────────────────────────────────────────────────────────────

    let score = 50;

    let hits = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) hits++;
    }
    score += Math.min(hits * 5, 30);

    // Entry-level / junior signals
    if (/junior|entry.?level|associate|new grad|0-2 years|1-2 years|early career/.test(text)) score += 15;

    // Seniority penalty
    if (/senior|staff|principal|lead|director|manager/.test(text)) score -= 20;

    // Role type bonus
    if (text.includes('full stack') || text.includes('full-stack')) score += 10;
    if (text.includes('backend')) score += 8;
    if (text.includes('node') || text.includes('react')) score += 7;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // Subclasses must implement these
  async login() { throw new Error(`${this.name}.login() not implemented`); }
  async searchJobs() { throw new Error(`${this.name}.searchJobs() not implemented`); }
  async apply() { throw new Error(`${this.name}.apply() not implemented`); }
}

module.exports = { BasePlatform };
