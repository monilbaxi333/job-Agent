# JobAgent AI — GitHub Actions Edition 🤖

Runs automatically on GitHub's free servers. No laptop, no cloud bill.

## How it works

- Runs **twice a day** (9 AM + 1 PM EST, Mon–Fri) via GitHub Actions cron
- Applies to jobs on **LinkedIn Easy Apply**, **Greenhouse**, and **Lever**
- Generates a **unique AI cover letter** per job using Claude API
- Logs every application — never applies to the same job twice
- Results visible in GitHub Actions tab after each run

---

## Setup (one time, ~15 minutes)

### 1. Fork / create this repo on GitHub
```bash
git init
git remote add origin https://github.com/YOUR_USERNAME/job-agent.git
```

### 2. Install dependencies locally (needed for step 3)
```bash
npm install
npx playwright install chromium
```

### 3. Copy your resume into data/
```bash
cp /path/to/Monil_Baxi_2026_Final.pdf data/
```

### 4. Run the setup helper (saves LinkedIn session + encodes secrets)
```bash
bash setup-secrets.sh
```

### 5. Add secrets to GitHub
Go to: `https://github.com/YOUR_USERNAME/job-agent/settings/secrets/actions`

| Secret | Value |
|--------|-------|
| `LINKEDIN_EMAIL` | monilbaxi@gmail.com |
| `LINKEDIN_PASSWORD` | your password |
| `LINKEDIN_SESSION` | output from setup script |
| `RESUME_PDF_BASE64` | `base64 -i data/Monil_Baxi_2026_Final.pdf` |
| `ANTHROPIC_API_KEY` | sk-ant-... (for cover letters) |

### 6. Push to GitHub
```bash
git add .
git commit -m "init job agent"
git push -u origin main
```

**That's it.** The agent now runs automatically every weekday.

---

## Trigger manually

GitHub → Actions tab → "Job Agent — Auto Apply" → "Run workflow"

You can also set a custom target:
- Default: 500 per run (1,000/day across 2 runs)
- Max: ~300–400 realistic on GitHub's free runners (6hr limit)

---

## View results

After each run: **Actions tab → click the run → scroll to summary**

You'll see:
- Total applied today
- Breakdown by platform
- Last 10 applications with match scores
- Full log downloadable as artifact (retained 30 days)

---

## Customize

Edit `config/profile.js` to change:
- `keywords` — job search terms
- `minMatchScore` — filter threshold (default 65%)
- `blacklist` — companies to skip
- `priorityCompanies` — boost these in scoring

Edit `.github/workflows/job-agent.yml` to change the schedule:
```yaml
- cron: '0 13 * * 1-5'  # 9 AM EST weekdays
```

---

## GitHub Actions free tier limits

| Limit | Value |
|-------|-------|
| Minutes/month | 2,000 (free) |
| Max job duration | 6 hours |
| Concurrent jobs | 20 |

Each run uses ~2–4 hours. Two runs/day × 22 weekdays = ~180 hrs/month — well within the free 2,000 min limit.
