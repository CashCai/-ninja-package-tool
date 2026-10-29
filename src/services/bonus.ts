import type { BonusDetailEntry } from '@/types'
import { nanoid } from '@/utils/id'

/** 明细合计（points × count 求和） */
export function sumBonusEntries(entries: BonusDetailEntry[] | undefined | null): number {
  if (!Array.isArray(entries)) return 0
  return entries.reduce(
    (s, e) => s + (Number(e.points) || 0) * (Number(e.count) || 1),
    0
  )
}

/** 构造一条明细 */
export function makeBonusEntry(
  patch: Partial<BonusDetailEntry> & { name: string; points: number }
): BonusDetailEntry {
  return {
    id: nanoid(),
    count: 1,
    kind: 'tag',
    at: Date.now(),
    ...patch,
  }
}
