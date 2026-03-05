# SourceKit Talent Finder

Evidence-based technical sourcing. Find engineers by what they've actually built — their open-source contributions, repositories, and shipped code — not keywords or pedigree. Higher signal, better predictor of impact.

## What It Does

SourceKit turns GitHub's open-source graph into a recruiting pipeline:

- **Research** — Paste a job description or describe a role, and Exa Research builds a sourcing strategy: target repos to mine, companies to source from, skills to weight, and EEA (Evidence of Exceptional Ability) signals to detect. Claude serves as automatic fallback.
- **Search** — Finds real GitHub contributors matching your criteria, scores them 0-100, enriches the top 10 with grounded web summaries and citations via Exa Answer, and surfaces hidden gems (high-quality, low-visibility engineers).
- **Find Similar** — Found a great candidate? Exa findSimilar discovers engineers with similar profiles and web presence from a single match.
- **Company Intel** — Parallel.ai deep-researches target companies: engineering headcount, tech stack signals, hiring/attrition patterns. Map Engineers discovers specific engineers at each company via Parallel FindAll.
- **Enrich** — Looks up LinkedIn profiles via Exa semantic search and finds contact information.
- **Pipeline** — Kanban board to track candidates through Sourced → Contacted → Responded → Screen → Offer.
- **Websets** — Persistent, auto-updating candidate collections powered by Exa. Define criteria once, get new matches continuously. CSV import and webhook support.
- **Outreach** — AI writes personalized messages referencing the candidate's actual open-source work.
- **Bulk Actions** — Compare, rank, and draft outreach for multiple candidates with an AI chat interface.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Radix UI
- **Backend:** Supabase (PostgreSQL, Edge Functions, Auth)
- **AI / Research:**
  - Exa Research API (strategy generation)
  - Exa Answer API (grounded candidate summaries with citations)
  - Exa findSimilar (similar candidate discovery)
  - Exa Websets (persistent collections, imports, monitors, webhooks)
  - Parallel.ai Task API (company intelligence)
  - Parallel.ai FindAll API (talent mapping)
  - Anthropic Claude (scoring, outreach, strategy fallback)
- **Data:** GitHub REST API (contributor mining, profile enrichment), Exa (LinkedIn lookup)
- **Payments:** Stripe
- **Hosting:** Vercel
- **Analytics:** Vercel Web Analytics

## Getting Started

### Prerequisites

- Node.js 18+ (install via [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- A Supabase project
- API keys for: GitHub, Anthropic, Exa, and Parallel.ai

### Setup

```sh
# Clone the repo
git clone https://github.com/mrNLK/SourceProof.git
cd SourceProof

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your actual keys (see below)

# Start the dev server
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (Edge Functions only) |
| `GITHUB_TOKEN` | GitHub personal access token |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `EXA_API_KEY` | Exa API key (Research, Answer, findSimilar, Websets) |
| `PARALLEL_API_KEY` | Parallel.ai API key (Company Intel, FindAll) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |
| `STRIPE_PRICE_ID` | Stripe price ID |

> **Important:** The `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` must also be set as environment variables in your Vercel project settings for the production deployment to work.

### Deploying to Vercel

1. Connect this repo to a Vercel project.
2. Add all `VITE_*` environment variables in **Vercel → Project Settings → Environment Variables**.
3. Deploy. The `vercel.json` config handles SPA routing automatically.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (localhost:5173) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests (Vitest) |

## Project Structure

```
src/
├── components/      # UI components (search, pipeline, research, bulk actions)
├── hooks/           # Custom React hooks (subscriptions, etc.)
├── integrations/    # Supabase client and type definitions
├── lib/             # API helpers, utilities, and scoring (eea.ts)
├── pages/           # Route-level page components
├── services/        # External service integrations (Exa/Websets)
├── types/           # TypeScript type definitions
└── data/            # Static data and constants
supabase/
└── functions/       # Supabase Edge Functions
    ├── research-role/           # Exa Research + Claude fallback strategy generation
    ├── github-search/           # GitHub contributor search + Exa Answer enrichment
    ├── company-intel/           # Parallel Task API company intelligence
    ├── find-similar-candidates/ # Exa findSimilar candidate discovery
    ├── map-company-talent/      # Parallel FindAll talent mapping
    ├── import-candidates/       # Exa Websets CSV import
    ├── exa-websets/             # Webset CRUD + webhook registration
    ├── webset-webhook/          # Webhook receiver for Webset events
    └── _shared/                 # Shared utilities (CORS, etc.)
```

## Documentation

- **[Tester Guide](./TESTER_GUIDE.md)** — Full walkthrough of every feature, search tips, and workflow diagrams.
- **[Security Policy](./SECURITY.md)** — How secrets and API keys are handled.
- **[Beta Guide (PDF)](./docs/SourceKit_Beta_v2_1_Guide.pdf)** — Printable 5-page guide.
- **[Beta TL;DR (PDF)](./docs/SourceKit_Beta_v2_1___TL_DR.pdf)** — One-page summary.

## License

This project is source-available. The code is publicly visible for transparency and review, but no license is granted for redistribution or commercial use. All rights reserved by the author.
