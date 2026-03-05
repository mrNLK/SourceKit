# SourceKit Talent Finder — Tester Guide

**URL:** https://getsourcekit.vercel.app

---

## What Is SourceKit Talent Finder?

SourceKit Talent Finder is an **evidence-based technical sourcing tool** for recruiting software engineers. Instead of searching LinkedIn for "Senior Engineer" and getting thousands of generic profiles, this tool finds people based on **what they've actually built** — their open-source contributions, the repositories they work on, and the code they've shipped.

Here's what it does:

1. **Research** — Describe a role (or paste a job description) and AI builds a sourcing strategy: which repos to mine, which companies to poach from, what skills matter most, and what EEA criteria to verify
2. **Search** — Finds real GitHub contributors who match your criteria, scores them, enriches top candidates with grounded web summaries, and highlights hidden gems
3. **Enrich** — Looks up LinkedIn profiles, finds contact info, detects Evidence of Exceptional Ability (EEA) signals
4. **Company Intel** — Deep research on target companies: engineering headcount, tech stack, hiring/attrition signals, and specific engineer discovery
5. **Pipeline** — Track candidates through Sourced → Contacted → Responded → Screen → Offer
6. **Outreach** — AI writes personalized messages referencing the candidate's actual open-source work
7. **Websets** — Persistent, auto-updating candidate collections with CSV import and webhook support

The key insight: **open-source contributions are the most honest signal of engineering ability.** This tool makes that signal searchable, verifiable, and persistent.

---

## How the APIs Work

Understanding how search works behind the scenes helps you write better queries and get better results.

### Exa Research API (Strategy Generation)

When you build a sourcing strategy, SourceKit uses the **Exa Research API** as the primary engine:

1. **Async research request** — Sends the role description to Exa's `/research/v1` endpoint
2. **Polls for completion** — The research task runs asynchronously (up to 30 polls at 3-second intervals)
3. **Structured output** — Returns target repositories, poach companies, skills matrix, and EEA criteria grounded in web evidence
4. **Claude fallback** — If Exa Research is unavailable or fails, Claude AI generates the strategy as an automatic fallback

The response includes a `research_source` field indicating whether Exa or Claude generated the strategy.

### Exa Answer API (Grounded Summaries)

After GitHub search and scoring, the top 10 candidates are enriched with the **Exa Answer API**:

1. **Per-candidate query** — For each top candidate, a natural-language question is sent to `/answer`
2. **Web-grounded response** — Exa returns a summary verified against actual web pages
3. **Citations included** — Each summary comes with up to 5 citation URLs linking to the evidence
4. **Displayed on cards** — Grounded summaries appear as italic text with a left border below the candidate's bio

### Exa findSimilar (Similar Candidates)

From any candidate's detail view, you can discover similar engineers:

1. **Profile URL submitted** — The candidate's GitHub URL is sent to Exa's `/findSimilar` endpoint
2. **Vector matching** — Exa finds pages with similar content and signals
3. **Results panel** — Similar candidates appear in the slide-out with name, URL, similarity score, and GitHub username

### GitHub API (Primary Data Source)

When you run a search, the app uses the **GitHub REST API** to find contributors:

1. **AI parses your query** — Extracts target repositories, skills, location, and seniority from your natural language input
2. **Scans repo contributors** — Fetches the top 30 contributors from each target repository
3. **Falls back to user search** — If no repos are found, searches GitHub users by keywords
4. **Fetches full profiles** — For each contributor: bio, location, followers, stars, languages, repositories

Then an **AI scoring model** evaluates each candidate on:
- Contribution quality (commits to significant repos)
- Language expertise (matches your skill requirements)
- Community standing (followers, stars)
- Hidden Gem detection (high quality + low visibility)

**Tips for better search queries:**

| Do this | Not this |
|---------|----------|
| "Rust systems engineers who contribute to tokio or hyper" | "Rust" |
| "React accessibility experts working on reach-ui or radix" | "React dev" |
| "ML infrastructure engineers contributing to pytorch or ray" | "ML" |
| Name specific repos: "contributors to vercel/ai and langchain" | "AI engineers" |
| Add location: "Kubernetes contributors based in Europe" | Just "Kubernetes" |

**Key insight:** Naming specific GitHub repositories dramatically improves results. The tool mines contributors from those repos directly.

### Parallel.ai (Company Intelligence + Talent Mapping)

Two Parallel.ai integrations provide company-level intelligence:

