export interface ColumnConfig {
  key: string
  label: string
  type: 'base' | 'derived'
  formula?: string
  isEditable: boolean
}

export interface FormulaConfig {
  targetColumn: string
  expression: string
  dependencies: string[]
}

export interface ScoreTier {
  min: number
  max: number | null
  label: string
  gift: string
  quantity?: number | '无限'
}

export interface FormTemplate {
  id: string
  name: string
  columns: ColumnConfig[]
  formulaConfig: FormulaConfig
  scoreTiers: ScoreTier[]
  createdAt: number
  updatedAt: number
}

export interface FormInstance {
  id: string
  templateId: string
  title: string
  data: Record<string, any>[]
  createdAt: number
  updatedAt: number
}

export interface OCRCache {
  id?: number
  imageHash: string
  rawText: string
  parsedRows: Record<string, any>[]
  confidence: number
  usedAt: number
}

export const PRESET_COLUMNS: ColumnConfig[] = [
  { key: 'playerId', label: '玩家ID', type: 'base', isEditable: true },
  { key: 'power', label: '战力', type: 'base', isEditable: true },
  { key: 'loginDays', label: '上线天数', type: 'base', isEditable: true },
  { key: 'battleCount', label: '参战次数', type: 'base', isEditable: true },
  { key: 'winRate', label: '胜率', type: 'base', isEditable: true },
  { key: 'remarkCoeff', label: '备注系数', type: 'base', isEditable: true },
]

export const DEFAULT_SCORE_TIERS: ScoreTier[] = [
  { min: 0, max: 3000, label: '普通', gift: '基础礼包', quantity: '无限' },
  { min: 3000, max: 6000, label: '精英', gift: '精英礼包', quantity: 3 },
  { min: 6000, max: null, label: '传说', gift: '传说礼包', quantity: 1 },
]

export const DEFAULT_FORMULA = 'floor(power/1000) + loginDays * 20 + battleCount * 10'
