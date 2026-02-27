import { useState } from 'react'
import { Search, Github, Sparkles } from 'lucide-react'
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

export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [githubHandle, setGithubHandle] = useState('')
  const [capabilityQuery, setCapabilityQuery] = useState('')
  const [ghError, setGhError] = useState<string | null>(null)

  const handleGithubChange = (value: string) => {
    setGithubHandle(value)
    setGhError(validateGithubHandle(value))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name && !company && !githubHandle && !capabilityQuery) return

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
        />
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>or search by profile</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
        <Input placeholder="Company" value={company} onChange={e => setCompany(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input placeholder="Role (optional)" value={role} onChange={e => setRole(e.target.value)} />
        <div>
          <div className="relative">
            <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="GitHub handle"
              value={githubHandle}
              onChange={e => handleGithubChange(e.target.value)}
              className={`pl-10 ${ghError ? 'border-destructive' : ''}`}
            />
          </div>
          {ghError && <p className="text-[10px] text-destructive mt-1">{ghError}</p>}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading || Boolean(ghError)}>
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
