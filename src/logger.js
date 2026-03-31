/**
 * Logger — writes to console + JSONL file, tracks applied job IDs
 */

const fs   = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logFile    = path.join(__dirname, '../logs/applications.jsonl');
    this.appliedIds = new Set();
    this._ensureDir();
    this._loadApplied();
  }

  _ensureDir() {
    const dir = path.dirname(this.logFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.logFile)) fs.writeFileSync(this.logFile, '');
  }

  _loadApplied() {
    // Re-hydrate already-applied IDs from previous runs
    try {
      const lines = fs.readFileSync(this.logFile, 'utf8').split('\n').filter(Boolean);
      for (const line of lines) {
        const entry = JSON.parse(line);
        if (entry.jobId) this.appliedIds.add(entry.jobId);
      }
      this.info(`📂 Loaded ${this.appliedIds.size} previously applied jobs`);
    } catch (_) {}
  }

  hasApplied(jobId) {
    return this.appliedIds.has(jobId);
  }

  logApplication(job, status) {
    const entry = {
      timestamp: new Date().toISOString(),
      jobId:     job.id,
      title:     job.title,
      company:   job.company,
      platform:  job.platform,
      matchScore: job.matchScore,
      status,
    };

    fs.appendFileSync(this.logFile, JSON.stringify(entry) + '\n');

    if (status === 'applied') {
      this.appliedIds.add(job.id);
    }
  }

  info(msg)    { console.log(`[${this._ts()}] INFO  ${msg}`); }
  success(msg) { console.log(`[${this._ts()}] ✅    ${msg}`); }
  error(msg)   { console.error(`[${this._ts()}] ❌    ${msg}`); }
  _ts()        { return new Date().toISOString().slice(11, 19); }
}

module.exports = { Logger };
