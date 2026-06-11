import puppeteer from "puppeteer";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const outputPdfDir = join(repoRoot, "output", "pdf");
const guideHtmlPath = join(__dirname, "sellkit-two-page-guide.html");
const guidePdfPath = join(__dirname, "sellkit-two-page-guide.pdf");
const outputGuidePdfPath = join(outputPdfDir, "sellkit-two-page-guide.pdf");
const generatedAt = new Date().toLocaleDateString("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function buildGuideHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SellKit Two-Page Quick Start</title>
  <style>
    @page { size: letter; margin: 0.32in; }
    :root {
      --ink: #102129;
      --muted: #52686f;
      --line: #c5d3d6;
      --surface: #f7fbfa;
      --paper: #e7eeee;
      --teal: #0f766e;
      --teal-dark: #08383e;
      --amber: #b45309;
      --blue: #2563eb;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      background: var(--paper);
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.34;
    }
    main {
      max-width: 980px;
      margin: 0 auto;
      padding: 18px;
    }
    .page {
      min-height: 10.1in;
      page-break-after: always;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: rgba(248,251,250,0.92);
      box-shadow: 0 18px 50px rgba(16,33,41,0.12);
      padding: 22px;
      overflow: hidden;
    }
    .page:last-child { page-break-after: auto; }
    .hero {
      border-radius: 16px;
      padding: 22px;
      color: #ecfeff;
      background: linear-gradient(135deg, #0b1824, #0d3d44 56%, #0f766e);
    }
    .kicker {
      margin: 0 0 8px;
      color: #99f6e4;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.15em;
      text-transform: uppercase;
    }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 34px; line-height: 1.02; }
    h2 { margin-top: 16px; font-size: 18px; line-height: 1.08; }
    h3 { font-size: 14px; }
    .hero p { margin-top: 8px; max-width: 760px; color: #cde7e7; font-size: 14px; }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }
    .pill {
      border: 1px solid rgba(236,253,245,0.24);
      border-radius: 999px;
      padding: 6px 9px;
      background: rgba(236,253,245,0.1);
      color: #ecfeff;
      font-size: 11px;
      font-weight: 700;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-top: 12px;
    }
    .panel {
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 12px;
      background: rgba(255,255,255,0.62);
    }
    .panel h2:first-child { margin-top: 0; }
    ul, ol {
      margin: 8px 0 0 18px;
      padding: 0;
    }
    li { margin: 5px 0; font-size: 12.4px; }
    strong { color: var(--teal-dark); }
    .checklist {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    .check {
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 9px;
      min-height: 72px;
      background: #ffffff;
      font-size: 12px;
    }
    .check strong {
      display: block;
      margin-bottom: 4px;
      font-size: 12px;
    }
    .callouts {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-top: 12px;
    }
    .callout {
      border-left: 4px solid var(--teal);
      border-radius: 10px;
      padding: 10px;
      background: #ecfdf5;
      font-size: 12px;
    }
    .callout.warning {
      border-left-color: var(--amber);
      background: #fff7ed;
    }
    .shots {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-top: 12px;
    }
    figure {
      margin: 0;
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 7px;
      background: #ffffff;
      overflow: hidden;
    }
    img {
      display: block;
      width: 100%;
      height: 116px;
      border-radius: 8px;
      border: 1px solid #d5e0e2;
      object-fit: cover;
      object-position: top left;
    }
    figcaption {
      margin-top: 5px;
      color: var(--muted);
      font-size: 10.5px;
    }
    .provider {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      font-size: 10.85px;
    }
    .provider th,
    .provider td {
      border: 1px solid var(--line);
      padding: 7px;
      text-align: left;
      vertical-align: top;
    }
    .provider th {
      background: #e6f3f1;
      color: var(--teal-dark);
      font-size: 10px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .provider td { background: rgba(255,255,255,0.62); }
    .two-col {
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      gap: 12px;
      margin-top: 12px;
    }
    .small { color: var(--muted); font-size: 11px; }
    a { color: var(--teal-dark); font-weight: 700; }
    @media print {
      body { background: #ffffff; }
      main { max-width: none; padding: 0; }
      .page {
        min-height: auto;
        border: 0;
        border-radius: 0;
        box-shadow: none;
        padding: 0;
      }
    }
    @media screen and (max-width: 760px) {
      main { padding: 10px; }
      .page {
        min-height: 0;
        padding: 14px;
        border-radius: 14px;
        page-break-after: auto;
        margin-bottom: 14px;
      }
      .hero { padding: 18px; }
      h1 { font-size: 28px; }
      .grid,
      .checklist,
      .callouts,
      .shots,
      .two-col {
        grid-template-columns: 1fr;
      }
      .provider thead { display: none; }
      .provider,
      .provider tbody,
      .provider tr,
      .provider td {
        display: block;
        width: 100%;
      }
      .provider tr {
        border: 1px solid var(--line);
        border-radius: 12px;
        margin-bottom: 10px;
        overflow: hidden;
        background: #ffffff;
      }
      .provider td {
        display: grid;
        grid-template-columns: 92px minmax(0, 1fr);
        gap: 10px;
        border: 0;
        border-bottom: 1px solid var(--line);
        font-size: 13px;
      }
      .provider td:last-child { border-bottom: 0; }
      .provider td::before {
        content: attr(data-label);
        color: var(--teal-dark);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      img { height: auto; }
    }
  </style>
</head>
<body>
  <main>
    <section class="page">
      <div class="hero">
        <p class="kicker">SellKit quick start</p>
        <h1>Two-Page Guide for Mariah</h1>
        <p>Use SellKit to review signal-backed account and buyer recommendations, approve manual outreach drafts, and export rows. Nothing sends automatically.</p>
        <div class="meta">
          <span class="pill">Audience: Mariah Rubino</span>
          <span class="pill">Mode: manual-first</span>
          <span class="pill">Generated: ${generatedAt}</span>
        </div>
      </div>

      <div class="grid">
        <div class="panel">
          <h2>What SellKit Does</h2>
          <ul>
            <li>Finds target accounts and likely buyers using sourcing signals.</li>
            <li>Shows evidence for score, title fit, account fit, and email confidence.</li>
            <li>Prepares manual email copy, a LinkedIn note, and CRM-ready export rows.</li>
          </ul>
        </div>
        <div class="panel">
          <h2>Before First Use</h2>
          <ul>
            <li>Use the approved work account.</li>
            <li>Confirm external enrichment tools are allowed.</li>
            <li>Keep Microsoft, Salesforce, and LinkedIn manual until policy approves direct access.</li>
          </ul>
        </div>
      </div>

      <h2>First-Time Onboarding: Answer These Five</h2>
      <div class="checklist">
        <div class="check"><strong>Target company</strong>Size, stage, geography, industries in/out.</div>
        <div class="check"><strong>Buyer titles</strong>Strong yes titles and close-but-no titles.</div>
        <div class="check"><strong>Offer line</strong>What she sells in one plain sentence.</div>
        <div class="check"><strong>Buying signals</strong>Rank triggers and define what good looks like.</div>
        <div class="check"><strong>Email voice</strong>Examples, subject style, length, and tone.</div>
      </div>

      <div class="two-col">
        <div class="panel">
          <h2>Daily Review Flow</h2>
          <ol>
            <li>Sign in and open <strong>/sellkit</strong>.</li>
            <li>Pick the highest-scored target in the review queue.</li>
            <li>Check account fit, buyer title, signal evidence, and email confidence.</li>
            <li>Review the buying committee and why-now reasoning.</li>
            <li>Edit the draft if needed.</li>
            <li>Approve only when the copy and evidence look right.</li>
          </ol>
        </div>
        <div class="panel">
          <h2>Approval Rules</h2>
          <div class="callouts">
            <div class="callout"><strong>No automatic send.</strong><br />Copy and export stay human-approved.</div>
            <div class="callout"><strong>Manual CRM.</strong><br />Export CSV rows until Salesforce access is approved.</div>
            <div class="callout warning"><strong>No LinkedIn automation.</strong><br />Use profile links and notes by hand.</div>
          </div>
        </div>
      </div>

      <div class="shots">
        <figure>
          <img src="../output/guide-screenshots/sellkit/02-onboarding.png" alt="SellKit onboarding screen" />
          <figcaption><strong>Onboarding.</strong> These answers tune target fit, signals, scoring, and draft voice.</figcaption>
        </figure>
        <figure>
          <img src="../output/guide-screenshots/sellkit/04-committee-and-evidence.png" alt="SellKit committee and evidence screen" />
          <figcaption><strong>Review.</strong> Read committee, evidence, score factors, and draft before approval.</figcaption>
        </figure>
      </div>
    </section>

    <section class="page">
      <h1>Provider Roles and Guardrails</h1>
      <p class="small">Use providers as stages in one workflow, not substitutes. Start broad, verify evidence, enrich only after scoring, and keep every send manual.</p>

      <table class="provider">
        <thead>
          <tr>
            <th>Stage</th>
            <th>Provider</th>
            <th>Use It For</th>
            <th>Guardrail</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td data-label="Stage">Account discovery</td>
            <td data-label="Provider">Exa Company Search</td>
            <td data-label="Use">ICP-matched company lists by industry, headcount, geography, funding stage, and technology.</td>
            <td data-label="Guardrail">Use company category, highlights, and structured metadata.</td>
          </tr>
          <tr>
            <td data-label="Stage">Buyer discovery</td>
            <td data-label="Provider">Exa People Search</td>
            <td data-label="Use">Likely buyers, public profiles, current roles, location, and career context.</td>
            <td data-label="Guardrail">Run query variations and dedupe. Exa is not verified email.</td>
          </tr>
          <tr>
            <td data-label="Stage">Fast lookup</td>
            <td data-label="Provider">Parallel Entity Search</td>
            <td data-label="Use">Quick people/company results for natural-language tests.</td>
            <td data-label="Guardrail">Use for candidate sets, not final cited enrichment.</td>
          </tr>
          <tr>
            <td data-label="Stage">ICP preview</td>
            <td data-label="Provider">Parallel FindAll Preview</td>
            <td data-label="Use">Evaluate about 10 candidates before a full run.</td>
            <td data-label="Guardrail">Always preview first and tune match criteria.</td>
          </tr>
          <tr>
            <td data-label="Stage">List-building</td>
            <td data-label="Provider">Parallel FindAll or Exa Websets</td>
            <td data-label="Use">Verified async lists with reasoning, citations, enrichments, and webhooks.</td>
            <td data-label="Guardrail">Cap match limits and enrich only matched candidates.</td>
          </tr>
          <tr>
            <td data-label="Stage">Account dossier</td>
            <td data-label="Provider">Exa Agent or Parallel Task</td>
            <td data-label="Use">Buying committee, why-now, initiatives, objections, and talking points.</td>
            <td data-label="Guardrail">Use bounded JSON and require source URLs.</td>
          </tr>
          <tr>
            <td data-label="Stage">Contact enrichment</td>
            <td data-label="Provider">Apollo</td>
            <td data-label="Use">Verified work email and company/person enrichment after scoring.</td>
            <td data-label="Guardrail">Batch in groups of 10. Avoid phone/personal email by default.</td>
          </tr>
          <tr>
            <td data-label="Stage">Fallback review</td>
            <td data-label="Provider">Clay</td>
            <td data-label="Use">Spreadsheet-style human enrichment queues for ambiguous rows.</td>
            <td data-label="Guardrail">Test one row, set rate limits, return only needed fields.</td>
          </tr>
        </tbody>
      </table>

      <div class="grid">
        <div class="panel">
          <h2>Evidence-First Scoring</h2>
          <ul>
            <li><strong>Signal strength:</strong> link to source, date, excerpt, and why it matters.</li>
            <li><strong>Title fit:</strong> cite the profile or bio used to identify the buyer.</li>
            <li><strong>Company fit:</strong> cite metadata or source for size, industry, funding, or stack.</li>
            <li><strong>Email confidence:</strong> show Apollo status separately from the score.</li>
          </ul>
        </div>
        <div class="panel">
          <h2>Cost and Compliance Defaults</h2>
          <ul>
            <li>Cache provider responses by normalized query.</li>
            <li>Use Parallel Preview before full runs.</li>
            <li>Use Apollo only after score thresholds.</li>
            <li>Keep provider keys server-side.</li>
            <li>Store raw provider payloads separately from normalized rows.</li>
          </ul>
        </div>
      </div>

      <div class="panel">
        <h2>Useful Links</h2>
        <p class="small">
          Full guide: <a href="./sellkit-user-guide.html">sellkit-user-guide.html</a> |
          Exa: <a href="https://exa.ai/docs/reference/verticals/company">Company</a>,
          <a href="https://exa.ai/docs/reference/verticals/people">People</a>,
          <a href="https://exa.ai/docs/reference/agent-api-guide">Agent</a> |
          Parallel: <a href="https://docs.parallel.ai/findall-api/entity-search">Entity Search</a>,
          <a href="https://docs.parallel.ai/findall-api/features/findall-preview">FindAll Preview</a> |
          Apollo: <a href="https://docs.apollo.io/reference/people-enrichment">People Enrichment</a> |
          Clay: <a href="https://university.clay.com/docs/http-api-integration-overview">HTTP API</a>
        </p>
      </div>
    </section>
  </main>
</body>
</html>`;
}

async function renderPdf() {
  mkdirSync(outputPdfDir, { recursive: true });
  writeFileSync(guideHtmlPath, buildGuideHtml(), "utf8");

  const browser = await puppeteer.launch({ headless: "new" });
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(guideHtmlPath).href, { waitUntil: "networkidle0" });
    await page.pdf({
      path: guidePdfPath,
      format: "Letter",
      printBackground: true,
      margin: { top: "0.32in", right: "0.32in", bottom: "0.32in", left: "0.32in" },
    });
  } finally {
    await browser.close();
  }

  copyFileSync(guidePdfPath, outputGuidePdfPath);
}

await renderPdf();

console.log(JSON.stringify({
  guideHtmlPath,
  guidePdfPath,
  outputGuidePdfPath,
}, null, 2));
