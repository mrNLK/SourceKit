import { useState, useCallback, useMemo } from "react";
import { Loader2, Copy, ClipboardCheck, RefreshCw, Sparkles, FileText, Check, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { generateOutreach } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import {
  BUILT_IN_TEMPLATES,
  loadCustomTemplates,
  interpolatePartial,
  type Template,
} from "@/lib/outreach-templates";

interface OutreachCandidate {
  id: string;
  github_username: string;
  name?: string;
  avatar_url?: string;
  score?: number;
  // Enrichment fields for template interpolation (F10)
  bio?: string;
  location?: string;
  top_languages?: { name: string; count: number }[];
  highlights?: string[];
  followers?: number;
  public_repos?: number;
  stars?: number;
  github_url?: string;
  joined_year?: number;
  stage?: string;
  [key: string]: any;
}

interface GeneratedMessage {
  username: string;
  name: string;
  message: string;
  error?: string;
  saved?: boolean;
}

interface BulkOutreachModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: OutreachCandidate[];
}

const TONES = [
  { id: "professional", label: "Professional" },
  { id: "casual", label: "Casual" },
  { id: "technical", label: "Technical" },
];

const BulkOutreachModal = ({ open, onOpenChange, candidates }: BulkOutreachModalProps) => {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<GeneratedMessage[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [roleContext, setRoleContext] = useState("");
  const [tone, setTone] = useState("professional");
  const [mode, setMode] = useState<"ai" | "template">("ai");
  const [selectedTemplateId, setSelectedTemplateId] = useState(BUILT_IN_TEMPLATES[0].id);

  const allTemplates = useMemo(() => [...BUILT_IN_TEMPLATES, ...loadCustomTemplates()], []);
  const selectedTemplate = allTemplates.find(t => t.id === selectedTemplateId) || allTemplates[0];
  const templatePreview = useMemo(
    () => candidates[0] ? interpolatePartial(selectedTemplate.body, candidates[0]) : selectedTemplate.body,
    [selectedTemplate, candidates],
  );

  const generate = useCallback(async () => {
    if (candidates.length === 0) return;
    setGenerating(true);
    setMessages([]);
    setProgress({ current: 0, total: candidates.length });

    const results: GeneratedMessage[] = [];
    const toneLabel = TONES.find((t) => t.id === tone)?.label || "Professional";
    const context = [roleContext, `Tone: ${toneLabel}`].filter(Boolean).join(". ");

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      setProgress({ current: i + 1, total: candidates.length });
      try {
        const resp = await generateOutreach(c.github_username, c.name, context);
        results.push({
          username: c.github_username,
          name: c.name || c.github_username,
          message: resp.message,
        });
      } catch (e) {
        results.push({
          username: c.github_username,
          name: c.name || c.github_username,
          message: "",
          error: (e as Error).message,
        });
      }
      setMessages([...results]);
    }
    setGenerating(false);
  }, [candidates, roleContext, tone]);

  const generateFromTemplate = useCallback(() => {
    if (candidates.length === 0) return;
    const results: GeneratedMessage[] = candidates.map(c => ({
      username: c.github_username,
      name: c.name || c.github_username,
      message: interpolatePartial(selectedTemplate.body, c),
    }));
    setMessages(results);
    toast({ title: `${results.length} messages generated from template` });
  }, [candidates, selectedTemplate]);

  const handleCopy = (idx: number) => {
    navigator.clipboard.writeText(messages[idx].message);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const handleCopyAll = () => {
    const text = messages
      .filter((m) => m.message)
      .map((m) => `--- ${m.name} (@${m.username}) ---\n${m.message}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    toast({ title: `Copied ${messages.filter((m) => m.message).length} messages` });
  };

  const handleRegenerate = async (idx: number) => {
    const c = candidates[idx];
    if (!c) return;
    const toneLabel = TONES.find((t) => t.id === tone)?.label || "Professional";
    const context = [roleContext, `Tone: ${toneLabel}`].filter(Boolean).join(". ");
    setMessages((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, message: "", error: undefined } : m))
    );
    try {
      const resp = await generateOutreach(c.github_username, c.name, context);
      setMessages((prev) =>
        prev.map((m, i) => (i === idx ? { ...m, message: resp.message, error: undefined } : m))
      );
    } catch (e) {
      setMessages((prev) =>
        prev.map((m, i) => (i === idx ? { ...m, error: (e as Error).message } : m))
      );
    }
  };

  const persistMessages = useCallback(async () => {
    const unsaved = messages.filter(m => m.message && !m.saved && !m.error);
    if (unsaved.length === 0) return;
    setSaving(true);
    let savedCount = 0;
    for (const msg of unsaved) {
      const candidate = candidates.find(c => c.github_username === msg.username);
      if (!candidate) continue;
      const { error } = await supabase.from("outreach_history").insert({
        pipeline_id: candidate.id,
        message: msg.message,
      });
      if (!error) {
        savedCount++;
        setMessages(prev => prev.map(m => m.username === msg.username ? { ...m, saved: true } : m));
      }
    }
    setSaving(false);
    if (savedCount > 0) {
      queryClient.invalidateQueries({ queryKey: ["outreach-history"] });
      toast({ title: `${savedCount} message${savedCount !== 1 ? "s" : ""} saved to outreach history` });
    }
  }, [messages, candidates, queryClient]);

  // F7: Advance "sourced" candidates to "contacted" after saving outreach
  const [showStagePrompt, setShowStagePrompt] = useState(false);
  const sourcedCount = candidates.filter(c => c.stage === "sourced").length;

  const handleAdvanceSourced = useCallback(async () => {
    const sourced = candidates.filter(c => c.stage === "sourced");
    for (const c of sourced) {
      await supabase.from("pipeline").update({ stage: "contacted" }).eq("id", c.id);
    }
    queryClient.invalidateQueries({ queryKey: ["pipeline"] });
    queryClient.invalidateQueries({ queryKey: ["bulk-pipeline"] });
    toast({ title: `Moved ${sourced.length} candidate${sourced.length !== 1 ? "s" : ""} to Contacted` });
    setShowStagePrompt(false);
  }, [candidates, queryClient]);

  const handleSaveAndClose = useCallback(async () => {
    await persistMessages();
    // If there are sourced candidates, show the stage prompt instead of closing
    if (sourcedCount > 0) {
      setShowStagePrompt(true);
    } else {
      onOpenChange(false);
    }
  }, [persistMessages, onOpenChange, sourcedCount]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="font-display text-base">
            Bulk Outreach Generation
          </DialogTitle>
          <DialogDescription className="text-xs">
            Generate personalized messages for {candidates.length} candidate{candidates.length !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {/* Mode switcher */}
          {messages.length === 0 && !generating && (
            <div className="flex rounded-lg border border-border overflow-hidden w-fit">
              <button
                onClick={() => setMode("ai")}
                className={`flex items-center gap-1.5 text-xs font-display px-3 py-1.5 transition-colors ${
                  mode === "ai" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="w-3 h-3" /> AI Generate
              </button>
              <button
                onClick={() => setMode("template")}
                className={`flex items-center gap-1.5 text-xs font-display px-3 py-1.5 transition-colors ${
                  mode === "template" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="w-3 h-3" /> Template
              </button>
            </div>
          )}

          {/* Config */}
          {messages.length === 0 && !generating && mode === "ai" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-display font-semibold text-muted-foreground block mb-1">
                  Role / Context (optional)
                </label>
                <input
                  type="text"
                  value={roleContext}
                  onChange={(e) => setRoleContext(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer at Acme Corp"
                  className="w-full bg-secondary border border-border rounded-lg text-sm text-foreground py-2 px-3 outline-none focus:border-primary/40 font-body"
                />
              </div>
              <div>
                <label className="text-xs font-display font-semibold text-muted-foreground block mb-1">
                  Tone
                </label>
                <div className="flex gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTone(t.id)}
                      className={`text-xs font-display px-3 py-1.5 rounded-lg border transition-colors ${
                        tone === t.id
                          ? "bg-primary/15 text-primary border-primary/30"
                          : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={generate}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-display text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Generate Messages
              </button>
            </div>
          )}

          {/* Template config */}
          {messages.length === 0 && !generating && mode === "template" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-display font-semibold text-muted-foreground block mb-1.5">
                  Select Template
                </label>
                <div className="flex flex-wrap gap-2">
                  {allTemplates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplateId(t.id)}
                      className={`text-xs font-display px-3 py-1.5 rounded-lg border transition-colors ${
                        t.id === selectedTemplateId
                          ? "bg-primary/15 text-primary border-primary/30"
                          : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-display font-semibold text-muted-foreground block mb-1.5">
                  Preview (first candidate)
                </label>
                <div className="p-3 rounded-lg bg-secondary/50 border border-border max-h-40 overflow-y-auto">
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-body">{templatePreview}</p>
                </div>
              </div>
              <button
                onClick={generateFromTemplate}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-display text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Generate {candidates.length} Messages from Template
              </button>
            </div>
          )}

          {/* Progress */}
          {generating && (
            <div className="flex items-center gap-3 py-2">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <span className="text-xs font-display text-foreground">
                Generating {progress.current}/{progress.total}...
              </span>
              <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-display text-muted-foreground">
                  {messages.filter((m) => m.message).length} message{messages.filter((m) => m.message).length !== 1 ? "s" : ""} generated
                </span>
                <div className="flex gap-2">
                  {!generating && (
                    <button
                      onClick={generate}
                      className="flex items-center gap-1 text-[10px] font-display px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" /> Regenerate All
                    </button>
                  )}
                  <button
                    onClick={handleCopyAll}
                    className="flex items-center gap-1 text-[10px] font-display px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Copy className="w-3 h-3" /> Copy All
                  </button>
                  {!generating && messages.some(m => m.message && !m.saved) && (
                    <button
                      onClick={handleSaveAndClose}
                      disabled={saving}
                      className="flex items-center gap-1 text-[10px] font-display px-2 py-1 rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Save & Close
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {messages.map((msg, idx) => (
                  <div
                    key={msg.username}
                    className="glass rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {candidates[idx]?.avatar_url ? (
                          <img
                            src={candidates[idx].avatar_url}
                            alt=""
                            className="w-6 h-6 rounded-full border border-border object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center font-display text-[9px] font-bold text-primary">
                            {msg.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-display text-xs font-semibold text-foreground">
                          {msg.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          @{msg.username}
                        </span>
                        {msg.saved && (
                          <span className="flex items-center gap-0.5 text-[9px] text-emerald-400 font-display">
                            <Check className="w-2.5 h-2.5" /> Saved
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {!generating && (
                          <button
                            onClick={() => handleRegenerate(idx)}
                            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                            title="Regenerate"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        )}
                        {msg.message && (
                          <button
                            onClick={() => handleCopy(idx)}
                            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy"
                          >
                            {copiedIdx === idx ? (
                              <ClipboardCheck className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    {msg.error ? (
                      <p className="text-xs text-destructive font-body">{msg.error}</p>
                    ) : msg.message ? (
                      <p className="text-xs text-muted-foreground font-body leading-relaxed whitespace-pre-wrap">
                        {msg.message}
                      </p>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-3 h-3 text-primary animate-spin" />
                        <span className="text-xs text-muted-foreground">Generating...</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* F7: Stage advancement prompt after saving */}
          {showStagePrompt && sourcedCount > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <span className="text-xs font-display text-foreground flex-1">
                Messages saved — move {sourcedCount} sourced candidate{sourcedCount !== 1 ? "s" : ""} to <span className="font-semibold text-amber-400">Contacted</span>?
              </span>
              <button
                onClick={handleAdvanceSourced}
                className="text-xs font-display font-semibold px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors whitespace-nowrap"
              >
                Move to Contacted
              </button>
              <button
                onClick={() => { setShowStagePrompt(false); onOpenChange(false); }}
                className="text-xs font-display text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkOutreachModal;
