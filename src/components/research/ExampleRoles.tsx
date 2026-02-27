import { Sparkles } from "lucide-react";
import type { InputMode } from "@/components/ResearchTab";

interface ExampleRolesProps {
  inputMode: InputMode;
  onSelect: (title: string, company: string) => void;
}

const EXAMPLES = [
  { title: "Staff ML Engineer", company: "Anthropic" },
  { title: "Founding Engineer", company: "Series A AI startup" },
  { title: "Staff Backend Engineer", company: "Stripe" },
];

const ExampleRoles = ({ inputMode, onSelect }: ExampleRolesProps) => (
  <div className="glass rounded-xl p-8 text-center border border-dashed border-border">
    <Sparkles className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
    <p className="font-display text-sm text-muted-foreground mb-1">
      {inputMode === "jd" ? "Paste a job description URL or text above" : "Enter a role and company above"}
    </p>
    <p className="text-xs text-muted-foreground/60 font-body mb-4">AI will build a complete sourcing strategy with target repos, companies to poach from, skills, and EEA signals</p>
    {inputMode === "manual" && (
      <div className="space-y-2">
        <p className="text-[10px] font-display text-muted-foreground/60 uppercase tracking-wider">Try an example</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {EXAMPLES.map((ex) => (
            <button key={ex.title + ex.company} onClick={() => onSelect(ex.title, ex.company)}
              className="text-xs font-display px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors">
              {ex.title} @ {ex.company}
            </button>
          ))}
        </div>
      </div>
    )}
  </div>
);

export default ExampleRoles;
