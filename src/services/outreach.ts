import type { Candidate, Settings } from '@/types'

export interface OutreachResult {
  message: string
  source: 'ai' | 'template'
}

export async function generateOutreach(
  candidate: Candidate,
  settings: Settings,
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<OutreachResult> {
  if (supabaseUrl && supabaseKey) {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-outreach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          candidate: {
            name: candidate.name,
            company: candidate.company,
            role: candidate.role,
            bio: candidate.bio,
            signals: candidate.signals,
          },
          context: {
            target_company: settings.target_company,
            role_title: settings.role_title,
            pitch: settings.one_line_pitch,
          },
        }),
      })

      if (!response.ok) throw new Error('Failed to generate outreach')
      const data = await response.json()
      return { message: data.message, source: 'ai' }
    } catch (err) {
      // Fall back to template but indicate that AI failed
      console.error('AI outreach generation failed, using template:', err)
      return { message: buildFallbackTemplate(candidate, settings), source: 'template' }
    }
  }

  return { message: buildFallbackTemplate(candidate, settings), source: 'template' }
}

function buildFallbackTemplate(candidate: Candidate, settings: Settings): string {
  const name = candidate.name.split(' ')[0]
  return `Hey ${name}, I came across your work${candidate.company ? ` at ${candidate.company}` : ''} and was really impressed. We're building ${settings.one_line_pitch || 'something exciting'} at ${settings.target_company || 'our company'} and looking for a ${settings.role_title || 'talented engineer'}. Would love to chat if you're open to it!`
}
