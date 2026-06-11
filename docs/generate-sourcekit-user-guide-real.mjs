import fs from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const guideHtmlPath = join(__dirname, "sourcekit-user-guide.html");
const guidePdfPath = join(__dirname, "sourcekit-user-guide.pdf");
const userGuideOutputPdf = join(__dirname, "..", "output", "pdf", "sourcekit-user-guide.pdf");
const userGuideScreenshotDir = join(__dirname, "..", "output", "guide-screenshots", "user-guide");
const userGuideScreenshotHtmlBase = "../output/guide-screenshots/user-guide";
const userGuideScreenshotManifest = join(userGuideScreenshotDir, "screenshot-manifest.json");
const LOGO_BASE = "../../docs/assets/logos";
const SHOT_SOURCE_DIR = join(__dirname, "..", "tmp", "screenshots-real");
const VERSION_DATE = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
}).format(new Date());

const steps = [
  {
    number: 1,
    title: "Open SourceKit and sign in",
    action: "Go to <code>getsourcekit.vercel.app</code> and authenticate with your approved Google account.",
    expectation: "You should see the SourceKit login screen and then your recruiter workspace after sign-in.",
    image: "00-login-current-brand-example-crop.png",
    assetName: "step-01-sign-in.png",
    target: "SourceKit sign-in screen in Chrome.",
    focusArea: "Branding, auth form, and primary sign-in call to action.",
    calloutType: "tip",
    calloutTitle: "Tip",
    calloutText: "Use the same work account every time so your saved searches and settings persist.",
  },
  {
    number: 2,
    title: "Open New Search workspace",
    action: "Select <code>New Search</code> to start from role and company context before running discovery.",
    expectation: "You should see the Research & Strategy screen with role input fields and quick templates.",
    image: "20-new-search-tab.png",
    assetName: "step-02-new-search.png",
    target: "Recruiter dashboard after opening New Search.",
    focusArea: "Left navigation, role inputs, and quick-template area.",
    calloutType: "tip",
    calloutTitle: "Tip",
    calloutText: "Role-first setup is the fastest path for specialized technical hiring.",
  },
  {
    number: 3,
    title: "Set role and company",
    action: "Choose the Anthropic quick template to prefill role and company details.",
    expectation: "You should see <code>Staff ML Engineer</code> and <code>Anthropic</code> in the Role + Company fields.",
    image: "02-anthropic-prefill.png",
    assetName: "step-03-role-company.png",
    target: "Research & Strategy form with Anthropic quick template applied.",
    focusArea: "Prefilled role and company fields with surrounding context.",
    calloutType: "tip",
    calloutTitle: "Tip",
    calloutText: "Edit both fields if needed before strategy generation starts.",
  },
  {
    number: 4,
    title: "Build sourcing strategy",
    action: "Click <code>Build Sourcing Strategy</code> to generate targeting guidance from your role context.",
    expectation: "You should see strategy progress items such as target repositories and competitor mapping.",
    image: "21-strategy-building-anthropic.png",
    assetName: "step-04-build-strategy.png",
    target: "Research & Strategy screen during strategy generation.",
    focusArea: "Progress module and generated targeting signals.",
    calloutType: "tip",
    calloutTitle: "Best practice",
    calloutText: "Use this output to seed target companies, repo names, and skills in your search query.",
  },
  {
    number: 5,
    title: "Define target companies and repos in query",
    action: "Open <code>Results</code> and write a technical query with company targets and repository signals.",
    expectation: "You should see your query in the search bar while ranked results remain visible below.",
    image: "38-results-target-query-short.png",
    assetName: "step-05-query.png",
    target: "Results tab with query text populated from strategy notes.",
    focusArea: "Search query plus first rows of ranked results.",
    calloutType: "warning",
    calloutTitle: "Best practice",
    calloutText: "Keep company targets short and list concrete repo ecosystems such as <code>PyTorch</code>, <code>vLLM</code>, and <code>Ray</code>.",
  },
  {
    number: 6,
    title: "Run search and monitor progress",
    action: "Click <code>Search</code> and wait while SourceKit parses repositories, enriches profiles, and scores candidates.",
    expectation: "You should see live status lines and loading cards until ranking finishes.",
    image: "07-search-progress-real.png",
    assetName: "step-06-search-progress.png",
    target: "Results screen while the search is actively running.",
    focusArea: "Progress states and loading cards that explain the current stage.",
    calloutType: "tip",
    calloutTitle: "Tip",
    calloutText: "Do not change filters until scoring completes to avoid rework.",
  },
  {
    number: 7,
    title: "Handle no-results searches",
    action: "If your query is too narrow, read the built-in tips and adjust company or repository constraints.",
    expectation: "You should see the <code>No engineers found</code> guidance with concrete ways to broaden search.",
    image: "27-results-ranked-targeted.png",
    assetName: "step-07-broaden.png",
    target: "Results state that shows how to recover from an over-targeted search.",
    focusArea: "Guidance text, broadened targeting, and visible results context.",
    calloutType: "warning",
    calloutTitle: "Common issue",
    calloutText: "Remove one or two company constraints first, then rerun with repository names still intact.",
  },
  {
    number: 8,
    title: "Open completed runs in History",
    action: "Go to <code>History</code> and select the completed sourcing run you want to review.",
    expectation: "You should see recent runs with timestamps and engineer count.",
    image: "33-history-list.png",
    assetName: "step-08-history.png",
    target: "History tab with completed search runs listed.",
    focusArea: "Recent runs, timestamps, and result counts.",
    calloutType: "tip",
    calloutTitle: "Tip",
    calloutText: "Completed webset-backed runs appear here as well, so this is the fastest place to reopen results.",
  },
  {
    number: 9,
    title: "Review ranked candidate pipeline",
    action: "Open the run from History to load the ranked candidate list in <code>Results</code>.",
    expectation: "You should see scored engineer cards with repository evidence, language signals, and quick actions.",
    image: "34-history-rerun-results.png",
    assetName: "step-09-ranked-results.png",
    target: "Completed ranked result list loaded from History.",
    focusArea: "Candidate cards, scores, and visible evidence snippets.",
    calloutType: "warning",
    calloutTitle: "Score meaning",
    calloutText: "The score measures verifiable GitHub output and is not a substitute for interviews.",
  },
  {
    number: 10,
    title: "Review query details before action",
    action: "Expand <code>Query details</code> to verify the exact search text and parsed criteria.",
    expectation: "You should see the expanded query panel directly above ranked results.",
    image: "35-query-details-expanded.png",
    assetName: "step-10-query-details.png",
    target: "Expanded query details panel in Results.",
    focusArea: "Parsed criteria, exact query text, and relationship to ranked results.",
    calloutType: "tip",
    calloutTitle: "Best practice",
    calloutText: "Confirm parsed criteria before exporting so the final slate matches your role brief.",
  },
  {
    number: 11,
    title: "Inspect an individual candidate profile",
    action: "Click a candidate card to open the profile side panel.",
    expectation: "You should see summary, EEA breakdown, notable work, and outreach tools in one panel.",
    image: "31-candidate-profile-history.png",
    assetName: "step-11-candidate-profile.png",
    target: "Candidate profile side panel opened from the results list.",
    focusArea: "Summary, EEA breakdown, notable work, and outreach actions.",
    calloutType: "tip",
    calloutTitle: "Tip",
    calloutText: "Use EEA and repo evidence directly in personalized outreach.",
  },
  {
    number: 12,
    title: "Open Websets from strategy workflow",
    action: "Navigate to <code>Websets</code> to turn your strategy into a reusable sourcing definition.",
    expectation: "You should see the Create Webset form with search query, criteria, and enrichment sections.",
    image: "22-websets-start.png",
    assetName: "step-12-websets-start.png",
    target: "Websets tab before filling the reusable sourcing definition.",
    focusArea: "Create Webset form structure and the top of the builder.",
    calloutType: "tip",
    calloutTitle: "Tip",
    calloutText: "Websets are best for recurring roles with stable technical criteria.",
  },
  {
    number: 13,
    title: "Create webset criteria from sourcing strategy",
    action: "Add criteria for target companies, repository signals, and enrichment fields from your strategy notes.",
    expectation: "You should see a complete Webset definition ready for creation.",
    image: "23-webset-criteria-targets.png",
    assetName: "step-13-webset-criteria.png",
    target: "Filled Webset builder with sourcing logic translated into criteria.",
    focusArea: "Criteria content, enrichment fields, and reusable definition inputs.",
    calloutType: "tip",
    calloutTitle: "Best practice",
    calloutText: "Use criteria that describe evidence, such as concrete repo contribution patterns or infrastructure ownership.",
  },
  {
    number: 14,
    title: "Submit Webset and watch completion status",
    action: "Click <code>Create Webset</code> and confirm whether the run is accepted or an error is shown.",
    expectation: "You should see either a success flow or a visible notification if creation fails.",
    image: "37-webset-submit-after-1s.png",
    assetName: "step-14-webset-submit.png",
    target: "Immediate Webset submission state after clicking Create Webset.",
    focusArea: "Submission feedback and visible success or failure messaging.",
    calloutType: "warning",
    calloutTitle: "Common issue",
    calloutText: "If you see <code>Failed to fetch</code>, verify provider keys and retry before checking History for results.",
  },
  {
    number: 15,
    title: "Export candidate output",
    action: "From Results, open <code>Export</code> and choose CSV or JSON for handoff.",
    expectation: "You should see export options available directly from the ranked list.",
    image: "17-export-menu-real.png",
    assetName: "step-15-export.png",
    target: "Results screen with export controls visible.",
    focusArea: "Export menu options alongside the shortlist context.",
    calloutType: "tip",
    calloutTitle: "Tip",
    calloutText: "Finalize filters before export so recruiter handoff stays focused.",
  },
];

