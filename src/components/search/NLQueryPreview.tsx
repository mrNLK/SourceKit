import { X, Search, Edit3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ParsedQuery } from '@/hooks/useNLQueryParser';

interface NLQueryPreviewProps {
  parsed: ParsedQuery;
  onSearch: (githubQuery: string) => void;
  onDismiss: () => void;
}

const NLQueryPreview = ({ parsed, onSearch, onDismiss }: NLQueryPreviewProps) => {
  return (
    <div className="glass rounded-lg p-3 space-y-2 border border-primary/20">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-display font-semibold text-primary uppercase tracking-wider">
          Interpreted Search
        </span>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {parsed.role && (
          <Badge variant="secondary" className="text-[10px]">
            Role: {parsed.role}
          </Badge>
        )}
        {parsed.seniority && (
          <Badge variant="secondary" className="text-[10px]">
            Level: {parsed.seniority}
          </Badge>
        )}
        {parsed.location && (
          <Badge variant="secondary" className="text-[10px]">
            Location: {parsed.location}
          </Badge>
        )}
        {parsed.skills?.map((skill) => (
          <Badge key={skill} variant="outline" className="text-[10px] border-primary/30 text-primary">
            {skill}
          </Badge>
        ))}
        {parsed.companies?.map((co) => (
          <Badge key={co} variant="outline" className="text-[10px]">
            Company: {co}
          </Badge>
        ))}
        {parsed.qualifications?.map((q, i) => (
          <Badge key={i} variant="outline" className="text-[10px]">
            {q}
          </Badge>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="text-xs h-7"
          onClick={() => onSearch(parsed.github_query || '')}
        >
          <Search className="w-3 h-3 mr-1" />
          Search with these criteria
        </Button>
        <span className="text-[10px] text-muted-foreground">or edit above to refine</span>
      </div>
    </div>
  );
};

export default NLQueryPreview;
