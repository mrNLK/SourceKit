const ROLE_NOUNS = "engineer|engineers|developer|developers|researcher|researchers|scientist|scientists|architect|architects|designer|designers|manager|managers|lead|leads|founder|founders|cto|head|director|analyst|analysts|specialist|specialists";
const ROLE_RE = new RegExp(`((?:[A-Za-z+#/.-]+\\s+){0,3}(?:${ROLE_NOUNS}))\\b`, "i");
const FILLER = /^(find|search|looking|for|me|some|the|a|an|top|best|with|who|that|and|of|in)\s+/i;

const titleCase = (s: string) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase());

/** Short, human role category (e.g. "ML Infrastructure Engineer") from a job title or long search query. */
export function deriveRoleCategory(jobTitle?: string | null, query?: string | null): string {
  const title = (jobTitle || "").trim();
  if (title && title.length <= 60) return title;
  const text = (title || query || "").replace(/\s+/g, " ").trim();
  if (!text) return "General";
  const firstClause = text.split(/[,.;:()\n]| who | with | that /i)[0].trim();
  const m = firstClause.match(ROLE_RE) || text.match(ROLE_RE);
  let cat = (m ? m[1] : firstClause.split(" ").slice(0, 4).join(" ")).trim();
  while (FILLER.test(cat)) cat = cat.replace(FILLER, "");
  cat = cat.replace(/s$/i, (x) => (/(engineers|developers|researchers|scientists|architects|designers|managers|leads|founders|analysts|specialists)$/i.test(cat) ? "" : x));
  if (cat.length > 48) cat = `${cat.slice(0, 45).trim()}…`;
  return titleCase(cat || "General");
}
