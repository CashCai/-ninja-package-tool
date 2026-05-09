import { db } from '../dexie'
import type { FormInstance } from '@/types'
import { nanoid } from '@/utils/id'

export const instanceRepo = {
  async getAll(): Promise<FormInstance[]> {
    return db.instances.orderBy('updatedAt').reverse().toArray()
  },

  async getById(id: string): Promise<FormInstance | undefined> {
    return db.instances.get(id)
  },

  async create(instance: Omit<FormInstance, 'id' | 'createdAt' | 'updatedAt'>): Promise<FormInstance> {
    const now = Date.now()
    const full: FormInstance = {
      ...instance,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    }
    await db.instances.add(full)
    return full
  },

  async update(id: string, data: Partial<FormInstance>): Promise<void> {
    await db.instances.update(id, { ...JSON.parse(JSON.stringify(data)), updatedAt: Date.now() })
  },

  async delete(id: string): Promise<void> {
    await db.instances.delete(id)
  },
}
