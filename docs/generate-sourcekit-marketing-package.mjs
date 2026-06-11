import fs from "fs/promises";
import { dirname, join, basename } from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..");

const outputRoot = join(repoRoot, "output", "marketing");
const outputPdfRoot = join(outputRoot, "pdf");
const outputLogosRoot = join(outputRoot, "logos");
const outputScreensRoot = join(outputRoot, "screenshots");
const outputPromptRoot = join(outputRoot, "prompt-pack");

const workflowManifestPath = join(repoRoot, "output", "guide-screenshots", "workflow", "screenshot-manifest.json");
const userManifestPath = join(repoRoot, "output", "guide-screenshots", "user-guide", "screenshot-manifest.json");
const logosSourceRoot = join(repoRoot, "..", "docs", "assets", "logos");

const packageSpecPath = join(outputRoot, "package-spec.json");
const readmePath = join(outputRoot, "README.md");

const assets = {
  landing: {
    html: join(outputRoot, "sourcekit-landing-narrative.html"),
    pdf: join(outputPdfRoot, "sourcekit-landing-narrative.pdf"),
  },
  quickstart: {
    html: join(outputRoot, "sourcekit-quickstart-examples-guide.html"),
    pdf: join(outputPdfRoot, "sourcekit-quickstart-examples-guide.pdf"),
  },
  comprehensive: {
    html: join(outputRoot, "sourcekit-comprehensive-workflow-api-guide.html"),
    pdf: join(outputPdfRoot, "sourcekit-comprehensive-workflow-api-guide.pdf"),
  },
  workflowExplainer: {
    html: join(outputRoot, "sourcekit-workflow-explainer.html"),
    pdf: join(outputPdfRoot, "sourcekit-workflow-explainer.pdf"),
  },
};

const promptFiles = {
  master: join(outputPromptRoot, "master-package-prompt.md"),
  quickstart: join(outputPromptRoot, "quickstart-build-prompt.md"),
  comprehensive: join(outputPromptRoot, "comprehensive-build-prompt.md"),
  qa: join(outputPromptRoot, "qa-verifier-prompt.md"),
};

const approvedLogos = [
  "sourcekit-full.svg",
  "sourcekit-mark-new.svg",
  "exa-full.svg",
  "exa-mark.svg",
  "parallel-full.svg",
  "parallel-mark.svg",
  "parallel-mark-purple.svg",
  "github-full.svg",
  "github-green.svg",
  "claude-full.svg",
  "claude-mark.svg",
  "harmonic-full.svg",
];

const providerMap = [
  {
    feature_surface: "Role + Company strategy generation",
    edge_function: "research-role",
    external_api: "Anthropic Messages API + Harmonic Companies/Similar Companies APIs",
    why: "Turns recruiter intent into actionable target repositories, companies, and signals.",
    status: "live",
  },
  {
    feature_surface: "Primary ranked technical search",
    edge_function: "github-search",
    external_api: "GitHub API + Anthropic Messages API + Exa Search API",
    why: "Finds engineer candidates from real repo evidence and ranks by relevance.",
    status: "live",
  },
  {
    feature_surface: "Blended semantic candidate discovery",
    edge_function: "search-candidates",
    external_api: "Exa Search API + Parallel Search API",
    why: "Expands sourcing breadth when role criteria is early or ambiguous.",
    status: "live",
  },
  {
    feature_surface: "Lateral expansion from strong candidate",
    edge_function: "find-similar-candidates",
    external_api: "Exa findSimilar API",
    why: "Accelerates shortlist depth from one high-fit profile.",
    status: "live",
  },
  {
    feature_surface: "JD URL extraction",
    edge_function: "parse-jd",
    external_api: "Parallel Extract API (+ HTML fallback)",
    why: "Converts job post URLs into clean strategy input text.",
    status: "live",
  },
  {
    feature_surface: "Company intelligence",
    edge_function: "company-intel",
    external_api: "Parallel Task API",
    why: "Adds contextual hiring signals to target-company selection.",
    status: "live",
  },
  {
    feature_surface: "Company talent mapping",
    edge_function: "map-company-talent",
    external_api: "Parallel FindAll API",
    why: "Finds likely engineers at target companies for outbound.",
    status: "live",
  },
  {
    feature_surface: "Candidate profile drill-down",
    edge_function: "github-profile",
    external_api: "GitHub API",
    why: "Shows profile depth, repo activity, and evidence-backed context.",
    status: "live",
  },
  {
    feature_surface: "Outreach generation",
    edge_function: "generate-outreach",
    external_api: "Anthropic Messages API",
    why: "Produces recruiter-ready personalized outreach drafts.",
    status: "live",
  },
  {
    feature_surface: "LinkedIn enrichment",
    edge_function: "enrich-linkedin",
    external_api: "Exa Search API + Anthropic Messages API",
    why: "Improves contactability with profile matching and disambiguation.",
    status: "live",
  },
  {
    feature_surface: "Persistent sourcing workflows",
    edge_function: "exa-websets",
    external_api: "Exa Websets API",
    why: "Creates reusable criteria-based sourcing sets with monitorability.",
    status: "live",
  },
  {
    feature_surface: "Bulk candidate import",
    edge_function: "import-candidates",
    external_api: "Exa Webset Imports API",
    why: "Moves external candidate lists into SourceKit webset workflows.",
    status: "live",
  },
  {
    feature_surface: "Webset webhook ingestion",
    edge_function: "webset-webhook",
    external_api: "Exa Webset Webhook events",
    why: "Keeps pipeline state aligned with webset updates.",
    status: "live",
  },
  {
    feature_surface: "Company graph search",
    edge_function: "harmonic-search",
    external_api: "Harmonic search_agent/keyword/typeahead APIs",
    why: "Expands and validates company targeting with graph context.",
    status: "live",
  },
  {
    feature_surface: "Company/person enrichment gateway",
    edge_function: "harmonic-enrich",
    external_api: "Harmonic enrichment APIs + Supabase cache",
    why: "Normalizes enrichment responses for stable recruiter-facing views.",
    status: "live",
  },
  {
    feature_surface: "Grounded Answer synthesis",
    edge_function: "none",
    external_api: "Exa Answer API",
    why: "Potentially useful for grounded narrative outputs.",
    status: "planned_not_wired",
  },
];

