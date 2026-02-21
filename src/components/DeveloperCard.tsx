import { Star, GitFork, MapPin, Gem } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Developer } from "@/data/mockDevelopers";

interface DeveloperCardProps {
  developer: Developer;
}

const DeveloperCard = ({ developer }: DeveloperCardProps) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/developer/${developer.id}`)}
      className="w-full text-left glass rounded-xl p-5 hover:glow-border transition-all duration-300 hover:glow-sm group"
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
          <p className="text-sm text-text-secondary line-clamp-2 mb-3">{developer.bio}</p>

          {/* Language bars */}
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

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-text-dim">
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
            developer.score >= 90 ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary text-secondary-foreground border border-border"
          }`}>
            {developer.score}
          </div>
          <span className="text-[10px] text-text-dim mt-1 font-display">SCORE</span>
        </div>
      </div>
    </button>
  );
};

export default DeveloperCard;
