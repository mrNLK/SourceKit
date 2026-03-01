import { useState, useEffect } from "react";
import { Download, ChevronDown, FileJson, FileSpreadsheet } from "lucide-react";

interface ExportColumn {
  key: string;
  label: string;
  extract: (item: any) => string | number;
}

const DEFAULT_COLUMNS: ExportColumn[] = [
  { key: "name", label: "Name", extract: (d) => d.name || d.candidate_name || "" },
  { key: "username", label: "GitHub Username", extract: (d) => d.username || d.github_username || "" },
  { key: "score", label: "Score", extract: (d) => d.score || 0 },
  { key: "location", label: "Location", extract: (d) => d.location || "" },
  { key: "bio", label: "Bio", extract: (d) => d.bio || d.summary || "" },
  { key: "stars", label: "Stars", extract: (d) => d.stars || 0 },
  { key: "followers", label: "Followers", extract: (d) => d.followers || 0 },
  { key: "publicRepos", label: "Public Repos", extract: (d) => d.publicRepos || d.public_repos || 0 },
  { key: "languages", label: "Languages", extract: (d) => (d.topLanguages || d.top_languages || []).map((l: any) => l.name).join(", ") },
  { key: "githubUrl", label: "GitHub URL", extract: (d) => d.githubUrl || d.github_url || `https://github.com/${d.username || d.github_username}` },
  { key: "linkedinUrl", label: "LinkedIn URL", extract: (d) => d.linkedinUrl || d.linkedin_url || "" },
  { key: "email", label: "Email", extract: (d) => d.email || "" },
  { key: "stage", label: "Pipeline Stage", extract: (d) => d.stage || "" },
  { key: "addedAt", label: "Added At", extract: (d) => d.created_at || d.addedAt || "" },
];

interface ExportButtonProps {
  data: any[];
  filename?: string;
  columns?: ExportColumn[];
  label?: string;
}

function escapeCSV(val: string | number): string {
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const ExportButton = ({ data, filename = "sourcekit-export", columns = DEFAULT_COLUMNS, label = "Export" }: ExportButtonProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  if (data.length === 0) return null;

  const exportCSV = () => {
    const header = columns.map(c => c.label).join(",");
    const rows = data.map(item => columns.map(c => escapeCSV(c.extract(item))).join(","));
    const csv = [header, ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const exportJSON = () => {
    const json = data.map(item => {
      const obj: Record<string, string | number> = {};
      for (const c of columns) {
        obj[c.key] = c.extract(item);
      }
      return obj;
    });

    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
      >
        <Download className="w-3 h-3" />
        {label}
        <ChevronDown className="w-2.5 h-2.5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 right-0 bg-popover border border-border rounded-lg shadow-lg z-50 min-w-[140px]">
            <button onClick={exportCSV}
              className="w-full flex items-center gap-2 text-xs font-display px-3 py-2 hover:bg-accent transition-colors text-foreground">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              Export CSV
            </button>
            <button onClick={exportJSON}
              className="w-full flex items-center gap-2 text-xs font-display px-3 py-2 hover:bg-accent transition-colors text-foreground">
              <FileJson className="w-3.5 h-3.5 text-amber-400" />
              Export JSON
            </button>
            <div className="border-t border-border px-3 py-1.5">
              <span className="text-[10px] text-muted-foreground">{data.length} item{data.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExportButton;
