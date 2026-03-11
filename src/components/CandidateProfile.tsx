import { useState, useEffect } from "react";
import {
  ArrowLeft, MessageSquare, Bookmark, BookmarkCheck, Link as LinkIcon, Briefcase, GraduationCap, BookOpen,
  CheckCircle2, XCircle, Star, MapPin, Clock, ExternalLink, Loader2, Sparkles, Copy, ClipboardCheck,
  ChevronDown, ArrowRight, Plus, Send, Mail, Linkedin, MoreHorizontal, Check
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWatchlist } from "@/hooks/useWatchlist";
import { toast } from "@/hooks/use-toast";
import { EEAFull } from "@/components/EEASignals";
import { CompanyContext } from "@/components/CompanyContext";
import { notifyStageChange } from "@/lib/api";
import ErrorBoundary from "@/components/ErrorBoundary";
import type { Language } from "@/types/developer";

import { PIPELINE_STAGES as STAGES } from "@/lib/constants";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function getScoreColor(score: number) {
  if (score >= 70) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (score >= 40) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  if (score >= 1) return "bg-red-500/15 text-red-400 border-red-500/30";
  return "bg-secondary text-secondary-foreground border border-border";
}

interface CandidateProfileProps {
  pipelineCandidate: any;
  onBack: () => void;
}

