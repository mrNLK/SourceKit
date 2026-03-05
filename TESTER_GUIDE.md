# SourceKit Talent Finder / Tester Guide

**URL:** https://getsourcekit.vercel.app

---

## What Is SourceKit Talent Finder?

SourceKit is an **evidence-based technical sourcing tool** for recruiting software engineers. Instead of searching LinkedIn for "Senior Engineer" and getting thousands of generic profiles, it finds people based on **what they've actually built**: open-source contributions, the repositories they work on, the code they've shipped.

**Research** builds an AI sourcing strategy from a role spec: repos to mine, companies to poach from, skills, EEA criteria. **Search** finds GitHub contributors matching your criteria, scores them, and enriches top candidates with grounded web summaries. **Enrich** looks up LinkedIn profiles and contact info. **Company Intel** deep-researches target companies for headcount, tech stack, hiring/attrition signals and discovers specific engineers. **Pipeline** tracks candidates through Sourced > Contacted > Responded > Screen > Offer. **Outreach** generates personalized messages referencing actual open-source work. **Websets** builds persistent, auto-updating candidate collections with CSV import and webhook support.

Open-source contributions are the most honest signal of engineering ability. SourceKit makes that signal searchable, verifiable, and persistent.

---

## How the APIs Work

Better queries produce better results. Knowing how search works under the hood helps.

### Exa Research API (Strategy Generation)

SourceKit uses the **Exa Research API** as the primary strategy engine. It sends the role description to Exa's `/research/v1` endpoint, polls asynchronously (up to 30 polls at 3s intervals), and gets back a structured strategy: target repositories, poach companies, skills matrix, and EEA criteria grounded in web evidence. If Exa Research is unavailable, Claude AI generates the strategy automatically. The response includes a `research_source` field showing which engine produced it.

### Exa Answer API (Grounded Summaries)

After GitHub search and scoring, the top 10 candidates are enriched via the **Exa Answer API**. For each candidate, a natural-language question goes to `/answer`. Exa returns a summary verified against actual web pages, with up to 5 citation URLs linking to the evidence. These appear as italic text with a left border below the candidate's bio on their card.

### Exa findSimilar (Similar Candidates)

From any candidate's detail view, click "Find Similar Candidates." The candidate's GitHub URL goes to Exa's `/findSimilar` endpoint. Exa returns pages with similar content and signals. Results appear in the slide-out with name, URL, similarity score, and GitHub username.

### GitHub API (Primary Data Source)

The app uses the **GitHub REST API** to find contributors. It extracts target repositories, skills, location, and seniority from the search query; fetches the top 30 contributors from each target repo; falls back to user search if no repos are found; then pulls full profiles (bio, location, followers, stars, languages, repositories).

An AI scoring model evaluates each candidate on contribution quality (commits to significant repos), language expertise (match to role requirements), community standing (followers, stars), and hidden gem detection (high quality + low visibility).

**Tips for better search queries:**

| Do this | Not this |
|---------|----------|
| "Rust systems engineers who contribute to tokio or hyper" | "Rust" |
| "React accessibility experts working on reach-ui or radix" | "React dev" |
| "ML infrastructure engineers contributing to pytorch or ray" | "ML" |
| Name specific repos: "contributors to vercel/ai and langchain" | "AI engineers" |
| Add location: "Kubernetes contributors based in Europe" | Just "Kubernetes" |

Naming specific GitHub repositories is the single biggest lever. The tool mines contributors from those repos directly.

### Parallel.ai (Company Intelligence + Talent Mapping)

**Company Intel** (Task API) runs multi-hop web research on each poach company: estimated engineering headcount, tech stack signals from job posts and repos, hiring surge or attrition signals, rationale for sourcing, LinkedIn search URL for the engineering team.

**Map Engineers** (FindAll API) discovers specific engineers at a target company: name, title, LinkedIn URL, GitHub URL, notable work. Results appear inline in the strategy editor.

