export interface Developer {
  id: string;
  username: string;
  name: string;
  avatarUrl: string;
  bio: string;
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
  recentActivity: { month: string; commits: number }[];
}

export const mockDevelopers: Developer[] = [
  {
    id: "1",
    username: "sarahcodes",
    name: "Sarah Chen",
    avatarUrl: "https://api.dicebear.com/9.x/notionists/svg?seed=sarah",
    bio: "Systems engineer building high-performance distributed databases. Rust & Go enthusiast.",
    location: "Portland, OR",
    totalContributions: 3847,
    publicRepos: 42,
    followers: 189,
    stars: 2340,
    topLanguages: [
      { name: "Rust", percentage: 45, color: "hsl(20, 80%, 55%)" },
      { name: "Go", percentage: 30, color: "hsl(195, 60%, 50%)" },
      { name: "C++", percentage: 15, color: "hsl(240, 50%, 55%)" },
      { name: "Python", percentage: 10, color: "hsl(55, 70%, 50%)" },
    ],
    highlights: ["Core contributor to tokio-rs", "Built a CRDT library with 800+ stars", "Wrote production-grade WAL implementation"],
    score: 94,
    hiddenGem: true,
    joinedYear: 2018,
    recentActivity: [
      { month: "Sep", commits: 45 }, { month: "Oct", commits: 62 }, { month: "Nov", commits: 38 },
      { month: "Dec", commits: 71 }, { month: "Jan", commits: 55 }, { month: "Feb", commits: 48 },
    ],
  },
  {
    id: "2",
    username: "marcusdev",
    name: "Marcus Johnson",
    avatarUrl: "https://api.dicebear.com/9.x/notionists/svg?seed=marcus",
    bio: "Frontend architect focused on accessibility and design systems. React & TypeScript.",
    location: "Austin, TX",
    totalContributions: 2156,
    publicRepos: 28,
    followers: 312,
    stars: 1580,
    topLanguages: [
      { name: "TypeScript", percentage: 55, color: "hsl(210, 80%, 55%)" },
      { name: "JavaScript", percentage: 25, color: "hsl(50, 90%, 50%)" },
      { name: "CSS", percentage: 15, color: "hsl(280, 60%, 55%)" },
      { name: "HTML", percentage: 5, color: "hsl(15, 80%, 55%)" },
    ],
    highlights: ["Maintains a11y-toolkit (1.2k stars)", "Shipped design system used by 50+ teams", "React RFC contributor"],
    score: 88,
    hiddenGem: true,
    joinedYear: 2019,
    recentActivity: [
      { month: "Sep", commits: 32 }, { month: "Oct", commits: 41 }, { month: "Nov", commits: 55 },
      { month: "Dec", commits: 28 }, { month: "Jan", commits: 63 }, { month: "Feb", commits: 39 },
    ],
  },
  {
    id: "3",
    username: "priya_ml",
    name: "Priya Patel",
    avatarUrl: "https://api.dicebear.com/9.x/notionists/svg?seed=priya",
    bio: "ML engineer working on efficient inference and model compression. PyTorch contributor.",
    location: "San Francisco, CA",
    totalContributions: 1923,
    publicRepos: 19,
    followers: 567,
    stars: 4200,
    topLanguages: [
      { name: "Python", percentage: 60, color: "hsl(55, 70%, 50%)" },
      { name: "C++", percentage: 20, color: "hsl(240, 50%, 55%)" },
      { name: "CUDA", percentage: 15, color: "hsl(120, 60%, 45%)" },
      { name: "Rust", percentage: 5, color: "hsl(20, 80%, 55%)" },
    ],
    highlights: ["Published quantization paper (200+ citations)", "Built TinyLLM inference engine", "PyTorch core contributor"],
    score: 96,
    hiddenGem: false,
    joinedYear: 2017,
    recentActivity: [
      { month: "Sep", commits: 28 }, { month: "Oct", commits: 35 }, { month: "Nov", commits: 42 },
      { month: "Dec", commits: 51 }, { month: "Jan", commits: 38 }, { month: "Feb", commits: 60 },
    ],
  },
  {
    id: "4",
    username: "kai_infra",
    name: "Kai Nakamura",
    avatarUrl: "https://api.dicebear.com/9.x/notionists/svg?seed=kai",
    bio: "Infrastructure engineer. Kubernetes operator author. Building the cloud-native future.",
    location: "Tokyo, Japan",
    totalContributions: 2890,
    publicRepos: 35,
    followers: 145,
    stars: 890,
    topLanguages: [
      { name: "Go", percentage: 50, color: "hsl(195, 60%, 50%)" },
      { name: "Shell", percentage: 20, color: "hsl(100, 40%, 50%)" },
      { name: "Python", percentage: 15, color: "hsl(55, 70%, 50%)" },
      { name: "HCL", percentage: 15, color: "hsl(260, 50%, 55%)" },
    ],
    highlights: ["K8s operator with 500+ production deployments", "Wrote Terraform provider for internal tools", "CNCF ambassador"],
    score: 85,
    hiddenGem: true,
    joinedYear: 2016,
    recentActivity: [
      { month: "Sep", commits: 55 }, { month: "Oct", commits: 48 }, { month: "Nov", commits: 62 },
      { month: "Dec", commits: 40 }, { month: "Jan", commits: 70 }, { month: "Feb", commits: 52 },
    ],
  },
  {
    id: "5",
    username: "elena_sec",
    name: "Elena Volkov",
    avatarUrl: "https://api.dicebear.com/9.x/notionists/svg?seed=elena",
    bio: "Security researcher and toolsmith. Finding vulnerabilities and building defenses.",
    location: "Berlin, Germany",
    totalContributions: 1654,
    publicRepos: 23,
    followers: 234,
    stars: 3100,
    topLanguages: [
      { name: "Rust", percentage: 40, color: "hsl(20, 80%, 55%)" },
      { name: "C", percentage: 30, color: "hsl(200, 40%, 50%)" },
      { name: "Python", percentage: 20, color: "hsl(55, 70%, 50%)" },
      { name: "Assembly", percentage: 10, color: "hsl(0, 50%, 50%)" },
    ],
    highlights: ["Discovered 3 CVEs in major OSS projects", "Built fuzzing framework (2k+ stars)", "Speaker at Black Hat & DEF CON"],
    score: 91,
    hiddenGem: true,
    joinedYear: 2015,
    recentActivity: [
      { month: "Sep", commits: 22 }, { month: "Oct", commits: 30 }, { month: "Nov", commits: 18 },
      { month: "Dec", commits: 45 }, { month: "Jan", commits: 33 }, { month: "Feb", commits: 27 },
    ],
  },
  {
    id: "6",
    username: "alex_wasm",
    name: "Alex Rivera",
    avatarUrl: "https://api.dicebear.com/9.x/notionists/svg?seed=alex",
    bio: "WebAssembly pioneer. Compiling the web's future, one module at a time.",
    location: "Barcelona, Spain",
    totalContributions: 2210,
    publicRepos: 31,
    followers: 178,
    stars: 1750,
    topLanguages: [
      { name: "Rust", percentage: 40, color: "hsl(20, 80%, 55%)" },
      { name: "C++", percentage: 25, color: "hsl(240, 50%, 55%)" },
      { name: "TypeScript", percentage: 20, color: "hsl(210, 80%, 55%)" },
      { name: "WAT", percentage: 15, color: "hsl(280, 60%, 55%)" },
    ],
    highlights: ["Core contributor to wasm-bindgen", "Built WASM-based video editor", "Published Wasm optimization guide"],
    score: 87,
    hiddenGem: true,
    joinedYear: 2017,
    recentActivity: [
      { month: "Sep", commits: 40 }, { month: "Oct", commits: 52 }, { month: "Nov", commits: 35 },
      { month: "Dec", commits: 48 }, { month: "Jan", commits: 60 }, { month: "Feb", commits: 44 },
    ],
  },
];
