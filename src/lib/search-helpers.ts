// ---------------------------------------------------------------------------
// Search helper functions & constants extracted from SearchTab
// ---------------------------------------------------------------------------

import type { Developer } from "@/types/developer";

export interface SuggestionChip {
  label: string;
  expandedQuery: string;
  targetRepos?: string[];
}

export interface SkillFilter {
  id: string;
  text: string;
}

export type SeniorityFilter = "any" | "junior" | "mid" | "senior";

// P25: Pre-configured chips with direct repo mappings (bypass AI parsing)
export const DEFAULT_SUGGESTIONS: SuggestionChip[] = [
  { label: "Rust systems engineers", expandedQuery: "Rust systems engineers — repos like rust-lang/rust, tokio-rs/tokio, denoland/deno", targetRepos: ["rust-lang/rust", "tokio-rs/tokio", "denoland/deno", "rust-lang/cargo", "bytecodealliance/wasmtime"] },
  { label: "React accessibility experts", expandedQuery: "React accessibility experts — repos like facebook/react, jsx-eslint/eslint-plugin-jsx-a11y, reach/reach-ui", targetRepos: ["facebook/react", "jsx-eslint/eslint-plugin-jsx-a11y", "radix-ui/primitives", "adobe/react-spectrum"] },
  { label: "ML infrastructure", expandedQuery: "ML infrastructure engineers — repos like pytorch/pytorch, huggingface/transformers, ray-project/ray", targetRepos: ["pytorch/pytorch", "huggingface/transformers", "ray-project/ray", "mlflow/mlflow", "tensorflow/tensorflow"] },
  { label: "Kubernetes contributors", expandedQuery: "Kubernetes contributors — repos like kubernetes/kubernetes, helm/helm, istio/istio", targetRepos: ["kubernetes/kubernetes", "helm/helm", "istio/istio", "argoproj/argo-cd", "prometheus/prometheus"] },
  { label: "Security researchers", expandedQuery: "Security researchers — repos like OWASP/CheatSheetSeries, sqlmapproject/sqlmap, rapid7/metasploit-framework", targetRepos: ["OWASP/CheatSheetSeries", "sqlmapproject/sqlmap", "rapid7/metasploit-framework", "zaproxy/zaproxy"] },
];

const BOT_USERNAME_PATTERN = /\b(bot|dependabot|renovate|greenkeeper|snyk|codecov|github-actions|automator|copilot)\b/i;

export function isLikelyBot(dev: Pick<Developer, "username">): boolean {
  if (BOT_USERNAME_PATTERN.test(dev.username || "")) return true;
  if ((dev.username || "").endsWith("-bot") || (dev.username || "").endsWith("[bot]")) return true;
  return false;
}

export function computeSkillMatch(dev: Developer, skills: SkillFilter[]): number {
  if (skills.length === 0) return -1;
  const activeSkills = skills.filter(s => s.text.trim());
  if (activeSkills.length === 0) return -1;
  const searchText = [
    dev.bio || "", dev.about || "", dev.name || "",
    ...(dev.topLanguages || []).map((l) => l.name || ""),
    ...(dev.highlights || []),
    ...Object.keys(dev.contributedRepos || {}),
  ].join(" ").toLowerCase();
  let totalPossible = 0, earned = 0;
  activeSkills.forEach((skill, idx) => {
    const weight = Math.max(2, 10 - idx * 2);
    totalPossible += weight;
    const keywords = skill.text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const matched = keywords.filter(kw => searchText.includes(kw)).length;
    if (keywords.length > 0) earned += weight * (matched / keywords.length);
  });
  return totalPossible > 0 ? Math.round((earned / totalPossible) * 100) : 0;
}

export function estimateSeniority(dev: Pick<Developer, "joinedYear" | "score">): SeniorityFilter {
  const yearsActive = new Date().getFullYear() - (dev.joinedYear || new Date().getFullYear());
  if (yearsActive >= 8 || dev.score >= 70) return "senior";
  if (yearsActive >= 4 || dev.score >= 40) return "mid";
  return "junior";
}