const brandTokens = {
  primary_blue: "#006EE6",
  core_gray: "#343434",
  support_sky: "#8CDDFF",
  accent_aqua: "#00D5C1",
  depth_indigo: "#48337D",
  ui_050: "#F8F9FA",
  ui_100: "#E9ECEF",
  ui_200: "#C0C8CF",
  ui_700: "#717171",
  ui_900: "#212121",
};

const packageConfig = {
  audience: "in_house_recruiters",
  primary_goal: "trial_signups",
  claims_mode: "current_state_only",
  narrative_style: "outcome_first",
  cta_profile: "start_trial",
  voice_profile: "direct_confident_recruiter_oriented",
};

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function pickByStep(manifest, step) {
  const row = manifest.find((item) => item.step === step);
  if (!row) {
    throw new Error(`Missing step ${step} in manifest`);
  }
  return row;
}

function relPathFromOutput(path) {
  return path.replace(`${outputRoot}/`, "");
}

async function ensureDirs() {
  await fs.mkdir(outputRoot, { recursive: true });
  await fs.mkdir(outputPdfRoot, { recursive: true });
  await fs.mkdir(outputLogosRoot, { recursive: true });
  await fs.mkdir(join(outputScreensRoot, "workflow"), { recursive: true });
  await fs.mkdir(join(outputScreensRoot, "user-guide"), { recursive: true });
  await fs.mkdir(outputPromptRoot, { recursive: true });
}

async function loadManifest(path) {
  const raw = await fs.readFile(path, "utf8");
  return JSON.parse(raw);
}

async function copyLogos() {
  await Promise.all(
    approvedLogos.map(async (logo) => {
      await fs.copyFile(join(logosSourceRoot, logo), join(outputLogosRoot, logo));
    }),
  );
}

async function copyScreenshots(workflowManifest, userManifest) {
  const workflowMap = [];
  const userMap = [];

  await Promise.all(
    workflowManifest.map(async (item) => {
      const filename = basename(item.outputPath);
      const dest = join(outputScreensRoot, "workflow", filename);
      await fs.copyFile(item.outputPath, dest);
      workflowMap.push({
        ...item,
        marketing_path: `./screenshots/workflow/${filename}`,
        marketing_rel_path: relPathFromOutput(dest),
      });
    }),
  );

  await Promise.all(
    userManifest.map(async (item) => {
      const filename = basename(item.outputPath);
      const dest = join(outputScreensRoot, "user-guide", filename);
      await fs.copyFile(item.outputPath, dest);
      userMap.push({
        ...item,
        marketing_path: `./screenshots/user-guide/${filename}`,
        marketing_rel_path: relPathFromOutput(dest),
      });
    }),
  );

  workflowMap.sort((a, b) => a.step - b.step);
  userMap.sort((a, b) => a.step - b.step);

  return { workflowMap, userMap };
}

function buildProofMap(userManifest, workflowManifest) {
  return [
    {
      claim_id: "claim-01-signin-activation",
      claim: "Recruiters can start from a branded sign-in and reach sourcing quickly.",
      evidence: [
        {
          manifest: "user-guide",
          step: 1,
          manifest_path: userManifestPath,
          screenshot_path: pickByStep(userManifest, 1).marketing_rel_path,
        },
      ],
    },
    {
      claim_id: "claim-02-strategy-builder",
      claim: "SourceKit can generate sourcing strategy from role + company context.",
      evidence: [
        {
          manifest: "user-guide",
          step: 4,
          manifest_path: userManifestPath,
          screenshot_path: pickByStep(userManifest, 4).marketing_rel_path,
        },
      ],
    },
    {
      claim_id: "claim-03-search-progress",
      claim: "Recruiters can monitor live search progress and stage-level status.",
      evidence: [
        {
          manifest: "workflow",
          step: 5,
          manifest_path: workflowManifestPath,
          screenshot_path: pickByStep(workflowManifest, 5).marketing_rel_path,
        },
      ],
    },
    {
      claim_id: "claim-04-ranked-results",
      claim: "Results are returned as ranked engineer cards with evidence snippets.",
      evidence: [
        {
          manifest: "user-guide",
          step: 9,
          manifest_path: userManifestPath,
          screenshot_path: pickByStep(userManifest, 9).marketing_rel_path,
        },
      ],
    },
    {
      claim_id: "claim-05-query-discipline",
      claim: "Query quality directly impacts shortlist quality and ranking precision.",
      evidence: [
        {
          manifest: "user-guide",
          step: 5,
          manifest_path: userManifestPath,
          screenshot_path: pickByStep(userManifest, 5).marketing_rel_path,
        },
        {
          manifest: "user-guide",
          step: 10,
          manifest_path: userManifestPath,
          screenshot_path: pickByStep(userManifest, 10).marketing_rel_path,
        },
      ],
    },
    {
      claim_id: "claim-06-no-results-recovery",
      claim: "No-results scenarios include actionable recovery guidance.",
      evidence: [
        {
          manifest: "user-guide",
          step: 7,
          manifest_path: userManifestPath,
          screenshot_path: pickByStep(userManifest, 7).marketing_rel_path,
        },
      ],
    },
    {
      claim_id: "claim-07-history-reopen",
      claim: "Completed runs can be reopened via History for pipeline continuation.",
      evidence: [
        {
          manifest: "workflow",
          step: 11,
          manifest_path: workflowManifestPath,
          screenshot_path: pickByStep(workflowManifest, 11).marketing_rel_path,
        },
      ],
    },
    {
      claim_id: "claim-08-candidate-drilldown",
      claim: "Candidate side panel consolidates profile context and recruiter actions.",
      evidence: [
        {
          manifest: "workflow",
          step: 8,
          manifest_path: workflowManifestPath,
          screenshot_path: pickByStep(workflowManifest, 8).marketing_rel_path,
        },
      ],
    },
    {
      claim_id: "claim-09-webset-flow",
      claim: "Websets support reusable criteria-based sourcing workflows.",
      evidence: [
        {
          manifest: "workflow",
          step: 9,
          manifest_path: workflowManifestPath,
          screenshot_path: pickByStep(workflowManifest, 9).marketing_rel_path,
        },
      ],
    },
    {
      claim_id: "claim-10-webset-failure-visible",
      claim: "Webset submit outcomes are visible, including failure signaling when provider paths fail.",
      evidence: [
        {
          manifest: "workflow",
          step: 10,
          manifest_path: workflowManifestPath,
          screenshot_path: pickByStep(workflowManifest, 10).marketing_rel_path,
        },
      ],
    },
    {
      claim_id: "claim-11-export-handoff",
      claim: "Recruiters can export shortlisted candidates for downstream handoff.",
      evidence: [
        {
          manifest: "workflow",
          step: 12,
          manifest_path: workflowManifestPath,
          screenshot_path: pickByStep(workflowManifest, 12).marketing_rel_path,
        },
      ],
    },
  ];
}

