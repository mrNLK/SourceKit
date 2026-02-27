import { X, ArrowRight } from "lucide-react";

const OnboardingCard = () => {
  if (localStorage.getItem("sourcekit-gs-onboarding-dismissed")) return null;

  return (
    <div className="glass rounded-xl p-5 space-y-3 border border-primary/20 relative">
      <button onClick={() => { localStorage.setItem("sourcekit-gs-onboarding-dismissed", "1"); window.dispatchEvent(new Event("storage")); }} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
      <h2 className="text-sm font-display font-semibold text-foreground">Find engineers by what they've built</h2>
      <p className="text-xs text-muted-foreground leading-relaxed">SourceKit searches GitHub contributions to find candidates based on real code — not just resumes. Describe the engineer you need, review AI-scored results, then enrich and add to your pipeline.</p>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="px-2 py-0.5 rounded bg-secondary">Search</span>
        <ArrowRight className="h-3 w-3" />
        <span className="px-2 py-0.5 rounded bg-secondary">Review &amp; Score</span>
        <ArrowRight className="h-3 w-3" />
        <span className="px-2 py-0.5 rounded bg-secondary">Enrich &amp; Pipeline</span>
      </div>
    </div>
  );
};

export default OnboardingCard;