### Anthropic Claude (AI Scoring + Outreach)

Claude handles candidate scoring (0-100 with an explanation of fit), outreach generation (personalized messages referencing actual work), and strategy fallback if Exa Research is unavailable.

### Exa Websets (Persistent Collections)

Websets are persistent, auto-updating candidate collections. Create one from any search or from scratch with entity type, query, and filtering criteria. Every item is enriched with company, role, LinkedIn, GitHub, and languages. Schedule auto-updates to discover new matches. Upload existing candidate lists via CSV for Exa enrichment. Register webhook endpoints for real-time notifications on new matches.

### Exa (LinkedIn Enrichment)

Clicking "Find LinkedIn" on a candidate triggers a semantic search via Exa for their name + location + bio on linkedin.com. Claude evaluates the match confidence (high/medium/low).

---

## Workflow Overview

```
+--------------------------------------------------------------+
|                  SOURCEKIT TALENT FINDER                      |
|                                                              |
|  +--------------+         +--------------------------+      |
|  |   RESEARCH   |------->|        SEARCH            |      |
|  |              |         |                          |      |
|  | Paste a JD   |  OR    | "Rust systems engineers  |      |
|  | or describe  | START  |  contributing to tokio"  |      |
|  | the role     | HERE   |                          |      |
|  +------+-------+         +------------+-------------+      |
|         |                              |                     |
|  +------v-------+         +-----------v--------------+     |
|  | COMPANY      |         |     RESULTS              |     |
|  | INTELLIGENCE |         |                          |     |
|  |              |         |  Score / Name / Repos    |     |
|  | Headcount    |         |  Grounded Summaries      |     |
|  | Tech Stack   |         |  Hidden Gem badges       |     |
|  | Map Engineers|         |                          |     |
|  +--------------+         |  [Star] [Pipeline+]      |     |
|                           |  [Similar] [LinkedIn]    |     |
|                           +-----------+--------------+     |
|                                       |                     |
|         +-----------------------------+-----------+        |
|         |                             |           |        |
|         v                             v           v        |
|  +--------------+  +--------------+  +------------------+  |
|  |  PIPELINE    |  |  WEBSETS     |  |  BULK ACTIONS    |  |
|  |              |  |              |  |                   |  |
|  |  Sourced     |  |  Persistent  |  |  Compare, rank,  |  |
|  |  Contacted   |  |  collections |  |  draft outreach  |  |
|  |  Responded   |  |  CSV import  |  |  for multiple    |  |
|  |  Screen      |  |  Webhooks    |  |  candidates      |  |
|  |  Offer       |  |  Monitoring  |  |                   |  |
|  +--------------+  +--------------+  +------------------+  |
+--------------------------------------------------------------+
```

---

## Getting Started

Go to **https://getsourcekit.vercel.app**. Google SSO login required. Click "Sign in with Google."

Authentication is required. Each user's data (pipeline, watchlist, settings) is isolated to their account.

---

## Step-by-Step Walkthrough

### Option A: Start with Research (Recommended)

Best when you have a job description or specific role in mind.

Click **Research** in the sidebar. Choose your input mode: **Role + Company** (e.g. "Staff ML Engineer" + "Anthropic"), or **Job Description** (paste JD URL or full text). Click **Build Sourcing Strategy**. Wait 15-20 seconds while Exa Research generates the plan.

**What you get back (all editable):**

