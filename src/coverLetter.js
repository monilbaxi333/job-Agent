/**
 * AI Cover Letter Generator
 * Calls Claude API to write a tailored cover letter per job
 */

const https = require('https');

class CoverLetterGenerator {
  constructor(profile) {
    this.profile = profile;
    this.cache   = new Map(); // cache by job ID to avoid re-generating
  }

  async generate(job) {
    const cacheKey = `${job.company}-${job.title}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    const prompt = this.buildPrompt(job);

    try {
      const letter = await this.callClaude(prompt);
      this.cache.set(cacheKey, letter);
      return letter;
    } catch (err) {
      console.error('Cover letter generation failed:', err.message);
      return this.fallbackLetter(job); // use template if API fails
    }
  }

  buildPrompt(job) {
    const p = this.profile;
    return `Write a concise, professional cover letter for the following job application.

CANDIDATE:
- Name: ${p.firstName} ${p.lastName}
- Current study: ${p.education}
- Experience: ${p.yearsOfExperience} years, specializing in ${p.skills.slice(0, 6).join(', ')}
- Notable project: ${p.highlightProject}
- Location: ${p.city}, ${p.state}

JOB:
- Title: ${job.title}
- Company: ${job.company}
- Platform: ${job.platform}

INSTRUCTIONS:
- 3 short paragraphs, under 200 words total
- Opening: express genuine interest in the specific role and company
- Middle: highlight 2 relevant skills/projects that match the role
- Closing: confident call to action
- Tone: professional but personable, not robotic
- Do NOT start with "Dear Hiring Manager" — use a fresh opener
- Do NOT use clichés like "I am writing to express my interest"
- Output the letter text only, no subject line or metadata`;
  }

  async callClaude(prompt) {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages:   [{ role: 'user', content: prompt }],
      });

      const req = https.request(
        {
          hostname: 'api.anthropic.com',
          path:     '/v1/messages',
          method:   'POST',
          headers: {
            'Content-Type':      'application/json',
            'x-api-key':         process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed.content?.[0]?.text || '');
            } catch (e) {
              reject(e);
            }
          });
        }
      );

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  fallbackLetter(job) {
    const p = this.profile;
    return `I'm excited to apply for the ${job.title} position at ${job.company}. As a software engineer with experience in ${p.skills.slice(0, 3).join(', ')}, I've built production systems that scale — including a multi-tenant SaaS billing platform with automated payment workflows and a CI/CD pipeline with full test coverage.

I'm currently completing my MS in Computer Science at NJIT, which has deepened my understanding of distributed systems and software engineering principles. I'd bring that foundation, along with hands-on full-stack experience, to your team.

I'd love the chance to discuss how my background aligns with what you're building at ${job.company}. Thank you for your consideration.

— ${p.firstName} ${p.lastName}`;
  }
}

module.exports = { CoverLetterGenerator };
