import fs from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const guideHtmlPath = join(__dirname, "sourcekit-api-guide.html");
const guidePdfPath = join(__dirname, "sourcekit-api-guide.pdf");

const VERSION_DATE = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
}).format(new Date());

const LOGO_BASE = "../../docs/assets/logos";
const SHOT_BASE = "../tmp/screenshots-real";

const workflowScreens = [
  {
    title: "Strategy Generation",
    description: "Role + company gets translated into target repos, target companies, and EEA criteria.",
    image: "21-strategy-building-anthropic.png",
  },
  {
    title: "Target Company + Repo Query",
    description: "Query quality controls relevance: explicit company clusters plus repository ecosystem signals.",
    image: "38-results-target-query-short.png",
  },
  {
    title: "Ranked Results View",
    description: "Candidates are ranked using verifiable engineering evidence and surfaced for pipeline action.",
    image: "34-history-rerun-results.png",
  },
  {
    title: "Candidate Profile Drilldown",
    description: "Per-candidate EEA indicators, notable work, and outreach actions are consolidated in one panel.",
    image: "31-candidate-profile-history.png",
  },
  {
    title: "Webset Criteria From Strategy",
    description: "Strategy output is converted into persistent Webset criteria and enrichment instructions.",
    image: "23-webset-criteria-targets.png",
  },
];

