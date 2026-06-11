import fs from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const outputHtml = join(__dirname, "sourcekit-workflow-guide.html");
const outputPdf = join(__dirname, "sourcekit-workflow-guide.pdf");
const workflowOutputPdf = join(__dirname, "..", "output", "pdf", "sourcekit-workflow-guide.pdf");
const workflowScreenshotDir = join(__dirname, "..", "output", "guide-screenshots", "workflow");
const workflowScreenshotHtmlBase = "../output/guide-screenshots/workflow";
const workflowScreenshotManifest = join(workflowScreenshotDir, "screenshot-manifest.json");

const VERSION_DATE = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
}).format(new Date());

const LOGO_BASE = "../../docs/assets/logos";
const SHOT_SOURCE_DIR = join(__dirname, "..", "tmp", "screenshots-real");

const workflowSteps = [
  {
    number: 1,
    title: "Open SourceKit and sign in",
    doThis: "Go to getsourcekit.vercel.app and sign in with email or Google using your approved account.",
    expectThis: "You should see the current SourceKit auth screen, then land in the recruiter workspace.",
    image: "00-login-current-brand-example-crop.png",
    imagePosition: "center center",
    assetName: "step-01-sign-in.png",
    target: "Chrome window with the SourceKit authentication screen in view.",
    focusArea: "The SourceKit logo, sign-in form, and primary CTA with no extra desktop chrome.",
    caption: "Example view with current SourceKit branding.",
    apis: [
      "Supabase Auth (session + JWT)",
      "No provider search APIs yet",
    ],
    tip: "Use one consistent account so saved history and websets are retained.",
  },
  {
    number: 2,
    title: "Start in New Search",
    doThis: "Open New Search and set role/company context (example: Staff ML Engineer at Anthropic).",
    expectThis: "Role and company fields become the base input for strategy generation.",
    image: "20-new-search-tab.png",
    assetName: "step-02-new-search.png",
    target: "New Search workspace immediately after opening the recruiter dashboard.",
    focusArea: "Left navigation plus the Research & Strategy inputs and quick templates.",
    apis: [
      "Front-end state only",
      "No external provider call until strategy is launched",
    ],
    tip: "Role specificity strongly improves repo targeting and candidate quality.",
  },
  {
    number: 3,
    title: "Build sourcing strategy",
    doThis: "Click Build Sourcing Strategy to generate search query, target repos, target companies, and EEA signals.",
    expectThis: "You should see strategy progress states and role-specific sourcing logic.",
    image: "21-strategy-building-anthropic.png",
    assetName: "step-03-build-strategy.png",
    target: "Research & Strategy screen while the strategy builder is actively running.",
    focusArea: "Progress module, role context, and emerging target-repo / target-company logic.",
    apis: [
      "Edge function: research-role",
      "Anthropic Messages API (tool call for structured strategy)",
      "Harmonic Companies + Similar Companies APIs for enrichment/expansion",
    ],
    tip: "This is where target companies and target repos are formed; review before searching.",
  },
  {
    number: 4,
    title: "Write a target-company and target-repo query",
    doThis: "In Results, use strategy output to compose a query that names target companies and repo ecosystems.",
    expectThis: "Your query is visible in the search bar with immediate context on the ranked slate.",
    image: "38-results-target-query-short.png",
    assetName: "step-04-query-composition.png",
    target: "Results tab with the search bar populated from strategy output.",
    focusArea: "Query text, visible repo/company anchors, and top of the ranked result list.",
    apis: [
      "Edge function: github-search (or search-candidates flow depending entry point)",
      "GitHub API and Exa Search API are primed by query intent",
    ],
    tip: "Best practice: use fewer company names plus stronger repo signals to avoid over-constraining.",
  },
  {
    number: 5,
    title: "Launch search and monitor progress",
    doThis: "Click Search and wait for parsing, retrieval, enrichment, and scoring to complete.",
    expectThis: "You should see real-time progress lines and loading cards.",
    image: "07-search-progress-real.png",
    assetName: "step-05-search-progress.png",
    target: "Results screen during a live search run.",
    focusArea: "Progress timeline, loading cards, and status labels that show the pipeline advancing.",
    apis: [
      "GitHub API (contributors/users/repos/events)",
      "Exa Search API (semantic candidate assist)",
      "Anthropic Messages API (query parsing + scoring summaries)",
    ],
    tip: "Do not tune filters mid-run; let ranking finish first.",
  },
  {
    number: 6,
    title: "Review ranked results",
    doThis: "Open the completed run and inspect score, evidence snippets, and repo contribution depth.",
    expectThis: "You should see a ranked list with candidate cards and quick actions.",
    image: "34-history-rerun-results.png",
    assetName: "step-06-ranked-results.png",
    target: "Completed results view with candidate cards loaded.",
    focusArea: "Score badges, evidence snippets, and enough of the list to show ranking quality.",
    apis: [
      "Supabase candidate cache + query-scoped scoring persistence",
      "No new upstream call needed when loading cached completed runs",
    ],
    tip: "Score is evidence strength from public artifacts, not final interview recommendation.",
  },
  {
    number: 7,
    title: "Handle no-results and broaden safely",
    doThis: "If no engineers found, reduce strict company constraints and retain technical repo anchors.",
    expectThis: "You should see guidance hints and can rerun with broader criteria.",
    image: "27-results-ranked-targeted.png",
    assetName: "step-07-broaden-search.png",
    target: "Results state that demonstrates how a narrow query can be broadened safely.",
    focusArea: "Query guidance, broadened targeting, and the part of the list or hint state that shows recovery.",
    apis: [
      "Same search pipeline with adjusted query",
      "No-results guidance from SourceKit result layer",
    ],
    tip: "Broaden company scope first. Keep high-signal repo and technology constraints.",
  },
  {
    number: 8,
    title: "Drill into candidate profile",
    doThis: "Click a candidate to open profile details, EEA indicators, notable work, and outreach tools.",
    expectThis: "A side panel shows summary evidence and action controls.",
    image: "31-candidate-profile-history.png",
    assetName: "step-08-candidate-profile.png",
    target: "Candidate profile side panel opened from a completed search.",
    focusArea: "EEA signals, notable work, company context, and recruiter action controls in one frame.",
    apis: [
      "GitHub profile data from cached/enriched candidate records",
      "Anthropic Messages API for generated outreach when requested",
      "Optional Exa + Anthropic via enrich-linkedin flow",
    ],
    tip: "Use cited repo evidence in outreach for higher response quality.",
  },
  {
    number: 9,
    title: "Create Webset from strategy criteria",
    doThis: "Open Websets and convert strategy logic into persistent criteria and enrichment fields.",
    expectThis: "A Webset definition captures query + criteria + enrichments for recurring monitoring.",
    image: "23-webset-criteria-targets.png",
    assetName: "step-09-webset-criteria.png",
    target: "Websets builder with a fully populated criteria form.",
    focusArea: "Criteria text, enrichment selections, and the reusable sourcing definition layout.",
    apis: [
      "Edge function: exa-websets",
      "Exa Websets API (create/list/items/enrichments)",
    ],
    tip: "Criterion text should describe verifiable evidence patterns, not generic title matching.",
  },
  {
    number: 10,
    title: "Submit Webset and track completion",
    doThis: "Click Create Webset and observe status; investigate errors if submission fails.",
    expectThis: "You should see success progression or an explicit failure notification.",
    image: "37-webset-submit-after-1s.png",
    assetName: "step-10-webset-status.png",
    target: "Immediate post-submit Webset state after clicking Create Webset.",
    focusArea: "Submission feedback, visible status, and any success or failure notification.",
    apis: [
      "Exa Websets create call",
      "webset-webhook event ingestion (idle/item/enrichment events) when configured",
    ],
    tip: "If you see Failed to fetch, verify server-side EXA key, quota, and network path first.",
  },
  {
    number: 11,
    title: "Navigate to completed run results",
    doThis: "Open History to load completed search/webset-backed runs and continue pipeline actions.",
    expectThis: "Completed runs show timestamp + count; opening a run restores ranked results.",
    image: "33-history-list.png",
    assetName: "step-11-history.png",
    target: "History tab with completed SourceKit runs listed.",
    focusArea: "Run names, timestamps, result counts, and the action affordance to reopen a run.",
    apis: [
      "Supabase persistence for search history and webset mappings",
      "No re-search required to review completed runs",
    ],
    tip: "History is the fastest way to return to completed result sets after async processing.",
  },
  {
    number: 12,
    title: "Export and move candidates into pipeline",
    doThis: "Use Export and pipeline actions once shortlist quality is confirmed.",
    expectThis: "CSV/JSON export and stage movement controls are available from results/pipeline screens.",
    image: "17-export-menu-real.png",
    assetName: "step-12-export.png",
    target: "Results screen with Export menu or pipeline action controls visible.",
    focusArea: "Export menu, handoff options, and the shortlist context surrounding the action.",
    apis: [
      "Supabase pipeline state updates",
      "Optional exa-websets batch_pipeline import path for webset items",
    ],
    tip: "Freeze final filters before export to prevent noisy handoff files.",
  },
];

