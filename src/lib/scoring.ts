import type { Candidate, Signal, GitHubProfile } from '../types'

interface ScoreWeights {
  phd: number
  top_company: number
  top_company_max: number
  top_university: number
  publications: number
  conferences: number
  open_source: number
  patents: number
  leadership: number
  experience_10_plus: number
}

const WEIGHTS: ScoreWeights = {
  phd: 15,
  top_company: 10,
  top_company_max: 20,
  top_university: 10,
  publications: 15,
  conferences: 10,
  open_source: 10,
  patents: 10,
  leadership: 10,
  experience_10_plus: 5,
}

const TOP_COMPANIES = [
  'google', 'meta', 'apple', 'amazon', 'microsoft', 'netflix',
  'openai', 'anthropic', 'stripe', 'databricks', 'snowflake',
  'nvidia', 'tesla', 'spacex', 'palantir', 'figma', 'vercel',
  'github', 'gitlab', 'hashicorp', 'datadog', 'cloudflare',
]

const TOP_UNIVERSITIES = [
  'mit', 'stanford', 'cmu', 'carnegie mellon', 'berkeley', 'caltech',
  'harvard', 'princeton', 'yale', 'oxford', 'cambridge', 'eth zurich',
  'georgia tech', 'university of washington', 'cornell', 'columbia',
  'university of illinois', 'uiuc', 'university of michigan',
]

export function calculateScore(candidate: Candidate): number {
  let score = 0
  const signals = candidate.signals || []

  if (signals.some(s => s.type === 'degree' && s.label.toLowerCase().includes('phd'))) {
    score += WEIGHTS.phd
  }

  const companySignals = signals.filter(s => s.type === 'company')
  let companyScore = 0
  for (const s of companySignals) {
    if (TOP_COMPANIES.some(c => s.label.toLowerCase().includes(c))) {
      companyScore += WEIGHTS.top_company
    }
  }
  score += Math.min(companyScore, WEIGHTS.top_company_max)

  if (signals.some(s => s.type === 'university' &&
    TOP_UNIVERSITIES.some(u => s.label.toLowerCase().includes(u)))) {
    score += WEIGHTS.top_university
  }

  if (signals.some(s => s.type === 'publication')) score += WEIGHTS.publications
  if (signals.some(s => s.type === 'conference')) score += WEIGHTS.conferences
  if (signals.some(s => s.type === 'open_source')) score += WEIGHTS.open_source
  if (signals.some(s => s.type === 'patent')) score += WEIGHTS.patents
  if (signals.some(s => s.type === 'leadership')) score += WEIGHTS.leadership
  if (signals.some(s => s.type === 'experience' &&
    parseInt(s.value || '0') >= 10)) score += WEIGHTS.experience_10_plus

  // GitHub profile bonus
  if (candidate.github_profile) {
    score += calculateGitHubBonus(candidate.github_profile)
  }

  return Math.min(100, score)
}

function calculateGitHubBonus(profile: GitHubProfile): number {
  let bonus = 0
  const sp = profile.skill_profile

  if (sp.overall_score >= 80) bonus += 10
  else if (sp.overall_score >= 60) bonus += 5

  if (sp.depth_score >= 80) bonus += 5
  if (sp.collaboration_score >= 70) bonus += 3

  if (profile.public_repos >= 50) bonus += 3
  else if (profile.public_repos >= 20) bonus += 1

  // Follower-based bonus (scaled for high-profile engineers)
  if (profile.followers >= 1000) bonus += 5
  else if (profile.followers >= 500) bonus += 4
  else if (profile.followers >= 100) bonus += 3
  else if (profile.followers >= 50) bonus += 1

  const totalStars = profile.repositories.reduce((sum, r) => sum + r.stars, 0)
  if (totalStars >= 10000) bonus += 8
  else if (totalStars >= 1000) bonus += 5
  else if (totalStars >= 100) bonus += 2

  // Bonus for high-impact repos (repos with 1000+ stars)
  const highImpactRepos = profile.repositories.filter(r => r.stars >= 1000)
  if (highImpactRepos.length >= 3) bonus += 5
  else if (highImpactRepos.length >= 1) bonus += 3

  // Bonus for high contribution volume
  const totalContributions = profile.repositories.reduce((sum, r) => sum + (r.contributions || 0), 0)
  if (totalContributions >= 1000) bonus += 5
  else if (totalContributions >= 500) bonus += 3
  else if (totalContributions >= 100) bonus += 1

  return Math.min(bonus, 30)
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#00e5a0'
  if (score >= 60) return '#eab308'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Low'
}

