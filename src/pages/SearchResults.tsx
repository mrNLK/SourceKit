import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Search, GitBranch, Filter, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { mockDevelopers } from "@/data/mockDevelopers";
import DeveloperCard from "@/components/DeveloperCard";

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState(query);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  // Mock filtering — in real app this would be an API call
  const results = mockDevelopers;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border glass sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-primary" />
            </div>
            <span className="font-display text-sm font-semibold text-foreground hidden sm:inline">SourceKit</span>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground py-2 pl-10 pr-4 outline-none border border-border focus:border-primary/40 transition-colors font-body"
              placeholder="Search engineers..."
            />
          </form>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-lg font-semibold text-foreground">
              Results for "<span className="text-primary">{query}</span>"
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {results.length} engineers found · Sorted by relevance score
            </p>
          </div>
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-display">Filters</span>
          </button>
        </div>

        <div className="grid gap-3">
          {results.map((dev) => (
            <DeveloperCard key={dev.id} developer={dev} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default SearchResults;