const providers = [
  {
    name: "Exa API",
    logo: `${LOGO_BASE}/exa-full.svg`,
    mark: `${LOGO_BASE}/exa-mark.svg`,
    accent: "#0891b2",
    summary:
      "Semantic retrieval, candidate expansion, and persistent Webset infrastructure.",
    rows: [
      ["Search API", "search-candidates, github-search, enrich-linkedin", "POST /search", "Neural person discovery, profile leads, and LinkedIn search candidates.", "Live"],
      ["findSimilar API", "find-similar-candidates", "POST /findSimilar", "Lateral discovery from a strong profile to similar engineers.", "Live"],
      ["Websets API", "exa-websets", "/websets/v0/websets*", "Create/list/get/delete websets, fetch items, add enrichments.", "Live"],
      ["Webset Monitors", "exa-websets", "/websets/{id}/monitors*", "Create/list/pause/resume scheduled monitors.", "Live"],
      ["Webset Imports", "import-candidates", "POST /websets/{id}/imports", "Import existing candidate URLs into websets.", "Live"],
      ["Answer API", "Not wired in current repo", "N/A", "Product narrative includes grounded summaries, but no direct /answer call in current code.", "Planned"],
    ],
  },
  {
    name: "Parallel API",
    logo: `${LOGO_BASE}/parallel-full.svg`,
    mark: `${LOGO_BASE}/parallel-mark.svg`,
    accent: "#7c3aed",
    summary:
      "Company intelligence, dynamic page extraction, and async talent-mapping tasks.",
    rows: [
      ["Extract API", "parse-jd", "POST /v1beta/extract", "Extracts JD content from JS-rendered pages with fallback parsing.", "Live"],
      ["Search API", "search-candidates", "POST /v1beta/search", "Secondary candidate retrieval stream merged with Exa output.", "Live"],
      ["Task API", "company-intel", "POST/GET /v1beta/tasks", "Per-company intelligence jobs: headcount, stack, attrition, rationale.", "Live"],
      ["FindAll API", "map-company-talent", "POST/GET /v1beta/findall", "Maps engineers at target companies with profile links and notable work.", "Live"],
    ],
  },
  {
    name: "GitHub API",
    logo: `${LOGO_BASE}/github-full.svg`,
    mark: `${LOGO_BASE}/github-green.svg`,
    accent: "#15803d",
    summary:
      "Primary evidence signal: contributors, commits, repos, and developer activity.",
    rows: [
      ["Contributors API", "github-search", "GET /repos/{owner}/{repo}/contributors", "Builds candidate pool from target repositories.", "Live"],
      ["Users Search API", "github-search", "GET /search/users", "Adds candidate candidates from skill/location qualifiers.", "Live"],
      ["Users/Repos/Events", "github-search, github-profile", "GET /users/*, /repos, /events", "Enriches candidate evidence packets and profile views.", "Live"],
      ["Repo Verification", "github-search", "GET /repos/{owner}/{name}", "Validates strategy repos before retrieval.", "Live"],
      ["Code Quality Inputs", "github-code-quality", "Repos + commits + contents endpoints", "Computes deeper repository quality and AI usage indicators.", "Live"],
    ],
  },
  {
    name: "Claude (Anthropic) API",
    logo: `${LOGO_BASE}/claude-full.svg`,
    mark: `${LOGO_BASE}/claude-mark.svg`,
    accent: "#ea580c",
    summary:
      "Structured strategy generation, ranking/scoring intelligence, and recruiter writing tools.",
    rows: [
      ["Tool-based strategy", "research-role", "POST /v1/messages (tool call)", "Returns structured strategy JSON with repos, companies, and EEA signals.", "Live"],
      ["Query parsing", "github-search", "POST /v1/messages", "Parses recruiter query into repos/skills/location/seniority hints.", "Live"],
      ["Candidate scoring", "github-search", "POST /v1/messages", "Scores and summarizes candidates with recruitability signal.", "Live"],
      ["Outreach generation", "generate-outreach", "POST /v1/messages", "Creates concise personalized outreach drafts.", "Live"],
      ["LinkedIn disambiguation", "enrich-linkedin", "POST /v1/messages (tool call)", "Chooses best LinkedIn profile match from search results.", "Live"],
    ],
  },
  {
    name: "Harmonic API",
    logo: `${LOGO_BASE}/harmonic-full.svg`,
    mark: `${LOGO_BASE}/harmonic-full.svg`,
    accent: "#0f766e",
    summary:
      "Company graph enrichment and expansion for stronger poach-company intelligence.",
    rows: [
      ["Companies API", "research-role, harmonic-enrich", "POST /companies", "Enriches target companies with stage, funding, growth, and graph context.", "Live"],
      ["Similar Companies", "research-role, harmonic-search", "POST /search/similar_companies", "Expands adjacent target-company graph from strong seed URNs.", "Live"],
      ["Company/Person Enrichment", "harmonic-enrich", "companies/persons/employees/status", "Normalized enrichment wrappers with caching and status checks.", "Live"],
      ["Search Agent + Keyword", "harmonic-search", "search_agent + companies_by_keywords + typeahead", "Natural language and keyword company landscape discovery.", "Live"],
    ],
  },
];

