# SourceKit — LinkedIn Outreach Copy (March 2026)

---

## Short Version (Connection Request / DM)

Built something I think you'd find relevant: [getsourcekit.vercel.app](https://getsourcekit.vercel.app)

SourceKit is a technical sourcing engine that finds software engineers based on what they've actually built — not keywords, not pedigree. It breaks down a role, identifies target repos and companies, scores candidates 0–100 against Evidence of Exceptional Ability criteria, and surfaces hidden gems: high-contribution engineers with low visibility who are likely under-recruited.

The stack: 19 Supabase Edge Functions, 7 external APIs (GitHub, Exa, Harmonic, Anthropic Claude, Parallel, Stripe, Slack), a full React/TypeScript frontend, and a venture creation pipeline (AI Fund) — designed and shipped with Claude Code as my engineering layer. Happy to walk you through it.

App: https://getsourcekit.vercel.app
Docs: https://sourcekit-docs.netlify.app

---

## Full Version (Post / Long-Form Message)

Just refreshed SourceKit. In case it's useful to anyone building technical recruiting pipelines, thinking about evidence-based hiring, or curious how far you can push a solo-build with Claude Code:

**SourceKit** is a technical sourcing tool that finds software engineers based on what they've actually shipped — not LinkedIn keywords or school names. Evidence-based hiring over pedigree matching. Higher signal, better predictor of impact.

It breaks down the role and your team's DNA, then builds a sourcing strategy with specific repos to mine, target companies to poach from, and EEA criteria (Evidence of Exceptional Ability: verifiable proof someone is in the top 5–10%). Scores candidates 0–100 and surfaces hidden gems — high contribution, low visibility, likely under-recruited.

### Architecture: Seven APIs, Four Layers

**Layer 1 — Strategy (Exa Research API + Claude)**

Generates the full sourcing plan from a role spec or job URL. Runs web searches across GitHub, LinkedIn, company blogs, and job boards to identify target repos, poach companies, and EEA signal definitions. Returns structured JSON with citations. No hallucinated repos, no made-up star counts. Supports both JD parsing from URLs and manual role input — strategy is reusable and hands off directly to search.

**Layer 2 — Company Intelligence (Parallel API + Harmonic API)**

- *Parallel Task API* researches each poach company in parallel: estimated eng headcount, tech stack, recent hiring signals, attrition patterns, and a sourcing rationale. Live intelligence on every target company card.
- *Parallel FindAll API* maps actual engineers at target companies by searching LinkedIn, GitHub, conference talks, and engineering blogs. Turns a static company name into a recruitable list.
- *Parallel Search API* extracts JDs from any URL (including JS-rendered pages) and does deep research on targets.

**Harmonic API Integration (4 edge functions):**
- `harmonic-enrich`: Company deep profiles — funding stage/amount, headcount with 30d/90d/180d growth trends, founders, investors, web traffic, traction metrics. 7-day local cache with TTL.
- `harmonic-search`: Natural language company search, keyword search, typeahead for companies/people/investors, similar companies discovery, saved searches with net-new monitoring.
- `harmonic-person`: LinkedIn-based person enrichment — full profile, education, experience, socials, email, phone, current company URN mapping.
- `harmonic-intelligence`: Async intelligence runs with status tracking (pending → running → completed → failed).
- **Poachability scoring** (0–100): Computes how recruitable a company's talent is based on funding trajectory, headcount changes, web traffic shifts, and funding recency. Easy/Moderate/Hard classification with per-company rationale.
- **Team connections** for warm introductions (plan-gated).

**Layer 3 — Discovery (Exa Search + GitHub REST API)**

- *Exa Search API* (vector search) matches and enriches candidates using embeddings, not keywords. Criteria can be natural language: "won or placed at a relevant hackathon" or "shipped a product in the robotics space." Matches against actual content of web pages, READMEs, and blog posts — catches candidates keyword search would never surface.
- *Exa Answer API* synthesizes a grounded summary for each candidate. Answers "what is this person actually known for?" with web citations. Surfaces on candidate cards and feeds into outreach generation.
- *Exa findSimilar API* enables lateral discovery. Click "Find Similar" on any strong candidate → get more engineers with comparable profiles.
- *GitHub REST API* mines contributors from target repos. Pulls commit counts, maintainer status, contribution recency, and repo-level metadata. Token rotation pool for rate limit management.
- *LinkedIn Enrichment via Exa* — LinkedIn profile discovery, email/contact lookup, bio and headline extraction.

**Code Quality Analysis (Builder Score — `github-code-quality` edge function):**