function baseStyles() {
  return `
    :root {
      --primary-blue: ${brandTokens.primary_blue};
      --core-gray: ${brandTokens.core_gray};
      --support-sky: ${brandTokens.support_sky};
      --accent-aqua: ${brandTokens.accent_aqua};
      --depth-indigo: ${brandTokens.depth_indigo};
      --ui-050: ${brandTokens.ui_050};
      --ui-100: ${brandTokens.ui_100};
      --ui-200: ${brandTokens.ui_200};
      --ui-700: ${brandTokens.ui_700};
      --ui-900: ${brandTokens.ui_900};
      --shadow-lg: 0 20px 48px rgba(33, 33, 33, 0.12);
      --shadow-md: 0 10px 24px rgba(33, 33, 33, 0.08);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background:
        radial-gradient(1200px 600px at -10% -10%, rgba(140, 221, 255, 0.45) 0%, transparent 60%),
        radial-gradient(1000px 500px at 110% -20%, rgba(0, 213, 193, 0.28) 0%, transparent 62%),
        linear-gradient(180deg, #d7dce6 0%, #c0c8d4 100%);
      color: var(--ui-900);
      font-family: "DM Sans", "Avenir Next", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .doc { width: 100%; margin: 0; }

    .page {
      background: linear-gradient(180deg, #edf1f8 0%, #f8f9fb 100%);
      border: 1px solid #c3ccd8;
      border-radius: 18px;
      margin: 10px;
      padding: 22px 18px 26px;
      box-shadow: var(--shadow-md);
      page-break-after: always;
      break-after: page;
      position: relative;
      overflow: hidden;
    }

    .page:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    h1 {
      margin: 0;
      font-family: "Space Grotesk", "DM Sans", sans-serif;
      font-size: 40px;
      line-height: 1.05;
      letter-spacing: -0.02em;
      color: var(--ui-900);
    }

    h2 {
      margin: 0 0 12px;
      font-family: "Space Grotesk", "DM Sans", sans-serif;
      font-size: 26px;
      line-height: 1.2;
      letter-spacing: -0.015em;
      color: var(--ui-900);
    }

    h3 {
      margin: 0 0 8px;
      font-family: "Space Grotesk", "DM Sans", sans-serif;
      font-size: 18px;
      color: var(--ui-900);
    }

    h4 {
      margin: 0 0 6px;
      font-family: "Space Grotesk", "DM Sans", sans-serif;
      font-size: 15px;
      color: var(--ui-900);
    }

    p {
      margin: 0 0 10px;
      font-size: 14px;
      line-height: 1.5;
      color: #314154;
    }

    ul {
      margin: 0;
      padding-left: 18px;
    }

    li {
      margin-bottom: 6px;
      color: #314154;
      font-size: 13px;
      line-height: 1.45;
    }

    .eyebrow {
      margin: 0 0 8px;
      font-family: "JetBrains Mono", monospace;
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #0d4f95;
    }

    .subtitle {
      margin-top: 8px;
      font-size: 18px;
      color: #3e5370;
      max-width: 80ch;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }

    .brand-lockup {
      height: 44px;
      width: auto;
    }

    .pill {
      border: 1px solid #9db1ce;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.78);
      padding: 6px 12px;
      font-family: "JetBrains Mono", monospace;
      font-size: 11px;
      color: #455a76;
    }

    .card {
      border: 1px solid #c2cbda;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.84);
      padding: 12px;
      box-shadow: 0 6px 16px rgba(33, 33, 33, 0.05);
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }

    .cta-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 12px;
      flex-wrap: wrap;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: linear-gradient(135deg, var(--primary-blue), #2f8bff);
      color: white;
      text-decoration: none;
      font-weight: 700;
      font-size: 13px;
      padding: 10px 16px;
      border: 1px solid rgba(0, 110, 230, 0.45);
      box-shadow: 0 8px 20px rgba(0, 110, 230, 0.28);
    }

    .btn-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.82);
      color: #1f3654;
      text-decoration: none;
      font-weight: 600;
      font-size: 13px;
      padding: 10px 16px;
      border: 1px solid #b9c8dd;
    }

    .logo-strip {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .logo-chip {
      border: 1px solid #c5cfdf;
      border-radius: 10px;
      height: 44px;
      min-width: 104px;
      padding: 8px 10px;
      background: linear-gradient(180deg, #ffffff 0%, #f4f7fb 100%);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-chip img {
      max-height: 24px;
      max-width: 90px;
      width: auto;
      object-fit: contain;
    }

    .step-list {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }

    .step-card {
      border: 1px solid #c5cfe0;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.86);
      padding: 10px;
      min-height: 118px;
    }

    .step-num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      border: 1px solid rgba(0, 110, 230, 0.3);
      background: rgba(0, 110, 230, 0.1);
      color: #0a4e96;
      font-family: "JetBrains Mono", monospace;
      font-size: 11px;
      padding: 3px 8px;
      margin-bottom: 6px;
    }

    .shot {
      border: 1px solid #c1cadd;
      border-radius: 12px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.88);
      box-shadow: 0 6px 16px rgba(33, 33, 33, 0.05);
    }

    .shot img {
      width: 100%;
      height: 188px;
      object-fit: cover;
      object-position: top left;
      display: block;
    }

    .shot figcaption {
      padding: 8px 10px;
      font-size: 12px;
      color: #576d87;
      border-top: 1px solid #d5dce8;
      background: rgba(250, 251, 253, 0.95);
    }

    .table-wrap {
      border: 1px solid #c4cddd;
      border-radius: 12px;
      overflow: hidden;
      background: white;
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
      border-top: 1px solid #d8dfea;
      line-height: 1.45;
    }

    thead th {
      border-top: 0;
      background: linear-gradient(180deg, #e8eef8 0%, #dfe8f5 100%);
      color: #1a2e47;
      font-weight: 700;
    }

    tbody tr:nth-child(even) td {
      background: #fbfdff;
    }

    .chip {
      display: inline-flex;
      border-radius: 999px;
      border: 1px solid #b8c8de;
      background: rgba(255, 255, 255, 0.8);
      padding: 3px 8px;
      font-size: 11px;
      color: #355071;
      font-family: "JetBrains Mono", monospace;
    }

    .callout {
      border: 1px solid;
      border-radius: 12px;
      padding: 12px;
    }

    .callout-success {
      background: rgba(0, 213, 193, 0.12);
      border-color: rgba(0, 213, 193, 0.34);
    }

    .callout-warning {
      background: rgba(255, 138, 92, 0.12);
      border-color: rgba(255, 102, 47, 0.34);
    }

    .footer-note {
      margin-top: 10px;
      font-size: 11px;
      color: #5d738f;
      font-family: "JetBrains Mono", monospace;
    }

    .mono {
      font-family: "JetBrains Mono", monospace;
      font-size: 12px;
      color: #233953;
    }

    .link {
      color: var(--primary-blue);
      text-decoration: none;
      font-weight: 600;
    }
  `;
}

