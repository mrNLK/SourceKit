import fs from "fs/promises";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

const APP_URL = "https://getsourcekit.vercel.app";
const screenshotsDir = join(rootDir, "tmp", "screenshots");
const guideHtmlPath = join(__dirname, "sourcekit-user-guide.html");
const guidePdfPath = join(__dirname, "sourcekit-user-guide.pdf");

const VERSION_DATE = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
}).format(new Date());

const stepContent = [
  {
    number: 1,
    title: "Open SourceKit and sign in",
    action:
      'Go to <code>getsourcekit.vercel.app</code> and click <code>Continue with Google</code> with your approved account.',
    expectation:
      "You should see the SourceKit login screen and then Google authentication before entering the app.",
    image: "01-landing.png",
    isExample: false,
    calloutType: "tip",
    calloutTitle: "Tip",
    calloutText:
      "Use the same work Google account your SourceKit admin enabled to avoid login loops.",
  },
  {
    number: 2,
    title: "Switch to light mode",
    action:
      "After login, open the left sidebar and click <code>Light Mode</code> so every workspace screen stays in the light theme.",
    expectation:
      "You should see the interface switch to a white background with green accent controls.",
    image: "02-light-mode-toggle.png",
    isExample: true,
    calloutType: "tip",
    calloutTitle: "Tip",
    calloutText:
      "Theme preference is saved, so you only need to set this once per browser profile.",
  },
  {
    number: 3,
    title: "Start a new sourcing strategy",
    action:
      "Open <code>New Search</code> and choose the strategy workflow to build a role-specific sourcing plan.",
    expectation:
      "You should see a strategy builder where you can move from role input to targeting decisions.",
    image: "03-strategy-start.png",
    isExample: true,
    calloutType: "tip",
    calloutTitle: "Tip",
    calloutText:
      "Use the strategy flow first instead of direct search when the role is new or hard to fill.",
  },
  {
    number: 4,
    title: "Enter role details",
    action:
      "Fill in role title, level, location, and hiring context so SourceKit can frame the technical search correctly.",
    expectation:
      "You should see a complete role brief ready for targeting companies and repositories.",
    image: "04-role-details.png",
    isExample: true,
    calloutType: "warning",
    calloutTitle: "Common mistake",
    calloutText:
      "Vague role details usually produce broad results with weaker score quality.",
  },
  {
    number: 5,
    title: "Select target companies",
    action:
      "Add target companies that represent the engineering environments you want to recruit from.",
    expectation:
      "You should see selected companies listed as active targeting chips in the strategy panel.",
    image: "05-company-selection.png",
    isExample: true,
    calloutType: "tip",
    calloutTitle: "Tip",
    calloutText:
      "Start with 3-8 companies so the search stays focused without becoming too narrow.",
  },
  {
    number: 6,
    title: "Select target repositories",
    action:
      "Choose repositories that map to the role's required stack, tooling, and engineering complexity.",
    expectation:
      "You should see repository targets queued in the strategy and ready for plan generation.",
    image: "06-repo-selection.png",
    isExample: true,
    calloutType: "warning",
    calloutTitle: "Common mistake",
    calloutText:
      "Do not select only one niche repository unless you intentionally want a very small candidate pool.",
  },
  {
    number: 7,
    title: "Review and approve the search plan",
    action:
      "Review the AI-generated plan, then confirm the scope, weighted skills, and expected result volume.",
    expectation:
      "You should see a structured plan summary before execution.",
    image: "07-search-plan.png",
    isExample: true,
    calloutType: "tip",
    calloutTitle: "Tip",
    calloutText:
      "Edit the plan before launch if required skills or repo coverage look incomplete.",
  },
  {
    number: 8,
    title: "Launch and monitor search",
    action:
      "Run the search and watch status steps as SourceKit parses criteria, scans repos, and ranks candidates.",
    expectation:
      "You should see live progress states and a completion path into results.",
    image: "08-search-progress.png",
    isExample: true,
    calloutType: "tip",
    calloutTitle: "Tip",
    calloutText:
      "Wait for scoring to complete before deciding whether to broaden or narrow filters.",
  },
  {
    number: 9,
    title: "Review ranked results",
    action:
      "Open <code>Results</code> and sort or filter candidates by score, location, skills, and fit signals.",
    expectation:
      "You should see a ranked list with 0-100 evidence scores based on verifiable GitHub artifacts.",
    image: "09-results-view.png",
    isExample: true,
    calloutType: "warning",
    calloutTitle: "Score meaning",
    calloutText:
      "Scores indicate public technical evidence strength, not interview outcome probability.",
  },
  {
    number: 10,
    title: "Open a candidate profile",
    action:
      "Click a candidate row to review profile evidence, key repositories, and outreach actions.",
    expectation:
      "You should see a detailed profile with score context and next-step controls.",
    image: "10-candidate-profile.png",
    isExample: true,
    calloutType: "tip",
    calloutTitle: "Tip",
    calloutText:
      "Use profile highlights directly in outreach to improve response rates.",
  },
  {
    number: 11,
    title: "Create and run a Webset",
    action:
      "Open <code>Websets</code>, name a Webset, enter criteria, and run it to generate a reusable sourcing collection.",
    expectation:
      "You should see a new Webset record with run status and item counts.",
    image: "11-webset-creation.png",
    isExample: true,
    calloutType: "tip",
    calloutTitle: "Tip",
    calloutText:
      "Use Websets for repeat hiring patterns so future searches start from a verified baseline.",
  },
  {
    number: 12,
    title: "Export or move candidates to pipeline",
    action:
      "Select candidates and use <code>Export</code> or <code>Add to Pipeline</code> for recruiter handoff and workflow tracking.",
    expectation:
      "You should see CSV/JSON export options and immediate pipeline stage actions.",
    image: "12-export-actions.png",
    isExample: true,
    calloutType: "tip",
    calloutTitle: "Tip",
    calloutText:
      "Export only after final filtering so your handoff list stays focused and actionable.",
  },
];

