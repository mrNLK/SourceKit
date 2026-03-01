import { useState, useMemo, useCallback } from "react";
import { Copy, ClipboardCheck, Eye, FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Developer } from "@/types/developer";
import {
  type Template,
  TEMPLATE_VARIABLES,
  BUILT_IN_TEMPLATES,
  loadCustomTemplates,
  saveCustomTemplates,
  interpolate,
} from "@/lib/outreach-templates";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OutreachTemplateEditorProps {
  developer: Developer;
  onUseMessage: (message: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const OutreachTemplateEditor = ({ developer, onUseMessage }: OutreachTemplateEditorProps) => {
  const [customTemplates, setCustomTemplates] = useState<Template[]>(loadCustomTemplates);
  const [selectedId, setSelectedId] = useState<string>(BUILT_IN_TEMPLATES[0].id);
  const [editing, setEditing] = useState(false);
  const [draftBody, setDraftBody] = useState("");
  const [draftName, setDraftName] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const allTemplates = useMemo(() => [...BUILT_IN_TEMPLATES, ...customTemplates], [customTemplates]);
  const selected = allTemplates.find((t) => t.id === selectedId) || allTemplates[0];
  const preview = useMemo(() => interpolate(editing ? draftBody : selected.body, developer), [editing, draftBody, selected, developer]);
  const isCustom = customTemplates.some((t) => t.id === selectedId);

  const handleCreateNew = useCallback(() => {
    const id = `custom-${Date.now()}`;
    const newTemplate: Template = { id, name: "New Template", body: "Hi {{name}},\n\n" };
    const updated = [...customTemplates, newTemplate];
    setCustomTemplates(updated);
    saveCustomTemplates(updated);
    setSelectedId(id);
    setEditing(true);
    setDraftName(newTemplate.name);
    setDraftBody(newTemplate.body);
  }, [customTemplates]);

  const handleSaveEdit = useCallback(() => {
    if (!isCustom) {
      // If editing a built-in, fork into a custom template
      const id = `custom-${Date.now()}`;
      const newTemplate: Template = { id, name: draftName || selected.name, body: draftBody };
      const updated = [...customTemplates, newTemplate];
      setCustomTemplates(updated);
      saveCustomTemplates(updated);
      setSelectedId(id);
    } else {
      const updated = customTemplates.map((t) =>
        t.id === selectedId ? { ...t, name: draftName || t.name, body: draftBody } : t,
      );
      setCustomTemplates(updated);
      saveCustomTemplates(updated);
    }
    setEditing(false);
    toast({ title: "Template saved" });
  }, [isCustom, customTemplates, selectedId, draftName, draftBody, selected]);

  const handleDelete = useCallback(() => {
    if (!isCustom) return;
    const updated = customTemplates.filter((t) => t.id !== selectedId);
    setCustomTemplates(updated);
    saveCustomTemplates(updated);
    setSelectedId(allTemplates[0].id);
    toast({ title: "Template deleted" });
  }, [isCustom, customTemplates, selectedId, allTemplates]);

  const handleUse = useCallback(() => {
    onUseMessage(preview);
    toast({ title: "Template applied" });
  }, [preview, onUseMessage]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(preview);
    setCopied(true);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopied(false), 1500);
  }, [preview]);

  return (
    <div className="space-y-3">
      {/* Template selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {allTemplates.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setSelectedId(t.id);
              setEditing(false);
              setShowPreview(false);
            }}
            className={`text-[11px] font-display px-2.5 py-1 rounded-lg border transition-colors ${
              t.id === selectedId
                ? "bg-primary/10 text-primary border-primary/30"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.name}
          </button>
        ))}
        <button
          onClick={handleCreateNew}
          className="text-[11px] font-display px-2 py-1 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
        >
          <Plus className="w-3 h-3 inline mr-0.5" />
          New
        </button>
      </div>

      {/* Editor / Preview */}
      {editing ? (
        <div className="space-y-2">
          <input
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="Template name"
            className="w-full bg-secondary/50 border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground font-display outline-none focus:border-primary/30 placeholder:text-muted-foreground"
          />
          <textarea
            value={draftBody}
            onChange={(e) => setDraftBody(e.target.value)}
            rows={8}
            className="w-full bg-secondary/50 border border-border rounded-lg p-3 text-xs text-foreground font-body outline-none resize-none focus:border-primary/30"
          />
          {/* Variable chips */}
          <div className="flex flex-wrap gap-1">
            {TEMPLATE_VARIABLES.map((v) => (
              <button
                key={v.key}
                onClick={() => setDraftBody((prev) => prev + `{{${v.key}}}`)}
                className="text-[10px] font-display px-2 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                title={`Insert {{${v.key}}} — e.g. "${v.example}"`}
              >
                {`{{${v.key}}}`}
              </button>
            ))}
          </div>
        </div>
      ) : showPreview ? (
        <div className="p-3 rounded-lg bg-secondary/50 border border-border">
          <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-body">{preview}</p>
        </div>
      ) : (
        <div className="p-3 rounded-lg bg-secondary/50 border border-border">
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap font-body">{selected.body}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {editing ? (
          <>
            <button onClick={handleSaveEdit}
              className="text-[11px] font-display px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
              Save
            </button>
            <button onClick={() => setEditing(false)}
              className="text-[11px] font-display px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
          </>
        ) : (
          <>
            <button onClick={handleUse}
              className="text-[11px] font-display px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
              <FileText className="w-3 h-3 inline mr-1" />
              Use Template
            </button>
            <button onClick={() => setShowPreview(!showPreview)}
              className={`text-[11px] font-display px-2.5 py-1 rounded-md border transition-colors ${
                showPreview ? "bg-primary/10 text-primary border-primary/20" : "border-border text-muted-foreground hover:text-foreground"
              }`}>
              <Eye className="w-3 h-3 inline mr-1" />
              {showPreview ? "Show Raw" : "Preview"}
            </button>
            <button onClick={() => {
              setEditing(true);
              setDraftName(selected.name);
              setDraftBody(selected.body);
            }}
              className="text-[11px] font-display px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors">
              Edit
            </button>
            <button onClick={handleCopy}
              className={`text-[11px] font-display px-2.5 py-1 rounded-md border transition-colors ${
                copied ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "border-border text-muted-foreground hover:text-foreground"
              }`}>
              {copied ? <><ClipboardCheck className="w-3 h-3 inline mr-1" />Copied</> : <><Copy className="w-3 h-3 inline mr-1" />Copy</>}
            </button>
            {isCustom && (
              <button onClick={handleDelete}
                className="text-[11px] font-display px-2.5 py-1 rounded-md border border-destructive/20 text-destructive/70 hover:text-destructive hover:border-destructive/40 transition-colors">
                <Trash2 className="w-3 h-3 inline mr-1" />
                Delete
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OutreachTemplateEditor;
