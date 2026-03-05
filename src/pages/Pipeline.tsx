import { Link } from "react-router-dom";
import { GitBranch, GripVertical, Trash2, Loader2, ChevronDown, ChevronUp, Copy, ClipboardCheck, Sparkles, MessageSquare, Clock } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const STAGES = [
  { id: 'sourced', label: 'Sourced', color: 'bg-primary/15 text-primary border-primary/30' },
  { id: 'contacted', label: 'Contacted', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  { id: 'responded', label: 'Responded', color: 'bg-info/15 text-info border-info/30' },
  { id: 'screen', label: 'Screen', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  { id: 'in_process', label: 'In Process', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
] as const;

// --- Outreach History + Generator for expanded card ---
const OutreachSection = ({ pipelineId, candidateName, githubUsername }: { pipelineId: string; candidateName: string; githubUsername: string }) => {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [generatedMsg, setGeneratedMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['outreach-history', pipelineId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outreach_history')
        .select('*')
        .eq('pipeline_id', pipelineId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleGenerate = async () => {
    setGenerating(true);
    setGeneratedMsg(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-outreach`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_name: candidateName, github_username: githubUsername }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      const msg = data.message;
      setGeneratedMsg(msg);

      // Save to outreach_history
      await supabase.from('outreach_history').insert({ pipeline_id: pipelineId, message: msg });
      queryClient.invalidateQueries({ queryKey: ['outreach-history', pipelineId] });
    } catch (e) {
      console.error('Outreach generation failed:', e);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="mt-3 space-y-3">
      {/* Generator */}
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full flex items-center justify-center gap-1.5 text-[11px] font-display font-semibold px-2 py-1.5 rounded-md border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
      >
        {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        {generating ? 'Generating...' : 'Generate Outreach'}
      </button>

      {generatedMsg && (
        <div className="p-2 rounded-md bg-primary/5 border border-primary/15 text-[11px] text-foreground leading-relaxed">
          {generatedMsg}
        </div>
      )}

      {/* History */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <MessageSquare className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider">
            Outreach History ({history.length})
          </span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-2">
            <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-[10px] text-muted-foreground italic">No messages yet</p>
        ) : (
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
            {history.map((h: any) => (
              <div key={h.id} className="group/msg p-2 rounded-md bg-secondary/50 border border-border text-[11px] text-secondary-foreground leading-relaxed relative">
                <p className="pr-6">{h.message}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(h.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(h.id, h.message)}
                  className="absolute top-2 right-2 p-1 rounded text-muted-foreground hover:text-foreground opacity-0 group-hover/msg:opacity-100 transition-opacity"
                  title="Copy message"
                >
                  {copiedId === h.id ? <ClipboardCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main Pipeline Page ---
const Pipeline = () => {
  const queryClient = useQueryClient();
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['pipeline'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pipeline').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase.from('pipeline').update({ stage }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipeline'] }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pipeline').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipeline'] }),
  });

  const handleDrop = (stageId: string) => {
    if (draggedItem) {
      moveMutation.mutate({ id: draggedItem, stage: stageId });
      setDraggedItem(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-primary" />
            </div>
            <span className="font-display text-sm font-semibold text-foreground">SourceKit</span>
          </Link>
          <nav className="flex items-center gap-1 ml-4">
            <Link to="/" className="text-xs font-display px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors">Search</Link>
            <span className="text-xs font-display px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">Pipeline</span>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="font-display text-lg font-semibold text-foreground mb-6">Candidate Pipeline</h1>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {STAGES.map((stage) => {
              const items = candidates.filter((c: any) => c.stage === stage.id);
              return (
                <div
                  key={stage.id}
                  className="glass rounded-xl p-3 min-h-[400px]"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(stage.id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-display font-semibold px-2 py-1 rounded-md border ${stage.color}`}>
                      {stage.label}
                    </span>
                    <span className="text-xs font-display text-muted-foreground">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((c: any) => {
                      const isExpanded = expandedCard === c.id;
                      return (
                        <div
                          key={c.id}
                          draggable={!isExpanded}
                          onDragStart={() => setDraggedItem(c.id)}
                          className="glass rounded-lg p-3 cursor-grab active:cursor-grabbing hover:glow-border transition-all group"
                        >
                          <div className="flex items-start gap-2">
                            <GripVertical className="w-3 h-3 text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            {c.avatar_url ? (
                              <img
                                src={c.avatar_url}
                                alt=""
                                className="w-7 h-7 rounded-full bg-secondary border border-border shrink-0 object-cover"
                                onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                              />
                            ) : null}
                            <div className={`${c.avatar_url ? 'hidden' : 'flex'} w-7 h-7 rounded-full bg-primary/15 border border-primary/30 items-center justify-center font-display text-[10px] font-bold text-primary shrink-0`}>
                              {(c.name || c.github_username)?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <Link
                                to={`/developer/${c.github_username}`}
                                className="font-display text-xs font-semibold text-foreground hover:text-primary transition-colors truncate block"
                              >
                                {c.name || c.github_username}
                              </Link>
                              <p className="text-[10px] text-muted-foreground font-display truncate">@{c.github_username}</p>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                onClick={() => setExpandedCard(isExpanded ? null : c.id)}
                                className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                              <button
                                onClick={() => removeMutation.mutate(c.id)}
                                className="p-1 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all shrink-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <OutreachSection
                              pipelineId={c.id}
                              candidateName={c.name || c.github_username}
                              githubUsername={c.github_username}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Pipeline;
