import { useState } from 'react'
import { Search, Github, Sparkles, Link as LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SearchQuery } from '@/types'

interface SearchFormProps {
  onSearch: (query: SearchQuery) => void
  isLoading: boolean
}

function validateGithubHandle(value: string): string | null {
  if (!value) return null
  const cleaned = value.replace(/^@/, '')
  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(cleaned)) {
    return 'GitHub handle must be alphanumeric (hyphens allowed, no leading/trailing hyphen)'
  }
  return null
}

/**
 * Extract a GitHub handle from a URL like:
 * - https://github.com/username
 * - https://github.com/username/repo
 * Returns the handle or null if not a GitHub URL.
 */
function extractGitHubHandle(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'github.com' || parsed.hostname === 'www.github.com') {
      const parts = parsed.pathname.split('/').filter(Boolean)
      if (parts.length >= 1 && /^[a-zA-Z0-9-]+$/.test(parts[0])) {
        return parts[0]
      }
    }
  } catch {
    // Not a valid URL
  }
  return null
}

export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [githubHandle, setGithubHandle] = useState('')
  const [capabilityQuery, setCapabilityQuery] = useState('')
  const [profileUrl, setProfileUrl] = useState('')
  const [ghError, setGhError] = useState<string | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)

  const handleGithubChange = (value: string) => {
    setGithubHandle(value)
    setGhError(validateGithubHandle(value))
  }

  const handleUrlChange = (value: string) => {
    setProfileUrl(value)
    setUrlError(null)
    // Auto-detect GitHub URL and extract handle
    if (value.trim()) {
      const handle = extractGitHubHandle(value.trim())
      if (handle) {
        setGithubHandle(handle)
        setGhError(null)
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // If URL is provided but not recognized, show error
    if (profileUrl.trim() && !extractGitHubHandle(profileUrl.trim())) {
      if (profileUrl.includes('linkedin.com')) {
        setUrlError('LinkedIn URLs are noted but search uses GitHub. Add a GitHub handle for best results.')
      } else if (!profileUrl.startsWith('http')) {
        setUrlError('Please enter a valid URL starting with https://')
        return
      }
    }

    if (!name && !company && !githubHandle && !capabilityQuery && !profileUrl) return

    // Validate GitHub handle before submit
    const ghValidation = validateGithubHandle(githubHandle)
    if (ghValidation) {
      setGhError(ghValidation)
      return
    }

    // Strip @ prefix from GitHub handle
    const cleanHandle = githubHandle.replace(/^@/, '').trim()

    onSearch({
      name: name || undefined,
      company: company || undefined,
      role: role || undefined,
      github_handle: cleanHandle || undefined,
      capability_query: capabilityQuery || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4">
      <div className="relative">
        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
        <Input
          placeholder="Search by capability... e.g. 'WASM compiler experience'"
          value={capabilityQuery}
          onChange={e => setCapabilityQuery(e.target.value)}
          className="pl-10 border-primary/30 focus-visible:ring-primary"
          aria-label="Search by capability"
        />
      </div>

      {/* URL Input */}
      <div>
        <div className="relative">
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Paste a GitHub or LinkedIn URL..."
            value={profileUrl}
            onChange={e => handleUrlChange(e.target.value)}
            className={`pl-10 ${urlError ? 'border-amber-500' : ''}`}
            aria-label="Profile URL"
          />
        </div>
        {urlError && <p className="text-[10px] text-amber-500 mt-1">{urlError}</p>}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>or search by profile</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} aria-label="Candidate name" />
        <Input placeholder="Company" value={company} onChange={e => setCompany(e.target.value)} aria-label="Company name" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input placeholder="Role (optional)" value={role} onChange={e => setRole(e.target.value)} aria-label="Role" />
        <div>
          <div className="relative">
            <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="GitHub handle"
              value={githubHandle}
              onChange={e => handleGithubChange(e.target.value)}
              className={`pl-10 ${ghError ? 'border-destructive' : ''}`}
              aria-label="GitHub handle"
            />
          </div>
          {ghError && <p className="text-[10px] text-destructive mt-1">{ghError}</p>}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading || Boolean(ghError)} aria-label="Search candidates">
        {isLoading ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            Searching...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Search Candidates
          </span>
        )}
      </Button>
    </form>
  )
}
