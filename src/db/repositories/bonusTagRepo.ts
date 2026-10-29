import { db } from '../dexie'
import type { BonusTag } from '@/types'
import { nanoid } from '@/utils/id'
import { PRESET_BONUS_TAGS } from '@/types'

export const bonusTagRepo = {
  async getAll(): Promise<BonusTag[]> {
    return db.bonusTags.orderBy('updatedAt').reverse().toArray()
  },

  /** 首次使用时播种预设标签 */
  async ensureSeeded(): Promise<void> {
    const count = await db.bonusTags.count()
    if (count > 0) return
    const now = Date.now()
    await db.bonusTags.bulkAdd(
      PRESET_BONUS_TAGS.map(t => ({ ...t, id: nanoid(), createdAt: now, updatedAt: now }))
    )
  },

  async create(tag: Omit<BonusTag, 'id' | 'createdAt' | 'updatedAt'>): Promise<BonusTag> {
    const now = Date.now()
    const full: BonusTag = { ...tag, id: nanoid(), createdAt: now, updatedAt: now }
    await db.bonusTags.add(full)
    return full
  },

  async update(id: string, data: Partial<BonusTag>): Promise<void> {
    await db.bonusTags.update(id, { ...JSON.parse(JSON.stringify(data)), updatedAt: Date.now() })
  },

  async delete(id: string): Promise<void> {
    await db.bonusTags.delete(id)
  },
}
