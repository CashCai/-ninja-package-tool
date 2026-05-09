import { db } from '../dexie'
import type { FormTemplate } from '@/types'
import { nanoid } from '@/utils/id'

export const templateRepo = {
  async getAll(): Promise<FormTemplate[]> {
    return db.templates.orderBy('updatedAt').reverse().toArray()
  },

  async getById(id: string): Promise<FormTemplate | undefined> {
    return db.templates.get(id)
  },

  async create(template: Omit<FormTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<FormTemplate> {
    const now = Date.now()
    const full: FormTemplate = {
      ...template,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    }
    await db.templates.add(full)
    return full
  },

  async update(id: string, data: Partial<FormTemplate>): Promise<void> {
    await db.templates.update(id, { ...JSON.parse(JSON.stringify(data)), updatedAt: Date.now() })
  },

  async delete(id: string): Promise<void> {
    await db.templates.delete(id)
  },
}