async function prepareGuideScreenshots() {
  await fs.mkdir(userGuideScreenshotDir, { recursive: true });

  const manifest = steps.map((step) => ({
    step: step.number,
    title: step.title,
    target: step.target,
    focusArea: step.focusArea,
    sourcePath: join(SHOT_SOURCE_DIR, step.image),
    outputPath: join(userGuideScreenshotDir, step.assetName),
    htmlPath: `${userGuideScreenshotHtmlBase}/${step.assetName}`,
  }));

  await Promise.all(
    manifest.map(async (item) => {
      await fs.copyFile(item.sourcePath, item.outputPath);
    }),
  );

  await fs.writeFile(userGuideScreenshotManifest, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function buildGuideHtml() {
  const stepPages = steps
    .map(
      (step) => `
      <section class="page step-page">
        <h2>Step ${step.number}: ${step.title}</h2>
        <p class="line"><strong>Do this:</strong> ${step.action}</p>
        <p class="line"><strong>You should see:</strong> ${step.expectation}</p>
        <div class="capture-grid">
          <div class="capture-card">
            <div class="capture-label">Target</div>
            <p>${step.target}</p>
          </div>
          <div class="capture-card">
            <div class="capture-label">Area To Frame</div>
            <p>${step.focusArea}</p>
          </div>
          <div class="capture-card path">
            <div class="capture-label">Output Path</div>
            <p class="path-chip">${userGuideScreenshotHtmlBase}/${step.assetName}</p>
          </div>
        </div>
        <figure class="shot">
          <img src="${userGuideScreenshotHtmlBase}/${step.assetName}" alt="Step ${step.number} screenshot" />
          <figcaption>Live application screenshot.</figcaption>
        </figure>
        <div class="callout ${step.calloutType}">
          <div class="callout-title">${step.calloutTitle}</div>
          <p>${step.calloutText}</p>
        </div>
      </section>
    `,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SourceKit User Guide</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
    <style>
      :root {
        --bg: #c4cad6;
        --paper: #f6f8fc;
        --panel: #e9edf4;
        --panel-2: #dde5f0;
        --line: #c4ccda;
        --line-2: #b2bdcf;
        --text: #0f172a;
        --muted: #475569;
        --subtle: #5d6f89;
        --green: #00d5c1;
        --blue: #006ee6;
        --shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background:
          radial-gradient(900px 500px at -10% -20%, #eef4ff 0%, transparent 60%),
          radial-gradient(1200px 680px at 110% 0%, #d8fff8 0%, transparent 62%),
          linear-gradient(180deg, #d4dae5 0%, #c4cad6 100%);
        color: var(--text);
        font-family: "DM Sans", "Avenir Next", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .doc {
        width: 100%;
        margin: 0;
      }
      .page {
        background: linear-gradient(180deg, var(--panel) 0%, var(--paper) 100%);
        border: 1px solid var(--line);
        border-radius: 18px;
        margin: 10px;
        padding: 20px 16px 24px;
        page-break-after: always;
        break-after: page;
        box-shadow: var(--shadow);
        position: relative;
      }
      .page:last-child {
        page-break-after: auto;
        break-after: auto;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 34px;
        line-height: 1.1;
      }
      h2 {
        margin: 0 0 12px;
        font-size: 24px;
        line-height: 1.2;
      }
      h3 {
        margin: 18px 0 8px;
        font-size: 17px;
      }
      p {
        margin: 0 0 10px;
        color: var(--muted);
        line-height: 1.5;
        font-size: 14px;
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
        min-height: 8.4in;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 18px;
        background:
          linear-gradient(145deg, #eef4ff 0%, #dce6f7 45%, #d0d9e9 100%);
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
      .cover-logo {
        height: 52px;
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
        width: fit-content;
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
      .subtitle {
        font-size: 18px;
        color: var(--muted);
        margin: 0 0 24px;
      }
      .meta p {
        margin: 0 0 8px;
        font-size: 14px;
      }
      .meta strong {
        display: inline-block;
        width: 110px;
        color: var(--text);
      }
      ul {
        margin: 0 0 14px;
        padding-left: 18px;
        color: var(--muted);
      }
      li {
        margin-bottom: 8px;
        font-size: 14px;
        line-height: 1.45;
      }
      .line strong {
        color: var(--text);
      }
      .shot {
        margin: 14px 0 12px;
      }
      .shot img {
        width: 100%;
        height: 334px;
        object-fit: contain;
        object-position: top left;
        display: block;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(240, 246, 255, 0.9) 100%);
        border: 1px solid var(--line-2);
        border-radius: 12px;
        box-shadow: var(--shadow);
        padding: 12px;
      }
      .shot figcaption {
        margin-top: 6px;
        color: var(--subtle);
        font-size: 12px;
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
        color: var(--text);
        word-break: break-all;
      }
      .callout {
        border: 1px solid;
        border-radius: 10px;
        padding: 10px 12px;
      }
      .callout.tip {
        background: rgba(0, 213, 193, 0.1);
        border-color: rgba(0, 213, 193, 0.35);
      }
      .callout.warning {
        background: rgba(249, 115, 22, 0.1);
        border-color: rgba(249, 115, 22, 0.3);
      }
      .callout-title {
        font-weight: 700;
        font-size: 13px;
        color: var(--text);
        margin-bottom: 4px;
      }
      .callout p {
        margin: 0;
        color: var(--muted);
        font-size: 13px;
      }
      .troubleshooting {
        border: 1px solid var(--line);
        border-radius: 12px;
        overflow: hidden;
        background: var(--panel-2);
      }
      .issue-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        border-top: 1px solid var(--line);
      }
      .issue-row:first-child {
        border-top: 0;
      }
      .issue-row > div {
        padding: 12px;
        font-size: 13px;
        line-height: 1.45;
      }
      .issue-head > div {
        background: linear-gradient(180deg, #e5ecf7 0%, #dde6f2 100%);
        color: var(--text);
        font-weight: 700;
      }
      .issue-row > div:first-child {
        background: var(--panel);
        font-weight: 600;
        color: var(--text);
      }
    </style>
  </head>
  <body>
    <main class="doc">
      <section class="page cover">
        <img src="${LOGO_BASE}/sourcekit-full.svg" alt="SourceKit" class="cover-logo" />
        <div class="pill">Version ${VERSION_DATE}</div>
        <h1>SourceKit User Guide</h1>
        <p class="subtitle">Evidence-based technical talent discovery</p>
        <div class="cover-grid">
          <div class="mini-card meta">
            <p><strong>URL</strong> <code>getsourcekit.vercel.app</code></p>
            <p><strong>Version date</strong> ${VERSION_DATE}</p>
            <p><strong>Scenario</strong> ML Engineer at Anthropic + Websets workflow</p>
          </div>
          <div class="mini-card">
            <h3>Provider stack</h3>
            <div class="logo-strip">
              <div class="logo-chip"><img src="${LOGO_BASE}/exa-full.svg" alt="Exa" /></div>
              <div class="logo-chip"><img src="${LOGO_BASE}/parallel-full.svg" alt="Parallel" /></div>
              <div class="logo-chip"><img src="${LOGO_BASE}/github-full.svg" alt="GitHub" /></div>
              <div class="logo-chip"><img src="${LOGO_BASE}/claude-full.svg" alt="Claude" /></div>
              <div class="logo-chip"><img src="${LOGO_BASE}/harmonic-full.svg" alt="Harmonic" /></div>
            </div>
          </div>
        </div>
      </section>

      <section class="page">
        <h2>What You Need Before You Start</h2>
        <h3>Browser</h3>
        <ul>
          <li>Use Google Chrome for consistent login and capture behavior.</li>
        </ul>
        <h3>Account access</h3>
        <ul>
          <li>Use an approved SourceKit account with search permissions.</li>
          <li>Ensure search quota and external provider keys are active.</li>
        </ul>
        <h3>Have these details ready</h3>
        <ul>
          <li>Role context: <code>ML Engineer</code> + target company <code>Anthropic</code>.</li>
          <li>Target-company shortlist (for example: Anthropic, OpenAI, DeepMind, Stripe, Datadog).</li>
          <li>Target-repository signals (for example: PyTorch, vLLM, Ray, model serving, distributed training).</li>
          <li>Webset criteria text for reusable recurring sourcing workflows.</li>
        </ul>
      </section>

      ${stepPages}

      <section class="page">
        <h2>Troubleshooting</h2>
        <div class="troubleshooting">
          <div class="issue-row">
            <div>Strategy build remains in progress</div>
            <div>Continue in Results tab and refine with query, repo signals, and filters while strategy service recovers.</div>
          </div>
          <div class="issue-row">
            <div>No engineers found</div>
            <div>Broaden the query by removing one or two company constraints and keeping technical repo signals.</div>
          </div>
          <div class="issue-row">
            <div>Webset create shows Failed to fetch</div>
            <div>Check provider keys and account limits, then retry from the same saved criteria.</div>
          </div>
          <div class="issue-row">
            <div>Completed run not visible in Results</div>
            <div>Open History and select the completed run entry to reload ranked candidates.</div>
          </div>
          <div class="issue-row">
            <div>Export disabled or empty</div>
            <div>Confirm results are loaded and active filters are not removing all rows.</div>
          </div>
        </div>
      </section>
    </main>
  </body>
</html>`;
}

async function generateGuide() {
  await prepareGuideScreenshots();
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

  await fs.mkdir(join(__dirname, "..", "output", "pdf"), { recursive: true });
  await fs.copyFile(guidePdfPath, userGuideOutputPdf);

  console.log("Generated:");
  console.log(`- ${guideHtmlPath}`);
  console.log(`- ${guidePdfPath}`);
  console.log(`- ${userGuideOutputPdf}`);
  console.log(`- ${userGuideScreenshotManifest}`);
}

generateGuide().catch((error) => {
  console.error(error);
  process.exit(1);
});