const placeholderStates = [
  {
    file: "02-light-mode-toggle.png",
    activeNav: "Settings",
    title: "Step 2: Switch to Light Mode",
    subtitle: "Settings",
    inner: `
      <div class="panel">
        <h3>Display settings</h3>
        <div class="setting-row">
          <div>
            <strong>Theme</strong>
            <p>Choose the visual mode used across all SourceKit tabs.</p>
          </div>
          <div class="toggle active">
            <span>Light Mode</span>
          </div>
        </div>
        <div class="setting-row">
          <div>
            <strong>Sidebar behavior</strong>
            <p>Keep sidebar pinned for faster tab switching.</p>
          </div>
          <div class="toggle">
            <span>On</span>
          </div>
        </div>
      </div>
    `,
  },
  {
    file: "03-strategy-start.png",
    activeNav: "New Search",
    title: "Step 3: Start Sourcing Strategy",
    subtitle: "Research & Strategy",
    inner: `
      <div class="panel">
        <h3>Choose input mode</h3>
        <div class="chips">
          <span class="filled">Role details</span>
          <span>Job description URL</span>
          <span>Pasted job description</span>
        </div>
        <div class="mini-grid">
          <div class="mini-card"><strong>Role-driven workflow</strong><p>Build strategy from structured recruiter inputs.</p></div>
          <div class="mini-card"><strong>JD workflow</strong><p>Parse existing job text and auto-generate plan.</p></div>
        </div>
        <div class="footer-row">
          <button class="secondary">Reset</button>
          <button class="primary">Start Strategy</button>
        </div>
      </div>
    `,
  },
  {
    file: "04-role-details.png",
    activeNav: "New Search",
    title: "Step 4: Enter Role Details",
    subtitle: "Role brief",
    inner: `
      <div class="panel">
        <h3>Role brief</h3>
        <div class="grid two">
          <div class="field"><label>Role title</label><div class="value">Senior Backend Engineer</div></div>
          <div class="field"><label>Hiring level</label><div class="value">Senior (L5+)</div></div>
          <div class="field"><label>Location</label><div class="value">US / Canada</div></div>
          <div class="field"><label>Hiring context</label><div class="value">Platform + developer infrastructure</div></div>
        </div>
        <div class="footer-row">
          <button class="secondary">Clear</button>
          <button class="primary">Continue</button>
        </div>
      </div>
    `,
  },
  {
    file: "05-company-selection.png",
    activeNav: "New Search",
    title: "Step 5: Select Target Companies",
    subtitle: "Company targeting",
    inner: `
      <div class="panel">
        <h3>Target companies</h3>
        <div class="chips">
          <span class="filled">Stripe</span><span class="filled">Datadog</span><span class="filled">GitHub</span><span class="filled">Cloudflare</span>
        </div>
        <h3>Suggested additions</h3>
        <div class="chips">
          <span>Vercel</span><span>Sentry</span><span>Supabase</span><span>Twilio</span>
        </div>
        <div class="footer-row">
          <button class="secondary">Back</button>
          <button class="primary">Save Companies</button>
        </div>
      </div>
    `,
  },
  {
    file: "06-repo-selection.png",
    activeNav: "New Search",
    title: "Step 6: Select Target Repositories",
    subtitle: "Repository targeting",
    inner: `
      <div class="panel">
        <h3>Priority repositories</h3>
        <div class="rows">
          <div class="row"><span class="name">vercel/next.js</span><span class="tag">Selected</span></div>
          <div class="row"><span class="name">nodejs/node</span><span class="tag">Selected</span></div>
          <div class="row"><span class="name">supabase/supabase</span><span class="tag">Selected</span></div>
          <div class="row"><span class="name">kubernetes/kubernetes</span><span class="tag">Selected</span></div>
        </div>
        <div class="footer-row">
          <button class="secondary">Back</button>
          <button class="primary">Build Plan</button>
        </div>
      </div>
    `,
  },
  {
    file: "07-search-plan.png",
    activeNav: "New Search",
    title: "Step 7: Review Search Plan",
    subtitle: "AI-generated plan",
    inner: `
      <div class="panel">
        <h3>Plan summary</h3>
        <ul>
          <li>Prioritize frequent contributors in selected infrastructure repositories.</li>
          <li>Weight TypeScript, backend systems, and distributed architecture signals.</li>
          <li>Down-rank inactive profiles with limited recent contribution evidence.</li>
        </ul>
        <div class="mini-grid three">
          <div class="mini-card"><strong>Company set</strong><p>4 selected</p></div>
          <div class="mini-card"><strong>Repo set</strong><p>12 repositories</p></div>
          <div class="mini-card"><strong>Expected yield</strong><p>35-65 profiles</p></div>
        </div>
        <div class="footer-row">
          <button class="secondary">Edit</button>
          <button class="primary">Approve Plan</button>
        </div>
      </div>
    `,
  },
  {
    file: "08-search-progress.png",
    activeNav: "Results",
    title: "Step 8: Launch and Monitor Search",
    subtitle: "Live progress",
    inner: `
      <div class="panel">
        <h3>Scoring and ranking candidates...</h3>
        <div class="progress-list">
          <div class="done">Expanding query with AI</div>
          <div class="done">Searching repositories</div>
          <div class="active">Fetching contributors</div>
          <div class="todo">Enriching profiles</div>
          <div class="todo">Scoring candidates</div>
        </div>
        <div class="bar"><div class="fill" style="width:58%"></div></div>
        <p class="muted">Elapsed time: 00:14</p>
      </div>
    `,
  },
  {
    file: "09-results-view.png",
    activeNav: "Results",
    title: "Step 9: Review Ranked Results",
    subtitle: "Candidate results",
    inner: `
      <div class="panel">
        <div class="toolbar">
          <span>42 candidates found</span>
          <button class="secondary small">Filters</button>
          <button class="secondary small">Sort by score</button>
        </div>
        <div class="rows">
          <div class="row"><span class="name">Ari Chen</span><span class="score high">92</span></div>
          <div class="row"><span class="name">Maria Costa</span><span class="score high">88</span></div>
          <div class="row"><span class="name">Dev Patel</span><span class="score mid">74</span></div>
          <div class="row"><span class="name">Owen Park</span><span class="score mid">69</span></div>
        </div>
        <p class="muted">Score scale: 0-100 evidence score from verifiable GitHub artifacts.</p>
      </div>
    `,
  },
  {
    file: "10-candidate-profile.png",
    activeNav: "Pipeline",
    title: "Step 10: Candidate Profile",
    subtitle: "Individual candidate view",
    inner: `
      <div class="panel">
        <div class="profile-head">
          <div class="avatar">AC</div>
          <div>
            <h3>Ari Chen</h3>
            <p>@arichen • Senior Backend Engineer</p>
          </div>
          <span class="score high">92</span>
        </div>
        <div class="mini-grid two">
          <div class="mini-card"><strong>Evidence highlights</strong><p>Maintainer-level commits across infra-heavy TypeScript repos.</p></div>
          <div class="mini-card"><strong>Top repositories</strong><p>vercel/next.js, nodejs/node, supabase/supabase</p></div>
          <div class="mini-card"><strong>Skills</strong><p>TypeScript, Postgres, distributed systems, platform tooling</p></div>
          <div class="mini-card"><strong>Actions</strong><p>Generate outreach, move stage, add notes, watchlist</p></div>
        </div>
      </div>
    `,
  },
  {
    file: "11-webset-creation.png",
    activeNav: "Websets",
    title: "Step 11: Create a Webset",
    subtitle: "Websets",
    inner: `
      <div class="panel">
        <h3>New Webset</h3>
        <div class="grid two">
          <div class="field"><label>Webset name</label><div class="value">US Backend Infrastructure - Spring</div></div>
          <div class="field"><label>Status</label><div class="value">Ready to run</div></div>
        </div>
        <h3>Criteria</h3>
        <div class="chips">
          <span class="filled">TypeScript backend</span><span class="filled">US / Canada</span><span class="filled">Infra repos</span><span class="filled">Staff+ signal</span>
        </div>
        <div class="footer-row">
          <button class="secondary">Save Draft</button>
          <button class="primary">Run Webset</button>
        </div>
      </div>
    `,
  },
  {
    file: "12-export-actions.png",
    activeNav: "Results",
    title: "Step 12: Export or Move to Pipeline",
    subtitle: "Batch actions",
    inner: `
      <div class="panel">
        <div class="toolbar">
          <span>12 selected</span>
          <button class="secondary small">Export</button>
          <button class="primary small">Add to Pipeline</button>
        </div>
        <div class="export-menu">
          <div>Export CSV</div>
          <div>Export JSON</div>
          <small>12 items</small>
        </div>
        <div class="rows">
          <div class="row"><span class="name">Ari Chen</span><span class="tag">Selected</span></div>
          <div class="row"><span class="name">Maria Costa</span><span class="tag">Selected</span></div>
          <div class="row"><span class="name">Dev Patel</span><span class="tag">Selected</span></div>
        </div>
      </div>
    `,
  },
];