```
+-----------------------------------------------------+
|              SOURCING STRATEGY                       |
+-----------------------------------------------------+
|                                                      |
|  Search Query (click pencil to edit)                 |
|  "ML infrastructure engineers contributing to        |
|   PyTorch, Ray, or MLflow with distributed           |
|   systems experience"                                |
|                                                      |
|  Target Repositories                                 |
|  +----------------+  +-----------+  +------------+  |
|  | pytorch/pytorch|  | ray/ray   |  | mlflow/... |  |
|  | Core ML infra  |  | Dist comp |  | ML ops     |  |
|  +----------------+  +-----------+  +------------+  |
|  + Add repository                                    |
|                                                      |
|  Companies to Source From                            |
|  DeepMind (Competitor)  [Map Engineers]               |
|  Databricks (Adjacent)  [Map Engineers]               |
|  Netflix (Talent Hub)   [Map Engineers]               |
|  + Add company                                       |
|                                                      |
|  Skills                                              |
|  Must Have: [Python] [PyTorch] [Distributed]         |
|  Nice to Have: [Kubernetes] [CUDA] [Rust]            |
|                                                      |
|  EEA Signals                                         |
|  PhD in ML/CS    NeurIPS/ICML publications           |
|  Core maintainer  Conference speaker                 |
|                                                      |
|  [Search with this strategy]                         |
+-----------------------------------------------------+
```

Edit freely: remove irrelevant repos or companies, add your own, adjust skills. Hover over any poach company and click the people icon to map engineers at that company. Click **Search with this strategy** to run with everything pre-filled.

### Option B: Start with Search (Quick Exploration)

Click **New Search** in the sidebar. Type a query (e.g. "Rust systems engineers"). Click **Search** or press Enter.

**Quick start chips** (when search is empty): "Rust systems engineers," "React accessibility experts," "ML infrastructure," "Kubernetes contributors," "Security researchers." Click any chip to see the expanded query. Double-click to search immediately.

---

## Understanding Search Results

### Candidate Cards

Each card shows:

```
+-------------------------------------------------+
|  [Avatar]  Jane Smith              Score: 85     |
|            @janesmith / GitHub                    |
|                                                   |
|  "Building distributed ML systems at scale..."    |
|                                                   |
|  Grounded: "Jane contributed to PyTorch's         |
|  distributed training module and presented at      |
|  NeurIPS 2024..."  [citation] [citation]          |
|                                                   |
|  Contributed to:                                  |
|  pytorch/pytorch (142 commits)                    |
|  ray-project/ray (38 commits)                     |
|                                                   |
|  Python 60%  Rust 20%  C++ 20%                    |
|                                                   |
|  2.4k stars  45 repos  San Francisco              |
|                                                   |
|  [Star] [Pipeline+] [Similar] [LinkedIn]          |
+-------------------------------------------------+
```

**Score colors:** Green (70+) = strong match | Amber (40-69) = possible match | Red (below 40) = weak match

**Special badges:**
- **Hidden Gem** = high quality, low visibility (under-the-radar talent)
- **In Pipeline** = already saved to your pipeline
- **EEA** = Evidence of Exceptional Ability signals detected

**Grounded Summary**: Top 10 candidates display an italic summary below their bio with citation links. Web-verified by Exa Answer, not AI-generated guesses.

### Card Actions (hover to reveal)

| Button | What it does |
|--------|-------------|
| **Star** (shortlist) | Marks as priority. Yellow border when active. |
| **Pipeline+** | Adds to pipeline in "Sourced" stage |
| **LinkedIn** | Opens profile if found; searches if not (~30 sec) |
| **Bookmark** | Saves to your watchlist |

### Candidate Detail View

Click any card to open the full profile slide-out. Includes full enrichment data, grounded summary with citation links, EEA signals with evidence links, **Find Similar Candidates** button (Exa findSimilar), outreach generator, pipeline controls, and watchlist toggle. Press **Escape** to close.

### Filtering + Sorting

**Filter bar above results:**

| Control | What it does |
|---------|-------------|
| **Skill Priorities** | Side panel with weighted skills. Drag to reorder. Higher = more weight. |
| **Location** dropdown | Filter by city/region from results |
| **Hidden Gems** toggle | Show only under-the-radar candidates |
| **Results count** | 10, 20, or 50 |
| **Enrich All** | Batch-find LinkedIn URLs for all results |
| **Language** filter | Filter by programming language |
| **Min Score** | Any / 30+ / 50+ / 70+ / 80+ |
| **Seniority** tabs | Any / Junior / Mid / Senior |
| **Export** | Download as CSV or JSON |