function template(title, body, withSpaceGrotesk = true) {
  const fontQuery = withSpaceGrotesk
    ? "family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700"
    : "family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?${fontQuery}&display=swap" rel="stylesheet" />
    <style>${baseStyles()}</style>
  </head>
  <body>
    <main class="doc">
      ${body}
    </main>
  </body>
</html>`;
}

function renderLanding({ workflowManifest }) {
  const strategy = pickByStep(workflowManifest, 3);
  const results = pickByStep(workflowManifest, 6);
  const profile = pickByStep(workflowManifest, 8);
  const webset = pickByStep(workflowManifest, 9);

  return template(
    "SourceKit Landing Narrative",
    `
      <section class="page" id="hero">
        <div class="topbar">
          <img src="./logos/sourcekit-full.svg" alt="SourceKit" class="brand-lockup" />
          <span class="pill">Trial Conversion Package / Current State Only</span>
        </div>
        <p class="eyebrow">Recruiter Outcome Narrative</p>
        <h1>Find stronger technical candidates faster, with proof in every profile.</h1>
        <p class="subtitle">SourceKit helps in-house recruiters move from role brief to evidence-backed shortlist in minutes, using repository-level signals instead of keyword-only sourcing.</p>

        <div class="cta-row">
          <a class="btn-primary" href="https://getsourcekit.vercel.app">Start Trial on getsourcekit.vercel.app</a>
          <a class="btn-secondary" href="#workflow">View Workflow Explainer</a>
          <span class="chip">Audience: In-house recruiters</span>
        </div>

        <div class="grid-2" style="margin-top:12px;">
          <article class="card">
            <h3>Why teams switch</h3>
            <ul>
              <li>Cut manual sourcing loops by combining strategy, search, and ranking in one workspace.</li>
              <li>See contribution-based evidence directly on candidate cards and profiles.</li>
              <li>Repeat winning criteria with Websets for recurring roles.</li>
            </ul>
          </article>
          <article class="card">
            <h3>Provider stack (server-side orchestrated)</h3>
            <div class="logo-strip">
              <div class="logo-chip"><img src="./logos/exa-full.svg" alt="Exa" /></div>
              <div class="logo-chip"><img src="./logos/parallel-full.svg" alt="Parallel" /></div>
              <div class="logo-chip"><img src="./logos/github-full.svg" alt="GitHub" /></div>
              <div class="logo-chip"><img src="./logos/claude-full.svg" alt="Claude" /></div>
              <div class="logo-chip"><img src="./logos/harmonic-full.svg" alt="Harmonic" /></div>
            </div>
          </article>
        </div>
      </section>

      <section class="page" id="workflow">
        <p class="eyebrow">How SourceKit Works</p>
        <h2>Branded Workflow Explainer</h2>
        <div class="step-list">
          <article class="step-card"><span class="step-num">Step 1</span><h4>Set role + company</h4><p>Start in New Search and lock role context.</p></article>
          <article class="step-card"><span class="step-num">Step 2</span><h4>Generate strategy</h4><p>Build repo and target-company strategy with AI support.</p></article>
          <article class="step-card"><span class="step-num">Step 3</span><h4>Run and refine</h4><p>Search, monitor progress, then tune query and filters.</p></article>
          <article class="step-card"><span class="step-num">Step 4</span><h4>Shortlist + export</h4><p>Review evidence-rich candidates and hand off clean output.</p></article>
        </div>

        <div class="grid-2" style="margin-top:12px;">
          <figure class="shot">
            <img src="${strategy.marketing_path}" alt="Strategy generation" />
            <figcaption>Strategy generation from recruiter input.</figcaption>
          </figure>
          <figure class="shot">
            <img src="${results.marketing_path}" alt="Ranked results" />
            <figcaption>Ranked candidate list with evidence snippets.</figcaption>
          </figure>
        </div>
      </section>

      <section class="page" id="trust-map">
        <p class="eyebrow">Proof-Backed Trust Map</p>
        <h2>Capability -> Screenshot Evidence</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Capability</th>
                <th>Recruiter Value</th>
                <th>Proof Screenshot</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Strategy Builder</strong></td>
                <td>Moves from role brief to actionable technical targeting.</td>
                <td><span class="mono">${strategy.marketing_rel_path}</span></td>
              </tr>
              <tr>
                <td><strong>Ranked Results</strong></td>
                <td>Prioritizes candidates by evidence quality and relevance.</td>
                <td><span class="mono">${results.marketing_rel_path}</span></td>
              </tr>
              <tr>
                <td><strong>Candidate Drilldown</strong></td>
                <td>Supports fast recruiter decisions with richer context.</td>
                <td><span class="mono">${profile.marketing_rel_path}</span></td>
              </tr>
              <tr>
                <td><strong>Websets</strong></td>
                <td>Operationalizes recurring technical sourcing criteria.</td>
                <td><span class="mono">${webset.marketing_rel_path}</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="callout callout-success" style="margin-top:12px;">
          <h3>CTA</h3>
          <p>Start with one role you are actively hiring for, run the quickstart path, and evaluate shortlist quality in under 5 minutes.</p>
          <p style="margin-top:8px;"><a class="btn-primary" href="https://getsourcekit.vercel.app">Start Trial</a></p>
        </div>

        <p class="footer-note">Claims mode: current_state_only. All major claims are mapped in package-spec.json proof_map.</p>
      </section>
    `,
  );
}

function renderQuickstart({ userManifest }) {
  const steps = [1, 2, 4, 6, 9, 15].map((step) => pickByStep(userManifest, step));
  const goodQuery = pickByStep(userManifest, 5);
  const noResults = pickByStep(userManifest, 7);
  const queryDetails = pickByStep(userManifest, 10);
  const websetStatus = pickByStep(userManifest, 14);

  const stepCards = steps
    .map(
      (step) => `
      <article class="card">
        <span class="chip">Step ${step.step}</span>
        <h3 style="margin-top:8px;">${step.title}</h3>
        <p>${step.target}</p>
        <figure class="shot" style="margin-top:8px;">
          <img src="${step.marketing_path}" alt="${step.title}" />
          <figcaption>${step.focusArea}</figcaption>
        </figure>
        <div class="callout callout-success" style="margin-top:8px;">
          <strong>What is happening for me:</strong>
          <p style="margin-top:6px;">${
            step.step <= 2
              ? "SourceKit sets the context so search quality starts from the right role assumptions."
              : step.step === 4
                ? "Strategy generation turns your role into concrete technical targeting."
                : step.step === 6
                  ? "Search services retrieve and score candidates while showing live progress."
                  : step.step === 9
                    ? "You get ranked evidence-backed candidates ready for recruiter action."
                    : "You can export shortlist output for handoff without rework."
          }</p>
        </div>
      </article>
    `,
    )
    .join("\n");

  return template(
    "SourceKit Quickstart + Examples Guide",
    `
      <section class="page" id="quickstart-cover">
        <div class="topbar">
          <img src="./logos/sourcekit-full.svg" alt="SourceKit" class="brand-lockup" />
          <span class="pill">Quickstart + Examples / Trial Path</span>
        </div>
        <p class="eyebrow">Concise Activation Guide</p>
        <h1>Go from role brief to export-ready shortlist in under 5 minutes.</h1>
        <p class="subtitle">Use this version when onboarding new recruiter users or validating SourceKit fit quickly.</p>
        <div class="cta-row">
          <a class="btn-primary" href="https://getsourcekit.vercel.app">Start Trial</a>
          <a class="btn-secondary" href="#query-examples">Jump to Query Examples</a>
          <span class="chip">Goal: first-success workflow</span>
        </div>
      </section>

      <section class="page" id="fast-path">
        <p class="eyebrow">Fast Path</p>
        <h2>6-Step First Success Flow</h2>
        <div class="grid-2">
          ${stepCards}
        </div>
      </section>

      <section class="page" id="query-examples">
        <p class="eyebrow">Examples</p>
        <h2>Query Patterns: Good vs Too Broad vs Too Narrow</h2>
        <div class="grid-3">
          <article class="card">
            <h3>Good Query</h3>
            <p class="mono">Staff ML Engineer Anthropic machine learning infrastructure</p>
            <figure class="shot" style="margin-top:8px;">
              <img src="${goodQuery.marketing_path}" alt="Good query" />
              <figcaption>Balanced specificity with company + technical signal.</figcaption>
            </figure>
          </article>
          <article class="card">
            <h3>Too Broad</h3>
            <p class="mono">ML engineer Python</p>
            <figure class="shot" style="margin-top:8px;">
              <img src="${queryDetails.marketing_path}" alt="Broad query context" />
              <figcaption>Use Query Details to tighten criteria and avoid noisy slates.</figcaption>
            </figure>
          </article>
          <article class="card">
            <h3>Too Narrow</h3>
            <p class="mono">Many strict companies + narrow repo constraints</p>
            <figure class="shot" style="margin-top:8px;">
              <img src="${noResults.marketing_path}" alt="Too narrow query" />
              <figcaption>No-results guidance indicates when to broaden safely.</figcaption>
            </figure>
          </article>
        </div>
      </section>

      <section class="page" id="recovery">
        <p class="eyebrow">Troubleshooting</p>
        <h2>Common Recovery Moves</h2>
        <div class="grid-2">
          <article class="callout callout-warning">
            <h3>No engineers found</h3>
            <ul>
              <li>Reduce strict company filters first.</li>
              <li>Keep high-signal technical repo anchors.</li>
              <li>Rerun and compare shortlist quality before exporting.</li>
            </ul>
            <p class="mono" style="margin-top:8px;">Proof: ${noResults.marketing_rel_path}</p>
          </article>
          <article class="callout callout-warning">
            <h3>Webset submit failure (Failed to fetch)</h3>
            <ul>
              <li>Treat as provider path issue first (keys/quota/connectivity).</li>
              <li>Retry from saved criteria after provider checks.</li>
              <li>Confirm result visibility in History when rerun completes.</li>
            </ul>
            <p class="mono" style="margin-top:8px;">Proof: ${websetStatus.marketing_rel_path}</p>
          </article>
        </div>

        <div class="cta-row" style="margin-top:14px;">
          <a class="btn-primary" href="https://getsourcekit.vercel.app">Start Trial</a>
          <a class="btn-secondary" href="./sourcekit-comprehensive-workflow-api-guide.html">Open Comprehensive Guide</a>
        </div>
      </section>
    `,
  );
}

function renderComprehensive({ userManifest, workflowManifest }) {
  const shot = {
    signIn: pickByStep(userManifest, 1),
    strategy: pickByStep(workflowManifest, 3),
    progress: pickByStep(workflowManifest, 5),
    ranked: pickByStep(workflowManifest, 6),
    profile: pickByStep(workflowManifest, 8),
    webset: pickByStep(workflowManifest, 9),
    websetStatus: pickByStep(workflowManifest, 10),
    history: pickByStep(workflowManifest, 11),
    export: pickByStep(workflowManifest, 12),
    noResults: pickByStep(userManifest, 7),
  };

  const providerRows = providerMap
    .map(
      (row) => `
      <tr>
        <td><strong>${row.feature_surface}</strong></td>
        <td><span class="mono">${row.edge_function}</span></td>
        <td>${row.external_api}</td>
        <td>${row.why}</td>
        <td><span class="chip">${row.status}</span></td>
      </tr>
    `,
    )
    .join("\n");

  const valueRows = [
    [
      "Low-confidence keyword sourcing",
      "Strategy-driven repository and company targeting",
      shot.strategy,
      "research-role -> Anthropic + Harmonic",
    ],
    [
      "Slow recruiter iteration",
      "Live query analysis and ranked shortlist refresh",
      shot.progress,
      "github-search -> GitHub + Anthropic + Exa",
    ],
    [
      "Weak decision context per candidate",
      "Evidence-backed profile side panel and score context",
      shot.profile,
      "github-profile (+ cached enrichment)",
    ],
    [
      "One-off search work that does not compound",
      "Websets for recurring criteria and enrichment workflows",
      shot.webset,
      "exa-websets -> Exa Websets",
    ],
    [
      "Handoff friction",
      "Export-ready shortlist outputs for recruiter workflows",
      shot.export,
      "results export + pipeline actions",
    ],
  ]
    .map(
      (row) => `
      <tr>
        <td>${row[0]}</td>
        <td>${row[1]}</td>
        <td><span class="mono">${row[2].marketing_rel_path}</span></td>
        <td>${row[3]}</td>
      </tr>
    `,
    )
    .join("\n");

  return template(
    "SourceKit Comprehensive Workflow + API Value Guide",
    `
      <section class="page" id="comprehensive-cover">
        <div class="topbar">
          <img src="./logos/sourcekit-full.svg" alt="SourceKit" class="brand-lockup" />
          <span class="pill">Comprehensive Guide / Current State Only</span>
        </div>
        <p class="eyebrow">Full Workflow + API Responsibility</p>
        <h1>Comprehensive SourceKit Walkthrough for in-house recruiter teams</h1>
        <p class="subtitle">This guide explains what each feature does, which provider path powers it, why it exists, and how to run best-practice sourcing workflows for repeatable outcomes.</p>
        <div class="cta-row">
          <a class="btn-primary" href="https://getsourcekit.vercel.app">Start Trial</a>
          <a class="btn-secondary" href="#provider-matrix">Jump to Provider Matrix</a>
        </div>
      </section>

      <section class="page" id="feature-walkthrough">
        <p class="eyebrow">Feature Walkthrough</p>
        <h2>Search -> History -> Profile -> Websets -> Export loop</h2>
        <div class="grid-2">
          <figure class="shot"><img src="${shot.signIn.marketing_path}" alt="Sign in" /><figcaption>Activation entry point</figcaption></figure>
          <figure class="shot"><img src="${shot.strategy.marketing_path}" alt="Strategy" /><figcaption>Strategy generation</figcaption></figure>
          <figure class="shot"><img src="${shot.progress.marketing_path}" alt="Search progress" /><figcaption>Live search progress</figcaption></figure>
          <figure class="shot"><img src="${shot.ranked.marketing_path}" alt="Ranked results" /><figcaption>Ranked results</figcaption></figure>
          <figure class="shot"><img src="${shot.profile.marketing_path}" alt="Candidate profile" /><figcaption>Candidate side panel context</figcaption></figure>
          <figure class="shot"><img src="${shot.history.marketing_path}" alt="History" /><figcaption>History reopen for completed runs</figcaption></figure>
          <figure class="shot"><img src="${shot.webset.marketing_path}" alt="Websets" /><figcaption>Reusable webset criteria</figcaption></figure>
          <figure class="shot"><img src="${shot.export.marketing_path}" alt="Export" /><figcaption>Export for handoff</figcaption></figure>
        </div>
      </section>

      <section class="page" id="provider-matrix">
        <p class="eyebrow">API Responsibility Matrix</p>
        <h2>What API handles what task and why</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Feature Surface</th>
                <th>Edge Function</th>
                <th>External API</th>
                <th>Why This Matters</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${providerRows}
            </tbody>
          </table>
        </div>
      </section>

      <section class="page" id="value-proposition">
        <p class="eyebrow">Value Proposition Model</p>
        <h2>Recruiter pain -> SourceKit capability -> screenshot proof -> provider mechanism</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Recruiter Pain</th>
                <th>SourceKit Capability</th>
                <th>Screenshot Proof</th>
                <th>Provider/API Mechanism</th>
              </tr>
            </thead>
            <tbody>
              ${valueRows}
            </tbody>
          </table>
        </div>
      </section>

      <section class="page" id="best-practices">
        <p class="eyebrow">Best Practices Playbook</p>
        <h2>Stage-by-stage execution guidance</h2>
        <div class="grid-2">
          <article class="callout callout-success">
            <h3>Strategy quality</h3>
            <ul>
              <li>Start with clear role + company context before query writing.</li>
              <li>Prefer concrete technical ecosystems over generic titles.</li>
              <li>Inspect generated targets before launching search.</li>
            </ul>
          </article>
          <article class="callout callout-success">
            <h3>Query quality</h3>
            <ul>
              <li>Use targeted company clusters and repository anchors.</li>
              <li>Use Query Details to validate parsed interpretation.</li>
              <li>Avoid over-constraining early iterations.</li>
            </ul>
          </article>
          <article class="callout callout-success">
            <h3>Filtering + shortlist hygiene</h3>
            <ul>
              <li>Let ranking finish before applying aggressive filters.</li>
              <li>Prioritize evidence-rich cards first for review speed.</li>
              <li>Capture reasons in profile notes for team alignment.</li>
            </ul>
          </article>
          <article class="callout callout-warning">
            <h3>Webset reliability</h3>
            <ul>
              <li>Treat <strong>Failed to fetch</strong> as provider-path risk first.</li>
              <li>Retry from saved criteria after key/quota/connectivity checks.</li>
              <li>Use History to confirm completed runs after retries.</li>
            </ul>
            <p class="mono" style="margin-top:8px;">Proof: ${shot.websetStatus.marketing_rel_path}</p>
          </article>
          <article class="callout callout-warning" style="grid-column: span 2;">
            <h3>No-results recovery</h3>
            <p>When searches return no engineers, reduce strict company constraints first and keep high-signal technical anchors in place.</p>
            <p class="mono" style="margin-top:8px;">Proof: ${shot.noResults.marketing_rel_path}</p>
          </article>
        </div>

        <div class="cta-row" style="margin-top:14px;">
          <a class="btn-primary" href="https://getsourcekit.vercel.app">Start Trial</a>
          <a class="btn-secondary" href="./sourcekit-workflow-explainer.html">Open Workflow Explainer</a>
        </div>
      </section>
    `,
  );
}

function renderWorkflowExplainer({ workflowManifest }) {
  const steps = workflowManifest
    .slice(0, 12)
    .map(
      (item) => `
      <article class="card" id="step-${item.step}">
        <span class="chip">Step ${item.step}</span>
        <h3 style="margin-top:8px;">${item.title}</h3>
        <p><strong>Target:</strong> ${item.target}</p>
        <p><strong>Area:</strong> ${item.focusArea}</p>
        <figure class="shot" style="margin-top:8px;">
          <img src="${item.marketing_path}" alt="${item.title}" />
          <figcaption>${item.marketing_rel_path}</figcaption>
        </figure>
      </article>
    `,
    )
    .join("\n");

  return template(
    "SourceKit Workflow Explainer",
    `
      <section class="page" id="workflow-explainer-cover">
        <div class="topbar">
          <img src="./logos/sourcekit-full.svg" alt="SourceKit" class="brand-lockup" />
          <span class="pill">Workflow Explainer / Branded</span>
        </div>
        <p class="eyebrow">Customer Experience Package</p>
        <h1>SourceKit Workflow Explainer</h1>
        <p class="subtitle">A visual, proof-backed walkthrough from sign-in to export handoff for technical sourcing teams.</p>
        <div class="cta-row">
          <a class="btn-primary" href="https://getsourcekit.vercel.app">Start Trial</a>
          <a class="btn-secondary" href="./sourcekit-quickstart-examples-guide.html">Open Quickstart Guide</a>
        </div>
      </section>

      <section class="page" id="workflow-steps">
        <p class="eyebrow">12-Step Visual Sequence</p>
        <h2>SourceKit recruiter workflow with screenshot evidence</h2>
        <div class="grid-2">
          ${steps}
        </div>
      </section>
    `,
  );
}

function buildPromptPack(spec) {
  const inputs = [
    "brand_assets_path",
    "workflow_manifest_path",
    "user_manifest_path",
    "output_root",
    "voice_profile",
    "cta_profile",
  ];

  const master = `# Master Package Prompt\n\nYou are generating the complete SourceKit CX + marketing package from source-of-truth assets only.\n\n## Fixed Inputs\n- package_spec_path: ${spec.contracts.package_spec_path}\n- brand_assets_path: ${spec.contracts.prompt_contract_inputs.brand_assets_path}\n- workflow_manifest_path: ${spec.contracts.prompt_contract_inputs.workflow_manifest_path}\n- user_manifest_path: ${spec.contracts.prompt_contract_inputs.user_manifest_path}\n- output_root: ${spec.contracts.prompt_contract_inputs.output_root}\n- voice_profile: ${spec.contracts.prompt_contract_inputs.voice_profile}\n- cta_profile: ${spec.contracts.prompt_contract_inputs.cta_profile}\n\n## Hard Requirements\n1. Current-state-only claims.\n2. Every major claim must map to screenshot evidence from manifest step IDs.\n3. Use approved SourceKit/provider logos only.\n4. Produce both quickstart and comprehensive assets plus landing + workflow explainer.\n5. Include trial-signup CTA in landing and both guides.\n\n## Output Targets\n- sourcekit-landing-narrative.html/pdf\n- sourcekit-quickstart-examples-guide.html/pdf\n- sourcekit-comprehensive-workflow-api-guide.html/pdf\n- sourcekit-workflow-explainer.html/pdf\n- package-spec.json\n- prompt-pack/*.md\n\n## Build Commands\n\`\`\`bash\nnode docs/generate-sourcekit-marketing-package.mjs\nnode docs/validate-sourcekit-marketing-package.mjs\n\`\`\`\n`;

  const quickstart = `# Quickstart Build Prompt\n\nGenerate only the concise conversion-focused quickstart + examples guide for SourceKit.\n\n## Include\n- 6-step first-success flow (sign in -> new search -> strategy -> run search -> inspect -> export).\n- Query examples: good vs too broad vs too narrow.\n- Troubleshooting: no-results and failed webset submit state.\n- Minimal API detail with clear recruiter-facing explanations.\n- Trial CTA to https://getsourcekit.vercel.app.\n\n## Evidence Rules\n- Use only user/workflow screenshot manifests.\n- Map every major claim to at least one manifest step.\n`;

  const comprehensive = `# Comprehensive Build Prompt\n\nGenerate the full SourceKit walkthrough + API value guide.\n\n## Include\n- End-to-end feature walkthrough (Search, History, Candidate Profile, Websets, Export, loopback).\n- Provider responsibility matrix: Exa, Parallel, GitHub, Claude, Harmonic.\n- Value proposition model: recruiter pain -> capability -> screenshot proof -> provider/API mechanism.\n- Best practices by stage: strategy quality, query quality, filters, shortlist hygiene, webset reliability.\n- Explicitly mark planned/unwired capabilities as not live.\n\n## Constraints\n- Outcome-first narrative.\n- Current-state claims only.\n- Trial CTA included.\n`;

  const qa = `# QA Verifier Prompt\n\nValidate SourceKit package outputs before publish.\n\n## Verify\n1. Every major claim is mapped to screenshot proof (manifest + step).\n2. No unwired feature is described as live.\n3. Quickstart remains concise and action-led.\n4. Brand assets are approved logos only.\n5. Trial CTA appears in landing + quickstart + comprehensive.\n6. Troubleshooting includes no-results and failed webset submission paths.\n7. All HTML and PDF assets exist and render.\n\n## Use\n\`\`\`bash\nnode docs/validate-sourcekit-marketing-package.mjs\n\`\`\`\n`;

  return { master, quickstart, comprehensive, qa, promptInputs: inputs };
}