const matrixRows = [
  ["research-role", "Role/JD -> strategy JSON", "Anthropic + Harmonic"],
  ["github-search", "Primary ranked search pipeline", "GitHub + Exa + Anthropic"],
  ["search-candidates", "Blended discovery endpoint", "Exa + Parallel"],
  ["find-similar-candidates", "Lateral candidate expansion", "Exa findSimilar"],
  ["exa-websets", "Webset CRUD + monitors + items", "Exa Websets + Supabase mappings"],
  ["import-candidates", "Bulk candidate URL import", "Exa Webset imports"],
  ["webset-webhook", "Webhook event ingestion", "Exa webset events -> Supabase"],
  ["parse-jd", "JD text extraction", "Parallel extract (+ HTML fallback)"],
  ["company-intel", "Poach-company intelligence", "Parallel Task API"],
  ["map-company-talent", "Engineer map for a target company", "Parallel FindAll API"],
  ["github-profile", "Candidate profile detail API", "GitHub API"],
  ["enrich-linkedin", "LinkedIn URL enrichment", "Exa + Anthropic"],
  ["generate-outreach", "Recruiter outreach drafts", "Anthropic"],
  ["harmonic-search", "Company graph search", "Harmonic"],
  ["harmonic-enrich", "Company/person enrichment", "Harmonic + Supabase cache"],
];

