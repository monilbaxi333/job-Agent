/**
 * Job Agent Configuration
 * Pre-filled from Monil Baxi's resume
 */

module.exports = {
  // ── Agent behaviour ─────────────────────────────────────────────────────────
  dailyTarget:   1000,     // applications per day
  headless:      true,     // false = watch the browser work
  slowMo:        60,       // ms between actions (higher = more human-like)
  minMatchScore: 65,       // skip jobs below this AI match score (0–100)
  sessionFile:   './data/session.json',  // saved login cookies

  // ── Your credentials (store in .env in production!) ─────────────────────────
  credentials: {
    linkedin: {
      email:    process.env.LINKEDIN_EMAIL    || 'monilbaxi@gmail.com',
      password: process.env.LINKEDIN_PASSWORD || 'YOUR_PASSWORD_HERE',
    },
  },

  // ── Candidate profile (parsed from resume) ────────────────────────────────
  profile: {
    firstName:          'Monil',
    lastName:           'Baxi',
    email:              'monilbaxi@gmail.com',
    phone:              '(201) 284-8285',
    city:               'Jersey City',
    state:              'NJ',
    linkedIn:           'https://linkedin.com/in/baxi-monil-explore',
    yearsOfExperience:  2,
    level:              'mid-level',   // junior | mid-level | senior
    education:          'MS Computer Science @ NJIT (in progress)',
    highlightProject:   'Multi-tenant SaaS Invoice Management System (Next.js, Node.js, PostgreSQL, Stripe, Docker)',
    skills: [
      'Node.js', 'React.js', 'TypeScript', 'Python', 'JavaScript',
      'PostgreSQL', 'MongoDB', 'MySQL', 'Express.js', 'Next.js',
      'REST APIs', 'Docker', 'Redis', 'GitHub Actions', 'CI/CD',
      'Java', 'Angular', 'JWT Authentication', 'BullMQ', 'Stripe',
    ],
  },

  // ── Search configuration ──────────────────────────────────────────────────
  keywords: [
    'Full Stack Engineer',
    'Backend Engineer',
    'Software Engineer',
    'Node.js Developer',
    'React Developer',
  ],
  location:  'Jersey City, NJ',
  remoteOnly: true,

  // ── Resume file path ──────────────────────────────────────────────────────
  resumePath: './data/Monil_Baxi_2026_Final.pdf',

  // ── Blacklisted companies (won't apply to these) ─────────────────────────
  blacklist: [
    // add company names in lowercase, e.g. 'acme corp'
  ],

  // ── Target companies (prioritise these in scoring) ────────────────────────
  priorityCompanies: [
    'stripe', 'vercel', 'notion', 'linear', 'supabase',
    'planetscale', 'retool', 'rippling', 'scale ai',
  ],
};