function buildPackageSpec({ workflowManifest, userManifest, proofMap }) {
  return {
    audience: packageConfig.audience,
    primary_goal: packageConfig.primary_goal,
    claims_mode: packageConfig.claims_mode,
    narrative_style: packageConfig.narrative_style,
    generated_at: new Date().toISOString(),
    asset_set: {
      landing: {
        id: "landing_narrative",
        html: relPathFromOutput(assets.landing.html),
        pdf: relPathFromOutput(assets.landing.pdf),
        purpose: "Conversion-first narrative optimized for trial starts.",
      },
      quickstart: {
        id: "quickstart_examples_guide",
        html: relPathFromOutput(assets.quickstart.html),
        pdf: relPathFromOutput(assets.quickstart.pdf),
        purpose: "Short activation path with query examples and recoveries.",
      },
      comprehensive: {
        id: "comprehensive_workflow_api_value_guide",
        html: relPathFromOutput(assets.comprehensive.html),
        pdf: relPathFromOutput(assets.comprehensive.pdf),
        purpose: "Full feature, value, and provider responsibility walkthrough.",
      },
      workflow_explainer: {
        id: "workflow_explainer",
        html: relPathFromOutput(assets.workflowExplainer.html),
        pdf: relPathFromOutput(assets.workflowExplainer.pdf),
        purpose: "Visual branded explainer that maps each workflow stage to proof.",
      },
      prompt_pack: {
        id: "prompt_pack",
        files: {
          master: relPathFromOutput(promptFiles.master),
          quickstart: relPathFromOutput(promptFiles.quickstart),
          comprehensive: relPathFromOutput(promptFiles.comprehensive),
          qa: relPathFromOutput(promptFiles.qa),
        },
        purpose: "Reusable prompts for Codex or Claude regeneration.",
      },
    },
    manifests: {
      workflow_manifest_path: workflowManifestPath,
      user_manifest_path: userManifestPath,
      workflow_steps: workflowManifest.map((item) => ({ step: item.step, title: item.title })),
      user_steps: userManifest.map((item) => ({ step: item.step, title: item.title })),
    },
    proof_map: proofMap,
    provider_map: providerMap,
    contracts: {
      package_spec_path: packageSpecPath,
      prompt_contract_inputs: {
        brand_assets_path: logosSourceRoot,
        workflow_manifest_path: workflowManifestPath,
        user_manifest_path: userManifestPath,
        output_root: outputRoot,
        voice_profile: packageConfig.voice_profile,
        cta_profile: packageConfig.cta_profile,
      },
      required_fields: [
        "audience",
        "primary_goal",
        "claims_mode",
        "narrative_style",
        "asset_set",
        "proof_map",
        "provider_map",
      ],
    },
    brand: {
      approved_logo_path: logosSourceRoot,
      approved_logos: approvedLogos,
      color_tokens: brandTokens,
    },
  };
}

