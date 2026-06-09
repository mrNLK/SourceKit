# SourceKit Talent Finder

AI-powered GitHub talent sourcing for technical recruiting. Find engineers by what they've actually built — their open-source contributions, repositories, and shipped code — not just their LinkedIn headlines.

## What It Does

SourceKit turns GitHub's open-source graph into a recruiting pipeline:

- **Research** — Paste a job description or describe a role, and AI builds a sourcing strategy: target repos to mine, companies to source from, skills to weight, and EEA (Evidence of Exceptional Ability) signals to detect.
- **Search** — Finds real GitHub contributors matching your criteria, scores them 0–100, and surfaces hidden gems (high-quality, low-visibility engineers).
- **Enrich** — Looks up LinkedIn profiles via Exa semantic search and finds contact information.
- **Pipeline** — Kanban board to track candidates through Contacted → Not Interested → Recruiter Screen → Rejected → Moved to ATS.
- **Outreach** — AI writes personalized messages referencing the candidate's actual open-source work.
- **Bulk Actions** — Compare, rank, and draft outreach for multiple candidates with an AI chat interface.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Radix UI
- **Backend:** Supabase (PostgreSQL, Edge Functions, Auth)
- **AI:** Anthropic Claude (query parsing, candidate scoring, research, outreach generation)
- **Search:** GitHub REST API (contributor mining, profile enrichment), Exa (LinkedIn lookup)
- **Payments:** Stripe
- **Hosting:** Vercel
- **Analytics:** Vercel Web Analytics

## Getting Started

### Prerequisites

- Node.js 18+ (install via [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- A Supabase project
- API keys for: GitHub, Anthropic, and Exa

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
| `EXA_API_KEY` | Exa API key |
| `PARALLEL_API_KEY` | Parallel API key for Fast Entity Search and research |
| `FINDEM_API_KEY` | Findem signal import key |
| `APOLLO_API_KEY` | Apollo enrichment key |
| `CLAY_API_KEY` | Clay fallback enrichment key |
| `MICROSOFT_*` | Optional future Microsoft Entra/Graph OAuth and mailbox settings |
| `SALESFORCE_*` | Optional future Salesforce connected app and API settings |
| `BD_*` | BD operator identity, compliance footer, unsubscribe, and sending-domain settings |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |
| `STRIPE_PRICE_ID` | Stripe price ID |

> **Important:** The `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` must also be set as environment variables in your Vercel project settings for the production deployment to work.

### Deploying to Vercel

1. Connect this repo to a Vercel project.
2. Add all `VITE_*` environment variables in **Vercel → Project Settings → Environment Variables**.
3. Deploy. The `vercel.json` config handles SPA routing automatically.

## SellKit BD Sourcing App

`SellKit` is a standalone business-development sourcing workflow at `/sellkit`. The legacy `/bd-sourcing` path also loads the same app. It uses the current Vite/React app, Supabase Postgres and Edge Functions, Vercel hosting, Exa Websets, Exa Company Search, Exa Agent, and Parallel server-side integrations. It does not introduce a separate backend or migrate the repo to Next.js.

V1 is manual-first because Microsoft Graph and Salesforce policy approval is unknown. The app can source, enrich, score, review, and prepare outreach without those integrations.

What is implemented:

- Deterministic scoring, human review gating, optional CRM/dedup helpers, target state machine, and template-bound email drafting.
- A review queue UI with Mariah onboarding, signal evidence, verified-email status, review gate status, copyable email drafts, `.eml` download, CRM CSV export, and Sales Navigator note text.
- Supabase migration for `bd_companies`, `bd_contacts`, `bd_signals`, `bd_targets`, `bd_outreach_touches`, `bd_email_messages`, `bd_salesforce_links`, `bd_suppressions`, `bd_scores`, and `bd_audit_logs`.
- A `bd-sourcing` Edge Function with safe action routing and server-side Parallel Fast Entity Search at `/v1beta/findall/entity-search`.
- Server-side Exa Company Search for structured company seeds and Exa Agent for async multi-hop target discovery with structured output.
- Microsoft Graph and Salesforce write actions are optional future upgrades and remain blocked in v1.

Manual setup before first real run:

1. Rotate any API key that has been pasted into chat or logs.
2. Add `PARALLEL_API_KEY` and `EXA_API_KEY` to Supabase Edge Function secrets and Vercel environment variables. The browser never receives these keys.
3. Add Apollo and Clay keys, then confirm the exact people-match and email-verification fields.
4. Add Findem credentials or export/import flow for hiring, executive-change, and funding signals.
5. Fill `BD_PHYSICAL_ADDRESS`, `BD_UNSUBSCRIBE_BASE_URL`, `BD_OPERATOR_NAME`, and `BD_OPERATOR_EMAIL`.
6. Complete the SellKit onboarding prompts for target companies, buyer titles, offer, buying signals, and email voice.
7. Keep `BD_INTEGRATION_MODE=manual`, `APOLLO_SEQUENCE_ENABLED=false`, and `INSTANTLY_SEQUENCE_ENABLED=false` until integrations are explicitly approved.

No CRM/customer/prospect suppression upload is required for v1 because a human approves every draft before any handoff or export.

Optional future setup, only if company policy allows it:

- Register a Microsoft Entra app for Microsoft Graph OAuth to create Outlook drafts or send through M365.
- Create a Salesforce connected app to run live dedup and write Leads/Contacts/Tasks.

Compliance defaults:

- No automatic email send, Outlook draft creation, Salesforce write, or Sales Navigator action executes in v1.
- Approved email is copied/downloaded for manual sending. Approved CRM records export as CSV for manual import.
- LinkedIn and Sales Navigator are manual only. The app prepares note text and profile links; it does not log in, scrape, or automate LinkedIn.
- Emails require verified work email, verified signal evidence, physical address, and one-click unsubscribe.

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
└── functions/       # Supabase Edge Functions (search, enrich, research, etc.)
```

## Documentation

- **[Tester Guide](./TESTER_GUIDE.md)** — Full walkthrough of every feature, search tips, and workflow diagrams.
- **[Security Policy](./SECURITY.md)** — How secrets and API keys are handled.

## License

This project is source-available. The code is publicly visible for transparency and review, but no license is granted for redistribution or commercial use. All rights reserved by the author.
