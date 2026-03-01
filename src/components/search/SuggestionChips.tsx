import type { SuggestionChip } from "@/lib/search-helpers";

interface SuggestionChipsProps {
  suggestions: SuggestionChip[];
  onSubmit: (chip: SuggestionChip) => void;
}

const SuggestionChips = ({ suggestions, onSubmit }: SuggestionChipsProps) => (
  <>
    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium font-display">Example searches — click to run</p>
    <div className="flex flex-wrap gap-2">
      {suggestions.map((chip) => (
        <button key={chip.label} onClick={() => onSubmit(chip)}
          className="text-xs font-display px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          title={chip.targetRepos ? `Searches ${chip.targetRepos.length} repos directly` : chip.expandedQuery.substring(0, 100) + "..."}>
          {chip.label}
        </button>
      ))}
    </div>
  </>
);

export default SuggestionChips;
