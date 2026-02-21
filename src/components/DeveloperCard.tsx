import { Star, GitFork, MapPin, Gem, Bookmark, BookmarkCheck, Linkedin, Loader2, UserPlus, Check, Copy, ClipboardCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import type { Developer } from "@/types/developer";
import { enrichLinkedIn } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

interface DeveloperCardProps {
  developer: Developer;
  isShortlisted?: boolean;
  onToggleShortlist?: () => void;
  showPipelineButton?: boolean;
}

const DeveloperCard = ({ developer, isShortlisted, onToggleShortlist, showPipelineButton }: DeveloperCardProps) => {
  const navigate = useNavigate();
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState(developer.linkedinUrl);
  const [linkedinCopied, setLinkedinCopied] = useState(false);
  const [addedToPipeline, setAddedToPipeline] = useState(false);
  const [pipelineLoading, setPipelineLoading] = useState(false);

  const handleAddToPipeline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (addedToPipeline || pipelineLoading) return;
    setPipelineLoading(true);
    try {
      const { error } = await supabase.from('pipeline').upsert({
        github_username: developer.username,
        name: developer.name,
        avatar_url: developer.avatarUrl,
        stage: 'sourced',
      }, { onConflict: 'github_username' });
      if (error) throw error;
      setAddedToPipeline(true);
    } catch (err) {
      console.error('Failed to add to pipeline:', err);
    } finally {
      setPipelineLoading(false);
    }
  };

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
            className="w-12 h-12 rounded-lg bg-secondary border border-border object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
          />
          <div className="hidden w-12 h-12 rounded-lg bg-primary/15 border border-primary/30 items-center justify-center font-display text-sm font-bold text-primary shrink-0">
            {developer.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
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
              developer.score >= 70 ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" :
              developer.score >= 40 ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" :
              developer.score >= 1 ? "bg-red-500/15 text-red-400 border border-red-500/30" :
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
        {/* Add to Pipeline */}
        {showPipelineButton && (
          <button
            onClick={handleAddToPipeline}
            className={`p-1.5 rounded-md border transition-colors ${
              addedToPipeline ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
            }`}
            title={addedToPipeline ? 'Added to pipeline' : 'Add to pipeline'}
          >
            {pipelineLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : addedToPipeline ? <Check className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
          </button>
        )}
        {/* LinkedIn */}
        {linkedinUrl ? (
          <>
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-md border bg-info/10 text-info border-info/30 hover:bg-info/20 transition-colors"
              title="Open LinkedIn"
            >
              <Linkedin className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(linkedinUrl);
                setLinkedinCopied(true);
                setTimeout(() => setLinkedinCopied(false), 1500);
              }}
              className={`p-1.5 rounded-md border transition-colors ${
                linkedinCopied ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
              }`}
              title={linkedinCopied ? 'Copied!' : 'Copy LinkedIn URL'}
            >
              {linkedinCopied ? <ClipboardCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </>
        ) : (
          <button
            onClick={handleLinkedIn}
            className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            title="Find LinkedIn"
          >
            {linkedinLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Linkedin className="w-3.5 h-3.5" />}
          </button>
        )}

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
