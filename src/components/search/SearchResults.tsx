import { Loader2, Plus, X, Check, UserPlus } from "lucide-react";
import DeveloperCard from "@/components/DeveloperCard";
import ExportButton from "@/components/ExportButton";
import type { Developer } from "@/types/developer";

interface SearchResultsProps {
  filtered: Developer[];
  results: Developer[];
  isExpanding: boolean;
  canExpand: boolean;
  currentResultCount: number;
  maxResults: number;
  batchSelected: Set<string>;
  batchAdding: boolean;
  pipelineSet: Set<string>;
  shortlisted: Set<string>;
  onToggleBatchSelect: (username: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBatchAddToPipeline: () => void;
  onToggleShortlist: (username: string) => void;
  onCardClick: (dev: Developer) => void;
  onScoreClick?: (dev: Developer) => void;
  onExpandSearch: () => void;
}

const SearchResults = ({
  filtered, results, isExpanding, canExpand, currentResultCount, maxResults,
  batchSelected, batchAdding, pipelineSet, shortlisted,
  onToggleBatchSelect, onSelectAll, onClearSelection, onBatchAddToPipeline,
  onToggleShortlist, onCardClick, onScoreClick, onExpandSearch,
}: SearchResultsProps) => (
  <>
    {/* Batch actions bar */}
    {filtered.length > 0 && (
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button onClick={batchSelected.size === filtered.length ? onClearSelection : onSelectAll}
          className="flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
          {batchSelected.size === filtered.length ? (
            <><X className="w-3 h-3" /> Deselect All</>
          ) : (
            <><Check className="w-3 h-3" /> Select All ({filtered.length})</>
          )}
        </button>
        <ExportButton data={filtered} filename="sourcekit-search" label="Export" />
        {batchSelected.size > 0 && (
          <>
            <span className="text-xs font-display text-muted-foreground">{batchSelected.size} selected</span>
            <button onClick={onBatchAddToPipeline} disabled={batchAdding}
              className="flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              {batchAdding ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
              Add to Pipeline
            </button>
            <button onClick={onClearSelection}
              className="text-xs font-display text-muted-foreground hover:text-foreground transition-colors">
              Clear
            </button>
          </>
        )}
      </div>
    )}

    <div className="grid gap-3">
      {filtered.map((dev) => (
        <div key={dev.id} className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleBatchSelect(dev.username); }}
            className={`absolute top-4 left-4 z-10 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
              batchSelected.has(dev.username)
                ? 'bg-primary border-primary text-primary-foreground'
                : 'border-border bg-secondary/50 text-transparent hover:border-primary/40'
            }`}
          >
            <Check className="w-3 h-3" />
          </button>
          <DeveloperCard
            developer={dev}
            isShortlisted={shortlisted.has(dev.username)}
            onToggleShortlist={() => onToggleShortlist(dev.username)}
            showPipelineButton
            inPipeline={pipelineSet.has(dev.username)}
            onCardClick={(d) => onCardClick(d)}
            onScoreClick={onScoreClick}
          />
          {dev.skillMatch >= 0 && (
            <div className={`absolute bottom-3 right-3 text-[10px] font-display font-bold px-2 py-0.5 rounded-full border ${
              dev.skillMatch >= 70 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
              dev.skillMatch >= 40 ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
              "bg-secondary text-secondary-foreground border-border"
            }`}>
              {dev.skillMatch}% skill match
            </div>
          )}
        </div>
      ))}
      {results.length === 0 && (
        <div className="text-center py-12 space-y-4">
          <p className="font-display text-sm font-medium text-foreground">No engineers found</p>
          <div className="text-xs text-muted-foreground space-y-1 text-left max-w-sm mx-auto font-display">
            <p className="font-medium text-foreground/80">Tips to improve results:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Name specific repositories (e.g. "contributors to pytorch/pytorch")</li>
              <li>Use technology names instead of role titles</li>
              <li>Remove location filters to search globally</li>
              <li>Try the Research tab to generate an optimized search strategy</li>
            </ul>
          </div>
        </div>
      )}
      {results.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <p className="font-display text-sm text-foreground">No engineers match the current filters.</p>
          <p className="text-xs text-muted-foreground font-display">Try adjusting location, seniority, or skill filters above.</p>
        </div>
      )}
    </div>

    {results.length > 0 && (
      <div className="flex justify-center mt-6">
        <button onClick={onExpandSearch} disabled={!canExpand || isExpanding}
          className={`flex items-center gap-2 text-xs font-display px-5 py-2.5 rounded-xl border transition-colors ${
            !canExpand ? "border-border text-muted-foreground/50 cursor-not-allowed" : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5"
          }`}
          title={currentResultCount >= maxResults ? "Maximum results reached" : "Expand to find more candidates"}>
          {isExpanding ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> Expanding...</>) : (<><Plus className="w-3.5 h-3.5" /> {currentResultCount >= maxResults ? "Maximum results reached" : "Expand Search"}</>)}
        </button>
      </div>
    )}
  </>
);

export default SearchResults;
