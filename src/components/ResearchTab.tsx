import { useState } from "react";
import { Loader2, Briefcase, Building2 } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface ResearchState {
  jobTitle: string;
  companyName: string;
  research: string;
  error: string;
}

interface ResearchTabProps {
  state: ResearchState;
  onStateChange: (state: ResearchState) => void;
}

const ResearchTab = ({ state, onStateChange }: ResearchTabProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const update = (partial: Partial<ResearchState>) =>
    onStateChange({ ...state, ...partial });

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.jobTitle.trim() || !state.companyName.trim()) return;

    setIsLoading(true);
    update({ error: "", research: "" });

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/research-role`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: "start",
          job_title: state.jobTitle,
          company_name: state.companyName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      update({ research: data.research });
    } catch (err) {
      update({ error: err instanceof Error ? err.message : 'Research failed' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleResearch} className="glass rounded-xl p-5 mb-6">
        <h3 className="font-display text-sm font-semibold text-foreground mb-4">Research a Role</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={state.jobTitle}
              onChange={(e) => update({ jobTitle: e.target.value })}
              placeholder="Job title (e.g. ML Engineer)"
              className="w-full bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground py-2.5 pl-10 pr-4 outline-none border border-border focus:border-primary/40 transition-colors font-body"
            />
          </div>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={state.companyName}
              onChange={(e) => update({ companyName: e.target.value })}
              placeholder="Company (e.g. Stripe)"
              className="w-full bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground py-2.5 pl-10 pr-4 outline-none border border-border focus:border-primary/40 transition-colors font-body"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading || !state.jobTitle.trim() || !state.companyName.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-display text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          {isLoading ? 'Researching...' : 'Research'}
        </button>
      </form>

      {state.error && (
        <div className="glass rounded-xl p-4 mb-6">
          <p className="text-sm text-destructive font-display">{state.error}</p>
        </div>
      )}

      {state.research && (
        <div className="glass rounded-xl p-6">
          <div className="prose prose-invert prose-sm max-w-none
            prose-headings:font-display prose-headings:text-foreground
            prose-h2:text-base prose-h2:mt-6 prose-h2:mb-3
            prose-p:text-secondary-foreground prose-p:leading-relaxed
            prose-li:text-secondary-foreground
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-strong:text-foreground
            prose-ul:my-2 prose-ol:my-2
          ">
            <MarkdownRenderer content={state.research} />
          </div>
        </div>
      )}
    </div>
  );
};

/** Simple markdown renderer for research results */
const MarkdownRenderer = ({ content }: { content: string }) => {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('## ')) {
      elements.push(<h2 key={i}>{line.slice(3)}</h2>);
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i}>{line.slice(4)}</h3>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = [line.slice(2)];
      while (i + 1 < lines.length && (lines[i + 1].startsWith('- ') || lines[i + 1].startsWith('* '))) {
        i++;
        items.push(lines[i].slice(2));
      }
      elements.push(
        <ul key={i}>
          {items.map((item, j) => (
            <li key={j} dangerouslySetInnerHTML={{ __html: linkify(boldify(item)) }} />
          ))}
        </ul>
      );
    } else if (line.match(/^\d+\. /)) {
      const items: string[] = [line.replace(/^\d+\. /, '')];
      while (i + 1 < lines.length && lines[i + 1].match(/^\d+\. /)) {
        i++;
        items.push(lines[i].replace(/^\d+\. /, ''));
      }
      elements.push(
        <ol key={i}>
          {items.map((item, j) => (
            <li key={j} dangerouslySetInnerHTML={{ __html: linkify(boldify(item)) }} />
          ))}
        </ol>
      );
    } else if (line.trim()) {
      elements.push(<p key={i} dangerouslySetInnerHTML={{ __html: linkify(boldify(line)) }} />);
    }
  }

  return <>{elements}</>;
};

function boldify(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function linkify(text: string): string {
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

export default ResearchTab;