const providers = [
  {
    id: "exa",
    name: "Exa API",
    logo: `${LOGO_BASE}/exa-full.svg`,
    mark: `${LOGO_BASE}/exa-mark.svg`,
    accent: "#0ea5e9",
    summary:
      "Exa is SourceKit's primary retrieval engine for semantic candidate discovery, lateral discovery, and persistent Websets.",
    capabilities: [
      "Neural person search from natural-language recruiting intent.",
      "findSimilar expansion from one strong candidate to adjacent profiles.",
      "Webset lifecycle: create, list, inspect, enrich, monitor, pause/resume, and import URLs.",
      "Enrichment-friendly item retrieval for pipeline ingestion.",
    ],
    endpoints: [
      {
        surface: "Candidate semantic search",
        source: "search-candidates",
        upstream: "POST https://api.exa.ai/search",
        function: "Search API",
        behavior: "Neural search with autoprompt, category=person, highlights/text snippets.",
        status: "live",
      },
      {
        surface: "GitHub-profile semantic assist",
        source: "github-search",
        upstream: "POST https://api.exa.ai/search",
        function: "Search API",
        behavior: "Find likely GitHub profiles from role query; merged with GitHub-native discovery.",
        status: "live",
      },
      {
        surface: "LinkedIn enrichment search",
        source: "enrich-linkedin",
        upstream: "POST https://api.exa.ai/search",
        function: "Search API",
        behavior: "Find LinkedIn candidates from GitHub identity, then AI-match best profile.",
        status: "live",
      },
      {
        surface: "Lateral candidate expansion",
        source: "find-similar-candidates",
        upstream: "POST https://api.exa.ai/findSimilar",
        function: "findSimilar API",
        behavior: "Expands from one GitHub URL into similar profiles with relevance score and highlights.",
        status: "live",
      },
      {
        surface: "Webset CRUD + item retrieval",
        source: "exa-websets",
        upstream: "https://api.exa.ai/websets/v0/*",
        function: "Websets API",
        behavior: "Create/list/get/delete websets, fetch items, add enrichments.",
        status: "live",
      },
      {
        surface: "Webset monitors",
        source: "exa-websets",
        upstream: "https://api.exa.ai/websets/v0/websets/{id}/monitors*",
        function: "Websets Monitor API",
        behavior: "Create/list/pause/resume monitors for scheduled discovery.",
        status: "live",
      },
      {
        surface: "Import existing candidate URLs",
        source: "import-candidates",
        upstream: "POST /websets/{id}/imports",
        function: "Websets Imports API",
        behavior: "Bulk import of known candidates (ATS/LinkedIn/GitHub lists) into websets.",
        status: "live",
      },
      {
        surface: "Grounded per-candidate summary",
        source: "N/A in current code",
        upstream: "Not currently called",
        function: "Answer API",
        behavior: "Product narrative includes grounded answer synthesis, but no direct /answer integration is present in this repository today.",
        status: "planned",
      },
    ],
  },
  {
    id: "parallel",
    name: "Parallel API",
    logo: `${LOGO_BASE}/parallel-full.svg`,
    mark: `${LOGO_BASE}/parallel-mark.svg`,
    accent: "#7c3aed",
    summary:
      "Parallel handles company intelligence, browser-grade extraction, and talent-mapping jobs where async task orchestration is useful.",
    capabilities: [
      "JD extraction from dynamic pages (including JS-rendered job boards).",
      "Company intelligence tasking with poll-based completion.",
      "FindAll talent mapping for engineers at target companies.",
      "Secondary search stream combined with Exa in blended discovery mode.",
    ],
    endpoints: [
      {
        surface: "JD extraction",
        source: "parse-jd",
        upstream: "POST https://api.parallel.ai/v1beta/extract",
        function: "Search/Extract API",
        behavior: "Extracts readable JD text from URLs; falls back to HTML parsing if needed.",
        status: "live",
      },
      {
        surface: "Blended candidate search",
        source: "search-candidates",
        upstream: "POST https://api.parallel.ai/v1beta/search",
        function: "Search API",
        behavior: "Generates profile leads from objective + search_queries; merged/deduped with Exa results.",
        status: "live",
      },
      {
        surface: "Poach-company intelligence",
        source: "company-intel",
        upstream: "POST/GET https://api.parallel.ai/v1beta/tasks",
        function: "Task API",
        behavior: "Creates extract tasks and polls completion for hiring signals, stack clues, attrition indicators.",
        status: "live",
      },
      {
        surface: "Engineer mapping per company",
        source: "map-company-talent",
        upstream: "POST/GET https://api.parallel.ai/v1beta/findall",
        function: "FindAll API",
        behavior: "Builds recruitable engineer lists from each target company with profile links and notable work.",
        status: "live",
      },
    ],
  },
  {
    id: "github",
    name: "GitHub API",
    logo: `${LOGO_BASE}/github-full.svg`,
    mark: `${LOGO_BASE}/github-green.svg`,
    accent: "#16a34a",
    summary:
      "GitHub provides the core evidence layer: contributors, commits, repos, events, and code footprint used for scoring and ranking.",
    capabilities: [
      "Repository contributor mining from strategy repos.",
      "User and profile enrichment with repo + event activity.",
      "Language distribution and notable-work extraction.",
      "Rate-limit-aware token pooling through shared GitHub helper.",
    ],
    endpoints: [
      {
        surface: "Repo contributor mining",
        source: "github-search",
        upstream: "GET https://api.github.com/repos/{owner}/{repo}/contributors",
        function: "Contributors API",
        behavior: "Fetches top contributors and commit counts for target repositories.",
        status: "live",
      },
      {
        surface: "User discovery",
        source: "github-search",
        upstream: "GET https://api.github.com/search/users",
        function: "Users Search API",
        behavior: "Adds candidate pool from search qualifiers (skills/location).",
        status: "live",
      },
      {
        surface: "Profile enrichment",
        source: "github-search, github-profile",
        upstream: "GET /users/{username}, /users/{username}/repos, /users/{username}/events/public",
        function: "Users/Repos/Events APIs",
        behavior: "Builds candidate evidence packet: languages, stars, highlights, recent activity.",
        status: "live",
      },
      {
        surface: "Repo verification",
        source: "github-search",
        upstream: "GET https://api.github.com/repos/{owner}/{name}",
        function: "Repos API",
        behavior: "Validates and filters parsed repositories before retrieval.",
        status: "live",
      },
      {
        surface: "Code quality scan",
        source: "github-code-quality",
        upstream: "Repos/Commits/Contents endpoints",
        function: "Repositories + Commits + Contents",
        behavior: "Computes deeper code-quality and AI usage signals from candidate repos.",
        status: "live",
      },
    ],
  },
  {
    id: "claude",
    name: "Claude (Anthropic) API",
    logo: `${LOGO_BASE}/claude-full.svg`,
    mark: `${LOGO_BASE}/claude-mark.svg`,
    accent: "#f97316",
    summary:
      "Claude powers strategy generation, query parsing, candidate scoring, matching logic, and recruiter-facing writing outputs.",
    capabilities: [
      "Tool-based structured strategy output for sourcing plans.",
      "Natural-language-to-repo parsing and search criteria extraction.",
      "Batch candidate scoring and summary generation.",
      "Outreach drafting and LinkedIn profile match disambiguation.",
    ],
    endpoints: [
      {
        surface: "Strategy generation",
        source: "research-role",
        upstream: "POST https://api.anthropic.com/v1/messages",
        function: "Tool call",
        behavior: "Returns structured strategy object: search_query, target_repos, poach_companies, skills, eea_signals, role_overview.",
        status: "live",
      },
      {
        surface: "GitHub query parsing",
        source: "github-search",
        upstream: "POST https://api.anthropic.com/v1/messages",
        function: "Text completion",
        behavior: "Extracts target repos + skills + optional location/seniority from recruiter text.",
        status: "live",
      },
      {
        surface: "Candidate scoring and summaries",
        source: "github-search",
        upstream: "POST https://api.anthropic.com/v1/messages",
        function: "Text completion",
        behavior: "Scores candidates and returns concise/extended summaries and recruitability signal.",
        status: "live",
      },
      {
        surface: "Outreach generation",
        source: "generate-outreach",
        upstream: "POST https://api.anthropic.com/v1/messages",
        function: "Text completion",
        behavior: "Generates personalized outreach message bodies from candidate evidence context.",
        status: "live",
      },
      {
        surface: "LinkedIn profile match",
        source: "enrich-linkedin",
        upstream: "POST https://api.anthropic.com/v1/messages",
        function: "Tool call",
        behavior: "Selects best LinkedIn profile from Exa candidates with confidence + reasoning.",
        status: "live",
      },
    ],
  },
  {
    id: "harmonic",
    name: "Harmonic API",
    logo: `${LOGO_BASE}/harmonic-full.svg`,
    mark: `${LOGO_BASE}/harmonic-full.svg`,
    accent: "#0f766e",
    summary:
      "Harmonic adds company graph intelligence so SourceKit can rank and prioritize poach targets with structured business context.",
    capabilities: [
      "Company enrichment by domain/LinkedIn with normalized caching.",
      "Similar-company expansion from high-confidence seeds.",
      "Employee and person graph retrieval.",
      "Search-agent and keyword discovery workflows.",
    ],
    endpoints: [
      {
        surface: "Strategy-time company enrichment",
        source: "research-role",
        upstream: "POST https://api.harmonic.ai/companies",
        function: "Companies API",
        behavior: "Enriches Claude seed companies with stage, growth, funding and computes poachability signals.",
        status: "live",
      },
      {
        surface: "Similar-company expansion",
        source: "research-role, harmonic-search",
        upstream: "POST https://api.harmonic.ai/search/similar_companies",
        function: "Similar Companies API",
        behavior: "Expands target company graph and deduplicates final poach list.",
        status: "live",
      },
      {
        surface: "Company/person enrichment gateway",
        source: "harmonic-enrich",
        upstream: "companies, persons, employees, enrichment_status endpoints",
        function: "Enrichment APIs",
        behavior: "Centralized enrichment wrapper with 7-day cache and normalized company payloads.",
        status: "live",
      },
      {
        surface: "Company search gateway",
        source: "harmonic-search",
        upstream: "search_agent, companies_by_keywords, typeahead, savedSearches",
        function: "Search APIs",
        behavior: "Natural-language and keyword discovery for company landscape mapping.",
        status: "live",
      },
    ],
  },
];

