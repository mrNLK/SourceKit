import fs from "fs/promises";
import { dirname, join, basename } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..");

const outputRoot = join(repoRoot, "output", "marketing");
const packageSpecPath = join(outputRoot, "package-spec.json");
const workflowManifestPath = join(repoRoot, "output", "guide-screenshots", "workflow", "screenshot-manifest.json");
const userManifestPath = join(repoRoot, "output", "guide-screenshots", "user-guide", "screenshot-manifest.json");

const requiredPromptContractInputs = [
  "brand_assets_path",
  "workflow_manifest_path",
  "user_manifest_path",
  "output_root",
  "voice_profile",
  "cta_profile",
];

const allowedProviderStatuses = new Set(["live", "planned_not_wired"]);
const expectedBrandTokens = {
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

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function ok(condition, message) {
  if (!condition) {
    fail(message);
  }
}

async function exists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function loadJson(path) {
  const raw = await fs.readFile(path, "utf8");
  return JSON.parse(raw);
}

function stripHtml(html) {
  return html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractIds(html) {
  const ids = new Set();
  const idRegex = /\sid="([^"]+)"/g;
  for (const match of html.matchAll(idRegex)) {
    ids.add(match[1]);
  }
  return ids;
}

function extractHrefs(html) {
  const hrefs = [];
  const hrefRegex = /\shref="([^"]+)"/g;
  for (const match of html.matchAll(hrefRegex)) {
    hrefs.push(match[1]);
  }
  return hrefs;
}

function extractLogoBasenames(html) {
  const set = new Set();
  const logoRegex = /logos\/([A-Za-z0-9._-]+\.svg)/g;
  for (const match of html.matchAll(logoRegex)) {
    set.add(match[1]);
  }
  return [...set];
}

function resolveFromOutput(relativePath) {
  return join(outputRoot, relativePath);
}

async function assertFile(path, label, minimumBytes = 1) {
  const present = await exists(path);
  ok(present, `${label} missing: ${path}`);
  if (!present) {
    return;
  }
  const stat = await fs.stat(path);
  ok(stat.size >= minimumBytes, `${label} appears empty/small: ${path} (${stat.size} bytes)`);
}

function assertPromptInputs(contract) {
  ok(Boolean(contract), "Missing contracts.prompt_contract_inputs");
  if (!contract) {
    return;
  }
  for (const key of requiredPromptContractInputs) {
    ok(typeof contract[key] === "string" && contract[key].length > 0, `Missing prompt contract input: ${key}`);
  }
}

function assertBrandTokens(spec) {
  const tokens = spec?.brand?.color_tokens;
  ok(Boolean(tokens), "Missing brand.color_tokens");
  if (!tokens) {
    return;
  }
  for (const [token, value] of Object.entries(expectedBrandTokens)) {
    ok(tokens[token] === value, `Brand token mismatch for ${token}: expected ${value}, got ${tokens[token] ?? "undefined"}`);
  }
}

function mapManifestSteps(manifest) {
  return new Map(manifest.map((row) => [row.step, row]));
}

