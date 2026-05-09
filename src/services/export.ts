import * as XLSX from 'xlsx'
import type { ColumnConfig, ScoreTier } from '@/types'

export function exportToExcel(
  data: Record<string, any>[],
  columns: ColumnConfig[],
  scoreTiers: ScoreTier[],
  title: string
): void {
  const headers = columns.map(c => c.label)
  const rows = data.map(row => {
    const tier = getScoreTier(Number(row.totalScore) || 0, scoreTiers)
    return [
      ...columns.map(c => row[c.key] ?? ''),
      tier?.label || '',
      tier?.gift || '',
    ]
  })

  const ws = XLSX.utils.aoa_to_sheet([[...headers, '档位', '礼包内容'], ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '发包清单')

  const colWidths = columns.map(() => ({ wch: 15 })).concat([{ wch: 10 }, { wch: 15 }])
  ws['!cols'] = colWidths

  XLSX.writeFile(wb, `${title}_发包清单.xlsx`)
}

export function getScoreTier(score: number, tiers: ScoreTier[]): ScoreTier | undefined {
  for (const tier of tiers) {
    if (tier.max === null) {
      if (score >= tier.min) return tier
    } else {
      if (score >= tier.min && score < tier.max) return tier
    }
  }
  return undefined
}