const internalFunctions = [
  ["research-role", "Role/JD -> strategy JSON", "Anthropic + Harmonic"],
  ["github-search", "Main ranked candidate retrieval", "GitHub + Anthropic + Exa"],
  ["search-candidates", "Simple blended candidate search", "Exa + Parallel"],
  ["find-similar-candidates", "Expand from one strong candidate", "Exa findSimilar"],
  ["exa-websets", "Webset CRUD/monitors/items", "Exa Websets + Supabase mapping"],
  ["import-candidates", "Import known candidate URLs", "Exa Websets imports"],
  ["webset-webhook", "Ingest webset events", "Exa webhook -> Supabase"],
  ["parse-jd", "Extract JD content from URL", "Parallel extract (+ HTML fallback)"],
  ["company-intel", "Poach company intelligence", "Parallel tasks"],
  ["map-company-talent", "Find engineers at company", "Parallel findall"],
  ["github-profile", "Candidate profile detail card", "GitHub API"],
  ["generate-outreach", "Message drafting", "Anthropic"],
  ["enrich-linkedin", "LinkedIn URL enrichment", "Exa + Anthropic"],
  ["harmonic-search", "Company graph search layer", "Harmonic"],
  ["harmonic-enrich", "Company/person enrichment layer", "Harmonic + cache"],
];

