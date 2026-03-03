/**
 * EEA — Evidence of Exceptional Ability
 *
 * Based on the 6 USCIS O-1A / EB-1A criteria, adapted for tech talent
 * sourcing. Plus 2 supplementary GitHub-specific signals that strengthen
 * the overall picture.
 *
 * USCIS Criteria (primary — weighted 10% each = 60% total):
 *   1. Original Contributions of Major Significance
 *   2. Critical or Leading Role in Distinguished Organizations
 *   3. Published Material & Expert Recognition
 *   4. Judging & Peer Review
 *   5. High Salary or Remuneration
 *   6. Membership in Exclusive Associations
 *
 * Supplementary Signals (weighted 8% each = 40% total):
 *   7. Sustained Technical Excellence
 *   8. Technical Profile (Depth + Breadth)
 *   9. Velocity & Trajectory — output relative to account age
 *  10. Builder DNA — prolific shipping, hackathon signals, maker mentality
 *  11. Early Mover — emerging tech adoption before the crowd
 *
 * Strength scale:
 *   0 = Not Detected — no measurable signal from public data
 *   1 = Emerging     — early or indirect signals
 *   2 = Moderate     — clear supporting evidence
 *   3 = Strong       — compelling evidence, above average
 *   4 = Exceptional  — top-tier, rare — would stand on its own
 *
 * NOTE: GitHub data provides a partial view. Many EEA signals (salary,
 * patents, formal awards) require documentation beyond what's publicly
 * available. The "Needs Documentation" notes flag where manual evidence
 * should supplement the automated scoring.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EEAStrength = 0 | 1 | 2 | 3 | 4;

export interface EEADimension {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  criterion: 'uscis' | 'supplementary';
  uscisMapping: string;
  description: string;
  strength: EEAStrength;
  evidence: string[];
  needsDocumentation: string[];
}

export interface EEATier {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export interface EEAProfile {
  dimensions: EEADimension[];
  overallScore: number; // 0–100
  tier: EEATier;
  topSignals: string[];
  strongCount: number; // dimensions with strength >= 3
  documentationGaps: string[]; // things that need manual evidence
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const STRENGTH_LABELS: Record<EEAStrength, string> = {
  0: 'Not Detected',
  1: 'Emerging',
  2: 'Moderate',
  3: 'Strong',
  4: 'Exceptional',
};

export const STRENGTH_COLORS: Record<EEAStrength, { text: string; bg: string; border: string; bar: string }> = {
  0: { text: 'text-muted-foreground/40', bg: 'bg-muted/20', border: 'border-border', bar: 'bg-muted-foreground/15' },
  1: { text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/25', bar: 'bg-sky-500/60' },
  2: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/25', bar: 'bg-amber-500/60' },
  3: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', bar: 'bg-emerald-500/60' },
  4: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/25', bar: 'bg-purple-500/60' },
};

const TIERS: { min: number; tier: EEATier }[] = [
  { min: 70, tier: { label: 'Exceptional EEA Case', color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' } },
  { min: 50, tier: { label: 'Strong EEA Signals', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' } },
  { min: 30, tier: { label: 'Moderate EEA Signals', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' } },
  { min: 10, tier: { label: 'Some EEA Signals', color: 'text-sky-400', bgColor: 'bg-sky-500/10', borderColor: 'border-sky-500/30' } },
  { min: 0, tier: { label: 'Limited Data', color: 'text-muted-foreground', bgColor: 'bg-secondary', borderColor: 'border-border' } },
];

// ---------------------------------------------------------------------------
// Input shape
// ---------------------------------------------------------------------------

export interface CandidateData {
  stars?: number;
  followers?: number;
  public_repos?: number;
  joined_year?: number;
  top_languages?: { name: string; percentage: number }[];
  highlights?: string[];
  contributed_repos?: Record<string, number>;
  bio?: string;
  about?: string;
  is_hidden_gem?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bioContains(bio: string, words: string[]): boolean {
  const lower = bio.toLowerCase();
  return words.some(w => {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(lower);
  });
}

// ---------------------------------------------------------------------------
// 1. Original Contributions of Major Significance
// ---------------------------------------------------------------------------

function scoreOriginalContributions(d: CandidateData): EEADimension {
  const stars = d.stars || 0;
  const bio = ((d.bio || '') + ' ' + (d.about || '')).toLowerCase();
  const evidence: string[] = [];
  const needsDocumentation: string[] = [];
  let strength: EEAStrength = 0;

  // Star thresholds (5000+ = strong case per Arvian guidance)
  if (stars >= 5000) {
    strength = 4;
    evidence.push(`${stars.toLocaleString()} total stars - exceptional open-source adoption`);
  } else if (stars >= 1000) {
    strength = 3;
    evidence.push(`${stars.toLocaleString()} total stars - significant community validation`);
  } else if (stars >= 200) {
    strength = 2;
    evidence.push(`${stars.toLocaleString()} total stars - growing adoption`);
  } else if (stars >= 50) {
    strength = 1;
    evidence.push(`${stars.toLocaleString()} stars - early traction`);
  }

  // Check highlights for high-star individual repos
  const highlights = d.highlights || [];
  const highStarRepos = highlights.filter(h => {
    const m = h.match(/\((\d+)⭐\)/);
    return m && parseInt(m[1]) >= 100;
  });
  if (highStarRepos.length > 0) {
    evidence.push(`${highStarRepos.length} repo(s) with 100+ stars individually`);
    if (strength < 2) strength = 2 as EEAStrength;
  }

  // Bio signals for patents, novel work
  if (bioContains(bio, ['patent', 'invented', 'invention', 'novel'])) {
    evidence.push('Bio mentions patents or novel inventions');
    if (strength < 2) strength = 2 as EEAStrength;
  }

  if (bioContains(bio, ['benchmark', 'state-of-the-art', 'sota', 'leaderboard'])) {
    evidence.push('Bio mentions benchmarks or state-of-the-art results');
    if (strength < 2) strength = 2 as EEAStrength;
  }

  // Documentation gaps
  if (stars < 5000) needsDocumentation.push('Third-party adoption letters showing production use of tools/libraries');
  needsDocumentation.push('Patent filings or technical benchmark documentation');

  return {
    id: 'original_contributions',
    label: 'Original Contributions of Major Significance',
    shortLabel: 'Original Work',
    icon: '',
    criterion: 'uscis',
    uscisMapping: 'Original contributions of major significance to the field',
    description: 'Novel work, open-source projects with high adoption, patents, or benchmark-setting results',
    strength, evidence, needsDocumentation,
  };
}

// ---------------------------------------------------------------------------
// 2. Critical or Leading Role in Distinguished Organizations
// ---------------------------------------------------------------------------

function scoreCriticalRole(d: CandidateData): EEADimension {
  const bio = ((d.bio || '') + ' ' + (d.about || '')).toLowerCase();
  const repos = d.contributed_repos || {};
  const entries = Object.entries(repos);
  const maxCommits = entries.reduce((max, [, c]) => Math.max(max, c as number), 0);
  const repoCount = entries.length;
  const evidence: string[] = [];
  const needsDocumentation: string[] = [];
  let strength: EEAStrength = 0;

  // Leadership signals from bio
  const leadershipSignals: string[] = [];
  if (bioContains(bio, ['founder', 'co-founder', 'cofounder'])) leadershipSignals.push('Founder / Co-founder');
  if (bioContains(bio, ['cto', 'chief technology', 'chief technical'])) leadershipSignals.push('CTO');
  if (bioContains(bio, ['ceo', 'chief executive'])) leadershipSignals.push('CEO');
  if (bioContains(bio, ['vp eng', 'vp of eng', 'vice president', 'head of eng', 'director of eng', 'engineering lead', 'lead engineer', 'staff engineer', 'principal engineer'])) leadershipSignals.push('Engineering Leadership');
  if (bioContains(bio, ['lead scientist', 'chief scientist', 'head of research', 'research lead'])) leadershipSignals.push('Research Leadership');

  for (const s of leadershipSignals) evidence.push(`Bio indicates: ${s}`);

  // VC / startup signals
  if (bioContains(bio, ['y combinator', 'yc ', 'sequoia', 'andreessen', 'a16z', 'benchmark', 'greylock', 'accel', 'vc-backed', 'series a', 'series b', 'raised'])) {
    evidence.push('Bio mentions VC backing or startup funding');
    leadershipSignals.push('VC-backed');
  }

  // Distinguished org signals
  if (bioContains(bio, ['google', 'meta', 'facebook', 'apple', 'amazon', 'microsoft', 'netflix', 'stripe', 'openai', 'anthropic', 'deepmind'])) {
    evidence.push('Bio mentions work at a distinguished organization');
    leadershipSignals.push('Distinguished org');
  }

  // Score based on combined leadership + contribution signals
  if (leadershipSignals.length >= 2 && maxCommits >= 50) {
    strength = 4;
  } else if (leadershipSignals.length >= 1 && (maxCommits >= 30 || repoCount >= 3)) {
    strength = 3;
  } else if (leadershipSignals.length >= 1 || (maxCommits >= 50 && repoCount >= 3)) {
    strength = 2;
  } else if (maxCommits >= 20 || repoCount >= 2) {
    strength = 1;
    evidence.push(`Core contributor to ${repoCount} project(s), up to ${maxCommits} commits`);
  }

  if (repoCount > 0 && entries.length > 0) {
    const top = entries.sort((a, b) => (b[1] as number) - (a[1] as number))[0];
    evidence.push(`Top contribution: ${top[0]} (${top[1]} commits)`);
  }

  needsDocumentation.push('Org charts showing leadership position');
  needsDocumentation.push('Investor letters or board documentation');
  if (leadershipSignals.length === 0) needsDocumentation.push('Evidence of leadership role at a distinguished organization');

  return {
    id: 'critical_role',
    label: 'Critical / Leading Role',
    shortLabel: 'Leadership',
    icon: '',
    criterion: 'uscis',
    uscisMapping: 'Critical or leading role in distinguished organizations',
    description: 'Founder, CTO, Lead Engineer, or core contributor at a VC-backed startup or major org',
    strength, evidence, needsDocumentation,
  };
}

// ---------------------------------------------------------------------------
// 3. Published Material & Expert Recognition
// ---------------------------------------------------------------------------

function scorePublishedMaterial(d: CandidateData): EEADimension {
  const bio = ((d.bio || '') + ' ' + (d.about || '')).toLowerCase();
  const followers = d.followers || 0;
  const evidence: string[] = [];
  const needsDocumentation: string[] = [];
  let strength: EEAStrength = 0;

  const signals: string[] = [];

  // Research / publications
  if (bioContains(bio, ['paper', 'publication', 'published', 'journal', 'arxiv', 'ieee', 'acm', 'neurips', 'nips', 'icml', 'cvpr', 'iclr', 'aaai'])) {
    signals.push('Research publications');
  }
  if (bioContains(bio, ['phd', 'ph.d', 'doctorate', 'doctoral'])) signals.push('PhD');
  if (bioContains(bio, ['professor', 'faculty', 'academia'])) signals.push('Academic position');

  // Media / speaking
  if (bioContains(bio, ['speaker', 'conference', 'talk', 'keynote', 'summit', 'meetup'])) signals.push('Conference speaker');
  if (bioContains(bio, ['blog', 'writing', 'newsletter', 'technical writ', 'author', 'book', 'wrote'])) signals.push('Technical writing / Author');
  if (bioContains(bio, ['techcrunch', 'forbes', 'wired', 'verge', 'featured in', 'press', 'media'])) signals.push('Media coverage');

  // Community recognition (followers as proxy for expert status)
  if (followers >= 1000) {
    signals.push(`${followers.toLocaleString()} followers - widely recognized expert`);
  } else if (followers >= 200) {
    signals.push(`${followers.toLocaleString()} followers - notable presence`);
  }

  for (const s of signals) evidence.push(s);

  if (signals.length >= 4) strength = 4;
  else if (signals.length >= 3) strength = 3;
  else if (signals.length >= 2) strength = 2;
  else if (signals.length >= 1) strength = 1;

  if (d.is_hidden_gem) {
    evidence.push('Hidden gem - high output, low public visibility (potential for media coverage)');
  }

  needsDocumentation.push('Links to published articles, papers, or media coverage');
  needsDocumentation.push('Citation counts for academic publications');
  needsDocumentation.push('Expert recommendation letters from independent authorities');

  return {
    id: 'published_material',
    label: 'Published Material & Expert Recognition',
    shortLabel: 'Published',
    icon: '',
    criterion: 'uscis',
    uscisMapping: 'Published material about the person in major media or professional publications',
    description: 'Research papers, media coverage, conference talks, expert recommendations, and community recognition',
    strength, evidence, needsDocumentation,
  };
}

// ---------------------------------------------------------------------------
// 4. Judging & Peer Review
// ---------------------------------------------------------------------------

function scoreJudging(d: CandidateData): EEADimension {
  const bio = ((d.bio || '') + ' ' + (d.about || '')).toLowerCase();
  const repos = d.contributed_repos || {};
  const repoCount = Object.keys(repos).length;
  const stars = d.stars || 0;
  const evidence: string[] = [];
  const needsDocumentation: string[] = [];
  let strength: EEAStrength = 0;

  const signals: string[] = [];

  // Bio signals for reviewing / judging
  if (bioContains(bio, ['reviewer', 'review', 'peer review'])) signals.push('Peer reviewer');
  if (bioContains(bio, ['judge', 'judging', 'jury', 'committee', 'selection'])) signals.push('Judge / Committee member');
  if (bioContains(bio, ['mentor', 'mentoring', 'advisor', 'advisory'])) signals.push('Mentor / Advisor');
  if (bioContains(bio, ['maintainer', 'core team', 'committer'])) signals.push('Open-source maintainer');
  if (bioContains(bio, ['program committee', 'editorial', 'editor'])) signals.push('Program committee / Editorial role');

  // Proxy: maintaining popular repos means you review others' PRs
  if (stars >= 500 && d.public_repos && d.public_repos >= 10) {
    signals.push(`Maintains repos with ${stars.toLocaleString()} total stars - likely reviews community PRs`);
  }

  // Proxy: contributing to many repos suggests code review activity
  if (repoCount >= 4) {
    signals.push(`Active across ${repoCount} projects - cross-project code reviewer`);
  }

  for (const s of signals) evidence.push(s);

  if (signals.length >= 3) strength = 4;
  else if (signals.length >= 2) strength = 3;
  else if (signals.length >= 1) strength = 2;
  else if (repoCount >= 2 || stars >= 100) {
    strength = 1;
    evidence.push('Indirect signals: multi-project contributor or popular repo maintainer');
  }

  needsDocumentation.push('Conference reviewer acceptance letters (NeurIPS, ICML, etc.)');
  needsDocumentation.push('Hackathon judging invitations or committee appointments');
  needsDocumentation.push('PR review history on major open-source projects');

  return {
    id: 'judging',
    label: 'Judging & Peer Review',
    shortLabel: 'Judging',
    icon: '',
    criterion: 'uscis',
    uscisMapping: 'Participation as a judge of the work of others in the field',
    description: 'Conference reviewer, competition judge, open-source maintainer reviewing community contributions',
    strength, evidence, needsDocumentation,
  };
}

// ---------------------------------------------------------------------------
// 5. High Salary or Remuneration
// ---------------------------------------------------------------------------

function scoreRemuneration(d: CandidateData): EEADimension {
  const bio = ((d.bio || '') + ' ' + (d.about || '')).toLowerCase();
  const evidence: string[] = [];
  const needsDocumentation: string[] = [];
  let strength: EEAStrength = 0;

  // This is the hardest criterion to assess from public data.
  // We use proxy signals: founder equity, senior titles, distinguished orgs.

  const proxies: string[] = [];

  if (bioContains(bio, ['founder', 'co-founder', 'cofounder'])) proxies.push('Founder - likely significant equity stake');
  if (bioContains(bio, ['cto', 'ceo', 'chief', 'vp ', 'vice president'])) proxies.push('C-level / VP title - typically above-market compensation');
  if (bioContains(bio, ['staff engineer', 'principal engineer', 'distinguished engineer', 'fellow'])) proxies.push('Senior IC title - premium compensation band');
  if (bioContains(bio, ['google', 'meta', 'facebook', 'apple', 'amazon', 'microsoft', 'netflix', 'stripe', 'openai', 'anthropic'])) proxies.push('FAANG / top-tier company - high compensation');

  for (const p of proxies) evidence.push(p);

  if (proxies.length >= 3) strength = 3;
  else if (proxies.length >= 2) strength = 2;
  else if (proxies.length >= 1) strength = 1;

  // Strength capped at 3 from proxies alone — needs actual docs for 4
  if (evidence.length === 0) {
    evidence.push('No salary signals detected from public profile - requires documentation');
  }

  needsDocumentation.push('Pay stubs, offer letters, or W-2 showing above-market compensation');
  needsDocumentation.push('Cap table or 409A valuation showing equity value');
  needsDocumentation.push('Comparable salary data (e.g., levels.fyi) showing top-percentile pay');

  return {
    id: 'remuneration',
    label: 'High Salary or Remuneration',
    shortLabel: 'Remuneration',
    icon: '',
    criterion: 'uscis',
    uscisMapping: 'High salary or remuneration relative to others in the field',
    description: 'Above-market compensation, significant equity, or investor-validated valuation',
    strength, evidence, needsDocumentation,
  };
}

// ---------------------------------------------------------------------------
// 6. Membership in Exclusive Associations
// ---------------------------------------------------------------------------

function scoreMembership(d: CandidateData): EEADimension {
  const bio = ((d.bio || '') + ' ' + (d.about || '')).toLowerCase();
  const evidence: string[] = [];
  const needsDocumentation: string[] = [];
  let strength: EEAStrength = 0;

  const signals: string[] = [];

  // Research organizations
  if (bioContains(bio, ['aaai', 'acm fellow', 'ieee fellow', 'acm member'])) signals.push('Member of AAAI / ACM / IEEE');
  if (bioContains(bio, ['research consortium', 'research group', 'research lab'])) signals.push('Research group membership');

  // Accelerators & exclusive programs
  if (bioContains(bio, ['y combinator', 'yc ', 'techstars', 'founder institute'])) signals.push('Accelerator alumni (YC, Techstars, etc.)');
  if (bioContains(bio, ['thiel fellow', 'fellowship', 'scholar'])) signals.push('Fellowship / Scholarship recipient');

  // Invitation-only communities
  if (bioContains(bio, ['invited', 'invitation-only', 'selected', 'accepted to'])) signals.push('Invitation-only program');

  // GitHub org memberships (proxy — being in a major org's GitHub implies membership)
  const repos = d.contributed_repos || {};
  const majorOrgs = Object.keys(repos).filter(r => {
    const org = r.split('/')[0]?.toLowerCase() || '';
    return ['google', 'facebook', 'meta', 'microsoft', 'apple', 'amazon', 'tensorflow', 'pytorch', 'huggingface', 'kubernetes', 'rust-lang', 'golang', 'nodejs', 'apache', 'mozilla', 'linux'].includes(org);
  });
  if (majorOrgs.length > 0) {
    signals.push(`Contributor to distinguished org repos: ${majorOrgs.map(r => r.split('/')[0]).join(', ')}`);
  }

  for (const s of signals) evidence.push(s);

  if (signals.length >= 3) strength = 4;
  else if (signals.length >= 2) strength = 3;
  else if (signals.length >= 1) strength = 2;
  else {
    // Check if we have any org-level contribution
    if (Object.keys(repos).length >= 3) {
      strength = 1;
      evidence.push(`Contributor to ${Object.keys(repos).length} organizations - potential membership evidence`);
    }
  }

  needsDocumentation.push('Membership certificates or acceptance letters');
  needsDocumentation.push('Accelerator admission documentation');
  needsDocumentation.push('Invitation-only group membership evidence');

  return {
    id: 'membership',
    label: 'Membership in Exclusive Associations',
    shortLabel: 'Membership',
    icon: '',
    criterion: 'uscis',
    uscisMapping: 'Membership in associations requiring outstanding achievements for admission',
    description: 'Membership in AAAI, ACM, YC alumni, research consortiums, or invitation-only groups',
    strength, evidence, needsDocumentation,
  };
}

// ---------------------------------------------------------------------------
// 7. Sustained Technical Excellence (Supplementary)
// ---------------------------------------------------------------------------

function scoreSustainedExcellence(d: CandidateData): EEADimension {
  const year = new Date().getFullYear();
  const yearsActive = d.joined_year ? year - d.joined_year : 0;
  const repos = d.public_repos || 0;
  const evidence: string[] = [];
  let strength: EEAStrength = 0;

  if (yearsActive >= 12 && repos >= 30) {
    strength = 4; evidence.push(`${yearsActive} years on GitHub with ${repos} public repos - exceptional longevity`);
  } else if (yearsActive >= 8 && repos >= 20) {
    strength = 3; evidence.push(`${yearsActive} years of sustained activity, ${repos} repos`);
  } else if (yearsActive >= 5 && repos >= 10) {
    strength = 2; evidence.push(`${yearsActive} years, ${repos} repos`);
  } else if (yearsActive >= 3) {
    strength = 1; evidence.push(`${yearsActive} years on GitHub`);
  }

  if (d.joined_year) evidence.push(`Active since ${d.joined_year}`);

  return {
    id: 'sustained_excellence',
    label: 'Sustained Technical Excellence',
    shortLabel: 'Sustained',
    icon: '',
    criterion: 'supplementary',
    uscisMapping: 'Supplementary: demonstrates consistent track record over time',
    description: 'Long track record of consistent open-source contribution and growth',
    strength, evidence, needsDocumentation: [],
  };
}

// ---------------------------------------------------------------------------
// 8. Technical Profile (Supplementary)
// ---------------------------------------------------------------------------

function scoreTechnicalProfile(d: CandidateData): EEADimension {
  const langs = d.top_languages || [];
  const repos = d.public_repos || 0;
  const highlights = d.highlights || [];
  const evidence: string[] = [];
  let strength: EEAStrength = 0;

  // Breadth
  const hasBreath = langs.length >= 3;
  // Depth
  const topLang = langs[0];
  const hasDepth = topLang && topLang.percentage >= 40 && repos >= 10;

  if (hasBreath && hasDepth && repos >= 20) {
    strength = 4;
    evidence.push(`${langs.length} languages with ${topLang!.percentage}% depth in ${topLang!.name} across ${repos} repos`);
  } else if ((hasBreath && repos >= 15) || (hasDepth && repos >= 15)) {
    strength = 3;
    evidence.push(`${langs.length} languages, ${repos} repos${hasDepth ? `, deep in ${topLang!.name}` : ''}`);
  } else if (langs.length >= 2 && repos >= 8) {
    strength = 2;
    evidence.push(`${langs.length} languages, ${repos} repos`);
  } else if (langs.length >= 1) {
    strength = 1;
    evidence.push(`Primary: ${langs[0].name}`);
  }

  if (langs.length > 0) evidence.push(`Stack: ${langs.map(l => l.name).join(', ')}`);

  if (highlights.length >= 2) {
    evidence.push(`${highlights.length} notable projects`);
    if (strength < 2) strength = 2 as EEAStrength;
  }

  return {
    id: 'technical_profile',
    label: 'Technical Profile',
    shortLabel: 'Tech Profile',
    icon: '',
    criterion: 'supplementary',
    uscisMapping: 'Supplementary: demonstrates technical depth and breadth',
    description: 'Technical versatility, language expertise, and project diversity',
    strength, evidence, needsDocumentation: [],
  };
}

// ---------------------------------------------------------------------------
// 9. Velocity & Trajectory (Supplementary)
// ---------------------------------------------------------------------------

function scoreVelocity(d: CandidateData): EEADimension {
  const year = new Date().getFullYear();
  const yearsActive = d.joined_year ? Math.max(year - d.joined_year, 1) : 0;
  const repos = d.public_repos || 0;
  const stars = d.stars || 0;
  const evidence: string[] = [];
  let strength: EEAStrength = 0;

  if (yearsActive === 0) {
    return {
      id: 'velocity',
      label: 'Velocity & Trajectory',
      shortLabel: 'Velocity',
      icon: '',
      criterion: 'supplementary',
      uscisMapping: 'Supplementary: rate of output and growth trajectory',
      description: 'How fast they ship relative to time on platform - high slope signals ambition and momentum',
      strength: 0, evidence: ['Account age unknown - cannot assess velocity'], needsDocumentation: [],
    };
  }

  const reposPerYear = repos / yearsActive;
  const starsPerYear = stars / yearsActive;

  // Repos/year thresholds
  if (reposPerYear >= 15) {
    evidence.push(`${reposPerYear.toFixed(1)} repos/year - extremely prolific`);
  } else if (reposPerYear >= 8) {
    evidence.push(`${reposPerYear.toFixed(1)} repos/year - high output`);
  } else if (reposPerYear >= 4) {
    evidence.push(`${reposPerYear.toFixed(1)} repos/year - solid cadence`);
  }

  // Stars/year — traction velocity
  if (starsPerYear >= 500) {
    evidence.push(`${starsPerYear.toFixed(0)} stars/year - viral growth`);
  } else if (starsPerYear >= 100) {
    evidence.push(`${starsPerYear.toFixed(0)} stars/year - strong traction`);
  } else if (starsPerYear >= 25) {
    evidence.push(`${starsPerYear.toFixed(0)} stars/year - growing`);
  }

  // Young account with outsized output = high slope
  if (yearsActive <= 4 && repos >= 30) {
    evidence.push(`${repos} repos in only ${yearsActive} year(s) - high slope builder`);
  }
  if (yearsActive <= 3 && stars >= 200) {
    evidence.push(`${stars} stars in only ${yearsActive} year(s) - rapid community traction`);
  }

  // Scoring
  if ((reposPerYear >= 15 && starsPerYear >= 100) || (yearsActive <= 3 && stars >= 500)) {
    strength = 4;
  } else if (reposPerYear >= 10 || starsPerYear >= 100 || (yearsActive <= 4 && repos >= 30)) {
    strength = 3;
  } else if (reposPerYear >= 6 || starsPerYear >= 25) {
    strength = 2;
  } else if (reposPerYear >= 3 || starsPerYear >= 5) {
    strength = 1;
  }

  if (evidence.length === 0) evidence.push(`${reposPerYear.toFixed(1)} repos/year over ${yearsActive} years`);

  return {
    id: 'velocity',
    label: 'Velocity & Trajectory',
    shortLabel: 'Velocity',
    icon: '',
    criterion: 'supplementary',
    uscisMapping: 'Supplementary: rate of output and growth trajectory',
    description: 'How fast they ship relative to time on platform - high slope signals ambition and momentum',
    strength, evidence, needsDocumentation: [],
  };
}

// ---------------------------------------------------------------------------
// 10. Builder DNA (Supplementary)
// ---------------------------------------------------------------------------

function scoreBuilderDNA(d: CandidateData): EEADimension {
  const bio = ((d.bio || '') + ' ' + (d.about || '')).toLowerCase();
  const repos = d.public_repos || 0;
  const highlights = d.highlights || [];
  const evidence: string[] = [];
  let strength: EEAStrength = 0;

  const signals: string[] = [];

  // Hackathon signals
  if (bioContains(bio, ['hackathon', 'hack day', 'hacka', 'devpost', 'mlh'])) {
    signals.push('Hackathon participant/winner');
  }

  // Maker/builder identity
  if (bioContains(bio, ['maker', 'builder', 'hacker', 'tinkerer', 'indie', 'shipping', 'ship fast', 'build in public', 'buildinpublic'])) {
    signals.push('Self-identifies as builder/maker');
  }

  // Side project / product signals
  if (bioContains(bio, ['side project', 'weekend project', 'launched', 'product hunt', 'indie hacker', 'indiehacker', 'saas', 'bootstrapped'])) {
    signals.push('Ships side projects / products');
  }

  // Prolific repo output — builders create lots of things
  if (repos >= 50) {
    signals.push(`${repos} public repos - prolific builder`);
  } else if (repos >= 25) {
    signals.push(`${repos} public repos - active builder`);
  }

  // Diverse highlights = ships across domains
  if (highlights.length >= 5) {
    signals.push(`${highlights.length} notable projects - builds across domains`);
  } else if (highlights.length >= 3) {
    signals.push(`${highlights.length} notable projects`);
  }

  // Contributing to many different repos = collaborative builder
  const contribCount = Object.keys(d.contributed_repos || {}).length;
  if (contribCount >= 6) {
    signals.push(`Contributes to ${contribCount} projects - collaborative builder`);
  }

  // Open-source as a way of life
  if (bioContains(bio, ['open source', 'open-source', 'oss', 'foss'])) {
    signals.push('Open-source advocate');
  }

  for (const s of signals) evidence.push(s);

  if (signals.length >= 5) strength = 4;
  else if (signals.length >= 3) strength = 3;
  else if (signals.length >= 2) strength = 2;
  else if (signals.length >= 1) strength = 1;

  // Bonus: is_hidden_gem is strong builder DNA signal
  if (d.is_hidden_gem) {
    evidence.push('Hidden gem - high output without self-promotion, pure builder');
    if (strength < 2) strength = 2 as EEAStrength;
  }

  return {
    id: 'builder_dna',
    label: 'Builder DNA',
    shortLabel: 'Builder',
    icon: '',
    criterion: 'supplementary',
    uscisMapping: 'Supplementary: prolific shipping, hackathon participation, maker mentality',
    description: 'Hackathon energy, side projects, prolific repo output - scrappy builders who ship fast and often',
    strength, evidence, needsDocumentation: [],
  };
}

// ---------------------------------------------------------------------------
// 11. Early Mover (Supplementary)
// ---------------------------------------------------------------------------

function scoreEarlyMover(d: CandidateData): EEADimension {
  const langs = d.top_languages || [];
  const bio = ((d.bio || '') + ' ' + (d.about || '')).toLowerCase();
  const highlights = d.highlights || [];
  const highlightText = highlights.join(' ').toLowerCase();
  const evidence: string[] = [];
  let strength: EEAStrength = 0;

  const signals: string[] = [];

  // Emerging languages — adopting before the crowd
  const emergingLangs = ['rust', 'zig', 'nim', 'mojo', 'gleam', 'vlang', 'carbon'];
  const emergingRuntime = ['bun', 'deno', 'tauri', 'leptos', 'htmx', 'solid'];
  const emergingAI = ['langchain', 'llamaindex', 'autogpt', 'crewai', 'rag', 'llm', 'fine-tun', 'embeddings', 'vector db', 'vectordb'];
  const emergingWeb3 = ['solidity', 'move', 'cairo', 'sui', 'aptos'];

  const langNames = langs.map(l => l.name.toLowerCase());

  for (const el of emergingLangs) {
    if (langNames.includes(el)) signals.push(`Early adopter: ${el}`);
  }

  // Check bio + highlights for emerging tech
  for (const et of emergingRuntime) {
    if (bio.includes(et) || highlightText.includes(et)) signals.push(`Uses emerging tool: ${et}`);
  }
  for (const ai of emergingAI) {
    if (bio.includes(ai) || highlightText.includes(ai)) signals.push(`Working in emerging AI: ${ai}`);
  }
  for (const w3 of emergingWeb3) {
    if (langNames.includes(w3) || bio.includes(w3)) signals.push(`Frontier Web3: ${w3}`);
  }

  // General frontier signals from bio
  if (bioContains(bio, ['cutting edge', 'cutting-edge', 'bleeding edge', 'frontier', 'experimental', 'research'])) {
    signals.push('Bio signals frontier/experimental work');
  }
  if (bioContains(bio, ['wasm', 'webassembly', 'web assembly'])) {
    signals.push('WebAssembly - emerging compile target');
  }

  for (const s of signals) evidence.push(s);

  // Deduplicate and score
  if (signals.length >= 4) strength = 4;
  else if (signals.length >= 3) strength = 3;
  else if (signals.length >= 2) strength = 2;
  else if (signals.length >= 1) strength = 1;

  return {
    id: 'early_mover',
    label: 'Early Mover',
    shortLabel: 'Early Mover',
    icon: '',
    criterion: 'supplementary',
    uscisMapping: 'Supplementary: early adoption of emerging technologies',
    description: 'Adopts new languages, frameworks, and paradigms before they go mainstream - signal of technical intuition',
    strength, evidence, needsDocumentation: [],
  };
}

// ---------------------------------------------------------------------------
// Main scorer
// ---------------------------------------------------------------------------

function getTier(score: number): EEATier {
  for (const t of TIERS) {
    if (score >= t.min) return t.tier;
  }
  return TIERS[TIERS.length - 1].tier;
}

export function computeEEA(data: CandidateData): EEAProfile {
  const dimensions = [
    scoreOriginalContributions(data),
    scoreCriticalRole(data),
    scorePublishedMaterial(data),
    scoreJudging(data),
    scoreRemuneration(data),
    scoreMembership(data),
    scoreSustainedExcellence(data),
    scoreTechnicalProfile(data),
    scoreVelocity(data),
    scoreBuilderDNA(data),
    scoreEarlyMover(data),
  ];

  // Weighted scoring: USCIS 10% each (6 × 10 = 60%), supplementary 8% each (5 × 8 = 40%)
  const uscisWeight = 10;
  const suppWeight = 8;
  const overallScore = Math.round(
    dimensions.reduce((sum, dim) => {
      const weight = dim.criterion === 'uscis' ? uscisWeight : suppWeight;
      return sum + (dim.strength / 4) * weight;
    }, 0)
  );

  const strongCount = dimensions.filter(dim => dim.strength >= 3).length;

  const topSignals = dimensions
    .filter(dim => dim.strength >= 2)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3)
    .map(dim => `${dim.icon} ${dim.shortLabel}: ${dim.evidence[0] || STRENGTH_LABELS[dim.strength]}`);

  const documentationGaps = dimensions
    .filter(dim => dim.criterion === 'uscis' && dim.strength < 3)
    .flatMap(dim => dim.needsDocumentation.slice(0, 1))
    .slice(0, 4);

  return { dimensions, overallScore, tier: getTier(overallScore), topSignals, strongCount, documentationGaps };
}

/**
 * Convert a Developer search result (camelCase) or candidate row (snake_case)
 * into the shape computeEEA expects.
 */
export function developerToCandidate(dev: Record<string, unknown>): CandidateData {
  return {
    stars: dev.stars ?? dev.totalStars ?? 0,
    followers: dev.followers ?? 0,
    public_repos: dev.publicRepos ?? dev.public_repos ?? 0,
    joined_year: dev.joinedYear ?? dev.joined_year ?? undefined,
    top_languages: dev.topLanguages ?? dev.top_languages ?? [],
    highlights: dev.highlights ?? [],
    contributed_repos: dev.contributedRepos ?? dev.contributed_repos ?? {},
    bio: dev.bio ?? '',
    about: dev.about ?? '',
    is_hidden_gem: dev.hiddenGem ?? dev.is_hidden_gem ?? false,
  };
}
