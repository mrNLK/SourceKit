# SourceKit Talent Finder

Evidence-based technical sourcing. Find engineers by what they've actually built: open-source contributions, repositories, shipped code. Not keywords, not pedigree. Higher signal, better predictor of impact.

## What It Does

SourceKit turns GitHub's open-source graph into a recruiting pipeline.

**Research** takes a job description or role spec and builds an AI sourcing strategy via Exa Research: target repos to mine, companies to source from, skills to weight, EEA (Evidence of Exceptional Ability) signals to detect. Claude serves as automatic fallback.

**Search** finds real GitHub contributors matching your criteria, scores them 0-100, enriches the top 10 with grounded web summaries and citations via Exa Answer, and surfaces hidden gems (high quality, low visibility).

**Find Similar** takes any strong candidate and uses Exa findSimilar to discover engineers with similar profiles and web presence.

**Company Intel** deep-researches target companies via Parallel.ai: engineering headcount, tech stack signals, hiring/attrition patterns. Map Engineers discovers specific people at each company via Parallel FindAll.

**Enrich** looks up LinkedIn profiles via Exa semantic search and finds contact info. **Pipeline** is a kanban board tracking candidates through Sourced > Contacted > Responded > Screen > Offer. **Websets** builds persistent, auto-updating candidate collections powered by Exa, with CSV import and webhook support. **Outreach** generates personalized messages referencing actual open-source work. **Bulk Actions** lets you compare, rank, and draft outreach for multiple candidates via AI chat.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Radix UI
- **Backend:** Supabase (PostgreSQL, Edge Functions, Auth)
- **AI / Research:** Exa Research API (strategy generation), Exa Answer API (grounded candidate summaries with citations), Exa findSimilar (similar candidate discovery), Exa Websets (persistent collections, imports, monitors, webhooks), Parallel.ai Task API (company intelligence), Parallel.ai FindAll API (talent mapping), Anthropic Claude (scoring, outreach, strategy fallback)
- **Data:** GitHub REST API (contributor mining, profile enrichment), Exa (LinkedIn lookup)
- **Payments:** Stripe
- **Hosting:** Vercel
- **Analytics:** Vercel Web Analytics

## Getting Started

### Prerequisites

- Node.js 18+ (install via [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- A Supabase project
- API keys: GitHub, Anthropic, Exa, Parallel.ai

### Setup

```sh
git clone https://github.com/mrNLK/SourceProof.git
cd SourceProof
npm install
cp .env.example .env
# Edit .env with your actual keys (see below)
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
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

`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` must also be set in your Vercel project settings for production.

### Deploying to Vercel

Connect this repo to a Vercel project. Add all `VITE_*` environment variables in Vercel > Project Settings > Environment Variables. Deploy. The `vercel.json` config handles SPA routing automatically.

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
  components/      UI components (search, pipeline, research, bulk actions)
  hooks/           Custom React hooks (subscriptions, etc.)
  integrations/    Supabase client and type definitions
  lib/             API helpers, utilities, scoring (eea.ts)
  pages/           Route-level page components
  services/        External service integrations (Exa/Websets)
  types/           TypeScript type definitions
  data/            Static data and constants

supabase/functions/
  research-role/           Exa Research + Claude fallback strategy generation
  github-search/           GitHub contributor search + Exa Answer enrichment
  company-intel/           Parallel Task API company intelligence
  find-similar-candidates/ Exa findSimilar candidate discovery
  map-company-talent/      Parallel FindAll talent mapping
  import-candidates/       Exa Websets CSV import
  exa-websets/             Webset CRUD + webhook registration
  webset-webhook/          Webhook receiver for Webset events
  _shared/                 Shared utilities (CORS, etc.)
```

## Documentation

- [Tester Guide](./TESTER_GUIDE.md): Full walkthrough, search tips, workflow diagrams
- [Security Policy](./SECURITY.md): Secrets and API key handling
- [Beta Guide (PDF)](./docs/SourceKit_Beta_v2_1_Guide.pdf): Printable 5-page guide
- [Beta TL;DR (PDF)](./docs/SourceKit_Beta_v2_1___TL_DR.pdf): One-page summary

## License

Source-available. Code is publicly visible for transparency and review. No license is granted for redistribution or commercial use. All rights reserved.
