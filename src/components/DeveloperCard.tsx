import { Star, GitFork, MapPin, Gem, Bookmark, BookmarkCheck, Linkedin, Loader2, UserPlus, Check, Copy, ClipboardCheck, Github, Mail, Twitter, AlertTriangle, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import type { Developer } from "@/types/developer";
import { enrichLinkedIn } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useWatchlist } from "@/hooks/useWatchlist";
import { EEAMini, EEAPopover } from "@/components/EEASignals";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import DuplicateModal from "@/components/DuplicateModal";

interface DeveloperCardProps {
  developer: Developer;
  isShortlisted?: boolean;
  onToggleShortlist?: () => void;
  showPipelineButton?: boolean;
  inPipeline?: boolean;
  onCardClick?: (dev: Developer) => void;
}

const DeveloperCard = ({ developer, isShortlisted, onToggleShortlist, showPipelineButton, inPipeline, onCardClick }: DeveloperCardProps) => {
  const navigate = useNavigate();
  const { isWatched, toggle: toggleWatchlist } = useWatchlist();
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState(developer.linkedinUrl);
  const [linkedinCopied, setLinkedinCopied] = useState(false);
  const [addedToPipeline, setAddedToPipeline] = useState(!!inPipeline);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [duplicateCandidate, setDuplicateCandidate] = useState<any>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const doAddToPipeline = async () => {
    try {
      const { error } = await supabase.from('pipeline').upsert({
        github_username: developer.username,
        name: developer.name,
        avatar_url: developer.avatarUrl,
        stage: 'sourced',
      }, { onConflict: 'github_username' });
      if (error) throw error;
      setAddedToPipeline(true);
      toast({
        title: `${developer.name || developer.username} added to pipeline`,
        description: "Added to Sourced stage.",
      });
    } catch (err) {
      console.error('Failed to add to pipeline:', err);
      toast({ title: "Failed to add to pipeline", variant: "destructive" });
    }
  };

  const handleAddToPipeline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (addedToPipeline || pipelineLoading) return;
    setPipelineLoading(true);
    try {
      // Duplicate detection
      const { data: existing } = await supabase
        .from('pipeline')
        .select('*')
        .ilike('github_username', developer.username)
        .maybeSingle();

      if (existing) {
        setDuplicateCandidate(existing);
        setShowDuplicateModal(true);
        setPipelineLoading(false);
        return;
      }

      await doAddToPipeline();
    } catch (err) {
      console.error('Failed to add to pipeline:', err);
      toast({ title: "Failed to add to pipeline", variant: "destructive" });
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
    if (linkedinLoading) return; // Prevent double-click
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
        onClick={() => onCardClick ? onCardClick(developer) : navigate(`/developer/${developer.username}`, { state: { developer } })}
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
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={developer.githubUrl || `https://github.com/${developer.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="GitHub profile"
                >
                  <Github className="w-3.5 h-3.5" />
                </a>
                {developer.email && (
                  <a
                    href={`mailto:${developer.email}`}
                    onClick={e => e.stopPropagation()}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title={developer.email}
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </a>
                )}
                {developer.twitterUsername && (
                  <a
                    href={`https://twitter.com/${developer.twitterUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title={`@${developer.twitterUsername}`}
                  >
                    <Twitter className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              {developer.hiddenGem && (
                <span className="flex items-center gap-1 text-warning text-xs font-display" title="Strong contributor with low visibility - often easier to recruit">
                  <Gem className="w-3 h-3" />
                  Hidden Gem
                </span>
              )}
              {developer.ungettable && (
                <span className="flex items-center gap-1 text-amber-400 text-xs font-display" title={developer.ungettableReason || 'Likely not recruitable'}>
                  <AlertTriangle className="w-3 h-3" />
                  Ungettable
                </span>
              )}
              {inPipeline && (
                <span className="text-[10px] font-display px-1.5 py-0.5 rounded bg-info/10 text-info border border-info/20">
                  In Pipeline
                </span>
              )}
              <Popover>
                <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <button className="cursor-pointer"><EEAMini developer={developer} /></button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="start" className="w-80 p-3" onClick={(e) => e.stopPropagation()}>
                  <EEAPopover developer={developer} />
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-xs text-muted-foreground font-display mb-2">@{developer.username}</p>
            
            <p className="text-sm text-secondary-foreground line-clamp-2 mb-2">{developer.bio}</p>
            {developer.groundedSummary && (
              <p className="text-xs text-muted-foreground italic line-clamp-2 mb-2 border-l-2 border-primary/30 pl-2">{developer.groundedSummary}</p>
            )}
            
            {developer.contributedRepos && Object.keys(developer.contributedRepos).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {Object.entries(developer.contributedRepos).map(([repo, count]) => (
                  <span key={repo} className="text-[10px] font-display px-2 py-0.5 rounded bg-primary/8 text-primary/80 border border-primary/15">
                    {repo.split('/').pop()} · {count as number} commits
                  </span>
                ))}
              </div>
            )}

            {/* P26: Top achievement badge */}
            {developer.highlights && developer.highlights.length > 0 && (
              <div className="flex items-center gap-1.5 mb-2">
                <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="text-[11px] text-secondary-foreground font-display truncate">{developer.highlights[0]}</span>
              </div>
            )}

            {developer.topLanguages.length > 0 && (
              <>
                <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden mb-3">
                  {developer.topLanguages.map((lang) => (
                    <div key={lang.name} style={{ width: `${lang.percentage}%`, backgroundColor: lang.color }} className="rounded-full" />
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

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" />{developer.stars.toLocaleString()}</span>
              <span className="flex items-center gap-1"><GitFork className="w-3.5 h-3.5" />{developer.publicRepos} repos</span>
              {developer.location && (
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{developer.location}</span>
              )}
            </div>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center shrink-0 z-10 relative">
            <div className={`w-11 h-11 rounded-lg flex items-center justify-center font-display text-sm font-bold ${
              developer.ungettable ? "bg-secondary text-muted-foreground border border-border opacity-60" :
              developer.score >= 70 ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" :
              developer.score >= 40 ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" :
              developer.score >= 1 ? "bg-red-500/15 text-red-400 border border-red-500/30" :
              "bg-secondary text-secondary-foreground border border-border"
            }`}>
              {developer.score}
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 font-display" title="AI relevance score (0-100). Green 70+: strong match. Amber 40-69: moderate. Red <40: weak. Based on contributions, skills, and seniority.">SCORE</span>
          </div>
        </div>
      </button>

      {/* Action buttons */}
      <div className="absolute top-3 right-16 flex items-center gap-1.5 z-10">
        {/* Shortlist star */}
        {onToggleShortlist && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleShortlist(); }}
            className={`p-1.5 rounded-md border transition-colors ${
              isShortlisted ? 'bg-warning/10 text-warning border-warning/30' : 'border-border text-muted-foreground hover:text-warning hover:border-warning/30'
            }`}
            title={isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
          >
            <Star className={`w-3.5 h-3.5 ${isShortlisted ? 'fill-current' : ''}`} />
          </button>
        )}

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
        {linkedinUrl ? (
          <>
            <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-md border bg-info/10 text-info border-info/30 hover:bg-info/20 transition-colors" title="Open LinkedIn">
              <Linkedin className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(linkedinUrl); setLinkedinCopied(true); setTimeout(() => setLinkedinCopied(false), 1500); }}
              className={`p-1.5 rounded-md border transition-colors ${linkedinCopied ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/30'}`}
              title={linkedinCopied ? 'Copied!' : 'Copy LinkedIn URL'}
            >
              {linkedinCopied ? <ClipboardCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </>
        ) : (
          <button onClick={handleLinkedIn} className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors" title="Find LinkedIn">
            {linkedinLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Linkedin className="w-3.5 h-3.5" />}
          </button>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); toggleWatchlist(developer.username, developer.name, developer.avatarUrl); }}
          className={`p-1.5 rounded-md border transition-colors ${
            isWatched(developer.username) ? 'bg-primary/10 text-primary border-primary/30' : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
          }`}
          title={isWatched(developer.username) ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          {isWatched(developer.username) ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Duplicate detection modal */}
      <DuplicateModal
        open={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        existing={duplicateCandidate}
        onSaveAnyway={() => {
          setShowDuplicateModal(false);
          doAddToPipeline();
        }}
        onViewExisting={() => {
          setShowDuplicateModal(false);
          navigate('/');
        }}
      />
    </div>
  );
};

export default DeveloperCard;