function renderCapturePlan() {
  const rows = workflowSteps
    .map(
      (step) => `
      <tr>
        <td>
          <div class="plan-step-wrap">
            <span class="step-pill inline">Step ${step.number}</span>
            <strong>${step.title}</strong>
          </div>
        </td>
        <td>${step.target}</td>
        <td>${step.focusArea}</td>
        <td><code>${workflowScreenshotHtmlBase}/${step.assetName}</code></td>
      </tr>
    `,
    )
    .join("\n");

  return `
    <section class="page">
      <div class="section-intro">
        <p class="eyebrow">Screenshot System</p>
        <h2>Capture Targets, Areas, and Output Paths</h2>
        <p>This guide uses a stable screenshot library so the walkthrough can be refreshed without reworking the layout. Each step below maps the exact screen to frame, the UI area to emphasize, and the saved output asset path.</p>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Step</th>
              <th>Target</th>
              <th>Area To Frame</th>
              <th>Output Asset</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

async function prepareWorkflowScreenshots() {
  await fs.mkdir(workflowScreenshotDir, { recursive: true });

  const manifest = workflowSteps.map((step) => ({
    step: step.number,
    title: step.title,
    target: step.target,
    focusArea: step.focusArea,
    sourcePath: join(SHOT_SOURCE_DIR, step.image),
    outputPath: join(workflowScreenshotDir, step.assetName),
    htmlPath: `${workflowScreenshotHtmlBase}/${step.assetName}`,
  }));

  await Promise.all(
    manifest.map(async (item) => {
      await fs.copyFile(item.sourcePath, item.outputPath);
    }),
  );

  await fs.writeFile(workflowScreenshotManifest, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function renderWorkflowStep(step) {
  const apiItems = step.apis.map((api) => `<li>${api}</li>`).join("\n");
  const imageStyle = step.imagePosition
    ? ` style="object-position:${step.imagePosition};"`
    : "";
  const imageCaption = step.caption || "Live application screenshot.";
  return `
    <section class="page step-page">
      <div class="step-head">
        <span class="step-pill">Step ${step.number}</span>
        <h2>${step.title}</h2>
      </div>
      <p class="line"><strong>Do this:</strong> ${step.doThis}</p>
      <p class="line"><strong>You should see:</strong> ${step.expectThis}</p>

      <div class="capture-grid">
        <article class="capture-card">
          <div class="capture-label">Screenshot Target</div>
          <p>${step.target}</p>
        </article>
        <article class="capture-card">
          <div class="capture-label">Area To Frame</div>
          <p>${step.focusArea}</p>
        </article>
        <article class="capture-card path">
          <div class="capture-label">Output Path</div>
          <p class="path-chip">${workflowScreenshotHtmlBase}/${step.assetName}</p>
        </article>
      </div>

      <figure class="shot">
        <img src="${workflowScreenshotHtmlBase}/${step.assetName}" alt="Step ${step.number} screenshot"${imageStyle} />
        <figcaption>${imageCaption}</figcaption>
      </figure>

      <div class="callout-grid">
        <article class="callout api">
          <div class="callout-title">APIs Active In This Step</div>
          <ul>${apiItems}</ul>
        </article>
        <article class="callout tip">
          <div class="callout-title">Best Practice</div>
          <p>${step.tip}</p>
        </article>
      </div>
    </section>
  `;
}

function getStatusClass(value) {
  const status = String(value || "").toLowerCase();
  if (status.includes("live")) return "status-live";
  if (status.includes("planned")) return "status-planned";
  return "status-partial";
}

function renderProvider(provider) {
  const rows = provider.rows
    .map(
      (row) => `
      <tr>
        <td><strong>${row[0]}</strong></td>
        <td><span class="mono">${row[1]}</span></td>
        <td><span class="mono">${row[2]}</span></td>
        <td>${row[3]}</td>
        <td><span class="status ${getStatusClass(row[4])}">${row[4]}</span></td>
      </tr>
    `,
    )
    .join("\n");

  return `
    <section class="page provider-page">
      <div class="provider-head" style="--provider-accent:${provider.accent};">
        <div class="brand-lockup">
          <img src="${provider.logo}" alt="${provider.name}" class="provider-logo" />
          <div>
            <h2>${provider.name}</h2>
            <p>${provider.summary}</p>
          </div>
        </div>
        <div class="mark-wrap">
          <img src="${provider.mark}" alt="${provider.name} mark" class="provider-mark" />
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>API Surface</th>
              <th>SourceKit Function</th>
              <th>Upstream Endpoint</th>
              <th>Functionality</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function buildHtml() {
  const stepPages = workflowSteps.map(renderWorkflowStep).join("\n");
  const providerPages = providers.map(renderProvider).join("\n");
  const capturePlanPage = renderCapturePlan();
  const matrixRowsHtml = matrixRows
    .map(
      (r) => `
      <tr>
        <td><span class="mono">${r[0]}</span></td>
        <td>${r[1]}</td>
        <td>${r[2]}</td>
      </tr>
    `,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SourceKit Comprehensive Workflow Guide</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
    <style>
      :root {
        --bg: #c4cad6;
        --paper: #f6f8fc;
        --panel: #e9edf4;
        --panel-2: #dde5f0;
        --line: #c4ccda;
        --line-2: #b2bdcf;
        --ink: #0f172a;
        --muted: #3f4f66;
        --subtle: #5d6f89;
        --brand: #006ee6;
        --brand-soft: #d8e8ff;
        --mint: #00d5c1;
        --mint-soft: #d8faf3;
        --warn: #ea580c;
        --warn-soft: #ffeddc;
        --shadow-lg: 0 18px 42px rgba(15, 23, 42, 0.1);
        --shadow-md: 0 10px 24px rgba(15, 23, 42, 0.08);
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        background:
          radial-gradient(900px 500px at -10% -20%, #eef4ff 0%, transparent 60%),
          radial-gradient(1200px 680px at 110% 0%, #d8fff8 0%, transparent 62%),
          linear-gradient(180deg, #d4dae5 0%, #c4cad6 100%);
        color: var(--ink);
        font-family: "DM Sans", "Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .doc { width: 100%; margin: 0; }

      .page {
        background: linear-gradient(180deg, var(--panel) 0%, var(--paper) 100%);
        border: 1px solid var(--line);
        border-radius: 18px;
        margin: 10px;
        padding: 20px 16px 24px;
        page-break-after: always;
        break-after: page;
        box-shadow: var(--shadow-md);
        position: relative;
      }

      .page:last-child {
        page-break-after: auto;
        break-after: auto;
      }

      .cover {
        min-height: 8.4in;
        background:
          linear-gradient(145deg, #eef4ff 0%, #dce6f7 45%, #d0d9e9 100%);
        display: flex;
        flex-direction: column;
        gap: 18px;
        overflow: hidden;
      }

      .cover::before,
      .cover::after {
        content: "";
        position: absolute;
        border-radius: 999px;
        pointer-events: none;
      }

      .cover::before {
        width: 360px;
        height: 360px;
        right: -120px;
        top: -120px;
        background: radial-gradient(circle, rgba(0, 110, 230, 0.18) 0%, rgba(0, 110, 230, 0) 72%);
      }

      .cover::after {
        width: 320px;
        height: 320px;
        left: -140px;
        bottom: -140px;
        background: radial-gradient(circle, rgba(0, 213, 193, 0.16) 0%, rgba(0, 213, 193, 0) 74%);
      }

      h1 {
        margin: 0;
        font-family: "Space Grotesk", "DM Sans", sans-serif;
        letter-spacing: -0.02em;
        font-size: 40px;
        line-height: 1.02;
      }

      h2 {
        margin: 0 0 10px;
        font-family: "Space Grotesk", "DM Sans", sans-serif;
        letter-spacing: -0.015em;
        font-size: 26px;
        line-height: 1.2;
      }

      h3 {
        margin: 0 0 8px;
        font-family: "Space Grotesk", "DM Sans", sans-serif;
        font-size: 17px;
      }

      h4 {
        margin: 0 0 6px;
        font-family: "Space Grotesk", "DM Sans", sans-serif;
        font-size: 14px;
        letter-spacing: -0.01em;
      }

      .eyebrow {
        margin: 0 0 6px;
        font-family: "JetBrains Mono", monospace;
        font-size: 11px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #0b4c95;
      }

      p {
        margin: 0 0 10px;
        color: var(--muted);
        line-height: 1.48;
        font-size: 14px;
      }

      .line strong { color: var(--ink); }

      .mono {
        font-family: "JetBrains Mono", monospace;
        font-size: 12px;
        color: var(--ink);
      }

      code {
        font-family: "JetBrains Mono", monospace;
        background: var(--panel-2);
        border: 1px solid var(--line);
        padding: 2px 5px;
        border-radius: 4px;
        color: var(--ink);
        font-size: 12px;
      }

      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }

      .cover-logo {
        height: 46px;
        width: auto;
      }

      .pill {
        border: 1px solid #a8b9d5;
        border-radius: 999px;
        padding: 6px 12px;
        font-size: 11px;
        font-family: "JetBrains Mono", monospace;
        background: rgba(255, 255, 255, 0.84);
        color: var(--muted);
      }

      .subtitle {
        font-size: 19px;
        color: var(--muted);
        margin-top: 8px;
        max-width: 78ch;
      }

      .cover-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .mini-card {
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 13px;
        background: rgba(255, 255, 255, 0.82);
        box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
      }

      .logo-strip {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 4px;
      }

      .logo-chip {
        border: 1px solid var(--line);
        border-radius: 9px;
        background: linear-gradient(180deg, #ffffff 0%, #f6f8fc 100%);
        width: 102px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .logo-chip img {
        max-height: 22px;
        max-width: 84px;
        width: auto;
      }

      .step-page {
        background: linear-gradient(180deg, #eff4fb 0%, #e7edf6 35%, #f7f9fc 100%);
      }

      .step-head {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }

      .step-pill {
        font-family: "JetBrains Mono", monospace;
        font-size: 11px;
        color: #0b4c95;
        background: var(--brand-soft);
        border: 1px solid rgba(0, 110, 230, 0.24);
        border-radius: 999px;
        padding: 5px 9px;
        white-space: nowrap;
      }

      .shot {
        margin: 14px 0 10px;
      }

      .shot img {
        width: 100%;
        height: 334px;
        object-fit: contain;
        object-position: top left;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(240, 246, 255, 0.9) 100%);
        border: 1px solid var(--line-2);
        border-radius: 12px;
        box-shadow: var(--shadow-md);
        display: block;
        padding: 12px;
      }

      .shot figcaption {
        margin-top: 6px;
        color: var(--subtle);
        font-size: 12px;
      }

      .callout-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .capture-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1.2fr;
        gap: 10px;
        margin: 12px 0 2px;
      }

      .capture-card {
        border: 1px solid var(--line);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.88);
        box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
        padding: 10px 12px;
      }

      .capture-card p {
        margin: 0;
        font-size: 12px;
        line-height: 1.45;
      }

      .capture-label {
        font-family: "JetBrains Mono", monospace;
        font-size: 10px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #0b4c95;
        margin-bottom: 6px;
      }

      .capture-card.path {
        background: linear-gradient(180deg, rgba(0, 110, 230, 0.08), rgba(0, 110, 230, 0.03));
      }

      .path-chip {
        font-family: "JetBrains Mono", monospace;
        font-size: 11px;
        color: var(--ink);
        word-break: break-all;
      }

      .callout {
        border: 1px solid;
        border-radius: 12px;
        padding: 10px 12px;
        box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
      }

      .callout-title {
        font-family: "Space Grotesk", "DM Sans", sans-serif;
        font-weight: 700;
        font-size: 14px;
        margin-bottom: 6px;
      }

      .callout ul {
        margin: 0;
        padding-left: 18px;
      }

      .callout li {
        margin-bottom: 6px;
        font-size: 13px;
        color: var(--muted);
        line-height: 1.4;
      }

      .callout p {
        margin: 0;
        font-size: 13px;
      }

      .callout.api {
        background: linear-gradient(180deg, rgba(0, 110, 230, 0.11), rgba(0, 110, 230, 0.07));
        border-color: rgba(0, 110, 230, 0.32);
      }

      .callout.tip {
        background: linear-gradient(180deg, rgba(0, 213, 193, 0.13), rgba(0, 213, 193, 0.08));
        border-color: rgba(0, 213, 193, 0.32);
      }

      .section-intro {
        margin-bottom: 12px;
      }

      .table-wrap {
        border: 1px solid var(--line);
        border-radius: 14px;
        overflow: hidden;
        background: #fff;
        box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th, td {
        text-align: left;
        vertical-align: top;
        padding: 10px;
        font-size: 12px;
        border-top: 1px solid var(--line);
      }

      thead th {
        border-top: 0;
        background: linear-gradient(180deg, #e5ecf7 0%, #dde6f2 100%);
        color: var(--ink);
        font-weight: 700;
        font-family: "Space Grotesk", "DM Sans", sans-serif;
        letter-spacing: 0.01em;
      }

      tbody tr:nth-child(even) td {
        background: #fbfdff;
      }

      .provider-page {
        background: linear-gradient(180deg, #ecf2fb 0%, #f6f8fc 100%);
      }

      .provider-head {
        border: 1px solid var(--line);
        border-left: 6px solid var(--provider-accent);
        border-radius: 14px;
        background: #fff;
        padding: 12px 12px 11px;
        margin-bottom: 10px;
        display: flex;
        justify-content: space-between;
        gap: 10px;
        box-shadow: 0 5px 16px rgba(15, 23, 42, 0.05);
      }

      .brand-lockup {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .provider-logo {
        width: 96px;
        height: 30px;
        object-fit: contain;
        object-position: left center;
      }

      .mark-wrap {
        border: 1px solid var(--line);
        border-radius: 10px;
        background: linear-gradient(180deg, #f8fafc 0%, #edf2f8 100%);
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .provider-mark {
        max-width: 34px;
        max-height: 34px;
        object-fit: contain;
      }

      .status {
        display: inline-block;
        border-radius: 999px;
        border: 1px solid;
        padding: 3px 8px;
        font-size: 11px;
        font-weight: 700;
        font-family: "JetBrains Mono", monospace;
        line-height: 1.3;
      }

      .status-live {
        color: #065f46;
        background: #dbf6ec;
        border-color: #86efac;
      }

      .status-planned {
        color: #1d4ed8;
        background: #deebff;
        border-color: #93c5fd;
      }

      .status-partial {
        color: #92400e;
        background: #ffedd5;
        border-color: #fdba74;
      }

      .plan-step-wrap {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .step-pill.inline {
        display: inline-flex;
        width: fit-content;
      }

      .warn {
        border: 1px solid rgba(234, 88, 12, 0.33);
        background: linear-gradient(180deg, var(--warn-soft) 0%, #fff6ee 100%);
        border-radius: 14px;
        padding: 13px;
      }

      .warn ul {
        margin: 0;
        padding-left: 18px;
      }

      .warn li {
        margin-bottom: 8px;
        font-size: 13px;
        color: var(--muted);
      }

      .logo-system {
        display: grid;
        gap: 12px;
      }

      .brand-hero {
        border: 1px solid #b5c2d8;
        border-radius: 16px;
        background:
          radial-gradient(400px 200px at 80% -40%, rgba(0, 110, 230, 0.12) 0%, rgba(0, 110, 230, 0) 72%),
          radial-gradient(420px 220px at -15% 110%, rgba(0, 213, 193, 0.14) 0%, rgba(0, 213, 193, 0) 74%),
          linear-gradient(180deg, #ffffff 0%, #f1f6ff 100%);
        padding: 14px;
        box-shadow: 0 8px 20px rgba(15, 23, 42, 0.07);
      }

      .brand-hero-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }

      .approved-badge {
        border-radius: 999px;
        border: 1px solid #94a8ca;
        background: rgba(255, 255, 255, 0.86);
        padding: 5px 10px;
        font-size: 10px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #0b4c95;
        font-family: "JetBrains Mono", monospace;
        white-space: nowrap;
      }

      .brand-hero-grid {
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 10px;
      }

      .brand-cell {
        border: 1px solid var(--line);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.84);
        min-height: 94px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 7px;
        padding: 10px;
      }

      .brand-cell img {
        max-height: 38px;
        max-width: 220px;
        width: auto;
        object-fit: contain;
      }

      .brand-cell mark {
        background: rgba(0, 110, 230, 0.14);
        color: #0b4c95;
        border-radius: 6px;
        padding: 1px 4px;
      }

      .brand-caption {
        font-size: 11px;
        color: var(--subtle);
        font-family: "JetBrains Mono", monospace;
      }

      .partners-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }

      .partner-card {
        border: 1px solid var(--line);
        border-radius: 13px;
        background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
        padding: 10px 11px;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
      }

      .partner-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
      }

      .partner-title {
        margin: 0;
        font-size: 14px;
        font-family: "Space Grotesk", "DM Sans", sans-serif;
      }

      .token {
        border: 1px solid var(--line);
        border-radius: 999px;
        background: #f4f7fc;
        padding: 2px 7px;
        color: var(--subtle);
        font-size: 10px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        font-family: "JetBrains Mono", monospace;
      }

      .partner-logos {
        display: grid;
        grid-template-columns: 1.35fr 0.65fr;
        gap: 8px;
      }

      .logo-tile {
        border: 1px solid var(--line);
        border-radius: 10px;
        background: #ffffff;
        min-height: 70px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 5px;
        padding: 7px;
      }

      .logo-tile img {
        max-height: 24px;
        max-width: 150px;
        object-fit: contain;
      }

      .logo-tile.mark img {
        max-height: 26px;
        max-width: 40px;
      }

      .logo-tile.placeholder {
        background: #f8fbff;
      }

      .logo-tile .mono {
        font-size: 10px;
        color: var(--subtle);
      }

      .guideline-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .guide-card {
        border: 1px solid var(--line);
        border-radius: 12px;
        background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
        padding: 10px 11px;
      }

      .guide-card h4 {
        margin: 0 0 7px;
        font-size: 13px;
      }

      .guide-list {
        margin: 0;
        padding-left: 17px;
      }

      .guide-list li {
        font-size: 12px;
        margin-bottom: 5px;
        color: var(--muted);
      }

      .guide-card.ok h4 {
        color: #065f46;
      }

      .guide-card.no h4 {
        color: #92400e;
      }
    </style>
  </head>
  <body>
    <main class="doc">
      <section class="page cover">
        <div class="topbar">
          <img src="${LOGO_BASE}/sourcekit-full.svg" alt="SourceKit" class="cover-logo" />
          <div class="pill">Version ${VERSION_DATE}</div>
        </div>

        <div>
          <p class="eyebrow">External Recruiter Documentation</p>
          <h1>SourceKit Comprehensive Workflow Guide</h1>
          <p class="subtitle">Full sourcing workflow + complete API functionality map with live product screenshots</p>
        </div>

        <div class="cover-grid">
          <article class="mini-card">
            <h3>What This Guide Covers</h3>
            <p>End-to-end recruiter workflow from role brief to persistent Webset pipeline, plus all major API integrations and their exact responsibilities.</p>
            <p><strong>App</strong> <code>https://getsourcekit.vercel.app</code></p>
          </article>

          <article class="mini-card">
            <h3>Provider Stack</h3>
            <div class="logo-strip">
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
          <h2>Edge Function To Provider Matrix</h2>
          <p>SourceKit routes provider integrations through Supabase Edge Functions to keep API keys server-side.</p>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Edge Function</th>
                <th>Primary Responsibility</th>
                <th>External APIs Used</th>
              </tr>
            </thead>
            <tbody>
              ${matrixRowsHtml}
            </tbody>
          </table>
        </div>
      </section>

      ${capturePlanPage}

      ${stepPages}

      ${providerPages}

      <section class="page">
        <h2>Implementation Notes</h2>
        <div class="warn">
          <ul>
            <li><strong>Exa Answer API:</strong> product narrative references grounded answer synthesis, but no direct Exa <code>/answer</code> call is currently wired in this repository.</li>
            <li><strong>Webset create failures:</strong> <code>Failed to fetch</code> states are typically key/quota/connectivity issues in provider path, not just UI issues.</li>
            <li><strong>Search gating:</strong> strategy/search flows enforce auth/subscription gate before expensive provider calls.</li>
            <li><strong>Webset criteria normalization:</strong> server-side webset create path limits criteria to the first five entries.</li>
            <li><strong>History as completion hub:</strong> completed runs (including async paths) are reopened through History for stable results review.</li>
          </ul>
        </div>
      </section>

      <section class="page">
        <h2>Approved Logo System</h2>
        <p>Primary SourceKit identity and partner marks used in this guide. This page uses the current SourceKit logo set.</p>

        <div class="logo-system">
          <article class="brand-hero">
            <div class="brand-hero-head">
              <h3>SourceKit Brand Identity</h3>
              <span class="approved-badge">Current Version</span>
            </div>
            <div class="brand-hero-grid">
              <div class="brand-cell">
                <img src="${LOGO_BASE}/sourcekit-full.svg" alt="SourceKit full logo" />
                <div class="brand-caption"><mark>Primary</mark> sourcekit-full.svg</div>
              </div>
              <div class="brand-cell">
                <img src="${LOGO_BASE}/sourcekit-mark-new.svg" alt="SourceKit mark logo" />
                <div class="brand-caption"><mark>Mark</mark> sourcekit-mark-new.svg</div>
              </div>
            </div>
          </article>

          <div class="partners-grid">
            <article class="partner-card">
              <div class="partner-head">
                <h4 class="partner-title">Exa</h4>
                <span class="token">Research</span>
              </div>
              <div class="partner-logos">
                <div class="logo-tile"><img src="${LOGO_BASE}/exa-full.svg" alt="Exa full logo" /><div class="mono">exa-full.svg</div></div>
                <div class="logo-tile mark"><img src="${LOGO_BASE}/exa-mark.svg" alt="Exa mark logo" /><div class="mono">exa-mark.svg</div></div>
              </div>
            </article>

            <article class="partner-card">
              <div class="partner-head">
                <h4 class="partner-title">Parallel</h4>
                <span class="token">Company Intel</span>
              </div>
              <div class="partner-logos">
                <div class="logo-tile"><img src="${LOGO_BASE}/parallel-full.svg" alt="Parallel full logo" /><div class="mono">parallel-full.svg</div></div>
                <div class="logo-tile mark"><img src="${LOGO_BASE}/parallel-mark.svg" alt="Parallel mark logo" /><div class="mono">parallel-mark.svg</div></div>
              </div>
            </article>

            <article class="partner-card">
              <div class="partner-head">
                <h4 class="partner-title">GitHub</h4>
                <span class="token">Evidence</span>
              </div>
              <div class="partner-logos">
                <div class="logo-tile"><img src="${LOGO_BASE}/github-full.svg" alt="GitHub full logo" /><div class="mono">github-full.svg</div></div>
                <div class="logo-tile mark"><img src="${LOGO_BASE}/github-green.svg" alt="GitHub green mark logo" /><div class="mono">github-green.svg</div></div>
              </div>
            </article>

            <article class="partner-card">
              <div class="partner-head">
                <h4 class="partner-title">Claude</h4>
                <span class="token">Reasoning</span>
              </div>
              <div class="partner-logos">
                <div class="logo-tile"><img src="${LOGO_BASE}/claude-full.svg" alt="Claude full logo" /><div class="mono">claude-full.svg</div></div>
                <div class="logo-tile mark"><img src="${LOGO_BASE}/claude-mark.svg" alt="Claude mark logo" /><div class="mono">claude-mark.svg</div></div>
              </div>
            </article>

            <article class="partner-card">
              <div class="partner-head">
                <h4 class="partner-title">Harmonic</h4>
                <span class="token">Graph</span>
              </div>
              <div class="partner-logos">
                <div class="logo-tile"><img src="${LOGO_BASE}/harmonic-full.svg" alt="Harmonic full logo" /><div class="mono">harmonic-full.svg</div></div>
                <div class="logo-tile placeholder"><div class="mono">mark asset not provided</div></div>
              </div>
            </article>
          </div>

          <div class="guideline-grid">
            <article class="guide-card ok">
              <h4>Logo Usage: Do</h4>
              <ul class="guide-list">
                <li>Use <code>sourcekit-full.svg</code> for title bars and headers.</li>
                <li>Use <code>sourcekit-mark-new.svg</code> for compact badges and avatars.</li>
                <li>Keep clear space around every logo mark.</li>
              </ul>
            </article>
            <article class="guide-card no">
              <h4>Logo Usage: Avoid</h4>
              <ul class="guide-list">
                <li>Do not stretch or recolor partner logos.</li>
                <li>Do not mix old SourceKit marks with the current set.</li>
                <li>Do not place low-contrast logos on similar background tones.</li>
              </ul>
            </article>
          </div>
        </div>
      </section>
    </main>
  </body>
</html>`;
}

async function run() {
  await prepareWorkflowScreenshots();
  const html = buildHtml();
  await fs.writeFile(outputHtml, html, "utf8");

  const browser = await puppeteer.launch({ headless: "new" });
  try {
    const page = await browser.newPage();
    await page.goto(`file://${outputHtml}`, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));

    await page.pdf({
      path: outputPdf,
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

  await fs.mkdir(join(__dirname, "..", "output", "pdf"), { recursive: true });
  await fs.copyFile(outputPdf, workflowOutputPdf);

  console.log("Generated:");
  console.log(`- ${outputHtml}`);
  console.log(`- ${outputPdf}`);
  console.log(`- ${workflowOutputPdf}`);
  console.log(`- ${workflowScreenshotManifest}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