function buildPlaceholderHtml(screen) {
  const navItems = ["New Search", "Results", "Pipeline", "Websets", "Settings"];
  const nav = navItems
    .map((item) => `<span class="${item === screen.activeNav ? "active" : ""}">${item}</span>`)
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${screen.title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        width: 100vw;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(circle at top left, rgba(0,229,160,0.12), transparent 45%), #eef3f7;
        font-family: "DM Sans", sans-serif;
        color: #0f172a;
      }
      #screen {
        width: 1300px;
        height: 780px;
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid #d8e1eb;
        background: #ffffff;
        box-shadow: 0 20px 50px rgba(15, 23, 42, 0.15);
        display: grid;
        grid-template-columns: 230px 1fr;
        position: relative;
      }
      .example {
        position: absolute;
        top: 14px;
        right: 14px;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid rgba(0,169,122,0.35);
        background: rgba(0,169,122,0.10);
        color: #0b6a4f;
        font: 600 11px "JetBrains Mono", monospace;
        letter-spacing: 0.02em;
      }
      .sidebar {
        background: #f7fafc;
        border-right: 1px solid #dce5ef;
        padding: 18px 14px;
      }
      .logo {
        font-family: "JetBrains Mono", monospace;
        font-weight: 700;
        color: #00986f;
        margin-bottom: 22px;
      }
      .nav {
        display: grid;
        gap: 8px;
      }
      .nav span {
        font-size: 12px;
        border: 1px solid #d8e1eb;
        background: #ffffff;
        color: #475569;
        padding: 8px 10px;
        border-radius: 8px;
      }
      .nav span.active {
        color: #0b6a4f;
        border-color: rgba(0,169,122,0.40);
        background: rgba(0,169,122,0.10);
      }
      .content {
        padding: 26px 26px 24px;
        background: #fcfdff;
      }
      .content h1 {
        margin: 0 0 4px;
        font-size: 26px;
        line-height: 1.1;
        color: #0f172a;
      }
      .sub {
        margin: 0 0 18px;
        color: #64748b;
        font-size: 13px;
      }
      .panel {
        border: 1px solid #d8e1eb;
        background: #ffffff;
        border-radius: 12px;
        padding: 16px;
      }
      .panel h3 {
        margin: 0 0 12px;
        font-size: 16px;
        color: #0f172a;
      }
      .grid {
        display: grid;
        gap: 10px;
      }
      .grid.two {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .field {
        border: 1px solid #d9e2ec;
        border-radius: 10px;
        padding: 10px 12px;
        background: #f8fbff;
      }
      .field label {
        display: block;
        font: 500 11px "JetBrains Mono", monospace;
        color: #64748b;
        margin-bottom: 8px;
      }
      .value {
        font-size: 13px;
        color: #0f172a;
      }
      .footer-row {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 14px;
      }
      .setting-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        border: 1px solid #d8e1eb;
        border-radius: 10px;
        background: #f8fbff;
        padding: 12px;
        margin-bottom: 10px;
      }
      .setting-row strong {
        font-size: 13px;
      }
      .setting-row p {
        margin: 3px 0 0;
        font-size: 12px;
        color: #64748b;
      }
      .toggle {
        border: 1px solid #d8e1eb;
        border-radius: 999px;
        background: #ffffff;
        padding: 6px 10px;
        font: 600 11px "JetBrains Mono", monospace;
        color: #475569;
      }
      .toggle.active {
        color: #0b6a4f;
        border-color: rgba(0,169,122,0.45);
        background: rgba(0,169,122,0.12);
      }
      button {
        border-radius: 9px;
        padding: 9px 14px;
        font-family: "JetBrains Mono", monospace;
        font-size: 11px;
      }
      button.primary {
        border: 1px solid #00a97a;
        background: #00c48c;
        color: #063124;
      }
      button.secondary {
        border: 1px solid #d8e1eb;
        background: #ffffff;
        color: #334155;
      }
      button.small {
        padding: 6px 10px;
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 12px;
      }
      .chips span {
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #334155;
        font: 500 11px "JetBrains Mono", monospace;
        border-radius: 999px;
        padding: 6px 10px;
      }
      .chips span.filled {
        border-color: rgba(0,169,122,0.45);
        background: rgba(0,169,122,0.12);
        color: #0b6a4f;
      }
      ul {
        margin: 0 0 14px;
        padding-left: 18px;
        color: #334155;
        font-size: 13px;
        line-height: 1.45;
      }
      .mini-grid {
        display: grid;
        gap: 10px;
      }
      .mini-grid.two {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .mini-grid.three {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .mini-card {
        border: 1px solid #d9e2ec;
        border-radius: 10px;
        background: #f8fbff;
        padding: 10px;
      }
      .mini-card strong {
        font-size: 12px;
        color: #0f172a;
      }
      .mini-card p {
        margin: 6px 0 0;
        color: #64748b;
        font-size: 12px;
      }
      .progress-list {
        display: grid;
        gap: 8px;
        margin: 8px 0 12px;
      }
      .progress-list div {
        border-radius: 8px;
        padding: 8px 10px;
        font: 500 12px "JetBrains Mono", monospace;
      }
      .progress-list .done {
        background: rgba(0,169,122,0.12);
        border: 1px solid rgba(0,169,122,0.24);
        color: #0b6a4f;
      }
      .progress-list .active {
        background: rgba(56,189,248,0.15);
        border: 1px solid rgba(56,189,248,0.28);
        color: #0c4a6e;
      }
      .progress-list .todo {
        background: #f8fbff;
        border: 1px solid #d9e2ec;
        color: #64748b;
      }
      .bar {
        height: 8px;
        border-radius: 999px;
        background: #e2e8f0;
        overflow: hidden;
      }
      .fill {
        height: 100%;
        background: linear-gradient(90deg, #00c48c, #35d9a6);
      }
      .muted {
        margin: 10px 0 0;
        color: #64748b;
        font: 500 11px "JetBrains Mono", monospace;
      }
      .rows {
        display: grid;
        gap: 8px;
      }
      .row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border: 1px solid #d9e2ec;
        border-radius: 10px;
        background: #ffffff;
        padding: 10px 12px;
      }
      .name {
        font-size: 13px;
        color: #0f172a;
      }
      .score {
        min-width: 36px;
        text-align: center;
        padding: 4px 8px;
        border-radius: 999px;
        font: 600 11px "JetBrains Mono", monospace;
      }
      .score.high {
        color: #0b6a4f;
        background: rgba(0,169,122,0.14);
        border: 1px solid rgba(0,169,122,0.35);
      }
      .score.mid {
        color: #8a5d00;
        background: rgba(245,158,11,0.16);
        border: 1px solid rgba(245,158,11,0.34);
      }
      .profile-head {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }
      .avatar {
        width: 46px;
        height: 46px;
        border-radius: 10px;
        background: rgba(0,169,122,0.14);
        border: 1px solid rgba(0,169,122,0.30);
        display: flex;
        align-items: center;
        justify-content: center;
        font: 600 14px "JetBrains Mono", monospace;
        color: #0b6a4f;
      }
      .profile-head h3 {
        margin: 0 0 2px;
      }
      .profile-head p {
        margin: 0;
        color: #64748b;
        font-size: 12px;
      }
      .toolbar {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
      }
      .toolbar span {
        flex: 1;
        font: 600 12px "JetBrains Mono", monospace;
        color: #0f172a;
      }
      .export-menu {
        margin-left: auto;
        width: 180px;
        border: 1px solid #d8e1eb;
        border-radius: 10px;
        background: #ffffff;
        padding: 8px;
        margin-bottom: 10px;
      }
      .export-menu div {
        border-radius: 7px;
        padding: 8px;
        font-size: 12px;
        color: #334155;
      }
      .export-menu small {
        display: block;
        margin-top: 6px;
        color: #64748b;
        font: 500 10px "JetBrains Mono", monospace;
      }
      .tag {
        border-radius: 999px;
        border: 1px solid rgba(0,169,122,0.35);
        color: #0b6a4f;
        background: rgba(0,169,122,0.10);
        font: 600 10px "JetBrains Mono", monospace;
        padding: 4px 8px;
      }
    </style>
  </head>
  <body>
    <div id="screen">
      <span class="example">Example view.</span>
      <aside class="sidebar">
        <div class="logo">SourceKit</div>
        <div class="nav">${nav}</div>
      </aside>
      <main class="content">
        <h1>${screen.title}</h1>
        <p class="sub">${screen.subtitle}</p>
        ${screen.inner}
      </main>
    </div>
  </body>
</html>`;
}

function buildGuideHtml() {
  const stepPages = stepContent
    .map(
      (step) => `
      <section class="page step-page">
        <h2>Step ${step.number}: ${step.title}</h2>
        <p class="line"><strong>Do this:</strong> ${step.action}</p>
        <p class="line"><strong>You should see:</strong> ${step.expectation}</p>
        <figure class="shot">
          <img src="../tmp/screenshots/${step.image}" alt="Step ${step.number} screenshot" />
          ${
            step.isExample
              ? `<figcaption class="example-caption">Example view.</figcaption>`
              : `<figcaption>Live application screenshot.</figcaption>`
          }
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
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
    <style>
      :root {
        --bg: #f5f6f8;
        --page: #ffffff;
        --text: #111827;
        --muted: #4b5563;
        --border: #e5e7eb;
        --tip-bg: #ecfdf5;
        --tip-border: #a7f3d0;
        --warn-bg: #fff7ed;
        --warn-border: #fdba74;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #ffffff;
        color: var(--text);
        font-family: "Inter", "DM Sans", sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .doc {
        width: 100%;
        margin: 0;
      }
      .page {
        background: var(--page);
        padding: 18px 10px 22px;
        page-break-after: always;
        break-after: page;
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
      .mono,
      code {
        font-family: "JetBrains Mono", monospace;
        background: #f3f4f6;
        padding: 2px 5px;
        border-radius: 4px;
        color: #111827;
        font-size: 12px;
      }
      .cover {
        min-height: 8.6in;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .subtitle {
        font-size: 18px;
        color: #374151;
        margin: 0 0 24px;
      }
      .meta {
        margin-top: 10px;
      }
      .meta p {
        margin: 0 0 8px;
        font-size: 14px;
      }
      .meta strong {
        display: inline-block;
        width: 110px;
        color: #111827;
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
        color: #111827;
      }
      .shot {
        margin: 14px 0 12px;
      }
      .shot img {
        width: 100%;
        height: auto;
        display: block;
        border: 1px solid var(--border);
        border-radius: 10px;
        box-shadow: 0 8px 20px rgba(17, 24, 39, 0.08);
      }
      .shot figcaption {
        margin-top: 6px;
        color: #6b7280;
        font-size: 12px;
      }
      .example-caption {
        font-family: "JetBrains Mono", monospace;
      }
      .callout {
        border: 1px solid;
        border-radius: 10px;
        padding: 10px 12px;
      }
      .callout.tip {
        background: var(--tip-bg);
        border-color: var(--tip-border);
      }
      .callout.warning {
        background: var(--warn-bg);
        border-color: var(--warn-border);
      }
      .callout-title {
        font-weight: 700;
        font-size: 13px;
        color: #111827;
        margin-bottom: 4px;
      }
      .callout p {
        margin: 0;
        color: #374151;
        font-size: 13px;
      }
      .troubleshooting {
        border: 1px solid var(--border);
        border-radius: 12px;
        overflow: hidden;
      }
      .issue-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        border-top: 1px solid var(--border);
      }
      .issue-row:first-child {
        border-top: 0;
      }
      .issue-row > div {
        padding: 12px;
        font-size: 13px;
        line-height: 1.45;
      }
      .issue-row > div:first-child {
        background: #f9fafb;
        font-weight: 600;
        color: #111827;
      }
      .note {
        margin-top: 14px;
        font-size: 12px;
        color: #6b7280;
      }
    </style>
  </head>
  <body>
    <main class="doc">
      <section class="page cover">
        <h1>SourceKit User Guide</h1>
        <p class="subtitle">Evidence-based technical talent discovery</p>
        <div class="meta">
          <p><strong>URL</strong> <span class="mono">getsourcekit.vercel.app</span></p>
          <p><strong>Version date</strong> ${VERSION_DATE}</p>
        </div>
      </section>

      <section class="page">
        <h2>What You Need Before You Start</h2>
        <h3>Browser</h3>
        <ul>
          <li>Use Google Chrome for the most consistent login, strategy editing, and export behavior.</li>
        </ul>
        <h3>Account access</h3>
        <ul>
          <li>Request SourceKit access from your internal admin before your first login.</li>
          <li>Sign in with the same Google account your admin approved.</li>
        </ul>
        <h3>Have these details ready</h3>
        <ul>
          <li><span class="mono">Role title</span>, level, location, and hiring context.</li>
          <li>Target companies and priority repositories for sourcing strategy.</li>
          <li>Core skills and framework requirements for final candidate filtering.</li>
        </ul>
      </section>

      ${stepPages}

      <section class="page">
        <h2>Troubleshooting</h2>
        <div class="troubleshooting">
          <div class="issue-row">
            <div>Search returned no results</div>
            <div>Broaden company or repository scope and remove restrictive location filters.</div>
          </div>
          <div class="issue-row">
            <div>Plan looks off-target</div>
            <div>Go back and refine role details, target companies, and repository selections before relaunch.</div>
          </div>
          <div class="issue-row">
            <div>Webset run produced too few items</div>
            <div>Relax Webset criteria and include more generalized skill or repo terms.</div>
          </div>
          <div class="issue-row">
            <div>Scores look lower than expected</div>
            <div>Scores reflect verifiable GitHub evidence and activity recency, not resume strength.</div>
          </div>
          <div class="issue-row">
            <div>Export options are disabled</div>
            <div>Select candidates first, then open <span class="mono">Export</span> for CSV or JSON output.</div>
          </div>
        </div>
        <p class="note">Screens marked <span class="mono">Example view.</span> represent authenticated product areas that require account access.</p>
      </section>
    </main>
  </body>
</html>`;
}

async function captureLanding(page) {
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(APP_URL, { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForSelector("body", { timeout: 30000 });
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 1200));
  await page.screenshot({
    path: join(screenshotsDir, "01-landing.png"),
    fullPage: true,
  });
}

async function capturePlaceholders(browser) {
  for (const state of placeholderStates) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setContent(buildPlaceholderHtml(state), {
      waitUntil: "networkidle0",
    });
    await page.waitForSelector("#screen", { timeout: 30000 });
    const element = await page.$("#screen");
    if (!element) {
      throw new Error(`Unable to locate placeholder capture element for ${state.file}`);
    }
    await element.screenshot({ path: join(screenshotsDir, state.file) });
    await page.close();
  }
}

async function generateGuide() {
  await fs.mkdir(screenshotsDir, { recursive: true });

  const browser = await puppeteer.launch({ headless: "new" });

  try {
    const livePage = await browser.newPage();
    await captureLanding(livePage);
    await livePage.close();

    await capturePlaceholders(browser);

    const html = buildGuideHtml();
    await fs.writeFile(guideHtmlPath, html, "utf8");

    const guidePage = await browser.newPage();
    await guidePage.goto(`file://${guideHtmlPath}`, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 800));

    await guidePage.pdf({
      path: guidePdfPath,
      format: "letter",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<div></div>`,
      footerTemplate: `
        <div style="width:100%;font-size:10px;color:#6b7280;padding:0 24px;text-align:right;font-family:Inter,Arial,sans-serif;">
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
    await guidePage.close();
  } finally {
    await browser.close();
  }
}

generateGuide()
  .then(() => {
    console.log("Generated:");
    console.log(`- ${guideHtmlPath}`);
    console.log(`- ${guidePdfPath}`);
    console.log(`- ${screenshotsDir}/01-landing.png ... 12-export-actions.png`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