function statusClass(status) {
  if (status === "live") return "status-live";
  if (status === "planned") return "status-planned";
  return "status-partial";
}

function statusLabel(status) {
  if (status === "live") return "Live";
  if (status === "planned") return "Planned / Not Wired";
  return "Partial";
}

function renderProvider(provider) {
  const endpointRows = provider.endpoints
    .map(
      (ep) => `
      <tr>
        <td><strong>${ep.surface}</strong><div class="mono">${ep.source}</div></td>
        <td><div class="mono">${ep.upstream}</div><div class="small">${ep.function}</div></td>
        <td>${ep.behavior}</td>
        <td><span class="status ${statusClass(ep.status)}">${statusLabel(ep.status)}</span></td>
      </tr>
    `,
    )
    .join("\n");

  const capabilityItems = provider.capabilities.map((c) => `<li>${c}</li>`).join("\n");

  return `
    <section class="page provider-page" id="${provider.id}">
      <div class="provider-head" style="--provider-accent:${provider.accent};">
        <div class="provider-brand">
          <img src="${provider.logo}" alt="${provider.name} logo" class="provider-logo" />
          <div>
            <h2>${provider.name}</h2>
            <p>${provider.summary}</p>
          </div>
        </div>
        <div class="provider-mark-wrap">
          <img src="${provider.mark}" alt="${provider.name} mark" class="provider-mark" />
        </div>
      </div>

      <div class="split">
        <div class="panel">
          <h3>What This API Does In SourceKit</h3>
          <ul class="checklist">
            ${capabilityItems}
          </ul>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Surface In Product</th>
              <th>Upstream Endpoint / API</th>
              <th>Functionality</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${endpointRows}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function buildGuideHtml() {
  const workflowCards = workflowScreens
    .map(
      (item) => `
      <article class="shot-card">
        <img src="${SHOT_BASE}/${item.image}" alt="${item.title}" />
        <div class="shot-meta">
          <h4>${item.title}</h4>
          <p>${item.description}</p>
        </div>
      </article>
    `,
    )
    .join("\n");

  const providerCards = providers
    .map(
      (p) => `
      <article class="provider-tile">
        <img src="${p.logo}" alt="${p.name}" />
        <div>
          <h4>${p.name}</h4>
          <p>${p.summary}</p>
        </div>
      </article>
    `,
    )
    .join("\n");

  const providerPages = providers.map((p) => renderProvider(p)).join("\n");

  const internalRows = internalFunctions
    .map(
      ([name, role, upstream]) => `
      <tr>
        <td><span class="mono">${name}</span></td>
        <td>${role}</td>
        <td>${upstream}</td>
      </tr>
    `,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SourceKit API Guide</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
    <style>
      :root {
        --bg: #c4cad6;
        --panel: #e9edf4;
        --panel-2: #e2e7ef;
        --line: #c7ceda;
        --line-2: #b8bfcc;
        --text: #0f172a;
        --muted: #475569;
        --subtle: #6b7280;
        --accent: #00d5c1;
        --blue: #006ee6;
        --shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        background: radial-gradient(circle at 20% 0%, #e9edf4 0%, #c4cad6 45%, #bec5d2 100%);
        color: var(--text);
        font-family: "DM Sans", "Avenir Next", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .doc { width: 100%; margin: 0; }

      .page {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 16px;
        margin: 8px;
        padding: 20px 16px 24px;
        page-break-after: always;
        break-after: page;
        box-shadow: var(--shadow);
      }

      .page:last-child {
        page-break-after: auto;
        break-after: auto;
      }

      h1 {
        margin: 0 0 10px;
        font-size: 36px;
        line-height: 1.05;
      }

      h2 {
        margin: 0 0 12px;
        font-size: 24px;
        line-height: 1.2;
      }

      h3 {
        margin: 0 0 10px;
        font-size: 17px;
      }

      h4 {
        margin: 0 0 6px;
        font-size: 15px;
      }

      p {
        margin: 0 0 10px;
        font-size: 14px;
        line-height: 1.5;
        color: var(--muted);
      }

      .small { font-size: 12px; color: var(--subtle); }

      .mono {
        font-family: "JetBrains Mono", monospace;
        font-size: 12px;
        color: var(--text);
      }

      code {
        font-family: "JetBrains Mono", monospace;
        background: var(--panel-2);
        border: 1px solid var(--line);
        padding: 2px 5px;
        border-radius: 4px;
        color: var(--text);
        font-size: 12px;
      }

      .cover {
        min-height: 8.2in;
        display: grid;
        grid-template-rows: auto auto 1fr;
        gap: 18px;
        background: linear-gradient(160deg, #eef3fb 0%, #d5deea 42%, #ccd5e3 100%);
      }

      .cover-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .cover-logo {
        height: 44px;
        width: auto;
      }

      .version-pill {
        border: 1px solid var(--line-2);
        background: rgba(255, 255, 255, 0.7);
        border-radius: 999px;
        padding: 6px 12px;
        font-size: 12px;
        color: var(--muted);
      }

      .subtitle {
        font-size: 18px;
        color: var(--muted);
        margin: 2px 0 0;
      }

      .hero-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .hero-card {
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.76);
        border-radius: 12px;
        padding: 12px;
      }

      .hero-card h3 { margin-bottom: 6px; }

      .logo-row {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .logo-chip {
        border: 1px solid var(--line);
        border-radius: 10px;
        background: #fff;
        padding: 8px 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 110px;
        height: 48px;
      }

      .logo-chip img {
        max-height: 24px;
        max-width: 92px;
        width: auto;
      }

      .section-intro {
        margin-bottom: 12px;
      }

      .workflow-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .shot-card {
        border: 1px solid var(--line);
        border-radius: 12px;
        overflow: hidden;
        background: #f8fafc;
        box-shadow: var(--shadow);
      }

      .shot-card img {
        width: 100%;
        height: 180px;
        object-fit: cover;
        object-position: top left;
        display: block;
      }

      .shot-meta {
        padding: 10px;
      }

      .provider-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .provider-tile {
        border: 1px solid var(--line);
        border-radius: 12px;
        background: var(--panel-2);
        padding: 10px;
        display: flex;
        gap: 10px;
        align-items: center;
      }

      .provider-tile img {
        width: 64px;
        height: 28px;
        object-fit: contain;
        object-position: left center;
        flex: 0 0 auto;
      }

      .provider-tile p {
        margin: 0;
        font-size: 12px;
      }

      .provider-page {
        background: linear-gradient(180deg, #edf2fb 0%, var(--panel) 100%);
      }

      .provider-head {
        border: 1px solid var(--line);
        background: #ffffff;
        border-left: 6px solid var(--provider-accent);
        border-radius: 12px;
        padding: 12px;
        margin-bottom: 12px;
        display: flex;
        justify-content: space-between;
        gap: 10px;
      }

      .provider-brand {
        display: flex;
        gap: 10px;
        align-items: center;
      }

      .provider-logo {
        width: 88px;
        height: 30px;
        object-fit: contain;
        object-position: left center;
      }

      .provider-mark-wrap {
        border: 1px solid var(--line);
        background: #f8fafc;
        border-radius: 10px;
        width: 52px;
        height: 52px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .provider-mark {
        max-width: 36px;
        max-height: 36px;
        object-fit: contain;
      }

      .split {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
        margin-bottom: 10px;
      }

      .panel {
        border: 1px solid var(--line);
        border-radius: 12px;
        background: #fff;
        padding: 12px;
      }

      .checklist {
        margin: 0;
        padding-left: 18px;
      }

      .checklist li {
        margin: 0 0 8px;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.45;
      }

      .table-wrap {
        border: 1px solid var(--line);
        border-radius: 12px;
        overflow: hidden;
        background: #fff;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th, td {
        font-size: 12px;
        text-align: left;
        vertical-align: top;
        padding: 10px;
        border-top: 1px solid var(--line);
      }

      thead th {
        border-top: 0;
        background: var(--panel-2);
        color: var(--text);
        font-weight: 700;
      }

      tbody tr:nth-child(even) td {
        background: #fbfdff;
      }

      .status {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        border: 1px solid;
      }

      .status-live {
        background: rgba(16, 185, 129, 0.12);
        border-color: rgba(16, 185, 129, 0.3);
        color: #065f46;
      }

      .status-partial {
        background: rgba(245, 158, 11, 0.14);
        border-color: rgba(245, 158, 11, 0.34);
        color: #92400e;
      }

      .status-planned {
        background: rgba(59, 130, 246, 0.14);
        border-color: rgba(59, 130, 246, 0.3);
        color: #1d4ed8;
      }

      .legend {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
        margin-top: 8px;
      }

      .notes {
        border: 1px solid rgba(249, 115, 22, 0.3);
        background: rgba(249, 115, 22, 0.1);
        border-radius: 12px;
        padding: 12px;
      }

      .notes h3 { margin-bottom: 8px; }

      .notes ul {
        margin: 0;
        padding-left: 18px;
      }

      .notes li {
        margin-bottom: 8px;
        color: var(--muted);
        font-size: 13px;
      }

      .final-logo-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }

      .final-logo-card {
        border: 1px solid var(--line);
        border-radius: 12px;
        background: #fff;
        min-height: 110px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .final-logo-card img {
        max-height: 34px;
        max-width: 130px;
        object-fit: contain;
      }

      .final-logo-card .mono {
        font-size: 11px;
        color: var(--subtle);
      }
    </style>
  </head>
  <body>
    <main class="doc">
      <section class="page cover">
        <div class="cover-top">
          <img src="${LOGO_BASE}/sourcekit-full.svg" alt="SourceKit" class="cover-logo" />
          <div class="version-pill">Version ${VERSION_DATE}</div>
        </div>

        <div>
          <h1>SourceKit API Guide</h1>
          <p class="subtitle">Comprehensive provider functionality map for strategy, sourcing, scoring, websets, and pipeline operations</p>
        </div>

        <div class="hero-grid">
          <article class="hero-card">
            <h3>Scope</h3>
            <p>This guide maps external APIs to SourceKit edge functions, app surfaces, and recruiter-visible outcomes.</p>
            <p><strong>App</strong> <code>https://getsourcekit.vercel.app</code></p>
            <p><strong>Docs</strong> <code>https://sourcekit-docs.netlify.app</code></p>
          </article>

          <article class="hero-card">
            <h3>Provider Stack</h3>
            <div class="logo-row">
              <div class="logo-chip"><img src="${LOGO_BASE}/exa-full.svg" alt="Exa" /></div>
              <div class="logo-chip"><img src="${LOGO_BASE}/parallel-full.svg" alt="Parallel" /></div>
              <div class="logo-chip"><img src="${LOGO_BASE}/github-full.svg" alt="GitHub" /></div>
              <div class="logo-chip"><img src="${LOGO_BASE}/claude-full.svg" alt="Claude" /></div>
              <div class="logo-chip"><img src="${LOGO_BASE}/harmonic-full.svg" alt="Harmonic" /></div>
            </div>
          </article>
        </div>
      </section>

      <section class="page">
        <div class="section-intro">
          <h2>Live Workflow Screens</h2>
          <p>These screenshots are from the authenticated SourceKit session and map to the API workflow below.</p>
        </div>

        <div class="workflow-grid">
          ${workflowCards}
        </div>
      </section>

      <section class="page">
        <div class="section-intro">
          <h2>Architecture At A Glance</h2>
          <p>SourceKit routes all provider calls through Supabase Edge Functions. API keys stay server-side. Recruiter actions trigger orchestrated provider workflows.</p>
        </div>

        <div class="provider-grid">
          ${providerCards}
        </div>

        <div class="table-wrap" style="margin-top:12px;">
          <table>
            <thead>
              <tr>
                <th>Edge Function</th>
                <th>Primary Responsibility</th>
                <th>External APIs Used</th>
              </tr>
            </thead>
            <tbody>
              ${internalRows}
            </tbody>
          </table>
        </div>

        <div class="legend">
          <span class="status status-live">Live</span>
          <span class="status status-partial">Partial</span>
          <span class="status status-planned">Planned / Not Wired</span>
        </div>
      </section>

      ${providerPages}

      <section class="page">
        <h2>Implementation Notes And Caveats</h2>
        <div class="notes">
          <h3>Important Technical Notes</h3>
          <ul>
            <li><strong>Webset errors:</strong> The current environment has shown <code>Failed to fetch</code> during create in some sessions. This is generally provider key/quota/connectivity related and not a UI-only issue.</li>
            <li><strong>Search gate:</strong> strategy/search functions enforce subscription and auth gating before expensive provider calls.</li>
            <li><strong>Criteria limits:</strong> Webset criteria are normalized server-side to the first five criteria in <code>exa-websets</code>.</li>
            <li><strong>Answer API:</strong> Product narrative includes grounded answer synthesis, but no direct Exa Answer API call is present in current repository code.</li>
            <li><strong>Server-side key security:</strong> Exa, Parallel, GitHub, Anthropic, Harmonic, and Stripe keys are all read from server env vars inside edge functions.</li>
          </ul>
        </div>
      </section>

      <section class="page">
        <h2>Logo Assets Used</h2>
        <p>This guide uses your provided identity assets and partner logos for visual consistency.</p>
        <div class="final-logo-grid">
          <article class="final-logo-card"><img src="${LOGO_BASE}/sourcekit-full.svg" alt="sourcekit-full" /><div class="mono">sourcekit-full.svg</div></article>
          <article class="final-logo-card"><img src="${LOGO_BASE}/sourcekit-mark-new.svg" alt="sourcekit-mark-new" /><div class="mono">sourcekit-mark-new.svg</div></article>
          <article class="final-logo-card"><img src="${LOGO_BASE}/exa-full.svg" alt="exa-full" /><div class="mono">exa-full.svg</div></article>
          <article class="final-logo-card"><img src="${LOGO_BASE}/exa-mark.svg" alt="exa-mark" /><div class="mono">exa-mark.svg</div></article>
          <article class="final-logo-card"><img src="${LOGO_BASE}/parallel-full.svg" alt="parallel-full" /><div class="mono">parallel-full.svg</div></article>
          <article class="final-logo-card"><img src="${LOGO_BASE}/parallel-mark.svg" alt="parallel-mark" /><div class="mono">parallel-mark.svg</div></article>
          <article class="final-logo-card"><img src="${LOGO_BASE}/github-full.svg" alt="github-full" /><div class="mono">github-full.svg</div></article>
          <article class="final-logo-card"><img src="${LOGO_BASE}/github-green.svg" alt="github-green" /><div class="mono">github-green.svg</div></article>
          <article class="final-logo-card"><img src="${LOGO_BASE}/claude-full.svg" alt="claude-full" /><div class="mono">claude-full.svg</div></article>
          <article class="final-logo-card"><img src="${LOGO_BASE}/claude-mark.svg" alt="claude-mark" /><div class="mono">claude-mark.svg</div></article>
          <article class="final-logo-card"><img src="${LOGO_BASE}/harmonic-full.svg" alt="harmonic-full" /><div class="mono">harmonic-full.svg</div></article>
        </div>
      </section>
    </main>
  </body>
</html>`;
}

async function generateGuide() {
  const html = buildGuideHtml();
  await fs.writeFile(guideHtmlPath, html, "utf8");

  const browser = await puppeteer.launch({ headless: "new" });
  try {
    const page = await browser.newPage();
    await page.goto(`file://${guideHtmlPath}`, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));

    await page.pdf({
      path: guidePdfPath,
      format: "letter",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<div></div>`,
      footerTemplate: `
        <div style="width:100%;font-size:10px;color:#475569;padding:0 24px;text-align:right;font-family:'DM Sans',Arial,sans-serif;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>
      `,
      margin: {
        top: "24px",
        right: "24px",
        bottom: "52px",
        left: "24px",
      },
    });

    await page.close();
  } finally {
    await browser.close();
  }

  console.log("Generated:");
  console.log(`- ${guideHtmlPath}`);
  console.log(`- ${guidePdfPath}`);
}

generateGuide().catch((error) => {
  console.error(error);
  process.exit(1);
});
