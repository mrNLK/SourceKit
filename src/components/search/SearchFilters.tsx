import { useState, useRef } from "react";
import { SlidersHorizontal, MapPin, X, Gem, Zap, Loader2, AlertTriangle } from "lucide-react";
import ExportButton from "@/components/ExportButton";

type SeniorityFilter = "any" | "junior" | "mid" | "senior";

interface SkillFilter {
  id: string;
  text: string;
}

interface SearchFiltersProps {
  results: any[];
  filtered: any[];
  hasActiveFilters: boolean;
  hasActiveSkills: boolean;
  skillFilters: SkillFilter[];
  showSkillPanel: boolean;
  onToggleSkillPanel: () => void;
  // Location
  locationFilter: string;
  onLocationChange: (val: string) => void;
  locationSuggestions: string[];
  // Gems
  showGemsOnly: boolean;
  onToggleGems: () => void;
  // Ungettable
  showUngettable: boolean;
  onToggleUngettable: () => void;
  // Results limit
  resultLimit: number;
  onResultLimitChange: (val: number) => void;
  // Enrich
  enrichProgress: { current: number; total: number; skipped: number } | null;
  onBatchEnrich: () => void;
  // Language
  availableLanguages: string[];
  languageFilter: string;
  onLanguageChange: (val: string) => void;
  // Score
  minScore: number;
  onMinScoreChange: (val: number) => void;
  // Seniority
  seniorityFilter: SeniorityFilter;
  onSeniorityChange: (val: SeniorityFilter) => void;
}

