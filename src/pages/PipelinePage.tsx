import { useState, useCallback } from 'react'
import { GitBranch, Download, Share2, ArrowUpDown, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { StageFilter } from '@/components/pipeline/StageFilter'
import { TagFilter } from '@/components/pipeline/TagFilter'
import { PipelineCard } from '@/components/pipeline/PipelineCard'
import { OutreachModal } from '@/components/pipeline/OutreachModal'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useCandidates } from '@/hooks/useCandidates'
import { useSettings } from '@/hooks/useSettings'
import { useOutreach } from '@/hooks/useOutreach'
import { useWatchlist } from '@/hooks/useWatchlist'
import { exportToCSV, exportToJSON, shareToSlack } from '@/services/export'
import { generateOutreach } from '@/services/outreach'
import { captureException } from '@/lib/sentry'
import { track } from '@/lib/analytics'
import type { Candidate } from '@/types'

export function PipelinePage() {
  const {
    candidates,
    stageCounts,
    allTags,
    stageFilter,
    setStageFilter,
    tagFilter,
    setTagFilter,
    sortByScore,
    setSortByScore,
    saveError,
    updateStage,
    updateNotes,
    addTag,
    removeTag,
    deleteCandidate,
  } = useCandidates()

  const { settings } = useSettings()
  const { saveOutreach, getHistory } = useOutreach()
  const { isWatchlisted, toggleWatchlist } = useWatchlist()

  const [outreachCandidate, setOutreachCandidate] = useState<Candidate | null>(null)
  const [outreachMessage, setOutreachMessage] = useState<string | null>(null)
  const [outreachLoading, setOutreachLoading] = useState(false)
  const [outreachSource, setOutreachSource] = useState<'ai' | 'template' | null>(null)
  const [notice, setNotice] = useState<{ type: 'error' | 'success' | 'info'; message: string } | null>(null)

  const showNotice = useCallback((type: 'error' | 'success' | 'info', message: string) => {
    setNotice({ type, message })
    setTimeout(() => setNotice(null), 4000)
  }, [])

  const handleGenerateOutreach = useCallback(async (candidate: Candidate) => {
    setOutreachCandidate(candidate)
    setOutreachLoading(true)
    setOutreachMessage(null)
    setOutreachSource(null)
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const result = await generateOutreach(candidate, settings, supabaseUrl, supabaseKey)
      setOutreachMessage(result.message)
      setOutreachSource(result.source)
      const key = candidate.github_handle || candidate.name.toLowerCase().replace(/\s+/g, '-')
      saveOutreach(key, candidate.name, result.message)
      track('outreach_generated', { candidate_source: candidate.source, outreach_source: result.source })

      if (result.source === 'template') {
        showNotice('info', 'AI generation failed — using template fallback. Configure Supabase for AI outreach.')
      }
    } catch (err) {
      console.error('Outreach error:', err)
      captureException(err)
      setOutreachMessage(null)
      showNotice('error', 'Failed to generate outreach message. Try again.')
    } finally {
      setOutreachLoading(false)
    }
  }, [settings, saveOutreach, showNotice])

  const handleToggleTag = useCallback((tag: string) => {
    setTagFilter(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }, [setTagFilter])

  const handleExport = (format: 'csv' | 'json' = 'csv') => {
    try {
      if (format === 'json') {
        exportToJSON(candidates)
      } else {
        exportToCSV(candidates)
      }
      showNotice('success', `Pipeline exported to ${format.toUpperCase()}`)
      track('export_triggered', { format, count: candidates.length })
    } catch (err) {
      console.error('Export error:', err)
      captureException(err)
      showNotice('error', `Failed to export ${format.toUpperCase()}`)
    }
  }

  const handleShareSlack = async () => {
    if (!settings.slack_webhook_url) {
      showNotice('error', 'Set Slack webhook URL in Settings first')
      return
    }
    try {
      await shareToSlack(candidates, settings.slack_webhook_url)
      showNotice('success', 'Shared to Slack!')
    } catch (err) {
      console.error('Slack error:', err)
      captureException(err)
      showNotice('error', 'Failed to share to Slack')
    }
  }

  return (
    <div className="flex flex-col">
      <StageFilter
        activeStage={stageFilter}
        onStageChange={setStageFilter}
        counts={stageCounts}
      />

      <TagFilter
        allTags={allTags}
        activeTags={tagFilter}
        onToggleTag={handleToggleTag}
      />

      {/* Storage warning */}
      {saveError && (
        <div className="mx-3 sm:mx-4 mt-2 flex items-center gap-2 p-2.5 rounded-lg text-sm bg-destructive/10 border border-destructive/20 text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">Storage full — changes may not be saved. Export your pipeline and clear old data in Settings.</span>
        </div>
      )}

      {/* Notice banner */}
      {notice && (
        <div className={`mx-3 sm:mx-4 mt-2 flex items-center gap-2 p-2.5 rounded-lg text-sm ${
          notice.type === 'error'
            ? 'bg-destructive/10 border border-destructive/20 text-destructive'
            : notice.type === 'info'
            ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
            : 'bg-green-500/10 border border-green-500/20 text-green-400'
        }`}>
          {notice.type === 'error'
            ? <AlertCircle className="w-4 h-4 shrink-0" />
            : notice.type === 'info'
            ? <Info className="w-4 h-4 shrink-0" />
            : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span className="flex-1">{notice.message}</span>
          <button onClick={() => setNotice(null)} className="opacity-60 hover:opacity-100 text-xs">dismiss</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2">
        <span className="text-xs sm:text-sm text-muted-foreground">
          {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            size="sm"
            variant={sortByScore ? 'secondary' : 'ghost'}
            onClick={() => setSortByScore(!sortByScore)}
            className="gap-1 px-2 sm:px-3"
          >
            <ArrowUpDown className="w-3 h-3" />
            <span className="hidden sm:inline">Score</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleExport('csv')} className="gap-1 px-2 sm:px-3">
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleExport('json')} className="gap-1 px-2 sm:px-3">
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">JSON</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={handleShareSlack} className="gap-1 px-2 sm:px-3">
            <Share2 className="w-3 h-3" />
            <span className="hidden sm:inline">Slack</span>
          </Button>
        </div>
      </div>

      {candidates.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="Pipeline is empty"
          description="Save candidates from Search to start building your pipeline"
        />
      ) : (
        <div className="space-y-3 px-3 sm:px-4 pb-4">
          {candidates.map(candidate => (
            <PipelineCard
              key={candidate.id}
              candidate={candidate}
              onUpdateStage={updateStage}
              onUpdateNotes={updateNotes}
              onAddTag={addTag}
              onRemoveTag={removeTag}
              onDelete={deleteCandidate}
              onGenerateOutreach={handleGenerateOutreach}
              onToggleWatchlist={toggleWatchlist}
              isWatchlisted={isWatchlisted(candidate.id)}
            />
          ))}
        </div>
      )}

      {outreachCandidate && (
        <OutreachModal
          candidate={outreachCandidate}
          message={outreachMessage}
          isLoading={outreachLoading}
          history={getHistory(outreachCandidate.github_handle || outreachCandidate.name.toLowerCase().replace(/\s+/g, '-'))}
          onClose={() => setOutreachCandidate(null)}
          onRegenerate={() => handleGenerateOutreach(outreachCandidate)}
          source={outreachSource}
        />
      )}
    </div>
  )
}