Scans a candidate's top 10 GitHub repositories and scores across 6 dimensions:
- **AI Mastery** (40%): GenAI projects, framework usage (LangChain, LlamaIndex, Anthropic SDK, Claude Agent SDK, DSPy, Pydantic AI, and 25+ more), Claude Code commit detection.
- **Build Velocity** (20%): Recent activity, project creation cadence, commit volume.
- **Tooling** (15%): CI/CD pipelines, linting, type checking.
- **Testing** (10%): Test suite presence and coverage indicators.
- **Documentation** (8%): READMEs, licenses, descriptions.
- **Community Health** (7%): Stars, forks, topic engagement.

Detects AI coding tool usage as a positive signal: Cursor, GitHub Copilot, Claude Code, Windsurf, Aider, Cline, Continue. Counts AI-assisted commits. Final score 0–100 with Claude AI written analysis and per-repo breakdown showing strengths and gaps.

**Layer 4 — Output + Persistence**

- **EEA Scoring (11 dimensions)**: 6 USCIS O-1A/EB-1A criteria (original contributions, leadership roles, publications, judging, salary, memberships) + 5 supplementary GitHub signals (sustained excellence, technical depth/breadth, velocity/trajectory, builder DNA, early mover). Strength scale 0–4 (Not Detected → Exceptional). Pass/fail against public evidence, not subjective assessment.
- **Exa Websets**: Define sourcing criteria once. Exa discovers, verifies, and enriches matches on a schedule. New candidates surface automatically. Monitors with cron scheduling, pause/resume, append-or-override. Batch import to pipeline. Per-item EEA enrichment display with error boundaries and loading skeletons.

### Pipeline & Outreach

- **5-stage Kanban** with drag-and-drop: Contacted → Not Interested → Recruiter Screen → Rejected → Moved to ATS.
- **Days-in-stage tracking** with color progression from green (fresh) to red (stale).
- **Pipeline events timeline** — full audit trail of every stage change with timestamps.
- **AI-drafted outreach** via Claude (Haiku 4.5): Generates personalized 3–5 sentence messages referencing each candidate's actual GitHub work.
- **Outreach templates**: 3 built-in templates (Intro, Follow-up, Technical) + custom template editor with variable interpolation: `{{name}}`, `{{username}}`, `{{top_language}}`, `{{highlights}}`, `{{score}}`, `{{followers}}`, `{{repos}}`, `{{github_url}}`, `{{location}}`, `{{bio_snippet}}`.
- **Bulk outreach modal**: Generate outreach for multiple candidates at once from the pipeline.
- **CSV + JSON export** for candidates and webset items, including all enrichment columns.
- **Candidate comparison**: Side-by-side view (2–3 candidates) comparing scores, stars, followers, repos, languages, and technical metrics.
- **Webhooks + Slack notifications**: Real-time alerts on pipeline stage changes via `notify-pipeline-change` edge function. Generic webhook (JSON payload) + native Slack Block Kit messages. Test button in settings to verify connectivity.

### Bulk Actions & AI Chat

Full-pipeline AI chat interface powered by Claude (streaming via `bulk-actions` edge function):
- **Refine Shortlist**: AI ranks selected candidates and suggests who to prioritize.
- **Draft Outreach**: Generates personalized messages for each selected candidate.
- **Search Insights**: Analyzes full pipeline — skills gaps, stage distribution, score trends.
- **Candidate Brief**: 2-sentence summaries for hiring managers (max 5 at a time).
- **Compare Selected**: Side-by-side markdown table of 2–3 candidates.
- **Free-form chat**: Ask anything about your pipeline candidates with full context.

Multi-select, search/filter within bulk view, sort by name/score/stage, score-based color coding.

### Search UX

- **Natural language query parsing** with Claude AI → structured GitHub search.
- **Streaming search** with real-time step-by-step progress updates.
- **Curated repo hints** for 15+ tech domains (Rust, React, Python, ML, K8s, Go, TypeScript, etc.) — ensures high-signal repos even when AI suggestions miss.
- **Filter persistence**: Seniority, skills, language, min score, hidden gems, location, result limit — all saved to localStorage.
- **Search funnel visualization**: Total found → Filtered → Location → Final results.
- **Skill priority panel** with drag-to-reorder, weighted matching.
- **Saved searches** (bookmarks): Save any query with filters for one-click re-run.
- **Search history**: Timestamped log of every search with replay and clear options.
- **Suggestion chips**: Pre-built role queries for quick starts.
- **"Hidden gem" detection**: High-quality, low-visibility engineers flagged automatically.
- **Subscription gating**: Free tier with limited searches, Pro tier unlimited via Stripe checkout.

### Candidate Deep Dive