function buildReadme(spec) {
  return `# SourceKit Marketing Package\n\n## Build\n\n\`\`\`bash\nnode docs/generate-sourcekit-marketing-package.mjs\nnode docs/validate-sourcekit-marketing-package.mjs\n\`\`\`\n\n## Primary Outputs\n- ${spec.asset_set.landing.html}\n- ${spec.asset_set.landing.pdf}\n- ${spec.asset_set.quickstart.html}\n- ${spec.asset_set.quickstart.pdf}\n- ${spec.asset_set.comprehensive.html}\n- ${spec.asset_set.comprehensive.pdf}\n- ${spec.asset_set.workflow_explainer.html}\n- ${spec.asset_set.workflow_explainer.pdf}\n\n## Contracts\n- package spec: ${relPathFromOutput(packageSpecPath)}\n- prompt pack: ${relPathFromOutput(outputPromptRoot)}\n\n## Goal\n- audience: ${spec.audience}\n- primary_goal: ${spec.primary_goal}\n- claims_mode: ${spec.claims_mode}\n- narrative_style: ${spec.narrative_style}\n`;
}

async function writeHtmlAssets(htmlByPath) {
  await Promise.all(
    Object.entries(htmlByPath).map(async ([filePath, html]) => {
      await fs.writeFile(filePath, html, "utf8");
    }),
  );
}

