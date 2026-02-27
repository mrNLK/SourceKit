import { useState, useCallback } from 'react'
import { CheckSquare, Download, Tags, ArrowRightLeft, Trash2, Send, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/EmptyState'
import { useCandidates } from '@/hooks/useCandidates'
import { useSettings } from '@/hooks/useSettings'
import { useOutreach } from '@/hooks/useOutreach'
import { exportToCSV } from '@/services/export'
import { generateOutreach } from '@/services/outreach'
import type { CandidateStage } from '@/types'

const STAGES: CandidateStage[] = ['sourced', 'contacted', 'responded', 'screen', 'offer']

export function BulkActionsPage() {
  const { allCandidates, updateStage, addTag, deleteCandidate } = useCandidates()
  const { settings } = useSettings()
  const { saveOutreach } = useOutreach()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [tagInput, setTagInput] = useState('')
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; message: string } | null>(null)
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const showNotice = useCallback((type: 'error' | 'success', message: string) => {
    setNotice({ type, message })
    setTimeout(() => setNotice(null), 4000)
  }, [])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === allCandidates.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allCandidates.map(c => c.id)))
    }
  }

  const handleExportSelected = () => {
    const selectedCandidates = allCandidates.filter(c => selected.has(c.id))
    if (selectedCandidates.length === 0) return
    exportToCSV(selectedCandidates, `sourcekit-bulk-export-${new Date().toISOString().slice(0, 10)}.csv`)
    showNotice('success', `Exported ${selectedCandidates.length} candidates`)
  }

  const handleChangeStage = (stage: CandidateStage) => {
    for (const id of selected) {
      updateStage(id, stage)
    }
    showNotice('success', `Updated ${selected.size} candidates to "${stage}"`)
  }

  const handleAddTags = () => {
    if (!tagInput.trim()) return
    const tag = tagInput.trim().replace(/[<>"'&]/g, '').slice(0, 30)
    for (const id of selected) {
      addTag(id, tag)
    }
    setTagInput('')
    showNotice('success', `Added tag "${tag}" to ${selected.size} candidates`)
  }

  const handleBatchOutreach = async () => {
    const selectedCandidates = allCandidates.filter(c => selected.has(c.id))
    if (selectedCandidates.length === 0) return

    setBatchProgress({ current: 0, total: selectedCandidates.length })
    let successCount = 0

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    for (let i = 0; i < selectedCandidates.length; i++) {
      const candidate = selectedCandidates[i]
      try {
        const result = await generateOutreach(candidate, settings, supabaseUrl, supabaseKey)
        const key = candidate.github_handle || candidate.name.toLowerCase().replace(/\s+/g, '-')
        saveOutreach(key, candidate.name, result.message)
        successCount++
      } catch {
        // continue on failure
      }
      setBatchProgress({ current: i + 1, total: selectedCandidates.length })
    }

    setBatchProgress(null)
    showNotice('success', `Generated outreach for ${successCount}/${selectedCandidates.length} candidates`)
  }

  const handleBulkDelete = () => {
    for (const id of selected) {
      deleteCandidate(id)
    }
    const count = selected.size
    setSelected(new Set())
    setConfirmDelete(false)
    showNotice('success', `Removed ${count} candidates from pipeline`)
  }

  if (allCandidates.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          icon={CheckSquare}
          title="No candidates in pipeline"
          description="Save candidates from Search to use bulk actions"
        />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-primary" />
          Bulk Actions
        </h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={toggleAll}>
            {selected.size === allCandidates.length ? 'Deselect All' : 'Select All'}
          </Button>
          <span className="text-sm text-muted-foreground">
            {selected.size} of {allCandidates.length} selected
          </span>
        </div>
      </div>

      {/* Notice */}
      {notice && (
        <div className={`flex items-center gap-2 p-2.5 rounded-lg text-sm ${
          notice.type === 'error' ? 'bg-destructive/10 border border-destructive/20 text-destructive' : 'bg-green-500/10 border border-green-500/20 text-green-400'
        }`}>
          {notice.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span>{notice.message}</span>
        </div>
      )}

      {/* Progress bar */}
      {batchProgress && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Generating outreach: {batchProgress.current}/{batchProgress.total}
          </p>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      {selected.size > 0 && (
        <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-secondary">
          <Button size="sm" variant="outline" onClick={handleExportSelected} className="gap-1">
            <Download className="w-3 h-3" />
            Export Selected
          </Button>

          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Stage:</span>
            {STAGES.map(stage => (
              <Button key={stage} size="sm" variant="ghost" onClick={() => handleChangeStage(stage)} className="text-xs px-2">
                <ArrowRightLeft className="w-3 h-3 mr-1" />
                {stage}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <Input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddTags()}
              placeholder="Tag name"
              className="h-8 w-32 text-xs"
            />
            <Button size="sm" variant="outline" onClick={handleAddTags} disabled={!tagInput.trim()} className="gap-1">
              <Tags className="w-3 h-3" />
              Add Tag
            </Button>
          </div>

          <Button size="sm" variant="outline" onClick={handleBatchOutreach} disabled={batchProgress !== null} className="gap-1">
            <Send className="w-3 h-3" />
            Generate Outreach
          </Button>

          {!confirmDelete ? (
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} className="gap-1 text-destructive hover:text-destructive">
              <Trash2 className="w-3 h-3" />
              Remove
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="text-xs">
                Confirm Remove {selected.size}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} className="text-xs">
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Candidate list with checkboxes */}
      <div className="space-y-1">
        {allCandidates.map(candidate => (
          <label
            key={candidate.id}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              selected.has(candidate.id)
                ? 'border-primary/30 bg-primary/5'
                : 'border-border hover:border-primary/20'
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(candidate.id)}
              onChange={() => toggleSelect(candidate.id)}
              className="w-4 h-4 rounded border-border accent-primary"
            />
            <div className="shrink-0">
              {candidate.avatar_url ? (
                <img src={candidate.avatar_url} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{candidate.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {candidate.role || 'Engineer'} {candidate.company && `@ ${candidate.company}`}
                <span className="ml-2 text-primary/60">{candidate.stage}</span>
              </p>
            </div>
            <span className="text-xs font-mono text-muted-foreground">{candidate.score}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