async function assertProofMap(spec, workflowManifest, userManifest) {
  ok(Array.isArray(spec.proof_map), "proof_map must be an array");
  if (!Array.isArray(spec.proof_map)) {
    return;
  }
  ok(spec.proof_map.length >= 10, `proof_map is too small (${spec.proof_map.length})`);

  const workflowSteps = mapManifestSteps(workflowManifest);
  const userSteps = mapManifestSteps(userManifest);

  for (const claimRow of spec.proof_map) {
    ok(typeof claimRow.claim_id === "string" && claimRow.claim_id.length > 0, "proof_map item missing claim_id");
    ok(typeof claimRow.claim === "string" && claimRow.claim.length > 0, `Claim text missing for ${claimRow.claim_id ?? "unknown"}`);
    ok(Array.isArray(claimRow.evidence) && claimRow.evidence.length > 0, `Claim ${claimRow.claim_id ?? "unknown"} must have at least one evidence row`);
    if (!Array.isArray(claimRow.evidence)) {
      continue;
    }

    for (const evidence of claimRow.evidence) {
      ok(["workflow", "user-guide"].includes(evidence.manifest), `Invalid manifest value in ${claimRow.claim_id}: ${evidence.manifest}`);
      ok(typeof evidence.step === "number", `Evidence step must be numeric in ${claimRow.claim_id}`);
      ok(typeof evidence.manifest_path === "string" && evidence.manifest_path.length > 0, `Evidence manifest_path missing in ${claimRow.claim_id}`);
      ok(typeof evidence.screenshot_path === "string" && evidence.screenshot_path.length > 0, `Evidence screenshot_path missing in ${claimRow.claim_id}`);

      if (evidence.manifest === "workflow") {
        ok(evidence.manifest_path === workflowManifestPath, `Workflow evidence manifest_path mismatch in ${claimRow.claim_id}`);
        ok(workflowSteps.has(evidence.step), `Workflow step ${evidence.step} not found for ${claimRow.claim_id}`);
      } else if (evidence.manifest === "user-guide") {
        ok(evidence.manifest_path === userManifestPath, `User-guide evidence manifest_path mismatch in ${claimRow.claim_id}`);
        ok(userSteps.has(evidence.step), `User-guide step ${evidence.step} not found for ${claimRow.claim_id}`);
      }

      if (typeof evidence.screenshot_path === "string" && evidence.screenshot_path.length > 0) {
        const screenshotAbs = resolveFromOutput(evidence.screenshot_path);
        // eslint-disable-next-line no-await-in-loop
        const present = await exists(screenshotAbs);
        ok(present, `Evidence screenshot not found for ${claimRow.claim_id}: ${screenshotAbs}`);
      }
    }
  }
}

function assertProviderMap(spec) {
  const rows = spec.provider_map;
  ok(Array.isArray(rows) && rows.length > 0, "provider_map must be a non-empty array");
  if (!Array.isArray(rows)) {
    return;
  }

  const providerCoverage = {
    exa: false,
    parallel: false,
    github: false,
    claude_or_anthropic: false,
    harmonic: false,
  };

  for (const row of rows) {
    ok(typeof row.feature_surface === "string" && row.feature_surface.length > 0, "provider_map row missing feature_surface");
    ok(typeof row.edge_function === "string" && row.edge_function.length > 0, `provider_map row missing edge_function for ${row.feature_surface ?? "unknown"}`);
    ok(typeof row.external_api === "string" && row.external_api.length > 0, `provider_map row missing external_api for ${row.feature_surface ?? "unknown"}`);
    ok(typeof row.why === "string" && row.why.length > 0, `provider_map row missing why for ${row.feature_surface ?? "unknown"}`);
    ok(allowedProviderStatuses.has(row.status), `provider_map row has invalid status for ${row.feature_surface ?? "unknown"}: ${row.status}`);

    const surfaceLower = `${row.feature_surface} ${row.external_api}`.toLowerCase();
    if (surfaceLower.includes("exa")) {
      providerCoverage.exa = true;
    }
    if (surfaceLower.includes("parallel")) {
      providerCoverage.parallel = true;
    }
    if (surfaceLower.includes("github")) {
      providerCoverage.github = true;
    }
    if (surfaceLower.includes("anthropic") || surfaceLower.includes("claude")) {
      providerCoverage.claude_or_anthropic = true;
    }
    if (surfaceLower.includes("harmonic")) {
      providerCoverage.harmonic = true;
    }

    const mentionsGroundedAnswer = surfaceLower.includes("grounded answer") || surfaceLower.includes("answer api");
    if (mentionsGroundedAnswer) {
      ok(row.status !== "live", "Grounded Answer/Answer API is marked live but should be planned_not_wired");
    }
    if (row.status === "live" && row.edge_function === "none") {
      fail(`Live provider_map row cannot use edge_function=none (${row.feature_surface})`);
    }
  }

  ok(providerCoverage.exa, "provider_map missing Exa coverage");
  ok(providerCoverage.parallel, "provider_map missing Parallel coverage");
  ok(providerCoverage.github, "provider_map missing GitHub coverage");
  ok(providerCoverage.claude_or_anthropic, "provider_map missing Claude/Anthropic coverage");
  ok(providerCoverage.harmonic, "provider_map missing Harmonic coverage");
}

