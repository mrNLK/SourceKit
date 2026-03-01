export interface Developer {
  id: string;
  username: string;
  name: string;
  avatarUrl: string;
  bio: string;
  about?: string;
  location: string;
  totalContributions: number;
  publicRepos: number;
  followers: number;
  stars: number;
  topLanguages: { name: string; percentage: number; color: string }[];
  highlights: string[];
  score: number;
  hiddenGem: boolean;
  joinedYear: number;
  recentActivity?: { month: string; commits: number }[];
  githubUrl?: string;
  contributedRepos?: Record<string, number>;
  linkedinUrl?: string | null;
  twitterUsername?: string | null;
  email?: string | null;
  ungettable?: boolean;
  ungettableReason?: string;
  recruitable?: boolean;
}
