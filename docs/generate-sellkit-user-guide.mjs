import puppeteer from "puppeteer";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const appUrl = process.env.SELLKIT_GUIDE_APP_URL || "https://sellkit-mu.vercel.app";
const appPath = process.env.SELLKIT_GUIDE_APP_PATH ?? "/";
const appHomeUrl = new URL(appPath, appUrl).toString().replace(/\/$/, "");
const screenshotDir = join(repoRoot, "output", "guide-screenshots", "sellkit");
const outputPdfDir = join(repoRoot, "output", "pdf");
const guideHtmlPath = join(__dirname, "sellkit-user-guide.html");
const guidePdfPath = join(__dirname, "sellkit-user-guide.pdf");
const outputGuidePdfPath = join(outputPdfDir, "sellkit-user-guide.pdf");
const skipScreenshots = process.env.SELLKIT_GUIDE_SKIP_SCREENSHOTS === "1";

const authStorageKey = "sb-iirwwadiedcbcrxpehog-auth-token";
const fakeSession = {
  access_token: "sellkit-guide-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: "sellkit-guide-refresh",
  user: {
    id: "sellkit-guide-user",
    aud: "authenticated",
    role: "authenticated",
    email: "mariah@example.com",
    app_metadata: { provider: "google", providers: ["google"] },
    user_metadata: { full_name: "Mariah Rubino" },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

const onboardingAnswers = {
  idealCompany: "Enterprise software companies with 1,000+ employees, US first, strong platform or data initiatives.",
  buyerTitles: "CTO, VP Engineering, VP IT, Head of Platform, Head of Data. Avoid junior ops and recruiters.",
  offerLine: "Expert operators and fractional consultants for urgent technical initiatives.",
  buyingSignals: "New leadership, senior hiring spike, expansion funding, product launch, platform initiative.",
  emailVoice: "Short, plain, direct. Mention the specific signal in the first sentence.",
};

const onboardingRow = {
  ideal_company: onboardingAnswers.idealCompany,
  buyer_titles: onboardingAnswers.buyerTitles,
  offer_line: onboardingAnswers.offerLine,
  buying_signals: onboardingAnswers.buyingSignals,
  email_voice: onboardingAnswers.emailVoice,
};

const screenshots = [
  {
    file: "01-sign-in.png",
    title: "Sign in to SellKit",
    caption: "SellKit has its own sign-in. Use the approved account and land back in the app after authentication.",
  },
  {
    file: "02-onboarding.png",
    title: "Complete Mariah onboarding",
    caption: "Answer the five setup questions, then click Save Progress. Answers save to the signed-in account and restore on any browser.",
  },
  {
    file: "03-signal-radar.png",
    title: "Review the Signal Radar",
    caption: "Fresh account signals wait here for review. Mariah marks each one Reviewed, adds it to the queue, or ignores it. Nothing runs automatically.",
  },
  {
    file: "04-icp-preview-lab.png",
    title: "Test an ICP in the Preview Lab",
    caption: "Describe an ICP and run a fast lookup or a capped 10-match preview before a broader list build.",
  },
  {
    file: "05-queue-and-providers.png",
    title: "Work the review queue",
    caption: "Targets arrive scored, with the provider stack (Exa, Parallel, Apollo, Clay) shown as stages above the queue.",
  },
  {
    file: "06-committee-and-evidence.png",
    title: "Inspect the buying committee",
    caption: "Five seats per account: primary buyer, champion, blocker, budget holder, and technical evaluator, each with a reason, initiative, source, and outreach angle.",
  },
  {
    file: "07-enrichment-and-approval.png",
    title: "Approve, enrich, and hand off manually",
    caption: "The enrichment gate stays blocked below a score of 75. Approval unlocks the manual email handoff, conversion tracking, and the CRM CSV export.",
  },
  {
    file: "08-conversion-learning.png",
    title: "Read the conversion learning dashboard",
    caption: "Signal-level and persona-level rates plus weekly Signal Discovery recommendations, all computed from what Mariah tracked by hand.",
  },
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function installFakeSession(page) {
  await page.evaluateOnNewDocument((key, session, answers, row) => {
    window.localStorage.setItem(key, JSON.stringify(session));
    window.localStorage.setItem("sellkit:onboarding:v1", JSON.stringify(answers));

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init = {}) => {
      const url = typeof input === "string" ? input : input?.url || "";
      if (url.includes("/rest/v1/sellkit_onboarding_profiles")) {
        const method = String(init.method || "GET").toUpperCase();
        return new Response(JSON.stringify(method === "GET" ? row : { ...row, user_id: session.user.id }), {
          status: method === "GET" ? 200 : 201,
          headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
          },
        });
      }

      // Radar items and conversion events: empty remote responses keep the
      // app on its deterministic demo data with no fallback toasts.
      if (url.includes("/rest/v1/bd_signal_radar_items") || url.includes("/rest/v1/bd_conversion_events")) {
        const method = String(init.method || "GET").toUpperCase();
        return new Response(method === "GET" ? "[]" : "{}", {
          status: method === "GET" ? 200 : 201,
          headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
          },
        });
      }

      return originalFetch(input, init);
    };
  }, authStorageKey, fakeSession, onboardingAnswers, onboardingRow);
}

async function createAuthedPage(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1040, deviceScaleFactor: 1 });
  await installFakeSession(page);
  await page.goto(appHomeUrl, { waitUntil: "networkidle0", timeout: 45000 });
  await page.waitForSelector(".sellkit-v2", { timeout: 15000 });
  return page;
}

