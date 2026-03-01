import { useState, useCallback, useMemo } from 'react'
import { Layers, Plus, RefreshCw, Trash2, ArrowLeft, ChevronDown, ChevronUp, Loader2, UserPlus, Check } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useWebsets } from '@/hooks/useWebsets'
import { createWebset, deleteWebset } from '@/services/websets'
import { supabase } from '@/integrations/supabase/client'
import WebsetEEAView from '@/components/websets/WebsetEEAView'
import EEAErrorBoundary from '@/components/websets/EEAErrorBoundary'
import { EEAViewSkeleton } from '@/components/websets/EEASkeleton'
import MonitorPanel from '@/components/websets/MonitorPanel'

const WebsetsTab = () => {
  const {
    websetRefs, activeWebset, items, isLoading, error,
    addWebsetRef, removeWebsetRef, setActiveWebsetId, refreshActiveWebset,
  } = useWebsets()

  // Create form state
  const [query, setQuery] = useState('')
  const [count, setCount] = useState(10)
  const [isCreating, setIsCreating] = useState(false)
  const [showCriteria, setShowCriteria] = useState(false)
  const [criteriaInputs, setCriteriaInputs] = useState<string[]>([''])
  const [showEnrichment, setShowEnrichment] = useState(false)
  const [enrichmentDesc, setEnrichmentDesc] = useState('')
  const [enrichmentFormat, setEnrichmentFormat] = useState('text')

  // Detail view
  const [viewingWebsetId, setViewingWebsetId] = useState<string | null>(null)
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set())
  const [addingItem, setAddingItem] = useState<string | null>(null)
  const [isBatchImporting, setIsBatchImporting] = useState(false)

  const handleAddToPipeline = useCallback(async (item: { id: string; title: string; url: string }) => {
    if (addingItem || addedItems.has(item.id)) return
    setAddingItem(item.id)
    try {
      const username = item.url ? new URL(item.url).pathname.replace(/^\//, '').replace(/\//g, '-') : item.id
      const { error } = await supabase.from('pipeline').upsert({
        github_username: username,
        name: item.title || username,
        avatar_url: '',
        stage: 'sourced',
      }, { onConflict: 'github_username' })
      if (error) throw error
      setAddedItems(prev => new Set(prev).add(item.id))
      toast({ title: `${item.title || 'Item'} added to pipeline`, description: 'Added to Sourced stage.' })
    } catch {
      toast({ title: 'Failed to add to pipeline', variant: 'destructive' })
    } finally {
      setAddingItem(null)
    }
  }, [addingItem, addedItems])

  const handleBatchImport = useCallback(async (batchItems: { id: string; title: string; url: string }[]) => {
    if (isBatchImporting) return
    setIsBatchImporting(true)
    let added = 0
    let failed = 0
    try {
      for (const item of batchItems) {
        if (addedItems.has(item.id)) continue
        try {
          const username = item.url ? new URL(item.url).pathname.replace(/^\//, '').replace(/\//g, '-') : item.id
          const { error } = await supabase.from('pipeline').upsert({
            github_username: username,
            name: item.title || username,
            avatar_url: '',
            stage: 'sourced',
          }, { onConflict: 'github_username' })
          if (error) throw error
          setAddedItems(prev => new Set(prev).add(item.id))
          added++
        } catch {
          failed++
        }
      }
      toast({
        title: `Batch import: ${added} added${failed > 0 ? `, ${failed} failed` : ''}`,
        variant: failed > 0 ? 'destructive' : 'default',
      })
    } finally {
      setIsBatchImporting(false)
    }
  }, [isBatchImporting, addedItems])

  const handleCreate = useCallback(async () => {
    if (!query.trim()) return
    setIsCreating(true)
    try {
      const criteria = criteriaInputs
        .filter(c => c.trim())
        .map(c => ({ description: c.trim() }))
      const enrichments = enrichmentDesc.trim()
        ? [{ description: enrichmentDesc.trim(), format: enrichmentFormat }]
        : undefined

      const result = await createWebset(
        query.trim(),
        Math.min(count, 100),
        { criteria: criteria.length > 0 ? criteria : undefined, enrichments },
      )

      addWebsetRef({
        id: result.id,
        query: query.trim(),
        count,
        status: result.status || 'running',
        createdAt: new Date().toISOString(),
      })

      toast({ title: 'Webset created' })
      setQuery('')
      setCount(10)
      setCriteriaInputs([''])
      setEnrichmentDesc('')
      setShowCriteria(false)
      setShowEnrichment(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create webset'
      toast({ title: msg, variant: 'destructive' })
    } finally {
      setIsCreating(false)
    }
  }, [query, count, criteriaInputs, enrichmentDesc, enrichmentFormat, addWebsetRef])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteWebset(id)
      removeWebsetRef(id)
      if (viewingWebsetId === id) setViewingWebsetId(null)
      toast({ title: 'Webset deleted' })
    } catch {
      toast({ title: 'Failed to delete webset', variant: 'destructive' })
    }
  }, [removeWebsetRef, viewingWebsetId])

  const handleViewWebset = useCallback(async (id: string) => {
    setViewingWebsetId(id)
    await setActiveWebsetId(id)
  }, [setActiveWebsetId])

  const handleRefresh = useCallback(async () => {
    await refreshActiveWebset()
  }, [refreshActiveWebset])

  const addCriteriaInput = () => setCriteriaInputs(prev => [...prev, ''])
  const updateCriteriaInput = (i: number, val: string) => {
    setCriteriaInputs(prev => prev.map((c, idx) => idx === i ? val : c))
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'idle': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'paused': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default: return 'bg-secondary text-muted-foreground border-border'
    }
  }

  // Resolve EEA signals for the current detail view
  const viewingRef = useMemo(
    () => websetRefs.find(r => r.id === viewingWebsetId),
    [websetRefs, viewingWebsetId]
  )
  const hasEEASignals = viewingRef?.eeaSignals && viewingRef.eeaSignals.length > 0

  // Detail view
  if (viewingWebsetId) {
    return (
      <div className="max-w-4xl space-y-4">
        <button
          onClick={() => setViewingWebsetId(null)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Websets
        </button>

        {activeWebset && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                <h2 className="font-display text-base font-semibold">
                  {hasEEASignals ? 'EEA Webset' : 'Webset Details'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColor(activeWebset.status)}`}>
                  {activeWebset.status}
                </span>
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  Refresh
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeWebset.itemCount || 0} items
              {hasEEASignals && ` \u00B7 ${viewingRef!.eeaSignals!.filter(s => s.enabled).length} EEA criteria`}
            </p>
          </div>
        )}

        {activeWebset?.status === 'running' && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            <span className="text-sm text-blue-400">Processing... Results will appear as they're found.</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && hasEEASignals && items.length === 0 && (
          <EEAViewSkeleton count={Math.min(viewingRef?.count || 5, 8)} />
        )}

        {/* EEA-enriched view when signals are available */}
        {items.length > 0 && hasEEASignals && (
          <EEAErrorBoundary fallbackMessage="Failed to render EEA enrichment data. An item may have unexpected property format.">
            <WebsetEEAView
              items={items}
              signals={viewingRef!.eeaSignals!}
              onAddToPipeline={handleAddToPipeline}
              onBatchImport={handleBatchImport}
              addedItems={addedItems}
              addingItem={addingItem}
              isBatchImporting={isBatchImporting}
            />
          </EEAErrorBoundary>
        )}

        {/* Generic item list fallback */}
        {items.length > 0 && !hasEEASignals && (
          <>
            <p className="text-sm text-muted-foreground">{items.length} items</p>
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline truncate block"
                        >
                          {item.url}
                        </a>
                      )}
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                      )}
                      {item.properties && Object.keys(item.properties).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(item.properties).map(([key, val]) => (
                            val.state === 'completed' && (
                              <span key={key} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                                {key}: {val.value}
                              </span>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddToPipeline(item)}
                      disabled={addingItem === item.id || addedItems.has(item.id)}
                      className="shrink-0 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 disabled:opacity-50 transition-colors"
                      title={addedItems.has(item.id) ? 'Added to pipeline' : 'Add to pipeline'}
                    >
                      {addingItem === item.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : addedItems.has(item.id) ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <UserPlus className="w-3 h-3" />
                      )}
                      {addedItems.has(item.id) ? 'Added' : 'Pipeline'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Monitor management */}
        {activeWebset && (
          <MonitorPanel websetId={activeWebset.id} defaultQuery={viewingRef?.query} />
        )}

        {!isLoading && items.length === 0 && !error && (
          <div className="rounded-xl border border-dashed border-border bg-card/50 py-12 text-center">
            <Layers className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              {activeWebset?.status === 'running' ? 'Items will appear as the webset processes' : 'This webset has no items'}
            </p>
          </div>
        )}
      </div>
    )
  }

  // Main view: Create + Browse
  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Layers className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">Websets</h2>
          <p className="text-sm text-muted-foreground">Use Exa AI to find and verify candidates matching your criteria</p>
        </div>
      </div>

      {/* Create Section */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-wider">Create Webset</h3>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Search query</label>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g. ML engineers at Bay Area AI startups"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Number of results</label>
          <input
            type="number"
            value={count}
            onChange={e => setCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 10)))}
            min={1}
            max={100}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Criteria */}
        <div>
          <button
            onClick={() => setShowCriteria(!showCriteria)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showCriteria ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Add criteria
          </button>
          {showCriteria && (
            <div className="mt-2 space-y-2">
              {criteriaInputs.map((c, i) => (
                <input
                  key={i}
                  value={c}
                  onChange={e => updateCriteriaInput(i, e.target.value)}
                  placeholder={`Criterion ${i + 1} (e.g. "Has published research papers")`}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              ))}
              <button onClick={addCriteriaInput} className="text-xs text-muted-foreground hover:text-foreground">
                + Add another
              </button>
            </div>
          )}
        </div>

        {/* Enrichment */}
        <div>
          <button
            onClick={() => setShowEnrichment(!showEnrichment)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showEnrichment ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Add enrichment
          </button>
          {showEnrichment && (
            <div className="mt-2 space-y-2">
              <input
                value={enrichmentDesc}
                onChange={e => setEnrichmentDesc(e.target.value)}
                placeholder="e.g. Current company and role"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <select
                value={enrichmentFormat}
                onChange={e => setEnrichmentFormat(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="email">Email</option>
                <option value="url">URL</option>
              </select>
            </div>
          )}
        </div>

        <button
          onClick={handleCreate}
          disabled={!query.trim() || isCreating}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isCreating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {isCreating ? 'Creating...' : 'Create Webset'}
        </button>
      </div>

      {/* Browse Section */}
      {websetRefs.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Your Websets ({websetRefs.length})</h3>
          {websetRefs.map(ref => (
            <div key={ref.id} className="rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => handleViewWebset(ref.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <p className="text-sm font-medium text-foreground truncate">{ref.query}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColor(ref.status)}`}>
                      {ref.status}
                    </span>
                    <span className="text-xs text-muted-foreground">{ref.count} results</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(ref.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(ref.id) }}
                  className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card/50 py-12 text-center">
          <Layers className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">No websets yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create a webset to find and verify candidates with AI-powered search</p>
        </div>
      )}
    </div>
  )
}

export default WebsetsTab
