import { useState } from 'react'
import { FlaskConical, Search, GitBranch, Send, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const DISMISSED_KEY = 'sourcekit-onboarding-dismissed'

const steps = [
  {
    num: 1,
    icon: FlaskConical,
    label: 'Research',
    description: 'Build AI sourcing strategy',
  },
  {
    num: 2,
    icon: Search,
    label: 'Search',
    description: 'Find matching engineers on GitHub',
  },
  {
    num: 3,
    icon: GitBranch,
    label: 'Pipeline',
    description: 'Track and manage candidates',
  },
  {
    num: 4,
    icon: Send,
    label: 'Outreach',
    description: 'Generate personalized messages',
  },
]

export function OnboardingBanner() {
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) !== 'true'
    } catch {
      return true
    }
  })
  const [fading, setFading] = useState(false)

  if (!visible) return null

  const dismiss = () => {
    setFading(true)
    setTimeout(() => {
      localStorage.setItem(DISMISSED_KEY, 'true')
      setVisible(false)
    }, 300)
  }

  return (
    <div
      className={cn(
        'mx-4 mt-4 rounded-xl bg-zinc-900/80 border border-zinc-800 p-4 transition-opacity duration-300',
        fading && 'opacity-0'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-foreground">How <span style={{ fontFamily: 'var(--font-mono)', color: '#9E9E9E' }}>Source</span><span style={{ fontFamily: 'var(--font-mono)', color: '#00BFA5' }}>Kit</span> works</p>
        <button
          onClick={dismiss}
          className="px-3 py-1 rounded-lg text-xs font-medium bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
        >
          Got it
        </button>
      </div>

      <div className="flex items-start gap-1 overflow-x-auto">
        {steps.map((step, i) => {
          const Icon = step.icon
          return (
            <div key={step.num} className="flex items-start gap-1 shrink-0">
              <div className="flex flex-col items-center text-center w-20">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center mb-1.5">
                  <span className="text-xs font-bold text-primary">{step.num}</span>
                </div>
                <Icon className="w-4 h-4 text-muted-foreground mb-1" />
                <p className="text-xs font-medium text-foreground">{step.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{step.description}</p>
              </div>
              {i < steps.length - 1 && (
                <ChevronRight className="w-4 h-4 text-zinc-600 mt-2 shrink-0" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