async function clickButtonByText(page, text) {
  await page.evaluate((targetText) => {
    const button = [...document.querySelectorAll("button")]
      .find((candidate) => candidate.textContent?.includes(targetText));
    button?.click();
  }, text);
}

async function captureScreenshots() {
  mkdirSync(screenshotDir, { recursive: true });
  const browser = await puppeteer.launch({ headless: "new" });

  try {
    const authPage = await browser.newPage();
    await authPage.setViewport({ width: 1440, height: 980, deviceScaleFactor: 1 });
    await authPage.goto(appHomeUrl, { waitUntil: "networkidle0", timeout: 45000 });
    await authPage.screenshot({ path: join(screenshotDir, "01-sign-in.png") });
    await authPage.close();

    const scrollToText = async (page, pattern) => {
      await page.evaluate((source) => {
        const regex = new RegExp(source, "i");
        const match = [...document.querySelectorAll("h1, h2, h3, h4, p, span")]
          .find((el) => el.children.length === 0 && regex.test(el.textContent || ""));
        match?.scrollIntoView({ block: "start" });
      }, pattern);
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 400));
    };

    const onboardingPage = await createAuthedPage(browser);
    await clickButtonByText(onboardingPage, "Edit Onboarding");
    await onboardingPage.waitForSelector("#sellkit-offerLine", { timeout: 10000 }).catch(() => {});
    await onboardingPage.screenshot({ path: join(screenshotDir, "02-onboarding.png") });
    await onboardingPage.close();

    const radarPage = await createAuthedPage(browser);
    await scrollToText(radarPage, "Signal Radar");
    await radarPage.screenshot({ path: join(screenshotDir, "03-signal-radar.png") });
    await radarPage.close();

    const icpPage = await createAuthedPage(browser);
    await scrollToText(icpPage, "Test an ICP quickly");
    await icpPage.screenshot({ path: join(screenshotDir, "04-icp-preview-lab.png") });
    await icpPage.close();

    const providerPage = await createAuthedPage(browser);
    await scrollToText(providerPage, "Review queue");
    await providerPage.screenshot({ path: join(screenshotDir, "05-queue-and-providers.png") });
    await providerPage.close();

    const evidencePage = await createAuthedPage(browser);
    await scrollToText(evidencePage, "Buying Committee Map");
    await evidencePage.screenshot({ path: join(screenshotDir, "06-committee-and-evidence.png") });
    await evidencePage.close();

    const approvalPage = await createAuthedPage(browser);
    await clickButtonByText(approvalPage, "Approve Draft");
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 600));
    await scrollToText(approvalPage, "Apollo Enrichment Gate");
    await approvalPage.screenshot({ path: join(screenshotDir, "07-enrichment-and-approval.png") });
    await approvalPage.close();

    const learningPage = await createAuthedPage(browser);
    await scrollToText(learningPage, "Conversion learning");
    await learningPage.screenshot({ path: join(screenshotDir, "08-conversion-learning.png") });
    await learningPage.close();
  } finally {
    await browser.close();
  }
}

function screenshotFigure(shot) {
  // Inline as base64 so the HTML guide is fully self-contained for sharing.
  const imageData = readFileSync(join(screenshotDir, shot.file)).toString("base64");
  return `
    <figure>
      <img src="data:image/png;base64,${imageData}" alt="${escapeHtml(shot.title)}" />
      <figcaption><strong>${escapeHtml(shot.title)}.</strong> ${escapeHtml(shot.caption)}</figcaption>
    </figure>
  `;
}

