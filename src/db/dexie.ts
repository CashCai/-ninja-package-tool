import Dexie from 'dexie'
import type { FormTemplate, FormInstance, OCRCache, BonusTag } from '@/types'

export class NinjaDB extends Dexie {
  templates!: Dexie.Table<FormTemplate, string>
  instances!: Dexie.Table<FormInstance, string>
  ocrCaches!: Dexie.Table<OCRCache, number>
  bonusTags!: Dexie.Table<BonusTag, string>

  constructor() {
    super('NinjaPackageTool')
    this.version(1).stores({
      templates: 'id, name, updatedAt',
      instances: 'id, templateId, title, updatedAt',
      ocrCaches: '++id, imageHash, usedAt',
    })
    this.version(2).stores({
      templates: 'id, name, updatedAt',
      instances: 'id, templateId, title, updatedAt',
      ocrCaches: '++id, imageHash, usedAt',
      bonusTags: 'id, name, updatedAt',
    })
  }
}

export const db = new NinjaDB()