export function parseSignals(text: string): Signal[] {
  const signals: Signal[] = []
  const lower = text.toLowerCase()

  // University detection
  for (const uni of TOP_UNIVERSITIES) {
    if (lower.includes(uni)) {
      signals.push({ type: 'university', label: uni.replace(/\b\w/g, c => c.toUpperCase()) })
    }
  }

  // Company detection
  for (const company of TOP_COMPANIES) {
    if (lower.includes(company)) {
      signals.push({ type: 'company', label: company.replace(/\b\w/g, c => c.toUpperCase()) })
    }
  }

  // Degree detection
  if (/\bph\.?d\b/i.test(text)) signals.push({ type: 'degree', label: 'PhD' })
  if (/\bm\.?s\.?\b/i.test(text) || /master/i.test(text)) signals.push({ type: 'degree', label: 'Masters' })

  // Publication detection — require academic context
  // "published at NeurIPS" matches, "published on Medium" or "published a blog post" does NOT
  if (/\bpublications?\b/i.test(text) ||
      /\barxiv\b/i.test(text) ||
      /\bpublished\s+(?:at|in)\s+(?:NeurIPS|ICML|CVPR|ACL|ICLR|AAAI|SIGMOD|VLDB|SOSP|OSDI|Nature|Science|IEEE|ACM)\b/i.test(text) ||
      /\b(?:research\s+)?paper(?:s)?\s+(?:at|in|on)\b/i.test(text) ||
      /\bjournal\s+(?:of|paper|article)/i.test(text)) {
    signals.push({ type: 'publication', label: 'Publications' })
  }

  // Conference detection
  if (/\b(?:nips|neurips|icml|cvpr|acl|iclr|sigmod|osdi|sosp|aaai|vldb)\b/i.test(text) ||
      /\bconference\s+(?:speaker|talk|presentation|paper)/i.test(text) ||
      /\bspoke\s+at\s+\w+/i.test(text)) {
    signals.push({ type: 'conference', label: 'Conference Speaker' })
  }

  // Open source detection
  if (/\bopen.?source|contributor|maintainer|committer\b/i.test(text)) {
    signals.push({ type: 'open_source', label: 'Open Source' })
  }

  // Patent detection
  if (/\bpatent/i.test(text)) signals.push({ type: 'patent', label: 'Patents' })

  // Leadership detection — require job title context, not freeform verbs
  // "Director of Engineering" matches, "directed the project" does NOT
  if (/\b(?:vp|vice\s+president)\s+(?:of\s+)?\w/i.test(text) ||
      /\b(?:director|head)\s+of\s+\w/i.test(text) ||
      /\b(?:chief\s+(?:technology|executive|product|operating|data|information))\b/i.test(text) ||
      /\b(?:cto|ceo|cpo|coo|cdo|cio)\b/i.test(text) ||
      /\b(?:co-?founder|founder)\b/i.test(text) ||
      /\b(?:principal|staff)\s+(?:engineer|scientist|architect|developer)/i.test(text) ||
      /\b(?:tech|engineering|team)\s+lead\b/i.test(text)) {
    signals.push({ type: 'leadership', label: 'Leadership' })
  }

  return signals
}
