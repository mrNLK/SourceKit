# SourceKit v2 — LinkedIn Outreach Copy

---

## Short Version (Connection Request / DM)

Just finished building something I think you'd find interesting: [getsourcekit.vercel.app](https://getsourcekit.vercel.app)

SourceKit is a technical sourcing engine I designed and built (with Claude Code as my engineering layer) to find software engineers based on what they've actually built — not keywords, not pedigree. It breaks down a role, identifies target repos and companies, scores candidates 0–100 against Evidence of Exceptional Ability criteria, and surfaces hidden gems: high-contribution engineers with low visibility who are likely under-recruited.

v2 adds code quality analysis (Builder Score), Harmonic company intelligence with poachability scoring, persistent auto-updating pipelines via Exa Websets, and a full AI Fund venture creation workflow. Happy to walk you through it.

App: https://getsourcekit.vercel.app
Docs: https://sourcekit-docs.netlify.app

---

## Full Version (Post / Long-Form Message)

Just shipped SourceKit v2. In case it's useful to anyone building technical recruiting pipelines or thinking about evidence-based hiring:

**SourceKit** is a technical sourcing tool I designed and built to find software engineers based on what they've actually shipped — not LinkedIn keywords or school names. Evidence-based hiring over pedigree matching. Higher signal, better predictor of impact.

It breaks down the role and your team's DNA, then builds a sourcing strategy with specific repos to mine, target companies to poach from, and EEA criteria (Evidence of Exceptional Ability: verifiable proof someone is in the top 5–10%). Scores candidates 0–100 and surfaces hidden gems — high contribution, low visibility, likely under-recruited.

### How It Works: Six APIs, Four Layers

**Layer 1 — Strategy (Exa Research API + Claude)**
Generates the full sourcing plan from a role spec or job URL. Runs web searches across GitHub, LinkedIn, company blogs, and job boards to identify target repos, poach companies, and EEA signal definitions. Returns structured JSON with citations. No hallucinated repos, no made-up star counts.

**Layer 2 — Company Intelligence (Parallel API + Harmonic API)**

- *Parallel Task API* researches each poach company in parallel: estimated eng headcount, tech stack, recent hiring signals, attrition patterns, and a sourcing rationale. Live intelligence on every target company card.
- *Parallel FindAll API* maps actual engineers at target companies by searching LinkedIn, GitHub, conference talks, and engineering blogs. Turns a static company name into a recruitable list.
- *Parallel Search API* extracts JDs from any URL (including JS-rendered pages) and does deep research on targets.

**NEW — Harmonic API Integration:**
- Company deep profiles: funding stage, headcount, founders, investors, traction metrics, web traffic trends.
- **Poachability scoring**: computes how recruitable a company's talent is based on funding trajectory, headcount changes, and traffic shifts.
- Team connections for warm introductions (plan-gated).
- Saved searches that monitor for net-new companies matching your criteria.

**Layer 3 — Discovery (Exa Search + GitHub REST API)**

- *Exa Search API* (vector search) matches and enriches candidates using embeddings, not keywords. Criteria can be natural language: "won or placed at a relevant hackathon" or "shipped a product in the robotics space." Matches against actual content of web pages, READMEs, and blog posts — catches candidates keyword search would never surface.
- *Exa Answer API* synthesizes a grounded summary for each candidate. Answers "what is this person actually known for?" with web citations. Surfaces on candidate cards and feeds into outreach generation.
- *Exa findSimilar API* enables lateral discovery. Click "Find Similar" on any strong candidate → get 10 more engineers with comparable GitHub profiles. Fastest path from one strong match to a full pipeline.
- *GitHub REST API* mines contributors from target repos. Pulls commit counts, maintainer status, contribution recency, and repo-level metadata.

**NEW — Code Quality Analysis (Builder Score):**
Scans a candidate's top 10 GitHub repositories and scores them across 6 dimensions:
- **AI Mastery** (40% weight): GenAI projects, framework usage (LangChain, LlamaIndex, Anthropic SDK), Claude Code commit detection
- **Build Velocity** (20%): Recent activity, project creation cadence, commit volume
- **Tooling** (15%): CI/CD pipelines, linting, type checking
- **Testing** (10%): Test suite presence and coverage
- **Documentation** (8%): READMEs, licenses, descriptions
- **Community Health** (7%): Stars, forks, topic engagement

Final score range 0–100 with Claude AI analysis providing a written summary. Detects AI coding tool usage (Cursor, GitHub Copilot, Claude Code) as a positive signal.

**Layer 4 — Output + Persistence**

- *EEA Scoring*: Binary checks against public artifacts — papers at top venues, maintainer status on high-star repos, conference talks, shipped systems at scale, competition wins. Pass/fail against evidence, not subjective assessment.
- *Exa Websets*: Define sourcing criteria once. Exa discovers, verifies, and enriches matches on a schedule. New qualified candidates surface automatically — pipeline grows without recruiter effort. Import existing candidate lists (CSV from ATS, LinkedIn saves) and run the same EEA enrichment on people you already know about. Monitors with cron scheduling, pause/resume, and append-or-override behavior.

### Pipeline & Outreach

- **Kanban board** with drag-and-drop stages: Contacted → Recruiter Screen → Moved to ATS (plus Not Interested, Rejected).
- **Days-in-stage tracking** with color progression from green to red.
- **AI-drafted outreach** via Claude: generates personalized 3–5 sentence messages referencing each candidate's actual GitHub work. Custom templates with variable interpolation ({{name}}, {{username}}, {{top_language}}).
- **CSV + JSON export** for candidates and webset items, including EEA signal columns.
- **Candidate comparison**: Side-by-side view comparing scores, stars, followers, repos, and technical metrics.
- **Webhooks + Slack notifications**: Real-time alerts on pipeline stage changes. Generic webhook support plus native Slack integration with formatted messages.

### NEW — AI Fund Venture Pipeline

Full venture creation workflow built for AI Fund's Founder-in-Residence and Venture Engineer programs:
- **11 Supabase tables** tracking concepts (thesis → funded), people, evaluation scores, assignments, evidence artifacts, engagement logs, residencies, and investment decision memos.
- **Composite scoring** weighted for role type: AI Excellence (40%), Technical Ability (25%), Product Instinct (20%), Leadership Potential (15%) — adjusted by FIR vs. VE role.
- **Evidence tracking**: GitHub repos, publications, patents, conference talks, arXiv papers, HuggingFace spaces.
- **Intelligence runs**: Async search jobs via Harmonic, Exa, Parallel, GitHub, or manual sources.
- **Residency management**: Stipend tracking, milestones, weekly check-ins, graduation status.

### Infrastructure

- **Multi-user isolation**: Token rotation, user-scoped Row Level Security, per-user API key protection.
- **Auth hardening**: Endpoint-level auth checks, CORS hardening, CSP frame-ancestors, rate limiting.
- **Stack**: React/TypeScript, Supabase (Postgres + Edge Functions), Vercel.

---

## Key Stats for Outreach

- **~40% hidden gem rate**: Top-scored candidates often have low or zero LinkedIn activity. Keyword search misses them. Artifact search finds them.
- **Websets = always-on pipeline**: Runs weekly, finds candidates who weren't active when you first searched. Pipeline grows without recruiter effort.
- **EEA = binary, not subjective**: Criteria are pass/fail against public evidence. Score reflects verifiable signal only.

---

**App**: https://getsourcekit.vercel.app
**Docs**: https://sourcekit-docs.netlify.app
**GitHub**: https://github.com/mrNLK/SourceKit
