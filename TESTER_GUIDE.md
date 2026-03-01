# SourceKit Talent Finder — Tester Guide

**URL:** https://getsourcekit.vercel.app

---

## What Is SourceKit Talent Finder?

SourceKit Talent Finder is a **GitHub-powered candidate sourcing tool** for technical recruiting. Instead of searching LinkedIn for "Senior Engineer" and getting thousands of generic profiles, this tool finds people based on **what they've actually built** — their open-source contributions, the repositories they work on, and the code they've shipped.

Here's what it does:

1. **Research** — Describe a role (or paste a job description) and AI builds a sourcing strategy: which repos to mine, which companies to poach from, what skills matter most
2. **Search** — Finds real GitHub contributors who match your criteria, scores them, and highlights hidden gems
3. **Enrich** — Looks up LinkedIn profiles, finds contact info, detects Evidence of Exceptional Ability (EEA) signals
4. **Pipeline** — Track candidates through Sourced → Contacted → Responded → Screen → Offer
5. **Outreach** — AI writes personalized messages referencing the candidate's actual open-source work

The key insight: **open-source contributions are the most honest signal of engineering ability.** This tool makes that signal searchable.

---

## How the Search APIs Work

Understanding how search works behind the scenes helps you write better queries and get better results.

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

### Anthropic Claude (AI Scoring & Research)

Two AI calls power the intelligence:

1. **Query parsing** — Claude reads your search query and extracts structured criteria (repos to check, skills to weight, location filter, seniority level)
2. **Candidate scoring** — Claude evaluates each candidate's profile and assigns a 0-100 score with a summary explaining *why* they're a good fit

For Research mode, Claude also builds a complete sourcing strategy from a job description:
- Identifies 8-15 target GitHub repositories where ideal candidates contribute
- Suggests 8-12 companies to source from (competitors, adjacent companies, talent hubs)
- Splits skills into "Must Have" vs "Nice to Have"
- Defines EEA signals to look for

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
│  └──────────────┘         └────────────┬─────────────┘      │
│                                        │                     │
│                            ┌───────────▼──────────────┐     │
│                            │     RESULTS              │     │
│                            │                          │     │
│                            │  Score ● Name ● Repos    │     │
│                            │  Languages ● Location    │     │
│                            │  Hidden Gem badges       │     │
│                            │                          │     │
│                            │  [Star] [Pipeline+]      │     │
│                            │  [LinkedIn] [Bookmark]   │     │
│                            └───────────┬──────────────┘     │
│                                        │                     │
│         ┌──────────────────────────────┼───────────┐        │
│         │                              │           │        │
│         ▼                              ▼           ▼        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  PIPELINE    │  │  WATCHLIST   │  │  BULK ACTIONS    │  │
│  │              │  │              │  │                   │  │
│  │  Sourced     │  │  Save for    │  │  Compare, rank,  │  │
│  │  Contacted   │  │  later in    │  │  draft outreach  │  │
│  │  Responded   │  │  custom      │  │  for multiple    │  │
│  │  Screen      │  │  lists       │  │  candidates      │  │
│  │  Offer       │  │              │  │                   │  │
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
4. Wait 1-2 minutes

**What you get back (all editable):**

```
┌─────────────────────────────────────────────────────┐
│              SOURCING STRATEGY                       │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Search Query (click ✏ to edit)                      │
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
│  🔴 DeepMind (Competitor)                            │
│  🟡 Databricks (Adjacent)                            │
│  🔵 Netflix (Talent Hub)                             │
│  + Add company                                       │
│                                                      │
│  Skills                                              │
│  ✅ Must Have: [Python] [PyTorch] [Distributed]     │
│  🟡 Nice to Have: [Kubernetes] [CUDA] [Rust]        │
│                                                      │
│  EEA Signals                                         │
│  ☑ PhD in ML/CS    ☑ NeurIPS/ICML publications      │
│  ☑ Core maintainer  ☑ Conference speaker             │
│                                                      │
│  [▶ Search with this strategy]                       │
└─────────────────────────────────────────────────────┘
```

5. **Edit freely** — Remove irrelevant repos or companies, add your own, adjust skills
6. Click **Search with this strategy** to jump to Search with everything pre-filled

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
│  [Avatar]  Jane Smith              Score: 85 🟢  │
│            @janesmith · GitHub                    │
│                                                   │
│  "Building distributed ML systems at scale..."    │
│                                                   │
│  Contributed to:                                  │
│  pytorch/pytorch (142 commits)                    │
│  ray-project/ray (38 commits)                     │
│                                                   │
│  ████████░░  Python 60%  Rust 20%  C++ 20%       │
│                                                   │
│  ⭐ 2.4k stars  📦 45 repos  📍 San Francisco    │
│                                                   │
│  [⭐ Star] [Pipeline+] [LinkedIn] [🔖 Bookmark]  │
└─────────────────────────────────────────────────┘
```

**Score colors:** 🟢 Green (70+) = strong match | 🟡 Amber (40-69) = possible match | 🔴 Red (below 40) = weak match

**Special badges:**
- **Hidden Gem** — High quality, low visibility (under-the-radar talent)
- **In Pipeline** — Already saved to your pipeline
- **EEA** — Shows Evidence of Exceptional Ability signals

### Card Actions (hover to reveal)

| Button | What it does |
|--------|-------------|
| **Star** (shortlist) | Marks as priority. Yellow border when active. |
| **Pipeline+** | Adds to pipeline in "Sourced" stage |
| **LinkedIn** | If found: opens profile + copy. If not: searches (~30 sec). |
| **Bookmark** | Saves to your watchlist |

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

## Candidate Detail View

Click any card to open the full profile slide-out:
- Full profile with all enrichment data
- EEA signals with evidence links
- **Outreach generator** — AI writes a personalized message referencing their actual work
- Pipeline controls — Change stage, add notes
- Watchlist toggle
- Press **Escape** to close

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
- Each card has a **time indicator**: 🟢 recent, 🟡 4-7 days, 🔴 8+ days in stage
- **Click a card** to open full profile
- **Hover actions**: Bookmark + Delete
- **Export** downloads pipeline as CSV

---

## Watchlist

Save candidates to organized lists:
- **Default** list always exists
- **+ New List** for custom lists (e.g. "Frontend", "ML Team", "Q2 Hires")
- Filter candidates within a list
- Click a card to view details
- **✕** to remove from list

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
- Research sessions show with a 📄 icon, searches with a 🔍 icon

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
4. **Use Skill Priorities** — Adding 3-5 weighted skills reshapes the ranking
5. **Try pasting a JD** — Real job postings give the richest research output
6. **Batch enrich LinkedIn** — Shortlist your top 10, then hit "Enrich All"
7. **Use Bulk Actions chat** — "Compare Selected" is great for finalist decisions
8. **Drag-and-drop pipeline** — Drag cards between stages to track progress

## Important Notes

- **Google SSO required** — Sign in with Google to access the app. Data is isolated per user.
- **GitHub API rate limits** — If searches fail, wait a few minutes before retrying
- **LinkedIn enrichment** depends on publicly available data — some lookups may fail
- **Browser data persists** — Clearing cookies resets shortlist/filter preferences

## Feedback

Please note:
- Any bugs or errors (screenshots help!)
- Search queries that return poor results
- Features that feel confusing or missing
- Quality of AI-generated outreach and research
- Pipeline workflow friction points
