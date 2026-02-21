import { Star, GitFork, MapPin, Gem, Bookmark, BookmarkCheck, Linkedin, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import type { Developer } from "@/types/developer";
import { enrichLinkedIn } from "@/lib/api";

interface DeveloperCardProps {
  developer: Developer;
  isShortlisted?: boolean;
  onToggleShortlist?: () => void;
}

const DeveloperCard = ({ developer, isShortlisted, onToggleShortlist }: DeveloperCardProps) => {
  const navigate = useNavigate();
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState(developer.linkedinUrl);

  const handleLinkedIn = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (linkedinUrl) {
      window.open(linkedinUrl, '_blank');
      return;
    }
    setLinkedinLoading(true);
    try {
      const result = await enrichLinkedIn(developer.username, developer.name, developer.location, developer.bio);
      if (result.linkedin_url) {
        setLinkedinUrl(result.linkedin_url);
      }
    } catch (e) {
      console.error('LinkedIn enrichment failed:', e);
    } finally {
      setLinkedinLoading(false);
    }
  };

  return (
    <div className="w-full text-left glass rounded-xl p-5 hover:glow-border transition-all duration-300 hover:glow-sm group relative">
      <button
        onClick={() => navigate(`/developer/${developer.username}`)}
        className="w-full text-left"
      >
        <div className="flex items-start gap-4">
          <img
            src={developer.avatarUrl}
            alt={developer.name}
            className="w-12 h-12 rounded-lg bg-secondary border border-border"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {developer.name}
              </h3>
              {developer.hiddenGem && (
                <span className="flex items-center gap-1 text-warning text-xs font-display">
                  <Gem className="w-3 h-3" />
                  Hidden Gem
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-display mb-2">@{developer.username}</p>
            
            {/* AI-generated summary */}
            <p className="text-sm text-secondary-foreground line-clamp-2 mb-2">{developer.bio}</p>
            
            {/* Contributed repos tags */}
            {developer.contributedRepos && Object.keys(developer.contributedRepos).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {Object.entries(developer.contributedRepos).map(([repo, count]) => (
                  <span key={repo} className="text-[10px] font-display px-2 py-0.5 rounded bg-primary/8 text-primary/80 border border-primary/15">
                    {repo.split('/').pop()} · {count as number} commits
                  </span>
                ))}
              </div>
            )}

            {/* Language bars */}
            {developer.topLanguages.length > 0 && (
              <>
                <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden mb-3">
                  {developer.topLanguages.map((lang) => (
                    <div
                      key={lang.name}
                      style={{ width: `${lang.percentage}%`, backgroundColor: lang.color }}
                      className="rounded-full"
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {developer.topLanguages.slice(0, 3).map((lang) => (
                    <span key={lang.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lang.color }} />
                      {lang.name}
                    </span>
                  ))}
                </div>
              </>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5" />
                {developer.stars.toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <GitFork className="w-3.5 h-3.5" />
                {developer.publicRepos} repos
              </span>
              {developer.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {developer.location}
                </span>
              )}
            </div>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center">
            <div className={`w-11 h-11 rounded-lg flex items-center justify-center font-display text-sm font-bold ${
              developer.score >= 80 ? "bg-primary/15 text-primary border border-primary/30" :
              developer.score >= 50 ? "bg-warning/15 text-warning border border-warning/30" :
              "bg-secondary text-secondary-foreground border border-border"
            }`}>
              {developer.score}
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 font-display">SCORE</span>
          </div>
        </div>
      </button>

      {/* Action buttons */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        {/* LinkedIn button */}
        <button
          onClick={handleLinkedIn}
          className={`p-1.5 rounded-md border transition-colors ${
            linkedinUrl ? 'bg-info/10 text-info border-info/30 hover:bg-info/20' :
            'border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
          }`}
          title={linkedinUrl ? 'Open LinkedIn' : 'Find LinkedIn'}
        >
          {linkedinLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Linkedin className="w-3.5 h-3.5" />}
        </button>

        {/* Shortlist button */}
        {onToggleShortlist && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleShortlist(); }}
            className={`p-1.5 rounded-md border transition-colors ${
              isShortlisted ? 'bg-primary/10 text-primary border-primary/30' : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
            }`}
            title={isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
          >
            {isShortlisted ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
};

export default DeveloperCard;
