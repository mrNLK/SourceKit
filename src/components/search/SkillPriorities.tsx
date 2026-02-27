import { X, GripVertical, Plus } from "lucide-react";

interface SkillFilter {
  id: string;
  text: string;
}

interface SkillPrioritiesProps {
  skills: SkillFilter[];
  hasActiveQuery: boolean;
  dragIdx: number | null;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, text: string) => void;
  onDragStart: (idx: number) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDragEnd: () => void;
  onClose: () => void;
}

const SkillPriorities = ({
  skills, hasActiveQuery, dragIdx,
  onAdd, onRemove, onUpdate,
  onDragStart, onDragOver, onDragEnd, onClose,
}: SkillPrioritiesProps) => {
  const hasActive = skills.some(s => s.text.trim());

  return (
    <div className="w-72 shrink-0 glass rounded-xl p-4 self-start sticky top-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm font-semibold text-foreground">Skill Priorities</h3>
        <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
      </div>
      <p className="text-[10px] text-muted-foreground font-display mb-3">Add skills in priority order. Higher priority skills weight more in match scoring. Drag to reorder.</p>
      <div className="space-y-2 mb-3">
        {skills.map((skill, idx) => (
          <div key={skill.id} draggable onDragStart={() => onDragStart(idx)} onDragOver={(e) => onDragOver(e, idx)} onDragEnd={onDragEnd}
            className={`flex items-center gap-1.5 p-1.5 rounded-lg border transition-all ${dragIdx === idx ? "border-primary/40 bg-primary/5" : "border-border bg-secondary/30"}`}>
            <GripVertical className="w-3 h-3 text-muted-foreground cursor-grab shrink-0" />
            <span className="w-4 h-4 rounded bg-primary/15 text-primary text-[9px] font-display font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
            <input type="text" value={skill.text} onChange={(e) => onUpdate(skill.id, e.target.value)}
              placeholder="e.g. Transformer architectures" className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none font-body min-w-0" />
            <button onClick={() => onRemove(skill.id)} className="p-0.5 rounded text-muted-foreground hover:text-destructive shrink-0"><X className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      <button onClick={onAdd} disabled={skills.length >= 10}
        className="w-full flex items-center justify-center gap-1.5 text-xs font-display px-3 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
        <Plus className="w-3 h-3" /> Add Skill {skills.length > 0 && `(${skills.length}/10)`}
      </button>
      {hasActive && hasActiveQuery && (
        <p className="text-[10px] text-muted-foreground font-display mt-3 text-center">Run a new search to include skill priorities in the query.</p>
      )}
    </div>
  );
};

export default SkillPriorities;
