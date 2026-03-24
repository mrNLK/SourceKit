import { useState, useEffect } from 'react';
import { Settings, Key, Bell, Users, Database, Palette, Save, Eye, EyeOff } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_SCORING_WEIGHTS } from '../lib/constants';
import type { ScoringWeights } from '../lib/types';

interface SettingsSection {
  id: string;
  label: string;
  icon: React.ElementType;
}

const SECTIONS: SettingsSection[] = [
  { id: 'ats', label: 'ATS Integration', icon: Database },
  { id: 'api_keys', label: 'API Keys', icon: Key },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'scoring', label: 'Default Scoring', icon: Settings },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

export default function RecruiterSettings() {
  const [activeSection, setActiveSection] = useState('ats');
  const [saved, setSaved] = useState(false);

  // ATS settings
  const [atsWebhookUrl, setAtsWebhookUrl] = useState('');
  const [atsFieldMapping, setAtsFieldMapping] = useState('');
  const [atsSyncAuto, setAtsSyncAuto] = useState(false);

  // API key display (masked)
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // Notification settings
  const [slackWebhook, setSlackWebhook] = useState('');
  const [emailAlerts, setEmailAlerts] = useState(true);

  // Default scoring weights
  const [weights, setWeights] = useState<ScoringWeights>({ ...DEFAULT_SCORING_WEIGHTS });

  // Density preference
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');

  const handleSave = () => {
    // TODO: Persist to recruiter-specific settings table or user settings
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleKeyVisibility = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  return (
    <div className="ros-fade-in">
      <PageHeader
        title="Settings"
        subtitle="Configure integrations, scoring defaults, and preferences"
        actions={
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors"
            style={{
              background: saved ? 'rgba(0,229,160,0.15)' : 'var(--ros-accent)',
              color: saved ? 'var(--ros-accent)' : 'var(--ros-bg-primary)',
            }}
          >
            <Save className="w-3.5 h-3.5" />
            {saved ? 'Saved' : 'Save Changes'}
          </button>
        }
      />

      <div className="flex gap-6">
        {/* Left nav */}
        <div className="w-48 shrink-0 space-y-0.5">
          {SECTIONS.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono transition-colors"
              style={{
                background: activeSection === section.id ? 'var(--ros-accent-muted)' : 'transparent',
                color: activeSection === section.id ? 'var(--ros-accent)' : 'var(--ros-text-secondary)',
              }}
            >
              <section.icon className="w-3.5 h-3.5" />
              {section.label}
            </button>
          ))}
        </div>

        {/* Right content */}
        <div className="flex-1 max-w-2xl">
          {activeSection === 'ats' && (
            <div className="space-y-4 ros-fade-in">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--ros-text-primary)' }}>ATS Integration</h2>
              <p className="text-xs" style={{ color: 'var(--ros-text-muted)' }}>Configure webhook-based ATS export for candidate data.</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--ros-text-muted)' }}>Webhook URL</label>
                  <input
                    type="url"
                    value={atsWebhookUrl}
                    onChange={e => setAtsWebhookUrl(e.target.value)}
                    placeholder="https://your-ats.com/api/webhook/candidates"
                    className="w-full px-3 py-2 rounded-lg text-sm font-mono border outline-none focus:ring-1"
                    style={{ background: 'var(--ros-bg-card)', borderColor: 'var(--ros-border)', color: 'var(--ros-text-primary)', outlineColor: 'var(--ros-accent)' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--ros-text-muted)' }}>Field Mapping (JSON)</label>
                  <textarea
                    value={atsFieldMapping}
                    onChange={e => setAtsFieldMapping(e.target.value)}
                    placeholder={'{\n  "name": "candidate_name",\n  "email": "candidate_email"\n}'}
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg text-xs font-mono border outline-none focus:ring-1"
                    style={{ background: 'var(--ros-bg-card)', borderColor: 'var(--ros-border)', color: 'var(--ros-text-primary)' }}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setAtsSyncAuto(!atsSyncAuto)}
                    className="w-9 h-5 rounded-full transition-colors relative"
                    style={{ background: atsSyncAuto ? 'var(--ros-accent)' : 'var(--ros-border)' }}
                  >
                    <span
                      className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
                      style={{
                        background: 'var(--ros-text-primary)',
                        left: atsSyncAuto ? '18px' : '2px',
                      }}
                    />
                  </button>
                  <span className="text-xs" style={{ color: 'var(--ros-text-secondary)' }}>Auto-sync Tier 1 candidates to ATS</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'api_keys' && (
            <div className="space-y-4 ros-fade-in">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--ros-text-primary)' }}>API Keys</h2>
              <p className="text-xs" style={{ color: 'var(--ros-text-muted)' }}>Keys are stored server-side. Manage them in the original SourceKit Settings.</p>

              {['Exa API Key', 'Harmonic API Key', 'Claude API Key'].map(keyName => (
                <div key={keyName} className="flex items-center justify-between p-3 rounded-lg border" style={{ background: 'var(--ros-bg-card)', borderColor: 'var(--ros-border)' }}>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--ros-text-primary)' }}>{keyName}</p>
                    <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--ros-text-muted)' }}>
                      {showKeys[keyName] ? 'sk-...configured-in-settings' : '••••••••••••'}
                    </p>
                  </div>
                  <button onClick={() => toggleKeyVisibility(keyName)} style={{ color: 'var(--ros-text-muted)' }}>
                    {showKeys[keyName] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-4 ros-fade-in">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--ros-text-primary)' }}>Notifications</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--ros-text-muted)' }}>Slack Webhook URL</label>
                  <input
                    type="url"
                    value={slackWebhook}
                    onChange={e => setSlackWebhook(e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full px-3 py-2 rounded-lg text-sm font-mono border outline-none"
                    style={{ background: 'var(--ros-bg-card)', borderColor: 'var(--ros-border)', color: 'var(--ros-text-primary)' }}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setEmailAlerts(!emailAlerts)}
                    className="w-9 h-5 rounded-full transition-colors relative"
                    style={{ background: emailAlerts ? 'var(--ros-accent)' : 'var(--ros-border)' }}
                  >
                    <span
                      className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
                      style={{
                        background: 'var(--ros-text-primary)',
                        left: emailAlerts ? '18px' : '2px',
                      }}
                    />
                  </button>
                  <span className="text-xs" style={{ color: 'var(--ros-text-secondary)' }}>Email alerts for Tier 1 candidate matches</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'scoring' && (
            <div className="space-y-4 ros-fade-in">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--ros-text-primary)' }}>Default Scoring Weights</h2>
              <p className="text-xs" style={{ color: 'var(--ros-text-muted)' }}>
                Global defaults applied when no role scorecard specifies weights. Total: {totalWeight}
              </p>
              <div className="space-y-3">
                {(Object.keys(weights) as (keyof ScoringWeights)[]).map(dim => (
                  <div key={dim} className="flex items-center gap-3">
                    <span className="w-32 text-xs font-mono capitalize" style={{ color: 'var(--ros-text-secondary)' }}>
                      {dim.replace('_', ' ')}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={weights[dim]}
                      onChange={e => setWeights(prev => ({ ...prev, [dim]: parseInt(e.target.value) }))}
                      className="flex-1 h-1.5 rounded-full appearance-none"
                      style={{ accentColor: 'var(--ros-accent)' }}
                    />
                    <span className="w-8 text-right text-xs font-mono font-bold" style={{ color: 'var(--ros-text-primary)' }}>
                      {weights[dim]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'team' && (
            <div className="space-y-4 ros-fade-in">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--ros-text-primary)' }}>Team Management</h2>
              <p className="text-xs" style={{ color: 'var(--ros-text-muted)' }}>
                Team features are planned for a future release. Currently operating in single-user mode.
              </p>
              <div className="p-6 rounded-lg border text-center" style={{ background: 'var(--ros-bg-card)', borderColor: 'var(--ros-border)' }}>
                <Users className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--ros-text-muted)' }} />
                <p className="text-xs" style={{ color: 'var(--ros-text-muted)' }}>
                  Invite team members, assign roles, and share pipelines.
                </p>
                <p className="text-[10px] mt-1 font-mono" style={{ color: 'var(--ros-text-muted)' }}>Coming soon</p>
              </div>
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="space-y-4 ros-fade-in">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--ros-text-primary)' }}>Appearance</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--ros-text-muted)' }}>Density</label>
                  <div className="flex gap-2">
                    {(['compact', 'comfortable'] as const).map(d => (
                      <button
                        key={d}
                        onClick={() => setDensity(d)}
                        className="px-3 py-1.5 rounded-lg text-xs font-mono capitalize border transition-colors"
                        style={{
                          background: density === d ? 'var(--ros-accent-muted)' : 'transparent',
                          borderColor: density === d ? 'var(--ros-accent)' : 'var(--ros-border)',
                          color: density === d ? 'var(--ros-accent)' : 'var(--ros-text-secondary)',
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-3">
                  <p className="text-xs" style={{ color: 'var(--ros-text-muted)' }}>
                    Recruiter OS uses dark mode by default for extended screen time. Light mode is available in the original SourceKit.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