async function assertInternalLinks(htmlPath) {
  const html = await fs.readFile(htmlPath, "utf8");
  const ids = extractIds(html);
  const hrefs = extractHrefs(html);

  for (const href of hrefs) {
    if (href.startsWith("https://") || href.startsWith("http://") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      continue;
    }

    if (href.startsWith("#")) {
      const anchor = href.slice(1);
      ok(ids.has(anchor), `Broken in-page anchor in ${basename(htmlPath)}: ${href}`);
      continue;
    }

    if (href.endsWith(".html") || href.startsWith("./")) {
      const resolved = join(dirname(htmlPath), href);
      // eslint-disable-next-line no-await-in-loop
      const present = await exists(resolved);
      ok(present, `Broken local link in ${basename(htmlPath)}: ${href}`);
    }
  }

  return html;
}

function assertCta(html, label) {
  ok(html.includes("getsourcekit.vercel.app"), `${label} is missing getsourcekit.vercel.app CTA URL`);
  ok(/start trial/i.test(html), `${label} is missing Start Trial CTA text`);
}

function assertQuickstartShape(quickstartHtml) {
  ok(quickstartHtml.includes("6-Step First Success Flow"), "Quickstart missing 6-step first-success section");
  ok(quickstartHtml.includes("No engineers found"), "Quickstart missing no-results troubleshooting");
  ok(quickstartHtml.includes("Failed to fetch"), "Quickstart missing webset failure troubleshooting");

  const quickstartText = stripHtml(quickstartHtml);
  const wordCount = quickstartText.split(/\s+/).filter(Boolean).length;
  ok(wordCount <= 2600, `Quickstart is too long for concise mode (${wordCount} words)`);
  ok(!quickstartHtml.includes("API Responsibility Matrix"), "Quickstart includes architecture-heavy API matrix content");
}

function assertPromptPack(spec, prompts) {
  for (const [name, content] of Object.entries(prompts)) {
    ok(content.length > 100, `${name} prompt appears too short`);
  }

  const contractInputs = spec.contracts?.prompt_contract_inputs;
  assertPromptInputs(contractInputs);

  const master = prompts.master;
  for (const key of requiredPromptContractInputs) {
    ok(master.includes(`${key}:`), `Master prompt missing fixed input line for ${key}`);
  }
  ok(master.includes("node docs/generate-sourcekit-marketing-package.mjs"), "Master prompt missing generate command");
  ok(master.includes("node docs/validate-sourcekit-marketing-package.mjs"), "Master prompt missing validate command");
}