function buildGuideHtml() {
  const generatedAt = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SellKit User Onboarding and Guide</title>
  <style>
    @page { margin: 0.55in; }
    :root {
      --brand-primary: #7C3AED;
      --brand-primary-hover: #6D28D9;
      --brand-dark: #10213A;
      --brand-slate: #415A77;
      --brand-muted: #A0AEC0;
      --brand-surface: #F1F3F2;
      --brand-background: #FAFBFC;
      --brand-white: #FFFFFF;
      --brand-border: #DCE3EC;
      --brand-success: #18C29C;
      --brand-warning: #F59E0B;
      --brand-error: #DC2626;
      --ink: var(--brand-dark);
      --muted: var(--brand-slate);
      --line: var(--brand-border);
      --surface: var(--brand-white);
      --paper: var(--brand-background);
      --accent: var(--brand-primary);
      --accent-dark: var(--brand-dark);
      --amber: var(--brand-warning);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      background: var(--paper);
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.52;
    }
    main {
      max-width: 1120px;
      margin: 0 auto;
      padding: 36px 24px 56px;
    }
    .cover {
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 32px;
      background: var(--brand-white);
      color: var(--ink);
      box-shadow: 0 24px 70px rgba(16,33,58,0.1);
    }
    .brand-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 22px;
    }
    .logo-mark {
      width: 42px;
      height: 42px;
      color: var(--brand-primary);
      flex: none;
    }
    .wordmark {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--brand-dark);
    }
    .wordmark span {
      color: var(--brand-primary);
    }
    .kicker {
      margin: 0 0 10px;
      color: var(--brand-primary);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }
    h1, h2, h3 { line-height: 1.12; margin: 0; }
    h1 { font-size: 42px; letter-spacing: -0.02em; }
    h2 { font-size: 24px; margin-top: 34px; }
    h3 { font-size: 18px; margin-top: 24px; }
    p { margin: 10px 0 0; }
    .cover p { color: var(--muted); max-width: 780px; }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 22px;
    }
    .pill {
      border: 1px solid rgba(124,58,237,0.2);
      border-radius: 999px;
      padding: 7px 11px;
      background: rgba(124,58,237,0.08);
      color: var(--brand-primary);
      font-size: 12px;
      font-weight: 700;
    }
    .card {
      border: 1px solid var(--line);
      border-radius: 14px;
      margin-top: 16px;
      padding: 18px;
      background: var(--brand-white);
      box-shadow: 0 12px 34px rgba(16,33,58,0.06);
    }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .section-lede {
      max-width: 880px;
      color: var(--muted);
      font-size: 15px;
    }
    .onboarding-panel {
      border: 1px solid var(--line);
      border-radius: 18px;
      margin-top: 18px;
      padding: 14px;
      background: var(--brand-surface);
    }
    .onboarding-rail {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 14px;
    }
    .rail-step {
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 10px;
      background: var(--brand-white);
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
    }
    .rail-step span {
      display: block;
      color: var(--brand-primary);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .onboarding-card {
      border: 1px solid var(--line);
      border-radius: 16px;
      margin-top: 10px;
      background: var(--brand-white);
      overflow: hidden;
      transition: border-color 180ms ease, transform 180ms ease, box-shadow 180ms ease;
    }
    .onboarding-card[open] {
      border-color: rgba(124,58,237,0.45);
      box-shadow: 0 18px 44px rgba(16,33,58,0.09);
    }
    .onboarding-card:hover {
      transform: translateY(-1px);
      border-color: rgba(124,58,237,0.45);
    }
    .onboarding-card summary {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: 14px;
      align-items: center;
      padding: 15px 16px;
      cursor: pointer;
      list-style: none;
    }
    .onboarding-card summary::-webkit-details-marker { display: none; }
    .step-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border-radius: 999px;
      background: var(--brand-primary);
      color: var(--brand-white);
      font-size: 15px;
      font-weight: 900;
    }
    .summary-copy strong {
      display: block;
      color: var(--ink);
      font-size: 18px;
    }
    .summary-copy span {
      display: block;
      margin-top: 4px;
      color: var(--muted);
      font-size: 13px;
    }
    .summary-icon {
      color: var(--accent-dark);
      font-size: 18px;
      font-weight: 900;
    }
    .onboarding-card[open] .summary-icon { transform: rotate(180deg); }
    .onboarding-body {
      border-top: 1px solid var(--line);
      padding: 16px;
      background: var(--brand-background);
    }
    .answer-grid {
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      gap: 14px;
    }
    .answer-block {
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 13px;
      background: var(--brand-white);
    }
    .answer-block h3 {
      margin-top: 0;
      color: var(--accent-dark);
      font-size: 14px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .answer-block p {
      color: var(--ink);
      font-size: 14px;
    }
    .chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      margin-top: 10px;
    }
    .chip {
      border: 1px solid rgba(124,58,237,0.25);
      border-radius: 999px;
      padding: 5px 8px;
      background: rgba(124,58,237,0.08);
      color: var(--brand-primary);
      font-size: 12px;
      font-weight: 700;
    }
    .sample-answer {
      border-left: 4px solid var(--accent);
      border-radius: 12px;
      margin-top: 12px;
      padding: 12px 13px;
      background: rgba(124,58,237,0.08);
      color: var(--ink);
      font-size: 14px;
    }
    .sample-answer strong {
      display: block;
      margin-bottom: 4px;
    }
    .avoid {
      border-left-color: var(--amber);
      background: #fff7ed;
    }
    .matrix {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
      font-size: 13px;
    }
    .matrix th,
    .matrix td {
      border: 1px solid var(--line);
      padding: 10px;
      text-align: left;
      vertical-align: top;
    }
    .matrix th {
      background: var(--brand-surface);
      color: var(--accent-dark);
      font-size: 12px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .matrix td {
      background: rgba(255,255,255,0.56);
    }
    ol, ul { margin: 12px 0 0 22px; padding: 0; }
    li { margin: 7px 0; }
    strong { color: var(--accent-dark); }
    a { color: var(--accent-dark); font-weight: 700; }
    code {
      border: 1px solid var(--line);
      border-radius: 7px;
      padding: 2px 5px;
      background: var(--brand-surface);
      color: var(--accent-dark);
      font-size: 0.92em;
    }
    figure {
      border: 1px solid var(--line);
      border-radius: 16px;
      margin: 18px 0 28px;
      padding: 10px;
      background: var(--surface);
      page-break-inside: avoid;
    }
    img {
      display: block;
      width: 100%;
      border-radius: 10px;
      border: 1px solid var(--line);
    }
    figcaption {
      color: var(--muted);
      font-size: 13px;
      margin: 10px 4px 2px;
    }
    .callout {
      border-left: 4px solid var(--accent);
      background: rgba(124,58,237,0.08);
      padding: 14px 16px;
      border-radius: 12px;
      margin-top: 16px;
    }
    .warning {
      border-left-color: var(--amber);
      background: #fff7ed;
    }
    .compact li { margin: 4px 0; }
    .small { color: var(--muted); font-size: 13px; }
    @media print {
      body { background: white; }
      main { padding: 0; }
      .card, figure, .cover { box-shadow: none; }
    }
    @media screen and (max-width: 760px) {
      main { padding: 16px 10px 34px; }
      .cover {
        border-radius: 14px;
        padding: 22px;
      }
      h1 { font-size: 30px; }
      h2 { font-size: 22px; margin-top: 24px; }
      h3 { font-size: 16px; margin-top: 18px; }
      .card {
        border-radius: 12px;
        margin-top: 12px;
        padding: 14px;
      }
      .grid,
      .onboarding-rail,
      .answer-grid {
        grid-template-columns: 1fr;
      }
      .onboarding-panel {
        border-radius: 14px;
        padding: 10px;
      }
      .onboarding-card summary {
        grid-template-columns: auto minmax(0, 1fr) auto;
        gap: 10px;
        padding: 13px 12px;
      }
      .step-number {
        width: 34px;
        height: 34px;
      }
      .summary-copy strong { font-size: 16px; }
      .onboarding-body { padding: 12px; }
      .matrix {
        border-collapse: separate;
        border-spacing: 0;
        font-size: 14px;
      }
      .matrix thead { display: none; }
      .matrix,
      .matrix tbody,
      .matrix tr,
      .matrix td {
        display: block;
        width: 100%;
      }
      .matrix tr {
        border: 1px solid var(--line);
        border-radius: 14px;
        margin-bottom: 12px;
        overflow: hidden;
        background: #ffffff;
      }
      .matrix td {
        display: grid;
        grid-template-columns: 96px minmax(0, 1fr);
        gap: 10px;
        border: 0;
        border-bottom: 1px solid var(--line);
        padding: 10px 12px;
        background: #ffffff;
      }
      .matrix td:last-child { border-bottom: 0; }
      .matrix td::before {
        content: attr(data-label);
        color: var(--accent-dark);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      figure {
        border-radius: 12px;
        margin: 14px 0 20px;
        padding: 7px;
      }
      .small code { word-break: break-word; }
    }
  </style>
</head>
<body>
  <main>
    <section class="cover">
      <div class="brand-row" aria-label="SellKit">
        <svg class="logo-mark" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M16.75 6.25H10a4.25 4.25 0 0 0 0 8.5h1.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M7.25 17.75H14a4.25 4.25 0 0 0 0-8.5h-1.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="wordmark">Sell<span>Kit</span></div>
      </div>
      <p class="kicker">SellKit onboarding</p>
      <h1>SellKit User Onboarding and Guide</h1>
      <p>The operating guide for Mariah Rubino: sign in, complete setup, review the Signal Radar, test ICPs quickly, work the scored queue with buying-committee context, approve manual outreach drafts, track conversions by hand, and let the dashboard learn which signals and personas actually convert. Nothing sends automatically.</p>
      <div class="meta">
        <span class="pill">Audience: Mariah Rubino</span>
        <span class="pill">Mode: manual-first</span>
        <span class="pill">Generated: ${escapeHtml(generatedAt)}</span>
      </div>
    </section>

    <section class="card">
      <h2>What SellKit Does</h2>
      <p>SellKit helps Mariah review account and buyer recommendations before outreach. One page combines six surfaces:</p>
      <ul>
        <li><strong>Signal Radar:</strong> fresh account signals (new leadership, hiring spikes, cloud efficiency pressure) waiting for a Review / Add to queue / Ignore decision.</li>
        <li><strong>ICP Preview Lab:</strong> type an ICP and test it with a fast lookup or a capped 10-match preview before a broader list build.</li>
        <li><strong>Review queue:</strong> scored targets with signal evidence, a five-seat buying committee map, and draft copy.</li>
        <li><strong>Enrichment gate:</strong> Apollo work-email enrichment unlocks only at score 75+, by manual click, with a visible batch cap.</li>
        <li><strong>Manual handoff:</strong> approved drafts become copyable email text, a downloadable .eml, and a CRM CSV. Nothing is sent or written for you.</li>
        <li><strong>Conversion learning:</strong> tracked outcomes roll up into signal-level and persona-level rates, and the Signal Discovery Agent suggests new signals to test each week.</li>
      </ul>
      <div class="callout">
        <strong>No automatic send.</strong> SellKit prepares drafts and exports. Mariah reviews and approves before anything is copied, downloaded, or imported elsewhere. No email, LinkedIn, Salesforce, or enrichment runs without a click.
      </div>
    </section>

    <section class="card">
      <h2>Before First Use</h2>
      <ul>
        <li>Use the approved work account to sign in.</li>
        <li>Confirm that external sourcing and enrichment tools are allowed under company policy.</li>
        <li>Keep provider keys server-side. Do not paste API keys into the browser or guide.</li>
        <li>Use manual email, manual CRM import, and manual LinkedIn steps until Microsoft, Salesforce, or LinkedIn access is approved.</li>
      </ul>
    </section>

    <section class="card">
      <h2>First-Time Onboarding</h2>
      <p class="section-lede">The onboarding panel opens automatically until all five questions are answered (use <code>Edit Onboarding</code> to reopen it later). Answer the questions, then click <code>Save Progress</code> — answers save to the signed-in account and restore on any browser. The goal is not a perfect spec. The goal is enough context for SellKit to recognize the right big-tech account, the right executive buyer, the right trigger, and the right expert-services angle.</p>
      <div class="onboarding-panel">
        <div class="onboarding-rail" aria-label="SellKit onboarding questions">
          <div class="rail-step"><span>01</span>Account fit</div>
          <div class="rail-step"><span>02</span>Buyer fit</div>
          <div class="rail-step"><span>03</span>Offer</div>
          <div class="rail-step"><span>04</span>Signals</div>
          <div class="rail-step"><span>05</span>Voice</div>
        </div>

        <details class="onboarding-card" open>
          <summary>
            <span class="step-number">1</span>
            <span class="summary-copy">
              <strong>Ideal target company</strong>
              <span>Describe the account where outside experts would be credible and timely.</span>
            </span>
            <span class="summary-icon">v</span>
          </summary>
          <div class="onboarding-body">
            <div class="answer-grid">
              <div class="answer-block">
                <h3>What to say</h3>
                <p>Use size, maturity, function, geography, and transformation context. For expert services, fit is usually about urgency plus complexity, not just industry.</p>
                <div class="chip-row">
                  <span class="chip">Big tech</span>
                  <span class="chip">Enterprise SaaS</span>
                  <span class="chip">AI platform rollout</span>
                  <span class="chip">Cloud migration</span>
                  <span class="chip">Post-reorg execution</span>
                </div>
              </div>
              <div class="answer-block">
                <h3>Example answer</h3>
                <p>Enterprise software or big-tech teams with 2,000+ employees, US first, active platform, AI, data, cloud, or product operating model initiatives. Avoid small startups unless they just hired a senior transformation leader.</p>
              </div>
            </div>
            <div class="sample-answer"><strong>Good SellKit input:</strong> "Large engineering/product orgs dealing with AI adoption, platform modernization, cloud efficiency pressure, or post-reorg change. Prioritize teams that would value former Google, HP, MongoDB, or enterprise SaaS operators."</div>
          </div>
        </details>

        <details class="onboarding-card">
          <summary>
            <span class="step-number">2</span>
            <span class="summary-copy">
              <strong>Buyer titles</strong>
              <span>Name who can feel the pain, sponsor the work, or bring in expert help.</span>
            </span>
            <span class="summary-icon">v</span>
          </summary>
          <div class="onboarding-body">
            <div class="answer-grid">
              <div class="answer-block">
                <h3>Strong yes titles</h3>
                <p>CTO, CIO, VP Engineering, VP Product, Head of Platform, Head of Data/AI, Chief Transformation Officer, GM, Product Ops, Engineering Enablement, or Strategy/Ops leaders attached to product and engineering.</p>
              </div>
              <div class="answer-block">
                <h3>Close but no</h3>
                <p>Recruiting-only titles, junior program managers, vendor management without business ownership, or people too far from the change initiative.</p>
              </div>
            </div>
            <div class="sample-answer"><strong>Good SellKit input:</strong> "Prioritize VP+ Product, Engineering, Data/AI, Platform, CIO/CTO, Transformation, and Product Ops. Avoid recruiters and junior PMO unless they report directly into a named transformation program."</div>
          </div>
        </details>

        <details class="onboarding-card">
          <summary>
            <span class="step-number">3</span>
            <span class="summary-copy">
              <strong>One-line offer</strong>
              <span>Make the service concrete: who the experts are and what business problem they help with.</span>
            </span>
            <span class="summary-icon">v</span>
          </summary>
          <div class="onboarding-body">
            <div class="answer-grid">
              <div class="answer-block">
                <h3>Offer patterns</h3>
                <p>Change management consultants, former product/engineering executives, domain experts, or fractional operators who help teams make a difficult initiative real.</p>
                <div class="chip-row">
                  <span class="chip">AI adoption</span>
                  <span class="chip">Dev productivity</span>
                  <span class="chip">Product operating model</span>
                  <span class="chip">Platform scale</span>
                  <span class="chip">Cloud efficiency</span>
                </div>
              </div>
              <div class="answer-block">
                <h3>Example answer</h3>
                <p>We connect enterprise product and engineering teams with proven operators and domain experts for urgent transformation work, from AI rollout and platform modernization to change management and executive advisory.</p>
              </div>
            </div>
            <div class="sample-answer avoid"><strong>Avoid vague offers:</strong> "Expert network access" is too generic. Better: "former product, engineering, AI, and change leaders who can help your team de-risk a specific initiative."</div>
          </div>
        </details>

        <details class="onboarding-card">
          <summary>
            <span class="step-number">4</span>
            <span class="summary-copy">
              <strong>Buying signals</strong>
              <span>Rank the events that make expert help timely, not merely interesting.</span>
            </span>
            <span class="summary-icon">v</span>
          </summary>
          <div class="onboarding-body">
            <div class="answer-grid">
              <div class="answer-block">
                <h3>High-intent triggers</h3>
                <p>New CTO/CIO/VP Eng, major reorg, AI platform launch, hiring spike for platform/data/product ops, cloud efficiency initiative, acquisition integration, enterprise transformation program, or public roadmap shift.</p>
              </div>
              <div class="answer-block">
                <h3>What good looks like</h3>
                <p>A visible initiative plus an owner. Example: "new VP Engineering hired in the last 90 days and the company is hiring platform productivity leaders."</p>
              </div>
            </div>
            <div class="sample-answer"><strong>Good SellKit input:</strong> "Strongest signals: new product/engineering leadership, AI/data platform rollout, change management after reorg, cloud or infra efficiency pressure, and senior hiring for platform/product ops."</div>
          </div>
        </details>

        <details class="onboarding-card">
          <summary>
            <span class="step-number">5</span>
            <span class="summary-copy">
              <strong>Email voice</strong>
              <span>Give SellKit a real tone to imitate: direct, credible, and tied to the signal.</span>
            </span>
            <span class="summary-icon">v</span>
          </summary>
          <div class="onboarding-body">
            <div class="answer-grid">
              <div class="answer-block">
                <h3>What to provide</h3>
                <p>One or two real emails, preferred subject length, whether to mention the signal, and how direct the ask should be.</p>
              </div>
              <div class="answer-block">
                <h3>Example opener</h3>
                <p>"Saw your platform org is hiring around developer productivity after the AI infra rollout. We help teams bring in former product and engineering operators who have led similar transitions."</p>
              </div>
            </div>
            <div class="sample-answer"><strong>Good SellKit input:</strong> "Short, plain, low-hype. Mention the specific signal in sentence one. Offer a useful expert angle, not a broad pitch. Ask for a quick compare-notes conversation."</div>
          </div>
        </details>
      </div>
      ${screenshotFigure(screenshots[1])}
    </section>

    <section class="card">
      <h2>Daily Workflow</h2>
      <ol>
        <li><strong>Sign in:</strong> open SellKit and authenticate with the approved account.</li>
        <li><strong>Sweep the Signal Radar:</strong> review fresh account signals. Add the timely ones to the queue, ignore the noise. Ignored signals can be reconsidered later.</li>
        <li><strong>Review the queue:</strong> pick the highest-scored target and inspect the company, title, signal, and email confidence.</li>
        <li><strong>Read evidence and the committee:</strong> open source links where needed; identify the primary buyer, champion, blocker, budget holder, and technical evaluator. <em>Refresh committee map</em> re-researches on demand — by click only.</li>
        <li><strong>Enrich selectively:</strong> if the target clears the score gate (75+) and you need a verified work email, click <em>Enrich work email</em>. The batch counter shows how much of the 10-target cap is used.</li>
        <li><strong>Approve only when ready:</strong> approve the draft after reviewing copy. Approval unlocks copy/download of the manual email and the CRM CSV export.</li>
        <li><strong>Track what happens:</strong> after sending manually, click <em>Track sent</em>, then <em>Track reply / meeting / won</em> as outcomes arrive. Tracked targets stay in the CRM export.</li>
        <li><strong>Read the dashboard weekly:</strong> conversion learning shows which signals and personas convert; Signal Discovery suggests the next signals to test.</li>
      </ol>
      ${screenshotFigure(screenshots[4])}
      ${screenshotFigure(screenshots[5])}
      ${screenshotFigure(screenshots[6])}
    </section>

    <section class="card">
      <h2>Signal Radar</h2>
      <p>The radar is the top of the funnel: each card is one account signal with its type, provider, detected date, why it matters, suggested buyer persona, and a confidence tier.</p>
      <ul class="compact">
        <li><strong>Review</strong> marks a signal as seen without acting on it.</li>
        <li><strong>Add to queue</strong> promotes the account toward the review queue. This is the only path from radar to outreach, and it is always a manual click.</li>
        <li><strong>Ignore</strong> parks the signal. Ignored signals can be re-reviewed if circumstances change.</li>
      </ul>
      <p class="small">Radar decisions save to Mariah's account. No outreach, enrichment, or provider action ever starts from this surface.</p>
      ${screenshotFigure(screenshots[2])}
    </section>

    <section class="card">
      <h2>ICP Preview Lab</h2>
      <p>Use the lab to tune targeting criteria before a broader list build. Describe the ICP in plain language and pick a mode:</p>
      <ul class="compact">
        <li><strong>Fast lookup</strong> (Parallel Entity Search): instant candidate set for quick gut checks.</li>
        <li><strong>Preview run</strong> (Parallel FindAll Preview): up to 10 sample matches with match reasons. A full FindAll run never starts from here.</li>
      </ul>
      <p class="small">Each match shows the company, match reason, provider, and confidence, with an <em>Add to Signal Radar</em> action. If the provider is unavailable, SellKit shows a clearly-labeled sample set.</p>
      ${screenshotFigure(screenshots[3])}
    </section>

    <section class="card">
      <h2>Enrichment Gate, Tracking, and Export</h2>
      <h3>Apollo enrichment is score-gated</h3>
      <ul class="compact">
        <li>Blocked below a composite score of 75. The card shows the current score, the threshold, and why a target is blocked.</li>
        <li>Manual click only, work email only — no phone or personal email enrichment.</li>
        <li>A visible batch counter enforces the 10-target cap. Rejected and suppressed targets stay blocked regardless of score.</li>
      </ul>
      <h3>Track conversions by hand</h3>
      <p>After approving and manually sending, record what happened with <em>Track sent</em>, <em>Track reply</em>, <em>Track meeting</em>, and <em>Track won</em>. Tracking is for reporting only — it never triggers a send, LinkedIn action, or CRM write. Events save to Mariah's account and survive reloads.</p>
      <h3>CRM CSV export</h3>
      <ul class="compact">
        <li>The export includes every approved target, <strong>including targets whose status has advanced</strong> (sent, replied, meeting, won). Lost and suppressed targets are excluded.</li>
        <li>Cells that start with <code>=</code>, <code>+</code>, <code>-</code>, or <code>@</code> are neutralized so provider-supplied text cannot execute as a spreadsheet formula when the file opens in Excel or Google Sheets.</li>
        <li>Import the CSV into the CRM manually after policy review.</li>
      </ul>
    </section>

    <section class="card">
      <h2>Conversion Learning and Signal Discovery</h2>
      <p>Everything Mariah tracks feeds the dashboard:</p>
      <ul class="compact">
        <li><strong>Signal-level conversion:</strong> approval, reply, positive reply, meeting, and win rates per signal — e.g. how "new data leader" replies compare with "hiring spike" meetings.</li>
        <li><strong>Persona performance:</strong> the same rates across CTO, VP Engineering, VP Data, Head of Transformation, and Security/CISO buyers.</li>
        <li><strong>Signal Discovery Agent:</strong> a weekly recommendation queue computed from converted-versus-ignored history — e.g. "platform hiring + AI observability language converted 2.4x better than funding-only accounts" — with evidence, a lift estimate, sample accounts, and an <em>Add to radar criteria</em> action. It recommends; it never reaches out.</li>
      </ul>
      ${screenshotFigure(screenshots[7])}
    </section>

    <section class="card">
      <h2>Sign-In Reference</h2>
      <p>If SellKit sends you to the sign-in page, use the approved account and return to <code>https://sellkit-mu.vercel.app</code>. The sign-in page is SellKit-branded; after authenticating you land back where you started.</p>
      ${screenshotFigure(screenshots[0])}
    </section>

    <section class="card">
      <h2>Provider Roles and API Appendix</h2>
      <p>Use the providers as stages in one workflow, not as substitutes for each other. This table is for operating SellKit after Mariah understands the basic review flow.</p>
      <table class="matrix">
        <thead>
          <tr>
            <th>Stage</th>
            <th>Best Provider</th>
            <th>Use It For</th>
            <th>Guardrail</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td data-label="Stage">Account discovery</td>
            <td data-label="Provider">Exa Company Search</td>
            <td data-label="Use it for">ICP-matched company lists by industry, headcount, geography, funding stage, and technology.</td>
            <td data-label="Guardrail">Use the company category, request highlights, and store structured company metadata separately from evidence snippets.</td>
          </tr>
          <tr>
            <td data-label="Stage">Buyer discovery</td>
            <td data-label="Provider">Exa People Search</td>
            <td data-label="Use it for">Likely buyers, senior leaders, profile URLs, current role, location, and career context.</td>
            <td data-label="Guardrail">Run 2-3 query variations, dedupe by profile URL/name/company, and do not treat Exa as verified email.</td>
          </tr>
          <tr>
            <td data-label="Stage">Interactive lookup</td>
            <td data-label="Provider">Parallel Entity Search</td>
            <td data-label="Use it for">Fast people/company results when Mariah types a natural-language search.</td>
            <td data-label="Guardrail">Use for candidate sets only. It is fast, but not a cited enrichment run.</td>
          </tr>
          <tr>
            <td data-label="Stage">ICP test</td>
            <td data-label="Provider">Parallel FindAll Preview</td>
            <td data-label="Use it for">Quickly evaluate about 10 candidates before a broader list build.</td>
            <td data-label="Guardrail">Always preview first, read matched and unmatched candidates, then adjust match conditions.</td>
          </tr>
          <tr>
            <td data-label="Stage">Deep list-building</td>
            <td data-label="Provider">Parallel FindAll or Exa Websets</td>
            <td data-label="Use it for">Verified account/person lists with reasoning, citations, enrichments, webhooks, and async completion.</td>
            <td data-label="Guardrail">Cap match limits, use webhooks for longer jobs, and only enrich matched candidates.</td>
          </tr>
          <tr>
            <td data-label="Stage">Account dossier</td>
            <td data-label="Provider">Exa Agent or Parallel Task</td>
            <td data-label="Use it for">Buying committee maps, why-now research, recent initiatives, objections, and structured talking points.</td>
            <td data-label="Guardrail">Use bounded JSON schemas and require source URLs for every important claim.</td>
          </tr>
          <tr>
            <td data-label="Stage">Contact enrichment</td>
            <td data-label="Provider">Apollo</td>
            <td data-label="Use it for">Verified work email, firmographic validation, and selective people/company enrichment after scoring.</td>
            <td data-label="Guardrail">Blocked below composite score 75; the in-app gate enforces it. Manual click only, batch cap of 10, work email only — no phone or personal email.</td>
          </tr>
          <tr>
            <td data-label="Stage">Fallback review</td>
            <td data-label="Provider">Clay</td>
            <td data-label="Use it for">Spreadsheet-style human enrichment queues and ambiguous rows that need manual review.</td>
            <td data-label="Guardrail">Test one row first, store credentials in Clay connections, set rate limits, and return only needed fields.</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="card">
      <h2>API Best Practices</h2>
      <h3>Evidence-First Scoring</h3>
      <p>Every score component should be traceable. Store the provider, source URL, source title, source date, retrieval time, excerpt, confidence, and why the evidence matters.</p>
      <ul class="compact">
        <li><strong>Signal strength:</strong> link to a press release, hiring page, earnings note, product post, or funding source.</li>
        <li><strong>Title fit:</strong> link to the profile or public bio used to identify the buyer.</li>
        <li><strong>Company fit:</strong> link to Exa company metadata or the source supporting headcount, industry, funding, or tech stack.</li>
        <li><strong>Email confidence:</strong> show Apollo status separately from the score and keep raw enrichment output server-side.</li>
      </ul>

      <h3>Usage Controls</h3>
      <ul class="compact">
        <li>Debounce interactive searches and cache provider responses by normalized query.</li>
        <li>Use Parallel Entity Search for quick lookups and FindAll Preview before full FindAll runs.</li>
        <li>Cap Exa Agent, Exa Websets, and Parallel FindAll list sizes before running.</li>
        <li>Use Apollo only after a target passes score thresholds. Bulk enrich in batches of 10.</li>
        <li>Do not enrich phone numbers or personal emails unless explicitly approved.</li>
      </ul>

      <h3>Compliance Defaults</h3>
      <ul class="compact">
        <li>No automatic send. SellKit prepares copy, <code>.eml</code> files, and exports only after approval.</li>
        <li>No automatic LinkedIn action. SellKit can prepare a note and profile link for manual use.</li>
        <li>Keep all API keys server-side and never expose them in browser requests, screenshots, or exports.</li>
        <li>Keep raw provider payloads separate from normalized app rows so data can be audited or deleted.</li>
        <li>Use work email before personal email. Treat phone enrichment as disabled unless Mariah explicitly opts in.</li>
        <li>CSV exports neutralize leading <code>=</code>, <code>+</code>, <code>-</code>, <code>@</code> so provider text cannot execute as a spreadsheet formula.</li>
        <li>Provider/agent output is length-clamped and URL-validated before display; it can never override the manual-first guardrails.</li>
      </ul>
    </section>

    <section class="card">
      <h2>Provider References</h2>
      <ul>
        <li><a href="https://exa.ai/docs/reference/verticals/company">Exa Company Search</a> - company discovery and structured company metadata.</li>
        <li><a href="https://exa.ai/docs/reference/verticals/people">Exa People Search</a> - professional profiles and buyer discovery.</li>
        <li><a href="https://exa.ai/docs/reference/agent-api-guide">Exa Agent</a> - deep research, grounded structured JSON, and account dossiers.</li>
        <li><a href="https://exa.ai/docs/websets/api-guide">Exa Websets</a> - verified async list-building and enrichment.</li>
        <li><a href="https://docs.parallel.ai/findall-api/entity-search">Parallel Entity Search</a> - fast synchronous people and company lookup.</li>
        <li><a href="https://docs.parallel.ai/findall-api/features/findall-preview">Parallel FindAll Preview</a> - quick validation before full FindAll runs.</li>
        <li><a href="https://docs.parallel.ai/findall-api/findall-quickstart">Parallel FindAll</a> - cited, verified, enriched list-building.</li>
        <li><a href="https://docs.apollo.io/reference/people-enrichment">Apollo People Enrichment</a> - verified contact enrichment after scoring.</li>
        <li><a href="https://university.clay.com/docs/http-api-integration-overview">Clay HTTP API</a> and <a href="https://university.clay.com/docs/webhook-integration-guide">Clay Webhooks</a> - manual enrichment workspace and row handoff.</li>
      </ul>
    </section>

    <section class="card">
      <h2>Troubleshooting</h2>
      <ul>
        <li><strong>Login loop:</strong> sign out, reopen the SellKit URL, and use the approved account.</li>
        <li><strong>Copy is disabled:</strong> approve the draft first. Copy/download stays disabled before approval.</li>
        <li><strong>CRM export is not ready:</strong> approve at least one target. Targets you have tracked (sent, replied, meeting, won) remain in the export.</li>
        <li><strong>Track buttons are disabled:</strong> approve the draft first; each event can only be tracked once per target.</li>
        <li><strong>Enrich work email is blocked:</strong> the target is below the 75-score threshold, already enriched, rejected/suppressed, or the 10-target batch cap is used up. The card states the reason.</li>
        <li><strong>Radar or preview shows sample data:</strong> the provider was unavailable; the labeled fallback keeps the workflow moving. Try again later for live results.</li>
        <li><strong>Draft sounds wrong:</strong> update the onboarding email voice field with a real example and Save Progress.</li>
        <li><strong>Score seems unclear:</strong> inspect Evidence-First Scoring and source links before approving.</li>
      </ul>
      <div class="callout warning">
        <strong>Policy reminder.</strong> Keep the app manual-first until company policy approves direct Microsoft, Salesforce, or LinkedIn integrations.
      </div>
    </section>

    <p class="small">Generated from SellKit at <code>${escapeHtml(appHomeUrl || appUrl)}</code>. Screenshots are stored in <code>output/guide-screenshots/sellkit</code>.</p>
  </main>
</body>
</html>`;
}

async function renderPdf() {
  mkdirSync(outputPdfDir, { recursive: true });
  const browser = await puppeteer.launch({ headless: "new" });
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(guideHtmlPath).href, { waitUntil: "networkidle0" });
    await page.evaluate(() => {
      document.querySelectorAll("details").forEach((details) => {
        details.open = true;
      });
    });
    await page.pdf({
      path: guidePdfPath,
      format: "Letter",
      printBackground: true,
      margin: { top: "0.35in", right: "0.35in", bottom: "0.35in", left: "0.35in" },
    });
  } finally {
    await browser.close();
  }
  copyFileSync(guidePdfPath, outputGuidePdfPath);
}

if (skipScreenshots) {
  const missingShots = screenshots
    .map((shot) => join(screenshotDir, shot.file))
    .filter((shotPath) => !existsSync(shotPath));
  if (missingShots.length > 0) {
    throw new Error(`Cannot skip screenshots. Missing files: ${missingShots.join(", ")}`);
  }
} else {
  await captureScreenshots();
}
writeFileSync(guideHtmlPath, buildGuideHtml(), "utf8");
await renderPdf();

console.log(JSON.stringify({
  guideHtmlPath,
  guidePdfPath,
  outputGuidePdfPath,
  screenshotDir,
}, null, 2));