const CandidateProfile = ({ pipelineCandidate, onBack }: CandidateProfileProps) => {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [generatedMsg, setGeneratedMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [linkedinCopied, setLinkedinCopied] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [localStage, setLocalStage] = useState<string>(pipelineCandidate.stage || "contacted");
  const [localNotes, setLocalNotes] = useState(pipelineCandidate.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);

  const { isWatched, toggle: toggleWatchlist, listNames: watchlistNames } = useWatchlist();
  const [watchlistDropdownOpen, setWatchlistDropdownOpen] = useState(false);

  const pc = pipelineCandidate;
  const username = pc.github_username;
  const displayName = pc.name || username;

  // Escape key to go back
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onBack]);

  // Fetch rich candidate data from candidates table
  const { data: candidate, isLoading: candidateLoading } = useQuery({
    queryKey: ["candidate-detail", username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("github_username", username)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Outreach history
  const { data: outreachHistory = [] } = useQuery({
    queryKey: ["outreach-history", pc.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_history")
        .select("*")
        .eq("pipeline_id", pc.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Pipeline timeline events
  const { data: timelineEvents = [] } = useQuery({
    queryKey: ["pipeline-events", pc.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_events")
        .select("*")
        .eq("pipeline_id", pc.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });


  // Stage update
  const handleStageChange = async (newStage: string) => {
    const fromStage = localStage;
    setLocalStage(newStage); // Optimistic update
    await supabase.from("pipeline").update({ stage: newStage }).eq("id", pc.id);
    queryClient.invalidateQueries({ queryKey: ["pipeline"] });
    queryClient.invalidateQueries({ queryKey: ["bulk-pipeline"] });
    queryClient.invalidateQueries({ queryKey: ["pipeline-events", pc.id] });
    setStageOpen(false);
    setShowStagePrompt(false);
    notifyStageChange({
      pipeline_id: pc.id,
      github_username: username,
      candidate_name: displayName,
      from_stage: fromStage,
      to_stage: newStage,
    });
  };

  // Generate outreach
  const handleGenerate = async () => {
    if (generating) return; // Prevent double-fire
    setGenerating(true);
    setGeneratedMsg(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-outreach`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_name: displayName || username, github_username: username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to generate outreach");
      setGeneratedMsg(data.message);
      toast({ title: "Outreach message generated" });
      await supabase.from("outreach_history").insert({ pipeline_id: pc.id, message: data.message });
      queryClient.invalidateQueries({ queryKey: ["outreach-history", pc.id] });
    } catch (e) {
      console.error("Outreach generation failed:", e);
      toast({ title: "Outreach generation failed", description: (e as Error)?.message || "Please try again.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const score = candidate?.score || 0;
  const topLanguages = (candidate?.top_languages as Language[]) || [];
  const highlights = (candidate?.highlights as string[]) || [];
  const contributedRepos = (candidate?.contributed_repos as Record<string, number>) || {};
  const about = candidate?.about || candidate?.summary || null;
  const linkedinUrl = candidate?.linkedin_url || null;
  const currentStage = STAGES.find((s) => s.id === localStage) || STAGES[0];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-display text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Pipeline
        <span className="text-[10px] text-muted-foreground ml-2 px-1.5 py-0.5 rounded bg-secondary border border-border">ESC</span>
      </button>

      {candidateLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ===== HEADER SECTION ===== */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              {pc.avatar_url ? (
                <img
                  src={pc.avatar_url}
                  alt={displayName}
                  className="w-20 h-20 rounded-xl bg-secondary border border-border object-cover shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center font-display text-2xl font-bold text-primary shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="font-display text-2xl font-bold text-foreground truncate">{displayName}</h1>
                  {/* Score badge */}
                  {score > 0 && (
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-display text-sm font-bold border ${getScoreColor(score)}`}>
                      {score}
                    </div>
                  )}
                </div>

                <p className="text-sm text-muted-foreground font-display mb-1">@{username}</p>

                {candidate?.bio && (
                  <p className="text-sm text-secondary-foreground mb-3">{candidate.bio}</p>
                )}

                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                  {candidate?.location && (
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{candidate.location}</span>
                  )}
                  {candidate?.followers != null && (
                    <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" />{candidate.followers.toLocaleString()} followers</span>
                  )}
                  {candidate?.joined_year && (
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Joined {candidate.joined_year}</span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="flex items-center gap-1.5 text-xs font-display font-semibold px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                  >
                    {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                    {generating ? "Generating..." : "Generate Outreach"}
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => {
                        if (isWatched(username)) {
                          setWatchlistDropdownOpen(!watchlistDropdownOpen);
                        } else {
                          toggleWatchlist(username, displayName, pc.avatar_url);
                        }
                      }}
                      className={`flex items-center gap-1.5 text-xs font-display px-3 py-2 rounded-lg border transition-colors ${
                        isWatched(username)
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                      }`}
                    >
                      {isWatched(username) ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                      {isWatched(username) ? "In Watchlist" : "Watchlist"}
                      {isWatched(username) && <ChevronDown className="w-3 h-3" />}
                    </button>
                    {watchlistDropdownOpen && isWatched(username) && (
                      <div className="absolute top-full mt-1 left-0 bg-popover border border-border rounded-lg shadow-lg z-50 min-w-[160px]">
                        {watchlistNames.map((name) => (
                          <button
                            key={name}
                            onClick={() => {
                              toggleWatchlist(username, displayName, pc.avatar_url, name);
                              setWatchlistDropdownOpen(false);
                            }}
                            className="w-full text-left text-xs font-display px-3 py-2 hover:bg-accent transition-colors text-foreground"
                          >
                            {name}
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            toggleWatchlist(username, displayName, pc.avatar_url, "Default");
                            setWatchlistDropdownOpen(false);
                          }}
                          className="w-full text-left text-xs font-display px-3 py-2 hover:bg-accent transition-colors text-destructive border-t border-border"
                        >
                          Remove from Default
                        </button>
                      </div>
                    )}
                  </div>

                  {linkedinUrl && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(linkedinUrl);
                        setLinkedinCopied(true);
                        setTimeout(() => setLinkedinCopied(false), 1500);
                      }}
                      className={`flex items-center gap-1.5 text-xs font-display px-3 py-2 rounded-lg border transition-colors ${
                        linkedinCopied ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                      }`}
                    >
                      {linkedinCopied ? <ClipboardCheck className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
                      {linkedinCopied ? "Copied!" : "Copy LinkedIn"}
                    </button>
                  )}

                  {/* Stage dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setStageOpen(!stageOpen)}
                      className={`flex items-center gap-1.5 text-xs font-display font-semibold px-3 py-2 rounded-lg border ${currentStage.color} transition-colors`}
                    >
                      {currentStage.label}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {stageOpen && (
                      <div className="absolute top-full mt-1 left-0 bg-popover border border-border rounded-lg shadow-lg z-50 min-w-[140px]">
                        {STAGES.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => handleStageChange(s.id)}
                            className={`w-full text-left text-xs font-display px-3 py-2 hover:bg-accent transition-colors ${
                              s.id === localStage ? "text-primary font-semibold" : "text-foreground"
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* LinkedIn link */}
                {linkedinUrl && (
                  <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary/80 hover:text-primary mt-3 font-display"
                  >
                    {linkedinUrl} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Generated message */}
          {generatedMsg && (
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-display text-xs font-semibold text-foreground">Generated Message</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{generatedMsg}</p>
            </div>
          )}


          {/* ===== AI SUMMARY ===== */}
          <div className="glass rounded-xl p-5">
            <h2 className="font-display text-sm font-semibold text-foreground mb-3">About</h2>
            {about ? (
              <p className="text-sm text-secondary-foreground leading-relaxed">{about}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No enrichment data available for this candidate.</p>
            )}
          </div>

          {/* ===== COMPANY INTEL (Harmonic) ===== */}
          <CompanyContext bio={candidate?.bio} about={about || undefined} />

          {/* ===== SKILLS / LANGUAGES ===== */}
          {topLanguages.length > 0 && (
            <div className="glass rounded-xl p-5">
              <h2 className="font-display text-sm font-semibold text-foreground mb-3">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {topLanguages.map((lang: Language) => (
                  <span
                    key={lang.name}
                    className="text-xs font-display px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
                  >
                    {lang.name}
                  </span>
                ))}
              </div>
              {/* Language bar */}
              <div className="flex gap-0.5 h-2 rounded-full overflow-hidden mt-4">
                {topLanguages.map((lang: Language) => (
                  <div
                    key={lang.name}
                    style={{ width: `${lang.percentage}%`, backgroundColor: lang.color }}
                    className="rounded-full"
                  />
                ))}
              </div>
            </div>
          )}

          {/* ===== CONTRIBUTED REPOS ===== */}
          {Object.keys(contributedRepos).length > 0 && (
            <div className="glass rounded-xl p-5">
              <h2 className="font-display text-sm font-semibold text-foreground mb-3">Contributed To</h2>
              <div className="space-y-2">
                {Object.entries(contributedRepos).map(([repo, count]) => (
                  <a
                    key={repo}
                    href={`https://github.com/${repo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border hover:border-primary/30 transition-colors group/repo"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-display text-foreground group-hover/repo:text-primary transition-colors">{repo}</span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover/repo:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-xs font-display text-muted-foreground">{count as number} commits</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ===== HIGHLIGHTS / ACHIEVEMENTS (P26: ranked with star badges) ===== */}
          {highlights.length > 0 && (
            <div className="glass rounded-xl p-5">
              <h2 className="font-display text-sm font-semibold text-foreground mb-3">Key Achievements</h2>
              <div className="space-y-2">
                {highlights.map((h, i) => {
                  const starMatch = h.match(/\((\d[\d,]*)⭐\)$/);
                  const starCount = starMatch ? parseInt(starMatch[1].replace(/,/g, ''), 10) : 0;
                  const label = starMatch ? h.replace(/\s*\(\d[\d,]*⭐\)$/, '') : h;
                  return (
                    <div key={i} className={`flex items-start gap-2 p-2 rounded-lg ${i === 0 ? 'bg-primary/5 border border-primary/15' : ''}`}>
                      <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold font-display ${
                        i === 0 ? 'bg-amber-500/15 text-amber-400' : i === 1 ? 'bg-gray-400/15 text-gray-400' : 'bg-orange-600/15 text-orange-500'
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-secondary-foreground">{label}</span>
                      </div>
                      {starCount > 0 && (
                        <span className="flex items-center gap-0.5 text-[11px] font-display text-amber-400 shrink-0">
                          <Star className="w-3 h-3 fill-current" />
                          {starCount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== EEA SIGNALS ===== */}
          <div className="glass rounded-xl p-5">
            <EEAFull developer={candidate || pc} />
          </div>

          {/* ===== OUTREACH HISTORY (F9: with sent tracking) ===== */}
          <div className="glass rounded-xl p-5">
            <h2 className="font-display text-sm font-semibold text-foreground mb-3">
              Outreach History ({outreachHistory.length})
            </h2>
            {outreachHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No outreach messages yet.</p>
            ) : (
              <div className="space-y-3">
                {outreachHistory.map((h: any) => {
                  const isSent = h.status === "sent";
                  const channel = h.channel || "email";
                  return (
                    <div key={h.id} className={`group/msg p-4 rounded-lg border relative ${isSent ? "bg-emerald-500/5 border-emerald-500/15" : "bg-secondary/50 border-border"}`}>
                      <p className={`text-sm leading-relaxed pr-8 ${isSent ? "text-secondary-foreground" : "text-muted-foreground"}`}>{h.message}</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {new Date(h.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {/* Channel badge */}
                        <span className={`flex items-center gap-1 text-[10px] font-display px-1.5 py-0.5 rounded border ${
                          channel === "linkedin" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                          channel === "email" ? "bg-primary/10 text-primary border-primary/20" :
                          "bg-secondary text-muted-foreground border-border"
                        }`}>
                          {channel === "linkedin" ? <Linkedin className="w-2.5 h-2.5" /> : channel === "email" ? <Mail className="w-2.5 h-2.5" /> : <MoreHorizontal className="w-2.5 h-2.5" />}
                          {channel}
                        </span>
                        {/* Sent status */}
                        {isSent ? (
                          <span className="flex items-center gap-1 text-[10px] font-display text-emerald-400">
                            <Check className="w-2.5 h-2.5" /> Sent {h.sent_at ? new Date(h.sent_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {/* Channel selector */}
                            <select
                              value={channel}
                              onClick={(e) => e.stopPropagation()}
                              onChange={async (e) => {
                                await supabase.from("outreach_history").update({ channel: e.target.value }).eq("id", h.id);
                                queryClient.invalidateQueries({ queryKey: ["outreach-history", pc.id] });
                              }}
                              className="bg-secondary/50 border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground font-display outline-none cursor-pointer"
                            >
                              <option value="email">Email</option>
                              <option value="linkedin">LinkedIn</option>
                              <option value="other">Other</option>
                            </select>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await supabase.from("outreach_history").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", h.id);
                                queryClient.invalidateQueries({ queryKey: ["outreach-history", pc.id] });
                                toast({ title: "Marked as sent" });
                              }}
                              className="flex items-center gap-1 text-[10px] font-display px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/15 transition-colors"
                            >
                              <Send className="w-2.5 h-2.5" /> Mark Sent
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleCopy(h.id, h.message)}
                        className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:text-foreground opacity-0 group-hover/msg:opacity-100 transition-opacity"
                        title="Copy message"
                      >
                        {copiedId === h.id ? <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ===== ACTIVITY TIMELINE (F6) ===== */}
          <div className="glass rounded-xl p-5">
            <h2 className="font-display text-sm font-semibold text-foreground mb-3">Activity Timeline</h2>
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
              <div className="space-y-3">
                {/* Stage change events */}
                {timelineEvents.map((event: any) => {
                  const fromStage = STAGES.find(s => s.id === event.from_stage);
                  const toStage = STAGES.find(s => s.id === event.to_stage);
                  return (
                    <div key={event.id} className="flex items-start gap-3 relative">
                      <div className="w-[15px] h-[15px] rounded-full bg-primary/15 border-2 border-primary/40 shrink-0 z-10 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {fromStage && (
                            <span className={`text-[10px] font-display font-semibold px-1.5 py-0.5 rounded border ${fromStage.color}`}>
                              {fromStage.label}
                            </span>
                          )}
                          <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                          {toStage && (
                            <span className={`text-[10px] font-display font-semibold px-1.5 py-0.5 rounded border ${toStage.color}`}>
                              {toStage.label}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(event.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {/* Synthetic "added to pipeline" entry */}
                <div className="flex items-start gap-3 relative">
                  <div className="w-[15px] h-[15px] rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 shrink-0 z-10 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Plus className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] font-display font-semibold text-emerald-400">Added to Pipeline</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(pc.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== NOTES ===== */}
          <div className="glass rounded-xl p-5">
            <h2 className="font-display text-sm font-semibold text-foreground mb-3">Notes</h2>
            <textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="Add notes about this candidate..."
              rows={4}
              className="w-full bg-secondary/50 border border-border rounded-lg py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/30 transition-colors font-body resize-y"
            />
            <button
              onClick={async () => {
                setSavingNotes(true);
                try {
                  await supabase.from("pipeline").update({ notes: localNotes }).eq("id", pc.id);
                  queryClient.invalidateQueries({ queryKey: ["pipeline"] });
                  toast({ title: "Notes saved" });
                } catch {
                  toast({ title: "Failed to save notes", variant: "destructive" });
                } finally {
                  setSavingNotes(false);
                }
              }}
              disabled={savingNotes}
              className="mt-2 text-xs font-display px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
            >
              {savingNotes ? "Saving..." : "Save Notes"}
            </button>
          </div>

          {/* Stats footer */}
          {candidate && (
            <div className="glass rounded-xl p-5">
              <h2 className="font-display text-sm font-semibold text-foreground mb-3">Stats</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Public Repos", value: candidate.public_repos || 0 },
                  { label: "Stars", value: candidate.stars || 0 },
                  { label: "Followers", value: candidate.followers || 0 },
                  { label: "Since", value: candidate.joined_year || "N/A" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center p-3 rounded-lg bg-secondary/50 border border-border">
                    <div className="font-display text-lg font-bold text-foreground">{typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}</div>
                    <div className="text-[11px] font-display text-muted-foreground mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function CandidateProfileWithBoundary(props: CandidateProfileProps) {
  return (
    <ErrorBoundary fallbackLabel="CandidateProfile">
      <CandidateProfile {...props} />
    </ErrorBoundary>
  );
}

export default CandidateProfileWithBoundary;