async function run() {
  ok(await exists(packageSpecPath), `Missing package spec: ${packageSpecPath}`);
  if (!(await exists(packageSpecPath))) {
    throw new Error("package spec missing");
  }

  const spec = await loadJson(packageSpecPath);
  const workflowManifest = await loadJson(workflowManifestPath);
  const userManifest = await loadJson(userManifestPath);

  ok(spec.audience === "in_house_recruiters", `audience mismatch: ${spec.audience}`);
  ok(spec.primary_goal === "trial_signups", `primary_goal mismatch: ${spec.primary_goal}`);
  ok(spec.claims_mode === "current_state_only", `claims_mode mismatch: ${spec.claims_mode}`);
  ok(spec.narrative_style === "outcome_first", `narrative_style mismatch: ${spec.narrative_style}`);

  ok(Boolean(spec.asset_set), "asset_set missing");
  ok(Boolean(spec.contracts), "contracts missing");
  assertBrandTokens(spec);
  assertProviderMap(spec);
  await assertProofMap(spec, workflowManifest, userManifest);

  const requiredAssets = [
    { path: resolveFromOutput(spec.asset_set?.landing?.html), label: "landing HTML", min: 1000 },
    { path: resolveFromOutput(spec.asset_set?.landing?.pdf), label: "landing PDF", min: 2000 },
    { path: resolveFromOutput(spec.asset_set?.quickstart?.html), label: "quickstart HTML", min: 1000 },
    { path: resolveFromOutput(spec.asset_set?.quickstart?.pdf), label: "quickstart PDF", min: 2000 },
    { path: resolveFromOutput(spec.asset_set?.comprehensive?.html), label: "comprehensive HTML", min: 1000 },
    { path: resolveFromOutput(spec.asset_set?.comprehensive?.pdf), label: "comprehensive PDF", min: 2000 },
    { path: resolveFromOutput(spec.asset_set?.workflow_explainer?.html), label: "workflow explainer HTML", min: 1000 },
    { path: resolveFromOutput(spec.asset_set?.workflow_explainer?.pdf), label: "workflow explainer PDF", min: 2000 },
    { path: resolveFromOutput(spec.asset_set?.prompt_pack?.files?.master), label: "master prompt", min: 100 },
    { path: resolveFromOutput(spec.asset_set?.prompt_pack?.files?.quickstart), label: "quickstart prompt", min: 100 },
    { path: resolveFromOutput(spec.asset_set?.prompt_pack?.files?.comprehensive), label: "comprehensive prompt", min: 100 },
    { path: resolveFromOutput(spec.asset_set?.prompt_pack?.files?.qa), label: "QA prompt", min: 100 },
  ];

  for (const asset of requiredAssets) {
    // eslint-disable-next-line no-await-in-loop
    await assertFile(asset.path, asset.label, asset.min);
  }

  const landingHtmlPath = resolveFromOutput(spec.asset_set.landing.html);
  const quickstartHtmlPath = resolveFromOutput(spec.asset_set.quickstart.html);
  const comprehensiveHtmlPath = resolveFromOutput(spec.asset_set.comprehensive.html);
  const workflowHtmlPath = resolveFromOutput(spec.asset_set.workflow_explainer.html);

  const landingHtml = await assertInternalLinks(landingHtmlPath);
  const quickstartHtml = await assertInternalLinks(quickstartHtmlPath);
  const comprehensiveHtml = await assertInternalLinks(comprehensiveHtmlPath);
  const workflowHtml = await assertInternalLinks(workflowHtmlPath);

  if (!workflowHtml.includes("SourceKit Workflow Explainer")) {
    warn("Workflow explainer title text changed from expected wording");
  }

  assertCta(landingHtml, "Landing");
  assertCta(quickstartHtml, "Quickstart");
  assertCta(comprehensiveHtml, "Comprehensive");

  assertQuickstartShape(quickstartHtml);
  ok(comprehensiveHtml.includes("API Responsibility Matrix"), "Comprehensive guide missing API responsibility matrix");

  const approvedLogos = Array.isArray(spec?.brand?.approved_logos) ? spec.brand.approved_logos : [];
  for (const html of [landingHtml, quickstartHtml, comprehensiveHtml, workflowHtml]) {
    for (const logo of extractLogoBasenames(html)) {
      ok(approvedLogos.includes(logo), `Unapproved logo used in HTML output: ${logo}`);
    }
  }

  for (const logo of approvedLogos) {
    // eslint-disable-next-line no-await-in-loop
    await assertFile(join(outputRoot, "logos", logo), `Approved logo copy (${logo})`, 20);
  }

  for (const color of Object.values(expectedBrandTokens)) {
    ok(landingHtml.includes(color), `Landing styles missing expected brand color token value: ${color}`);
  }

  const prompts = {
    master: await fs.readFile(resolveFromOutput(spec.asset_set.prompt_pack.files.master), "utf8"),
    quickstart: await fs.readFile(resolveFromOutput(spec.asset_set.prompt_pack.files.quickstart), "utf8"),
    comprehensive: await fs.readFile(resolveFromOutput(spec.asset_set.prompt_pack.files.comprehensive), "utf8"),
    qa: await fs.readFile(resolveFromOutput(spec.asset_set.prompt_pack.files.qa), "utf8"),
  };
  assertPromptPack(spec, prompts);

  if (warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (errors.length > 0) {
    console.error("Validation failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("Validation passed: SourceKit marketing package outputs are consistent.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
