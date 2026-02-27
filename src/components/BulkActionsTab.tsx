import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Loader2, Copy, ClipboardCheck, Send, Users, Sparkles, MessageSquare,
  BarChart3, FileText, GitCompare, ArrowUpDown, Search, ChevronDown
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import ExportButton from "@/components/ExportButton";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type SortKey = "name" | "score" | "stage";
type SortDir = "asc" | "desc";

const STAGES = ["sourced", "contacted", "responded", "screen", "offer"];
const STAGE_COLORS: Record<string, string> = {
  sourced: "bg-primary/15 text-primary border-primary/30",
  contacted: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  responded: "bg-info/15 text-info border-info/30",
  screen: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  offer: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

const QUICK_ACTIONS: { id: string; label: string; tip: string; icon: any; needsSelection: boolean; minSelection?: number; maxSelection?: number }[] = [
  { id: "refine", label: "Refine Shortlist", tip: "AI ranks selected candidates and suggests who to prioritize", icon: Sparkles, needsSelection: true },
  { id: "outreach", label: "Draft Outreach", tip: "Generate personalized outreach messages for each candidate", icon: MessageSquare, needsSelection: true },
  { id: "insights", label: "Search Insights", tip: "Analyze your full pipeline \u2014 skills gaps, stage distribution, trends", icon: BarChart3, needsSelection: false },
  { id: "brief", label: "Candidate Brief", tip: "Create a summary brief for hiring managers (max 5)", icon: FileText, needsSelection: true, maxSelection: 5 },
  { id: "compare", label: "Compare Selected", tip: "Side-by-side comparison of 2-3 candidates", icon: GitCompare, needsSelection: true, minSelection: 2, maxSelection: 3 },
];

function getScoreColor(score: number) {
  if (score >= 70) return "bg-emerald-500/15 text-emerald-400";
  if (score >= 40) return "bg-amber-500/15 text-amber-400";
  if (score >= 1) return "bg-red-500/15 text-red-400";
  return "bg-secondary text-secondary-foreground";
}

const BulkActionsTab = () => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch pipeline candidates joined with candidate details
  const { data: pipelineCandidates = [], isLoading } = useQuery({
    queryKey: ["bulk-pipeline"],
    queryFn: async () => {
      const { data: pipeline, error: pErr } = await supabase
        .from("pipeline")
        .select("*")
        .order("created_at", { ascending: false });
      if (pErr) throw pErr;

      const usernames = (pipeline || []).map((p: any) => p.github_username);
      if (usernames.length === 0) return [];

      const { data: candidates, error: cErr } = await supabase
        .from("candidates")
        .select("*")
        .in("github_username", usernames);
      if (cErr) throw cErr;

      const candidateMap = new Map((candidates || []).map((c: any) => [c.github_username, c]));
      return (pipeline || []).map((p: any) => ({
        ...p,
        ...(candidateMap.get(p.github_username) || {}),
        // Preserve pipeline id and stage
        id: p.id,
        stage: p.stage,
      }));
    },
  });

  // Filter + sort
  const filtered = useMemo(() => {
    let list = pipelineCandidates;
    if (searchText) {
      const s = searchText.toLowerCase();
      list = list.filter((c: any) =>
        (c.name || "").toLowerCase().includes(s) ||
        c.github_username.toLowerCase().includes(s) ||
        (c.bio || "").toLowerCase().includes(s)
      );
    }
    if (stageFilter) list = list.filter((c: any) => c.stage === stageFilter);
    list = list.filter((c: any) => {
      const score = c.score || 0;
      return score >= scoreRange[0] && score <= scoreRange[1];
    });
    list = [...list].sort((a: any, b: any) => {
      let av: any, bv: any;
      if (sortKey === "name") { av = (a.name || a.github_username).toLowerCase(); bv = (b.name || b.github_username).toLowerCase(); }
      else if (sortKey === "score") { av = a.score || 0; bv = b.score || 0; }
      else { av = STAGES.indexOf(a.stage); bv = STAGES.indexOf(b.stage); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [pipelineCandidates, searchText, stageFilter, scoreRange, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((c: any) => c.id)));
  };

  const selectedCandidates = useMemo(
    () => pipelineCandidates.filter((c: any) => selected.has(c.id)),
    [pipelineCandidates, selected]
  );

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Stream AI response
  const streamAction = useCallback(async (action: string, extraMessages?: ChatMessage[]) => {
    const candidates = action === "insights" ? pipelineCandidates : selectedCandidates;
    if (action !== "insights" && candidates.length === 0) return;

    setIsStreaming(true);

    const body: any = { action, candidates };
    if (action === "chat" && extraMessages) body.messages = extraMessages;

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/bulk-actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        setMessages(prev => [...prev, { role: "assistant", content: `❌ ${err.error || "Something went wrong."}` }]);
        setIsStreaming(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) { setIsStreaming(false); return; }

      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";

      // Add empty assistant message
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              const finalContent = assistantContent;
              setMessages(prev =>
                prev.map((m, i) => i === prev.length - 1 ? { ...m, content: finalContent } : m)
              );
            }
          } catch { /* partial json, wait for more */ }
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: `❌ ${e instanceof Error ? e.message : "Unknown error"}` }]);
    } finally {
      setIsStreaming(false);
    }
  }, [pipelineCandidates, selectedCandidates]);

  const handleQuickAction = (actionId: string) => {
    const action = QUICK_ACTIONS.find(a => a.id === actionId);
    if (!action) return;
    const count = selectedCandidates.length;
    if (action.needsSelection && count === 0) return;
    if (action.minSelection && count < action.minSelection) return;
    if (action.maxSelection && count > action.maxSelection) return;

    const label = action.label;
    setMessages(prev => [...prev, { role: "user", content: `🔧 ${label} (${actionId === "insights" ? pipelineCandidates.length : count} candidates)` }]);
    streamAction(actionId);
  };

  const handleChatSend = () => {
    const text = chatInput.trim();
    if (!text || isStreaming) return;
    setChatInput("");
    const newMsg: ChatMessage = { role: "user", content: text };
    setMessages(prev => [...prev, newMsg]);
    streamAction("chat", [...messages, newMsg]);
  };

  const handleCopy = (idx: number) => {
    navigator.clipboard.writeText(messages[idx].content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-lg font-semibold text-foreground">Bulk Actions</h1>
        <ExportButton data={selected.size > 0 ? pipelineCandidates.filter((c: any) => selected.has(c.id)) : pipelineCandidates} filename="sourcekit-bulk" label={selected.size > 0 ? `Export ${selected.size}` : "Export All"} />
      </div>

      <div className="flex flex-col lg:flex-row gap-4" style={{ minHeight: "calc(100vh - 160px)" }}>
        {/* LEFT: Candidate Table */}
        <div className="lg:w-[60%] flex flex-col glass rounded-xl overflow-hidden">
          {/* Filter bar */}
          <div className="p-3 border-b border-border flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search name, role..."
                className="w-full bg-secondary/50 border border-border rounded-lg py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/30 font-body"
              />
            </div>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="bg-secondary/50 border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground outline-none font-display cursor-pointer"
            >
              <option value="">All Stages</option>
              {STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <div className="flex items-center gap-1.5 text-[10px] font-display text-muted-foreground">
              <span>Score</span>
              <input
                type="range"
                min={0}
                max={100}
                value={scoreRange[0]}
                onChange={(e) => setScoreRange([+e.target.value, scoreRange[1]])}
                className="w-16 h-1 accent-primary"
              />
              <span>{scoreRange[0]}-{scoreRange[1]}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={scoreRange[1]}
                onChange={(e) => setScoreRange([scoreRange[0], +e.target.value])}
                className="w-16 h-1 accent-primary"
              />
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border">
                  <th className="p-2 w-8">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      onChange={toggleAll}
                      className="rounded border-border accent-primary"
                    />
                  </th>
                  <th
                    className="p-2 text-left font-display font-semibold text-muted-foreground cursor-pointer select-none"
                    onClick={() => toggleSort("name")}
                  >
                    <span className="flex items-center gap-1">
                      Name
                      <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th
                    className="p-2 text-center font-display font-semibold text-muted-foreground cursor-pointer select-none"
                    onClick={() => toggleSort("score")}
                  >
                    <span className="flex items-center justify-center gap-1">
                      Score
                      <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th
                    className="p-2 text-left font-display font-semibold text-muted-foreground cursor-pointer select-none"
                    onClick={() => toggleSort("stage")}
                  >
                    <span className="flex items-center gap-1">
                      Stage
                      <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th className="p-2 text-left font-display font-semibold text-muted-foreground hidden md:table-cell">
                    Languages
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => {
                  const languages = (c.top_languages as any[] || []).slice(0, 3);
                  return (
                    <tr
                      key={c.id}
                      className={`border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer ${
                        selected.has(c.id) ? "bg-primary/5" : ""
                      }`}
                      onClick={() => toggleSelect(c.id)}
                    >
                      <td className="p-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          className="rounded border-border accent-primary"
                        />
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {c.avatar_url ? (
                            <img src={c.avatar_url} alt="" className="w-6 h-6 rounded-full bg-secondary border border-border object-cover shrink-0" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center font-display text-[9px] font-bold text-primary shrink-0">
                              {(c.name || c.github_username)?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-display font-semibold text-foreground truncate block">{c.name || c.github_username}</span>
                            <span className="text-[10px] text-muted-foreground">@{c.github_username}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-md font-display font-bold text-[10px] ${getScoreColor(c.score || 0)}`}>
                          {c.score || "–"}
                        </span>
                      </td>
                      <td className="p-2">
                        <span className={`text-[10px] font-display font-semibold px-2 py-0.5 rounded-md border ${STAGE_COLORS[c.stage] || ""}`}>
                          {c.stage}
                        </span>
                      </td>
                      <td className="p-2 hidden md:table-cell">
                        <div className="flex gap-1">
                          {languages.map((l: any) => (
                            <span key={l.name} className="text-[9px] font-display px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                              {l.name}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-sm text-muted-foreground font-display">
                      {pipelineCandidates.length === 0
                        ? "No candidates in pipeline. Add candidates from Search first."
                        : "No candidates match filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-border text-[11px] font-display text-muted-foreground">
            <span className="text-primary font-semibold">{selected.size}</span> selected of{" "}
            <span className="font-semibold">{filtered.length}</span> candidates
          </div>
        </div>

        {/* RIGHT: Chat Interface */}
        <div className="lg:w-[40%] flex flex-col glass rounded-xl overflow-hidden">
          {/* Chat messages */}
          <div className="flex-1 overflow-auto p-4 space-y-3 min-h-[300px]">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Sparkles className="w-8 h-8 text-primary/40 mb-3" />
                <p className="text-sm text-muted-foreground font-display">
                  Select candidates and use quick actions or chat to analyze them with AI.
                </p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`group relative max-w-[90%] rounded-xl px-3.5 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-primary/10 text-foreground border border-primary/20"
                      : "bg-secondary/60 text-foreground border border-border"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown>{msg.content || "..."}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="font-body text-xs">{msg.content}</p>
                  )}
                  {msg.role === "assistant" && msg.content && (
                    <button
                      onClick={() => handleCopy(idx)}
                      className="absolute top-1.5 right-1.5 p-1 rounded text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ opacity: copiedIdx === idx ? 1 : undefined }}
                    >
                      {copiedIdx === idx ? <ClipboardCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isStreaming && messages[messages.length - 1]?.content === "" && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="text-xs font-display">Thinking...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick actions */}
          <div className="px-3 py-2 border-t border-border flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map((action) => {
              const count = selectedCandidates.length;
              const disabled =
                isStreaming ||
                (action.needsSelection && count === 0) ||
                (action.minSelection && count < action.minSelection) ||
                (action.maxSelection && count > action.maxSelection);
              return (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action.id)}
                  disabled={!!disabled}
                  title={action.tip}
                  className="flex items-center gap-1 text-[10px] font-display px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <action.icon className="w-3 h-3" />
                  {action.label}
                </button>
              );
            })}
          </div>

          {/* Chat input */}
          <div className="p-3 border-t border-border">
            <form
              onSubmit={(e) => { e.preventDefault(); handleChatSend(); }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about selected candidates..."
                className="flex-1 bg-secondary/50 border border-border rounded-lg py-2 px-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/30 font-body"
                disabled={isStreaming}
              />
              <button
                type="submit"
                disabled={isStreaming || !chatInput.trim()}
                className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkActionsTab;
