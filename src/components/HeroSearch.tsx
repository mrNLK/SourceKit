import { Search, GitBranch } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const HeroSearch = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const suggestions = ["Rust systems engineers", "React accessibility experts", "ML infrastructure", "Kubernetes contributors", "Security researchers"];

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 grid-pattern opacity-40" />
      
      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-primary/8 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1.5s" }} />

      <div className="relative z-10 max-w-3xl w-full text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center glow-sm">
            <GitBranch className="w-5 h-5 text-primary" />
          </div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
            SourceKit
          </h2>
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 font-display">
          <span className="text-foreground">Find </span>
          <span className="text-gradient">elite engineers</span>
          <br />
          <span className="text-foreground">hidden in open source</span>
        </h1>

        <p className="text-text-secondary text-lg sm:text-xl mb-10 max-w-xl mx-auto leading-relaxed">
          Analyze GitHub contributions to discover overlooked talent building the most impactful software.
        </p>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="relative group">
          <div className="relative glass rounded-xl glow-border transition-all duration-300 group-focus-within:glow-sm">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by skill, language, or domain..."
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground py-4 pl-14 pr-32 text-base sm:text-lg outline-none font-body"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-5 py-2 rounded-lg font-display text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Search
            </button>
          </div>
        </form>

        {/* Suggestion chips */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => {
                setQuery(s);
                navigate(`/search?q=${encodeURIComponent(s)}`);
              }}
              className="text-xs font-display px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-8 mt-16 text-text-dim">
          {[
            { label: "Engineers indexed", value: "2.4M+" },
            { label: "Repos analyzed", value: "18M+" },
            { label: "Hidden gems found", value: "340K+" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-display text-lg font-semibold text-foreground">{stat.value}</div>
              <div className="text-xs mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeroSearch;