1. **Company Intel** (Task API) — Multi-hop web research on each poach company:
   - Estimated engineering headcount
   - Tech stack signals from job posts and repos
   - Recent hiring surge or attrition signals
   - Rationale for why to source from this company
   - LinkedIn search URL for the engineering team

2. **Map Engineers** (FindAll API) — Discovers specific engineers at a target company:
   - Name, title, LinkedIn URL, GitHub URL
   - Notable work or projects
   - Results appear inline in the strategy editor

### Anthropic Claude (AI Scoring & Outreach)

Claude powers:

1. **Candidate scoring** — Evaluates each candidate's profile and assigns a 0-100 score with a summary explaining *why* they're a good fit
2. **Outreach generation** — Writes personalized messages referencing the candidate's actual work
3. **Strategy fallback** — If Exa Research is unavailable, Claude generates the sourcing strategy

### Exa Websets (Persistent Collections)

Websets are persistent, auto-updating candidate collections:

1. **Create** — Build a Webset from any search or from scratch with entity type, query, and filtering criteria
2. **Auto-Enrich** — Every item is enriched with company, role, LinkedIn, GitHub, and languages
3. **Monitor** — Schedule auto-updates to discover new candidates matching your criteria
4. **CSV Import** — Upload existing candidate lists for Exa enrichment
5. **Webhooks** — Register endpoints to receive real-time notifications on new matches

### Exa (LinkedIn Enrichment)

When you click "Find LinkedIn" on a candidate, the app uses **Exa** (a semantic search engine) to find their LinkedIn profile by searching for their name + location + bio on linkedin.com. Claude then evaluates the match confidence (high/medium/low).

---

## Workflow Overview