async function writePromptPack(pack) {
  await Promise.all([
    fs.writeFile(promptFiles.master, pack.master, "utf8"),
    fs.writeFile(promptFiles.quickstart, pack.quickstart, "utf8"),
    fs.writeFile(promptFiles.comprehensive, pack.comprehensive, "utf8"),
    fs.writeFile(promptFiles.qa, pack.qa, "utf8"),
  ]);
}

async function exportPdf(browser, htmlPath, pdfPath) {
  const page = await browser.newPage();
  try {
    await page.goto(`file://${htmlPath}`, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));

    await page.pdf({
      path: pdfPath,
      format: "letter",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `
        <div style="width:100%;font-size:10px;color:#4b5e79;padding:0 24px;text-align:right;font-family:'DM Sans',Arial,sans-serif;">
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
  } finally {
    await page.close();
  }
}

async function exportAllPdfs() {
  const browser = await puppeteer.launch({ headless: "new" });
  try {
    await exportPdf(browser, assets.landing.html, assets.landing.pdf);
    await exportPdf(browser, assets.quickstart.html, assets.quickstart.pdf);
    await exportPdf(browser, assets.comprehensive.html, assets.comprehensive.pdf);
    await exportPdf(browser, assets.workflowExplainer.html, assets.workflowExplainer.pdf);
  } finally {
    await browser.close();
  }
}

async function run() {
  await ensureDirs();

  const workflowManifestRaw = await loadManifest(workflowManifestPath);
  const userManifestRaw = await loadManifest(userManifestPath);

  await copyLogos();
  const { workflowMap, userMap } = await copyScreenshots(workflowManifestRaw, userManifestRaw);

  const proofMap = buildProofMap(userMap, workflowMap);
  const spec = buildPackageSpec({ workflowManifest: workflowMap, userManifest: userMap, proofMap });
  const promptPack = buildPromptPack(spec);

  const htmlByPath = {
    [assets.landing.html]: renderLanding({ workflowManifest: workflowMap }),
    [assets.quickstart.html]: renderQuickstart({ userManifest: userMap }),
    [assets.comprehensive.html]: renderComprehensive({ userManifest: userMap, workflowManifest: workflowMap }),
    [assets.workflowExplainer.html]: renderWorkflowExplainer({ workflowManifest: workflowMap }),
  };

  await writeHtmlAssets(htmlByPath);
  await writePromptPack(promptPack);
  await fs.writeFile(packageSpecPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
  await fs.writeFile(readmePath, buildReadme(spec), "utf8");

  await exportAllPdfs();

  console.log("Generated marketing package:");
  console.log(`- ${assets.landing.html}`);
  console.log(`- ${assets.landing.pdf}`);
  console.log(`- ${assets.quickstart.html}`);
  console.log(`- ${assets.quickstart.pdf}`);
  console.log(`- ${assets.comprehensive.html}`);
  console.log(`- ${assets.comprehensive.pdf}`);
  console.log(`- ${assets.workflowExplainer.html}`);
  console.log(`- ${assets.workflowExplainer.pdf}`);
  console.log(`- ${packageSpecPath}`);
  console.log(`- ${outputPromptRoot}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
