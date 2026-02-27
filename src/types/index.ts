export type CandidateStage = 'sourced' | 'contacted' | 'responded' | 'screen' | 'offer'

export type SourceType = 'linkedin' | 'github' | 'web' | 'exa'

export interface Candidate {
  id: string
  name: string
  company: string
  role: string
  title?: string
  location?: string
  bio?: string
  avatar_url?: string
  profile_url?: string
  github_handle?: string
  source: SourceType
  enrichment_data: EnrichmentData | null
  github_profile?: GitHubProfile | null
  stage: CandidateStage
  score: number
  notes: string
  tags: string[]
  signals: Signal[]
  created_by?: string
  created_at: string
  updated_at?: string
}

export interface EnrichmentData {
  linkedin_url?: string
  github_url?: string
  twitter_url?: string
  website?: string
  education?: Education[]
  experience?: Experience[]
  skills?: string[]
  publications?: string[]
  patents?: string[]
  raw?: Record<string, unknown>
}

export interface Education {
  institution: string
  degree?: string
  field?: string
  year?: number
}

export interface Experience {
  company: string
  title: string
  duration?: string
  current?: boolean
}

export interface Signal {
  type: SignalType
  label: string
  value?: string
}

export type SignalType =
  | 'university'
  | 'company'
  | 'degree'
  | 'publication'
  | 'conference'
  | 'open_source'
  | 'patent'
  | 'leadership'
  | 'experience'
  | 'skill'

export interface GitHubProfile {
  username: string
  avatar_url: string
  bio?: string
  public_repos: number
  followers: number
  following: number
  contributions_last_year?: number
  top_languages: LanguageStat[]
  skill_profile: SkillProfile
  repositories: GitHubRepo[]
  contribution_patterns?: ContributionPattern
}

export interface LanguageStat {
  language: string
  percentage: number
  bytes: number
}

export interface SkillProfile {
  domains: SkillDomain[]
  overall_score: number
  depth_score: number
  breadth_score: number
  collaboration_score: number
  consistency_score: number
}

export interface SkillDomain {
  name: string
  score: number
  evidence: string[]
  repos: string[]
}

export interface GitHubRepo {
  name: string
  full_name: string
  description?: string
  language?: string
  stars: number
  forks: number
  is_fork: boolean
  topics: string[]
  created_at: string
  updated_at: string
  contributions?: number
}

export interface ContributionPattern {
  total_commits: number
  total_prs: number
  total_reviews: number
  total_issues: number
  commit_frequency: 'daily' | 'weekly' | 'monthly' | 'sporadic'
  peak_hours: number[]
  active_days: number[]
  streak_current: number
  streak_longest: number
}

export interface SearchQuery {
  name?: string
  company?: string
  role?: string
  github_handle?: string
  capability_query?: string
}

export interface SearchHistoryEntry {
  id: string
  query_params: SearchQuery
  result_count: number
  metadata?: SearchHistoryMetadata
  created_by?: string
  created_at: string
}

export interface SearchHistoryMetadata {
  type: 'research_strategy' | 'search'
  strategy?: ResearchStrategy
  role?: string
  company?: string
}

export interface ResearchStrategy {
  jobTitle: string
  companyName: string
  searchQueries: string[]
  targetCompanies: string[]
  targetRepos: string[]
  keywords: string[]
  generatedAt: string
}

export interface Settings {
  enrichment_api_url: string
  slack_webhook_url: string
  target_company: string
  role_title: string
  one_line_pitch: string
  auto_enrich_github: boolean
  github_token?: string
  results_per_search: number
  default_seniority: 'any' | 'junior' | 'mid' | 'senior'
  outreach_tone: 'professional' | 'casual' | 'technical'
  scoring_commit_weight: number
  scoring_star_weight: number
  scoring_follower_weight: number
  scoring_recency_weight: number
}

export interface OutreachMessage {
  candidate_id: string
  message: string
  generated_at: string
}

export interface OutreachEntry {
  id: string
  candidate_key: string
  candidate_name: string
  message: string
  channel: 'email' | 'linkedin' | 'other'
  created_at: string
}
