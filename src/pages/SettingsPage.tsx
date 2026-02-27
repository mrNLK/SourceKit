import { useState, useCallback, useEffect } from 'react'
import { Settings as SettingsIcon, RotateCcw, ExternalLink, Search, Database, Info, Download, Trash2, AlertTriangle, AlertCircle, CheckCircle2, CreditCard, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { useSettings } from '@/hooks/useSettings'
import { useCandidates } from '@/hooks/useCandidates'
import { useSearchHistory } from '@/hooks/useSearchHistory'
import { useOutreach } from '@/hooks/useOutreach'
import { exportToCSV } from '@/services/export'
import { captureException } from '@/lib/sentry'
import { track } from '@/lib/analytics'
import { loadPlan, savePlan, createCheckoutSession, fetchPlanStatus, type PlanInfo } from '@/lib/stripe'

export function SettingsPage() {
  const { settings, updateSettings, resetSettings, saveError: settingsSaveError } = useSettings()
  const { allCandidates } = useCandidates()
  const { history, clearHistory } = useSearchHistory()
  const { entries: outreachEntries, clearHistory: clearOutreach } = useOutreach()

  const [confirmClearHistory, setConfirmClearHistory] = useState(false)
  const [confirmClearAll, setConfirmClearAll] = useState(false)
  const [confirmClearAllFinal, setConfirmClearAllFinal] = useState(false)
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; message: string } | null>(null)
  const [plan, setPlan] = useState<PlanInfo>(loadPlan)
  const [billingLoading, setBillingLoading] = useState(false)

  const showNotice = useCallback((type: 'error' | 'success', message: string) => {
    setNotice({ type, message })
    setTimeout(() => setNotice(null), 4000)
  }, [])

  // Check for billing redirect params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('billing') === 'success') {
      const updatedPlan: PlanInfo = { status: 'pro', current_period_end: new Date(Date.now() + 30 * 86400000).toISOString() }
      setPlan(updatedPlan)
      savePlan(updatedPlan)
      showNotice('success', 'Welcome to SourceKit Pro!')
      track('billing_upgraded', { plan: 'pro' })
      window.history.replaceState({}, '', '/settings')
    }
  }, [showNotice])

  // Fetch plan status on mount if Supabase is configured
  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (supabaseUrl && supabaseKey) {
      fetchPlanStatus(supabaseUrl, supabaseKey)
        .then(p => { setPlan(p); savePlan(p) })
        .catch(() => { /* use cached plan */ })
    }
  }, [])

  const handleUpgrade = async () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      showNotice('error', 'Billing not configured — set Supabase env vars')
      return
    }
    setBillingLoading(true)
    try {
      const url = await createCheckoutSession(supabaseUrl, supabaseKey)
      if (url) window.location.href = url
    } catch (err) {
      captureException(err)
      showNotice('error', 'Could not start checkout. Try again.')
    } finally {
      setBillingLoading(false)
    }
  }

  const handleExportPipeline = () => {
    if (allCandidates.length === 0) return
    try {
      exportToCSV(allCandidates)
      showNotice('success', 'Pipeline exported to CSV')
    } catch (err) {
      console.error('Export error:', err)
      captureException(err)
      showNotice('error', 'Failed to export pipeline')
    }
  }

  const handleExportHistory = () => {
    if (history.length === 0) return
    try {
      const json = JSON.stringify(history, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `sourcekit-history-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      showNotice('success', 'Search history exported to JSON')
    } catch (err) {
      console.error('Export error:', err)
      captureException(err)
      showNotice('error', 'Failed to export history')
    }
  }

  const handleClearHistory = () => {
    clearHistory()
    setConfirmClearHistory(false)
  }

  const handleClearAll = () => {
    // Clear all localStorage keys
    const keys = ['sourcekit_candidates', 'sourcekit_search_history', 'sourcekit_settings', 'sourcekit_outreach', 'sourcekit-onboarding-dismissed', 'sourcekit-nav-hints-dismissed', 'sourcekit-hide-pipelined']
    keys.forEach(k => localStorage.removeItem(k))
    clearHistory()
    clearOutreach()
    resetSettings()
    setConfirmClearAll(false)
    setConfirmClearAllFinal(false)
    window.location.reload()
  }

  return (
    <div className="p-4 space-y-4">
      {/* Notice banner */}
      {notice && (
        <div className={`flex items-center gap-2 p-2.5 rounded-lg text-sm ${
          notice.type === 'error'
            ? 'bg-destructive/10 border border-destructive/20 text-destructive'
            : 'bg-green-500/10 border border-green-500/20 text-green-400'
        }`}>
          {notice.type === 'error'
            ? <AlertCircle className="w-4 h-4 shrink-0" />
            : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span className="flex-1">{notice.message}</span>
        </div>
      )}

      {/* Storage warning */}
      {settingsSaveError && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg text-sm bg-destructive/10 border border-destructive/20 text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">Storage full — settings changes may not persist. Clear data below to free space.</span>
        </div>
      )}

      {/* Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">Plan</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {plan.status === 'free' && (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Free</span>
              </div>
              <p className="text-xs text-muted-foreground">
                60 GitHub req/hr, local storage only. Upgrade for unlimited searches, cloud sync, and outreach templates.
              </p>
              <Button onClick={handleUpgrade} disabled={billingLoading} className="w-full gap-1">
                {billingLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Loading...
                  </span>
                ) : (
                  <>
                    <Zap className="w-3 h-3" />
                    Upgrade to Pro
                  </>
                )}
              </Button>
            </div>
          )}
          {plan.status === 'pro' && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Pro</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Unlimited searches, cloud sync, and outreach templates.
              </p>
              {plan.current_period_end && (
                <p className="text-xs text-muted-foreground">
                  Renews {new Date(plan.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
          {plan.status === 'past_due' && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">Payment Past Due</span>
              </div>
              <p className="text-xs text-destructive/80">
                Your last payment failed. Update your payment method to keep Pro features.
              </p>
              <Button variant="destructive" onClick={handleUpgrade} disabled={billingLoading} className="w-full gap-1">
                Update Payment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">API Configuration</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Enrichment API URL</label>
            <Input
              value={settings.enrichment_api_url}
              onChange={e => updateSettings({ enrichment_api_url: e.target.value })}
              placeholder="https://api.example.com"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">GitHub Token (optional)</label>
            <Input
              type="password"
              value={settings.github_token || ''}
              onChange={e => updateSettings({ github_token: e.target.value })}
              placeholder="ghp_..."
            />
            <p className="text-xs text-muted-foreground mt-1">Increases GitHub API rate limits from 60 to 5,000 req/hr</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Slack Webhook URL</label>
            <Input
              value={settings.slack_webhook_url}
              onChange={e => updateSettings({ slack_webhook_url: e.target.value })}
              placeholder="https://hooks.slack.com/services/..."
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Auto-enrich GitHub</p>
              <p className="text-xs text-muted-foreground">Automatically fetch GitHub profiles when saving</p>
            </div>
            <button
              onClick={() => updateSettings({ auto_enrich_github: !settings.auto_enrich_github })}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                settings.auto_enrich_github ? 'bg-primary' : 'bg-secondary'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.auto_enrich_github ? 'translate-x-5.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Search Context */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">Search Context</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Pre-fills Research strategy builder inputs</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Target Role</label>
            <Input
              value={settings.role_title}
              onChange={e => updateSettings({ role_title: e.target.value })}
              placeholder="e.g. ML Engineer, Staff Frontend"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Target Company</label>
            <Input
              value={settings.target_company}
              onChange={e => updateSettings({ target_company: e.target.value })}
              placeholder="Your company name"
            />
          </div>
        </CardContent>
      </Card>

      {/* Outreach Context */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">Outreach Context</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">One-line Pitch</label>
            <Textarea
              value={settings.one_line_pitch}
              onChange={e => updateSettings({ one_line_pitch: e.target.value })}
              placeholder="What makes your company/role exciting..."
              className="min-h-[60px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">Data Management</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-secondary rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-foreground">{allCandidates.length}</p>
              <p className="text-[10px] text-muted-foreground">Pipeline</p>
            </div>
            <div className="bg-secondary rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-foreground">{history.length}</p>
              <p className="text-[10px] text-muted-foreground">Searches</p>
            </div>
            <div className="bg-secondary rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-foreground">{outreachEntries.length}</p>
              <p className="text-[10px] text-muted-foreground">Outreach</p>
            </div>
          </div>

          {/* Export */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportPipeline}
              disabled={allCandidates.length === 0}
              className="gap-1 flex-1"
            >
              <Download className="w-3 h-3" />
              Export Pipeline CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportHistory}
              disabled={history.length === 0}
              className="gap-1 flex-1"
            >
              <Download className="w-3 h-3" />
              Export History JSON
            </Button>
          </div>

          {/* Clear History */}
          {!confirmClearHistory ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmClearHistory(true)}
              disabled={history.length === 0}
              className="gap-1 w-full text-muted-foreground"
            >
              <Trash2 className="w-3 h-3" />
              Clear Search History
            </Button>
          ) : (
            <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <span className="text-xs text-destructive flex-1">Delete {history.length} search entries?</span>
              <Button size="sm" variant="destructive" onClick={handleClearHistory} className="text-xs px-2 py-1 h-auto">
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmClearHistory(false)} className="text-xs px-2 py-1 h-auto">
                Cancel
              </Button>
            </div>
          )}

          {/* Clear All Data */}
          {!confirmClearAll ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmClearAll(true)}
              className="gap-1 w-full text-destructive hover:text-destructive"
            >
              <Trash2 className="w-3 h-3" />
              Clear All Data
            </Button>
          ) : !confirmClearAllFinal ? (
            <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <span className="text-xs text-destructive flex-1">This will erase everything. Are you sure?</span>
              <Button size="sm" variant="destructive" onClick={() => setConfirmClearAllFinal(true)} className="text-xs px-2 py-1 h-auto">
                Yes, continue
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmClearAll(false)} className="text-xs px-2 py-1 h-auto">
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 bg-destructive/20 rounded-lg border border-destructive/30">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <span className="text-xs text-destructive font-medium flex-1">Last chance. This cannot be undone.</span>
              <Button size="sm" variant="destructive" onClick={handleClearAll} className="text-xs px-2 py-1 h-auto">
                Erase All
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setConfirmClearAll(false); setConfirmClearAllFinal(false) }} className="text-xs px-2 py-1 h-auto">
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={resetSettings} className="gap-1 flex-1">
          <RotateCcw className="w-4 h-4" />
          Reset Settings
        </Button>
      </div>

      {/* About */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">About</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Version</span>
            <span className="text-sm font-mono text-foreground">1.0.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Stack</span>
            <span className="text-sm text-foreground">React + TypeScript + Tailwind</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Storage</span>
            <span className="text-sm text-foreground">localStorage</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
