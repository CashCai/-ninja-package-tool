import Dexie from 'dexie'
import type { FormTemplate, FormInstance, OCRCache } from '@/types'

export class NinjaDB extends Dexie {
  templates!: Dexie.Table<FormTemplate, string>
  instances!: Dexie.Table<FormInstance, string>
  ocrCaches!: Dexie.Table<OCRCache, number>

  constructor() {
    super('NinjaPackageTool')
    this.version(1).stores({
      templates: 'id, name, updatedAt',
      instances: 'id, templateId, title, updatedAt',
      ocrCaches: '++id, imageHash, usedAt',
    })
  }
}

export const db = new NinjaDB()
