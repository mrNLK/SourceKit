import type { Developer } from '@/types/developer';

interface SimilarCandidatesProps {
  developer: Developer;
  allCandidates: Developer[];
  maxResults?: number;
  onSelect?: (dev: Developer) => void;
}

function computeSimilarity(a: Developer, b: Developer): { score: number; reason: string } {
  if (a.username === b.username) return { score: -1, reason: '' };

  let score = 0;
  const reasons: string[] = [];

  // Language overlap
  const aLangs = new Set((a.topLanguages || []).map(l => l.name));
  const bLangs = new Set((b.topLanguages || []).map(l => l.name));
  const langOverlap = [...aLangs].filter(l => bLangs.has(l));
  if (langOverlap.length > 0) {
    score += langOverlap.length * 10;
    reasons.push(`Shares ${langOverlap.join(', ')}`);
  }

  // Score proximity (closer scores = more similar)
  const scoreDiff = Math.abs(a.score - b.score);
  if (scoreDiff < 10) {
    score += 15;
    reasons.push('Similar quality score');
  } else if (scoreDiff < 20) {
    score += 8;
  }

  // Contribution overlap
  const aRepos = Object.keys(a.contributedRepos || {});
  const bRepos = Object.keys(b.contributedRepos || {});
  const repoOverlap = aRepos.filter(r => bRepos.includes(r));
  if (repoOverlap.length > 0) {
    score += repoOverlap.length * 20;
    reasons.push(`Both contribute to ${repoOverlap[0]}`);
  }

  // Location match
  if (a.location && b.location && a.location.toLowerCase() === b.location.toLowerCase()) {
    score += 5;
    reasons.push(`Same location: ${a.location}`);
  }

  return { score, reason: reasons[0] || 'Similar profile' };
}

const SimilarCandidates = ({ developer, allCandidates, maxResults = 5, onSelect }: SimilarCandidatesProps) => {
  const similar = allCandidates
    .map(c => ({ dev: c, ...computeSimilarity(developer, c) }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  if (similar.length === 0) return null;

  return (
    <div className="glass rounded-lg p-3">
      <h4 className="text-xs font-display font-semibold mb-2">Similar Candidates</h4>
      <div className="space-y-2">
        {similar.map(({ dev, reason }) => (
          <button
            key={dev.username}
            onClick={() => onSelect?.(dev)}
            className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-secondary/50 transition-colors text-left"
          >
            {dev.avatarUrl ? (
              <img src={dev.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-[9px] font-bold text-primary">
                {(dev.name || dev.username).charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-display font-semibold block truncate">
                {dev.name || dev.username}
              </span>
              <span className="text-[10px] text-muted-foreground truncate block">{reason}</span>
            </div>
            <span className={`text-[10px] font-display font-bold ${
              dev.score >= 70 ? 'text-emerald-400' : dev.score >= 40 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {dev.score}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SimilarCandidates;