const SearchFilters = ({
  results, filtered, hasActiveFilters, hasActiveSkills, skillFilters,
  showSkillPanel, onToggleSkillPanel,
  locationFilter, onLocationChange, locationSuggestions,
  showGemsOnly, onToggleGems,
  showUngettable, onToggleUngettable,
  resultLimit, onResultLimitChange,
  enrichProgress, onBatchEnrich,
  availableLanguages, languageFilter, onLanguageChange,
  minScore, onMinScoreChange,
  seniorityFilter, onSeniorityChange,
}: SearchFiltersProps) => {
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationHighlight, setLocationHighlight] = useState(-1);
  const locationInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3 mb-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">
            {hasActiveFilters ? (
              <>Showing <span className="text-primary">{filtered.length}</span> of {results.length} engineers</>
            ) : (
              <>Found <span className="text-primary">{filtered.length}</span> engineers</>
            )}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 font-display">
            Sorted by AI relevance score{hasActiveSkills && " + skill priorities"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={onToggleSkillPanel}
            className={`flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-full border transition-colors ${
              showSkillPanel || hasActiveSkills ? 'bg-primary/10 text-primary border-primary/30' : 'border-border text-muted-foreground hover:text-foreground'
            }`}>
            <SlidersHorizontal className="w-3 h-3" /> Filters
            {hasActiveSkills && <span className="text-[9px] px-1 py-0.5 rounded bg-primary/20 text-primary font-bold">{skillFilters.filter(s => s.text.trim()).length}</span>}
          </button>

          <div className="relative">
            <div className="flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-full border border-border bg-secondary">
              <MapPin className="w-3 h-3 text-muted-foreground" />
              <input ref={locationInputRef} type="text" value={locationFilter}
                onChange={(e) => { onLocationChange(e.target.value); setShowLocationSuggestions(true); setLocationHighlight(-1); }}
                onFocus={() => setShowLocationSuggestions(true)}
                onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 150)}
                onKeyDown={(e) => {
                  if (!showLocationSuggestions || locationSuggestions.length === 0) return;
                  if (e.key === "ArrowDown") { e.preventDefault(); setLocationHighlight(prev => (prev + 1) % locationSuggestions.length); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setLocationHighlight(prev => (prev <= 0 ? locationSuggestions.length - 1 : prev - 1)); }
                  else if (e.key === "Enter" && locationHighlight >= 0) { e.preventDefault(); onLocationChange(locationSuggestions[locationHighlight]); setShowLocationSuggestions(false); setLocationHighlight(-1); }
                  else if (e.key === "Escape") { setShowLocationSuggestions(false); setLocationHighlight(-1); }
                }}
                placeholder="Filter by location..." className="bg-transparent outline-none text-foreground placeholder:text-muted-foreground w-32" />
              {locationFilter && <button onClick={() => onLocationChange("")} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>}
            </div>
            {showLocationSuggestions && locationSuggestions.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
                {locationSuggestions.map((loc, idx) => (
                  <button key={loc} onMouseDown={() => { onLocationChange(loc); setShowLocationSuggestions(false); setLocationHighlight(-1); }}
                    className={`w-full text-left text-xs px-3 py-1.5 hover:bg-accent text-foreground font-display truncate ${idx === locationHighlight ? 'bg-accent' : ''}`}>{loc}</button>
                ))}
              </div>
            )}
          </div>

          <button onClick={onToggleGems}
            className={`flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-full border transition-colors ${
              showGemsOnly ? 'bg-warning/10 text-warning border-warning/30' : 'border-border text-muted-foreground hover:text-foreground'
            }`}>
            <Gem className="w-3 h-3" /> Hidden Gems
          </button>

          <button onClick={onToggleUngettable}
            className={`flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-full border transition-colors ${
              showUngettable ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'border-border text-muted-foreground hover:text-foreground'
            }`}
            title="Show high-profile candidates (founders, CEOs, industry leaders) that are typically harder to recruit">
            <AlertTriangle className="w-3 h-3" /> Show Ungettable
          </button>

          <div className="flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-full border border-border bg-secondary">
            <span className="text-muted-foreground">Results</span>
            <select value={resultLimit} onChange={(e) => onResultLimitChange(Number(e.target.value))}
              className="bg-popover text-foreground border border-border rounded px-1.5 py-0.5 outline-none text-xs font-display cursor-pointer">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <button onClick={onBatchEnrich} disabled={!!enrichProgress}
            className={`flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-full border transition-colors ${
              enrichProgress ? 'bg-info/10 text-info border-info/30' : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
            } disabled:cursor-not-allowed`}>
            {enrichProgress ? (
              <><Loader2 className="w-3 h-3 animate-spin" />{enrichProgress.current}/{enrichProgress.total}{enrichProgress.skipped > 0 && <span className="text-muted-foreground">· {enrichProgress.skipped} skipped</span>}</>
            ) : (
              <><Zap className="w-3 h-3" /> Enrich All</>
            )}
          </button>

          {availableLanguages.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-full border border-border bg-secondary">
              <span className="text-muted-foreground">Lang</span>
              <select value={languageFilter} onChange={(e) => onLanguageChange(e.target.value)}
                className="bg-popover text-foreground border border-border rounded px-1.5 py-0.5 outline-none text-xs font-display cursor-pointer">
                <option value="">All</option>
                {availableLanguages.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-full border border-border bg-secondary">
            <span className="text-muted-foreground">Min Score</span>
            <select value={minScore} onChange={(e) => onMinScoreChange(Number(e.target.value))}
              className="bg-popover text-foreground border border-border rounded px-1.5 py-0.5 outline-none text-xs font-display cursor-pointer">
              <option value={0}>Any</option>
              <option value={30}>30+</option>
              <option value={50}>50+</option>
              <option value={70}>70+</option>
              <option value={80}>80+</option>
            </select>
          </div>

          <ExportButton data={filtered} filename="sourcekit-search" />
        </div>
      </div>

      {/* Seniority filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-display text-muted-foreground">Seniority:</span>
        {(["any", "junior", "mid", "senior"] as SeniorityFilter[]).map(level => (
          <button
            key={level}
            onClick={() => onSeniorityChange(level)}
            className={`text-xs font-display px-3 py-1 rounded-lg border transition-colors capitalize ${
              seniorityFilter === level
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-secondary text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SearchFilters;