```
┌──────────────────────────────────────────────────────────────┐
│                  SOURCEKIT TALENT FINDER                      │
│                                                              │
│  ┌──────────────┐         ┌──────────────────────────┐      │
│  │   RESEARCH   │────────▶│        SEARCH            │      │
│  │              │         │                          │      │
│  │ Paste a JD   │  OR     │ "Rust systems engineers  │      │
│  │ or describe  │ START   │  contributing to tokio"  │      │
│  │ the role     │ HERE    │                          │      │
│  └──────┬───────┘         └────────────┬─────────────┘      │
│         │                              │                     │
│  ┌──────▼───────┐         ┌───────────▼──────────────┐     │
│  │ COMPANY      │         │     RESULTS              │     │
│  │ INTELLIGENCE │         │                          │     │
│  │              │         │  Score ● Name ● Repos    │     │
│  │ Headcount    │         │  Grounded Summaries      │     │
│  │ Tech Stack   │         │  Hidden Gem badges       │     │
│  │ Map Engineers│         │                          │     │
│  └──────────────┘         │  [Star] [Pipeline+]      │     │
│                           │  [Similar] [LinkedIn]    │     │
│                           └───────────┬──────────────┘     │
│                                       │                     │
│         ┌─────────────────────────────┼───────────┐        │
│         │                             │           │        │
│         ▼                             ▼           ▼        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  PIPELINE    │  │  WEBSETS     │  │  BULK ACTIONS    │  │
│  │              │  │              │  │                   │  │
│  │  Sourced     │  │  Persistent  │  │  Compare, rank,  │  │
│  │  Contacted   │  │  collections │  │  draft outreach  │  │
│  │  Responded   │  │  CSV import  │  │  for multiple    │  │
│  │  Screen      │  │  Webhooks    │  │  candidates      │  │
│  │  Offer       │  │  Monitoring  │  │                   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Getting Started

Go to **https://getsourcekit.vercel.app** — **Google SSO login required.** Click "Sign in with Google" to get started.

> **Note:** Authentication is required. Each user's data (pipeline, watchlist, settings) is isolated to their account.

---

## Step-by-Step Walkthrough

### Option A: Start with Research (Recommended)

Best when you have a job description or specific role in mind.

1. Click **Research** in the sidebar
2. Choose your input mode:
   - **Role + Company**: Enter "Staff ML Engineer" + "Anthropic"
   - **Job Description**: Paste a JD URL or the full text
3. Click **Build Sourcing Strategy**
4. Wait 15-20 seconds (Exa Research generates the plan)

**What you get back (all editable):**

```
┌─────────────────────────────────────────────────────┐
│              SOURCING STRATEGY                       │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Search Query (click pencil to edit)                 │
│  "ML infrastructure engineers contributing to        │
│   PyTorch, Ray, or MLflow with distributed           │
│   systems experience"                                │
│                                                      │
│  Target Repositories                                 │
│  ┌────────────────┐  ┌───────────┐  ┌────────────┐ │
│  │ pytorch/pytorch│  │ ray/ray   │  │ mlflow/... │ │
│  │ Core ML infra  │  │ Dist comp │  │ ML ops     │ │
│  └────────────────┘  └───────────┘  └────────────┘ │
│  + Add repository                                    │
│                                                      │
│  Companies to Source From                            │
│  DeepMind (Competitor)  [Map Engineers]               │
│  Databricks (Adjacent)  [Map Engineers]               │
│  Netflix (Talent Hub)   [Map Engineers]               │
│  + Add company                                       │
│                                                      │
│  Skills                                              │
│  Must Have: [Python] [PyTorch] [Distributed]         │
│  Nice to Have: [Kubernetes] [CUDA] [Rust]            │
│                                                      │
│  EEA Signals                                         │
│  PhD in ML/CS    NeurIPS/ICML publications           │
│  Core maintainer  Conference speaker                 │
│                                                      │
│  [Search with this strategy]                         │
└─────────────────────────────────────────────────────┘
```

5. **Edit freely** — Remove irrelevant repos or companies, add your own, adjust skills
6. **Map Engineers** — Hover over any poach company and click the people icon to discover specific engineers at that company
7. Click **Search with this strategy** to jump to Search with everything pre-filled

### Option B: Start with Search (Quick Exploration)

1. Click **New Search** in the sidebar
2. Type a query in the search bar (e.g. "Rust systems engineers")
3. Click **Search** or press Enter

**Quick start chips** (when search is empty):
- "Rust systems engineers"
- "React accessibility experts"
- "ML infrastructure"
- "Kubernetes contributors"
- "Security researchers"

Click any chip to see the expanded query. Double-click to search immediately.

---

## Understanding Search Results

### Candidate Cards

Each card shows:

```
┌─────────────────────────────────────────────────┐
│  [Avatar]  Jane Smith              Score: 85     │
│            @janesmith · GitHub                    │
│                                                   │
│  "Building distributed ML systems at scale..."    │
│                                                   │
│  Grounded: "Jane contributed to PyTorch's         │
│  distributed training module and presented at      │
│  NeurIPS 2024..."  [citation] [citation]          │
│                                                   │
│  Contributed to:                                  │
│  pytorch/pytorch (142 commits)                    │
│  ray-project/ray (38 commits)                     │
│                                                   │
│  Python 60%  Rust 20%  C++ 20%                    │
│                                                   │
│  2.4k stars  45 repos  San Francisco              │
│                                                   │
│  [Star] [Pipeline+] [Similar] [LinkedIn]          │
└─────────────────────────────────────────────────┘
```

**Score colors:** Green (70+) = strong match | Amber (40-69) = possible match | Red (below 40) = weak match

**Special badges:**
- **Hidden Gem** — High quality, low visibility (under-the-radar talent)
- **In Pipeline** — Already saved to your pipeline
- **EEA** — Shows Evidence of Exceptional Ability signals

**Grounded Summary** — Top 10 candidates display an italic summary below their bio with citation links. These are web-verified by Exa Answer, not AI-generated guesses.

### Card Actions (hover to reveal)

| Button | What it does |
|--------|-------------|
| **Star** (shortlist) | Marks as priority. Yellow border when active. |
| **Pipeline+** | Adds to pipeline in "Sourced" stage |
| **LinkedIn** | If found: opens profile + copy. If not: searches (~30 sec). |
| **Bookmark** | Saves to your watchlist |

### Candidate Detail View

Click any card to open the full profile slide-out:
- Full profile with all enrichment data
- Grounded summary with citation links
- EEA signals with evidence links
- **Find Similar Candidates** — Click to discover engineers with similar profiles via Exa findSimilar
- **Outreach generator** — AI writes a personalized message referencing their actual work
- Pipeline controls — Change stage, add notes
- Watchlist toggle
- Press **Escape** to close

### Filtering & Sorting Results

**Filter bar above results:**

| Control | What it does |
|---------|-------------|
| **Skill Priorities** | Opens side panel to add weighted skills. Drag to reorder — higher = more weight in scoring. |
| **Location** dropdown | Filter by city/region from results |
| **Hidden Gems** toggle | Show only under-the-radar candidates |
| **Results count** | 10, 20, or 50 |
| **Enrich All** | Batch-find LinkedIn URLs for all results |
| **Language** filter | Filter by programming language |
| **Min Score** | Any / 30+ / 50+ / 70+ / 80+ |
| **Seniority** tabs | Any / Junior / Mid / Senior |
| **Export** | Download as CSV or JSON |

**Funnel visualization** (when filters active): Shows how many candidates pass each filter step.

### Batch Operations
- **Check All** — Select all visible candidates
- **Add to Pipeline** — Bulk-add selected to pipeline
- **Expand Search** — Find more candidates (up to 50 total)

---

## Pipeline

Click **Pipeline** in the sidebar. Five-stage kanban board:

```
┌──────────┐   ┌───────────┐   ┌───────────┐   ┌────────┐   ┌───────┐
│ SOURCED  │──▶│ CONTACTED │──▶│ RESPONDED │──▶│ SCREEN │──▶│ OFFER │
│  (blue)  │   │  (amber)  │   │ (lt blue) │   │(purple)│   │(green)│
└──────────┘   └───────────┘   └───────────┘   └────────┘   └───────┘
```

- **Drag and drop** cards between stages
- Each card has a **time indicator**: recent, 4-7 days, 8+ days in stage
- **Click a card** to open full profile
- **Hover actions**: Bookmark + Delete
- **Export** downloads pipeline as CSV

---

## Exa Websets

Navigate to the **Websets** tab to manage persistent candidate collections:

- **Create Webset** — Define entity type, search query, and filtering criteria
- **Add Criteria** — Natural language criteria like "has contributed to a top-100 starred repo"
- **CSV Import** — Click the upload button to import a CSV of candidates into a Webset for enrichment
- **Monitor** — Set a schedule for auto-updates
- **Webhooks** — Register webhook URLs to receive notifications on new matches
- **Push to Pipeline** — Move Webset matches into your candidate pipeline

---

## Bulk Actions

Two-panel layout for batch AI analysis:

**Left panel — Candidate table:**
- Filter by name, stage, or score range
- Sort by name, score, or stage
- Check candidates to select

**Right panel — AI Chat:**

| Action | What it does | Requirements |
|--------|-------------|-------------|
| **Refine Shortlist** | Ranks candidates with recommendations | 1+ selected |
| **Draft Outreach** | Personalized email openers | 1-8 selected |
| **Search Insights** | Pool stats: avg scores, top companies, skills | Any candidates |
| **Candidate Brief** | One-sentence strength/risk per candidate | 1-5 selected |
| **Compare Selected** | Side-by-side comparison table | 2-3 selected |

You can also type custom questions in the chat.

---

## History

Browse past searches grouped by time (Today, Yesterday, This Week, Older):
- **Filter** by query text
- **Click** any entry to re-run that search
- Research sessions show with a document icon, searches with a search icon

---

## Settings

Configure defaults:
- **Target Role** — Pre-fills search forms
- **Target Company** — Used in outreach generation
- **Webhook URL** — POST candidate data on stage changes

---

## Tips for Testers

1. **Research first** — The AI strategy builder dramatically improves search quality
2. **Name specific repos** — "contributors to facebook/react" beats "React engineers"
3. **Edit the strategy** — Remove irrelevant repos/companies before searching
4. **Map engineers on poach companies** — Click the people icon to discover specific engineers before the broader search runs
5. **Check grounded summaries** — Top 10 candidates get web-verified summaries with citations. Click the citation links to validate claims.
6. **Use Find Similar** — Found one great candidate? Click "Find Similar" in their detail view to discover a cluster of similar engineers
7. **Try CSV import on Websets** — Upload an existing candidate list and let Exa enrich and verify each one
8. **Use Skill Priorities** — Adding 3-5 weighted skills reshapes the ranking
9. **Use Bulk Actions chat** — "Compare Selected" is great for finalist decisions
10. **Drag-and-drop pipeline** — Drag cards between stages to track progress

## Important Notes

- **Google SSO required** — Sign in with Google to access the app. Data is isolated per user.
- **GitHub API rate limits** — If searches fail, wait a few minutes before retrying
- **LinkedIn enrichment** depends on publicly available data — some lookups may fail
- **Strategy source** — Check the `research_source` field to see if Exa or Claude generated your strategy
- **Company Intel polling** — Parallel tasks may take 30-60s per company. Results stream in as they complete.
- **Browser data persists** — Clearing cookies resets shortlist/filter preferences

## Feedback

Please note:
- Any bugs or errors (screenshots help!)
- Search queries that return poor results
- Quality of grounded summaries and citations
- Company Intel accuracy (headcount, tech stack signals)
- Find Similar result quality
- Features that feel confusing or missing
- Quality of AI-generated outreach and research
- Pipeline workflow friction points
