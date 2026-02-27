import type { Candidate } from '@/types'

export type ExportFormat = 'csv' | 'json'

export function exportToJSON(candidates: Candidate[], filename?: string): void {
  const json = JSON.stringify(candidates, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename || `sourcekit-export-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportPipeline(candidates: Candidate[], format: ExportFormat): void {
  if (format === 'json') {
    exportToJSON(candidates)
  } else {
    exportToCSV(candidates)
  }
}

export function exportToCSV(candidates: Candidate[], filename?: string): void {
  const headers = ['Name', 'Company', 'Role', 'Stage', 'Score', 'Source', 'Tags', 'Notes', 'GitHub', 'Location', 'Created']

  const rows = candidates.map(c => [
    c.name,
    c.company,
    c.role,
    c.stage,
    c.score.toString(),
    c.source,
    c.tags.map(t => `#${t}`).join(', '),
    c.notes.replace(/"/g, '""'),
    c.github_handle || '',
    c.location || '',
    c.created_at,
  ])

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename || `sourcekit-export-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function shareToSlack(
  candidates: Candidate[],
  webhookUrl: string
): Promise<void> {
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `SourceKit Pipeline Update - ${candidates.length} candidates` },
    },
    { type: 'divider' },
    ...candidates.slice(0, 10).map(c => ({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${c.name}* - ${c.role} @ ${c.company}\nStage: \`${c.stage}\` | Score: \`${c.score}/100\`${c.tags.length > 0 ? `\nTags: ${c.tags.map(t => `\`#${t}\``).join(' ')}` : ''}`,
      },
    })),
  ]

  if (candidates.length > 10) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `_...and ${candidates.length - 10} more candidates_` },
    })
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks }),
  })

  if (!response.ok) {
    throw new Error(`Slack webhook failed: ${response.statusText}`)
  }
}
