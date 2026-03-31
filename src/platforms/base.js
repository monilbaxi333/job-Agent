/**
 * Base platform class — shared logic for all job boards
 */

class BasePlatform {
  constructor(context, config, logger) {
    this.context = context;
    this.config  = config;
    this.logger  = logger;
    this.name    = 'Base';
  }

  /**
   * Score a job listing against the candidate profile (0–100)
   */
  scoreJob(job) {
    const text = `${job.title} ${job.description || ''}`.toLowerCase();
    const keywords = this.config.keywords.map(k => k.toLowerCase());

    let score = 50; // baseline

    // Keyword matches
    let hits = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) hits++;
    }
    score += Math.min(hits * 5, 30); // up to +30 for keyword hits

    // Seniority alignment
    const level = this.config.profile.level.toLowerCase();
    if (level === 'mid-level') {
      if (/senior|staff|principal|lead/.test(text)) score -= 15;
      if (/junior|associate|intern/.test(text))      score -= 10;
    }
    if (level === 'senior') {
      if (/junior|associate|intern/.test(text))      score -= 20;
      if (/senior|staff/.test(text))                 score += 10;
    }

    // Role type bonus
    if (text.includes('full stack') || text.includes('full-stack')) score += 10;
    if (text.includes('backend'))                                    score += 8;
    if (text.includes('node') || text.includes('react'))            score += 7;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // Subclasses must implement these
  async login()      { throw new Error(`${this.name}.login() not implemented`); }
  async searchJobs() { throw new Error(`${this.name}.searchJobs() not implemented`); }
  async apply()      { throw new Error(`${this.name}.apply() not implemented`); }
}

module.exports = { BasePlatform };