**Funnel visualization** (when filters active): shows how many candidates pass each filter step.

### Batch Operations
- **Check All** selects all visible candidates
- **Add to Pipeline** bulk-adds selected
- **Expand Search** finds more candidates (up to 50 total)

---

## Pipeline

Click **Pipeline** in the sidebar. Five-stage kanban board:

```
+----------+   +-----------+   +-----------+   +--------+   +-------+
| SOURCED  |-->| CONTACTED |-->| RESPONDED |-->| SCREEN |-->| OFFER |
|  (blue)  |   |  (amber)  |   | (lt blue) |   |(purple)|   |(green)|
+----------+   +-----------+   +-----------+   +--------+   +-------+
```

Drag and drop cards between stages. Each card has a time indicator: green = recent, amber = 4-7 days, red = 8+ days in stage. Click a card to open full profile. Hover for bookmark + delete actions. Export downloads pipeline as CSV.

---

## Exa Websets

Navigate to the **Websets** tab. Manage persistent candidate collections: create Websets with entity type, search query, and filtering criteria. Add natural language criteria like "has contributed to a top-100 starred repo." CSV import uploads candidates into a Webset for enrichment. Set monitoring schedules for auto-updates. Register webhook URLs for notifications on new matches. Push matches into your pipeline.

---

## Bulk Actions

Two-panel layout. Left: candidate table with filters (name, stage, score range) and sort (name, score, stage). Right: AI chat.

| Action | What it does | Requirements |
|--------|-------------|-------------|
| **Refine Shortlist** | Ranks candidates with recommendations | 1+ selected |
| **Draft Outreach** | Personalized email openers | 1-8 selected |
| **Search Insights** | Pool stats: avg scores, top companies, skills | Any candidates |
| **Candidate Brief** | One-sentence strength/risk per candidate | 1-5 selected |
| **Compare Selected** | Side-by-side comparison table | 2-3 selected |

Custom questions also work in the chat.

---

## History

Past searches grouped by time (Today, Yesterday, This Week, Older). Filter by query text. Click any entry to re-run. Research sessions show with a document icon, searches with a search icon.

---

## Settings

- **Target Role** pre-fills search forms
- **Target Company** used in outreach generation
- **Webhook URL** POSTs candidate data on stage changes

---

## Tips for Testers

- **Research first.** The strategy builder dramatically improves search quality.
- **Name specific repos.** "contributors to facebook/react" beats "React engineers."
- **Edit the strategy.** Remove irrelevant repos/companies before searching.
- **Map engineers on poach companies.** Click the people icon to discover specific engineers before running broader search.
- **Check grounded summaries.** Top 10 candidates get web-verified summaries with citations. Click citation links to validate claims.
- **Use Find Similar.** One strong match can surface a cluster of similar engineers instantly.
- **Try CSV import on Websets.** Upload an existing candidate list and let Exa enrich each one.
- **Use Skill Priorities.** Adding 3-5 weighted skills reshapes the ranking.
- **Use Bulk Actions chat.** "Compare Selected" is great for finalist decisions.
- **Drag-and-drop pipeline.** Drag cards between stages to track progress.

## Important Notes

- **Google SSO required.** Data is isolated per user.
- **GitHub API rate limits.** If searches fail, wait a few minutes.
- **LinkedIn enrichment** depends on publicly available data; some lookups will fail.
- **Strategy source.** Check `research_source` to see if Exa or Claude generated your strategy.
- **Company Intel polling.** Parallel tasks take 30-60s per company. Results stream in as they complete.
- **Browser data persists.** Clearing cookies resets shortlist/filter preferences.

## Feedback

Report: bugs/errors (screenshots help), search queries with poor results, grounded summary quality, Company Intel accuracy, Find Similar result quality, confusing or missing features, outreach quality, pipeline friction points.