- **Full developer profile page**: GitHub stats, contribution history, working style quadrant (broad/narrow × execution/exploration), skills categorization, recent activity timeline, top repositories.
- **Company context card**: Linked to Harmonic — funding, headcount, growth trends, poachability badge, web traffic, investors.
- **EEA signal breakdown**: Per-dimension strength with evidence bullets and "needs documentation" flags.
- **Builder Score report**: 6-dimension bar chart with per-repo analysis, AI tool detection, commit quality metrics.
- **Slide-out detail view**: Non-blocking candidate inspector from search results — outreach, notes, tags, pipeline stage, watchlist toggle.

### AI Fund — Venture Creation Pipeline

Full venture creation workflow built for AI Fund's Founder-in-Residence and Venture Engineer programs:

- **11 Supabase tables** (`aifund_*`): concepts, people, evaluation_scores, assignments, evidence, engagement_log, residencies, decision_memos, activity_events, intelligence_runs, external_profiles.
- **9 dashboard tabs**: Overview, Concepts, Talent Pool, Matching, Engagement, Residencies, Investment Review, Intelligence, Settings.
- **Concept pipeline** (8 stages): Ideation → Validation → Prototyping → Recruiting → Residency → Investment Review → Funded → Archived. Thesis, sector, LP source tracking.
- **Talent pool** with person types (FIR / VE / both) and 12-stage process tracking (identified → graduated/archived).
- **Evidence artifacts**: Publications, patents, GitHub repos, conference talks, blog posts, product launches, awards, media mentions, HuggingFace spaces, arXiv papers.
- **Composite scoring** weighted by role: AI Excellence (40%), Technical Ability (25%), Product Instinct (20%), Leadership Potential (15%).
- **Matching board**: Assign people to concepts by role.
- **Engagement inbox**: Multi-channel tracking (email, LinkedIn, Twitter, referral, event, inbound).
- **Residency tracker**: Stipend tracking, milestones, weekly check-ins, graduation status (active/completed/extended/terminated/paused).
- **Investment review**: Decision memos with outcomes (invest/pass/defer/conditional).
- **Intelligence runs**: Multi-provider async orchestration (Exa, Parallel, GitHub, Harmonic, manual). Status tracking, results aggregation, founder import from run results.
- **Concept-linked searches**: Run sourcing searches scoped to specific venture concepts.

### Watchlist & History

- **Multiple watchlists** with custom names — persistent, per-user.
- **Search history tab** with timestamps, replay, and clear functionality.
- **Guide tab**: Embedded docs site for workflow reference.

### Infrastructure & Security

- **19 Supabase Edge Functions** (Deno): github-search, github-profile, github-code-quality, research-role, parse-jd, search-candidates, enrich-linkedin, generate-outreach, bulk-actions, exa-websets, harmonic-enrich, harmonic-search, harmonic-person, harmonic-intelligence, notify-pipeline-change, check-subscription, create-checkout-session, stripe-webhook, plus shared utilities (_shared/).
- **Multi-user isolation**: Per-user Row Level Security on all tables, token rotation, user-scoped API key protection.
- **Auth hardening**: Endpoint-level auth checks (`requireAuth`), CORS hardening, CSP frame-ancestors, rate limiting (429 responses with backoff).
- **Stripe integration**: Checkout flow, webhook handling, subscription status checks, trial limit tracking, upgrade modal.
- **Theme support**: Dark/light mode toggle, persisted to localStorage.
- **Mobile responsive**: Full mobile sidebar with collapsible navigation.
- **Stack**: React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix UI), React Query, Supabase (Postgres + Edge Functions + Auth), Vercel deployment.

---

## Key Stats for Outreach

- **~40% hidden gem rate**: Top-scored candidates often have low or zero LinkedIn activity. Keyword search misses them. Artifact search finds them.
- **Websets = always-on pipeline**: Runs on a schedule, finds candidates who weren't active when you first searched. Pipeline grows without recruiter effort.
- **EEA = binary, not subjective**: 11 dimensions, pass/fail against public evidence. Score reflects verifiable signal only.
- **Builder Score detects AI-native engineers**: Catches Claude Code commits, Cursor configs, GenAI framework usage — forward-looking signal most tools ignore.
- **7 external APIs orchestrated through 19 edge functions**: GitHub, Exa (search + websets + answers + findSimilar), Harmonic (company + person + search + intelligence), Parallel (tasks + findAll + search), Anthropic Claude (strategy + scoring + outreach + bulk chat), Stripe, Slack.
- **Entire product designed and built with Claude Code** as the engineering layer.

---

**App**: https://getsourcekit.vercel.app
**Docs**: https://sourcekit-docs.netlify.app
**GitHub**: https://github.com/mrNLK/SourceKit
