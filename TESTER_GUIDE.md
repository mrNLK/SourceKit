# SourceKit Talent Finder - Tester Guide

**URL:** https://github-stars.lovable.app

GitHub-powered candidate sourcing. Research roles from job descriptions, search open-source contributors, build a pipeline, and generate outreach.

---

## Getting Started

Go to https://github-stars.lovable.app -- **no login required**. The app is ready to use immediately.

---

## Core Workflow

The tool has two main entry points: **Research** (build a strategy first) or **Search** (jump straight to finding candidates).

### Option A: Start with Research

Best when you have a job description or specific role in mind.

1. Click **Research** in the sidebar
2. Choose your input mode:
   - **Role + Company**: Enter a job title and company name
   - **Job Description**: Paste a JD URL or the full text
3. Click **Build Sourcing Strategy**
4. Wait 1-2 minutes while AI analyzes the role

**What you get back (all editable):**
- **Search Query** -- A refined query ready to use. Click the pencil icon to edit.
- **Target Repositories** -- GitHub repos to source from, with rationale. Add or remove repos.
- **Companies to Source From** -- Categorized as Competitor, Adjacent, or Talent Hub. Edit freely.
- **Skills** -- Split into "Must Have" (green) and "Nice to Have" (amber). Add or remove any.
- **EEA Signals** -- Evidence of Exceptional Ability markers to look for (PhD, publications, etc.)
- **Role Overview** -- Summary of the position

5. Review and edit the strategy as needed
6. Click **Search with this strategy** at the bottom to jump to Search with everything pre-filled

### Option B: Start with Search

Best for quick exploration.

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

## Search Results

### Understanding the Cards

Each candidate card shows:
- **Avatar** and **name** (click to open detail view)
- **GitHub username** with link to their profile
- **Contact icons**: GitHub, email, Twitter (if available)
- **Bio** (2-line preview)
- **Contributed repos** with commit counts
- **Language bar** showing their top programming languages
- **Stats**: Stars, repos, location
- **Score badge** (top-right): Green (70+), amber (40-69), red (below 40)

**Special badges:**
- **Hidden Gem** -- High-quality candidate with low visibility
- **In Pipeline** -- Already saved to your pipeline
- **EEA** -- Shows Evidence of Exceptional Ability signals

### Card Actions (hover to reveal)

| Button | What it does |
|--------|-------------|
| **Star** (shortlist) | Marks as a priority candidate. Yellow border when active. |
| **Pipeline+** | Adds to your pipeline in "Sourced" stage |
| **LinkedIn** | If found: opens profile + copy button. If not: searches for it (~30 seconds). |
| **Bookmark** | Saves to your watchlist |

### Filtering Results

**Filter bar above results:**
- **Skill Priorities** button -- Opens a side panel to add weighted skills (drag to reorder). Higher priority = more weight in scoring.
- **Location** dropdown -- Filter by city/region from results
- **Hidden Gems** toggle -- Show only under-the-radar candidates
- **Results count** -- Show 10, 20, or 50
- **Enrich All** -- Batch-find LinkedIn URLs for all results
- **Language** filter -- Filter by programming language
- **Min Score** -- Filter by minimum quality score (Any/30+/50+/70+/80+)
- **Seniority** tabs -- Any / Junior / Mid / Senior
- **Export** -- Download as CSV or JSON

**Funnel visualization** (when filters active): Shows how many candidates pass through each filter step.

### Batch Operations

- **Check All** -- Select all visible candidates
- **Add to Pipeline** -- Bulk-add selected candidates to pipeline
- **Expand Search** -- Find more candidates (up to 50 total)

---

## Candidate Detail View

Click any candidate card to open the full profile slide-out:

- **Full profile** with all enrichment data
- **EEA signals** with evidence links
- **Outreach generator** -- AI writes a personalized message
- **Pipeline controls** -- Change stage, add notes
- **Watchlist toggle**

Press **Escape** to close.

---

## Pipeline

Click **Pipeline** in the sidebar. Five-stage kanban board:

| Stage | Color | Meaning |
|-------|-------|---------|
| **Sourced** | Blue | Just added from search |
| **Contacted** | Amber | Outreach sent |
| **Responded** | Light blue | Reply received |
| **Screen** | Purple | Interview stage |
| **Offer** | Green | Offer extended |

### How it works:
- **Drag and drop** cards between stages
- Each card shows a **time indicator** (green = recent, amber = 4-7 days, red = 8+ days in stage)
- **Click a card** to open the full candidate profile
- **Hover actions**: Bookmark (add to watchlist) and Delete (remove from pipeline)
- **Export** button downloads your pipeline as CSV

### Empty state:
If no candidates yet, click **Start Searching** to go to the Search tab.

---

## Other Tabs

### History
Browse past searches grouped by time (Today, Yesterday, This Week, Older).
- **Filter** by query text
- **Click** any entry to re-run that search
- Research sessions show with a document icon, searches with a magnifying glass

### Watchlist
Save candidates to organized lists.
- **Default** list always exists
- **+ New List** to create custom lists (e.g. "Frontend", "ML Team", "Q2 Hires")
- **Filter** candidates within a list
- **Click** a card to view details
- **X** button to remove from list

### Bulk Actions
AI-powered batch analysis. Two-panel layout:

**Left: Candidate table**
- Filter by name, stage, or score range
- Sort by name, score, or stage
- Check candidates to select them

**Right: AI Chat**
Five quick actions for selected candidates:

| Action | What it does | Requires |
|--------|-------------|----------|
| **Refine Shortlist** | Ranks candidates with recommendations | 1+ selected |
| **Draft Outreach** | Generates personalized email openers | 1+ selected (max 8) |
| **Search Insights** | Shows pool stats: avg scores, top companies, skills | Any candidates |
| **Candidate Brief** | One-sentence strength/risk per candidate | 1-5 selected |
| **Compare Selected** | Side-by-side comparison table | 2-3 selected |

You can also type custom questions in the chat.

### Settings
Configure defaults:
- **Target Role** -- Pre-fills search forms
- **Target Company** -- Used in outreach generation
- **Webhook URL** -- POST candidate data on stage changes

---

## Tips for Testers

1. **Research first for best results** -- The AI strategy builder dramatically improves search quality
2. **Edit the strategy** -- Remove irrelevant repos/companies, add your own before searching
3. **Use Skill Priorities** -- Adding 3-5 weighted skills reshapes the ranking
4. **Try the JD input** -- Paste a real job posting URL and let AI parse it
5. **Batch enrich LinkedIn** -- Shortlist your top 10, then hit "Enrich All"
6. **Use Bulk Actions chat** -- "Compare Selected" is great for finalist decisions
7. **Drag-and-drop pipeline** -- Drag cards between stages to track progress

## Important Notes

- **No login required** -- Data is shared (no user isolation). Best for solo testing.
- **GitHub API rate limits** -- If searches fail, wait a few minutes before retrying
- **LinkedIn enrichment** depends on publicly available data -- some lookups may fail
- **Browser data persists** -- Clearing cookies resets shortlist/filter preferences

## Feedback
Please note:
- Any bugs or errors (screenshots help!)
- Search queries that return poor results
- Features that feel confusing or missing
- Quality of AI-generated outreach and research
- Pipeline workflow friction points
