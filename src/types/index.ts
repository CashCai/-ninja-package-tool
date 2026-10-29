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

/** 奖励分标签（预设/自定义） */
export interface BonusTag {
  id: string
  name: string
  points: number
  builtin: boolean
  createdAt: number
  updatedAt: number
}

export type BonusEntryKind = 'tag' | 'custom' | 'inherited'

/** 奖励分明细条目（每行数据 bonusDetail 数组的元素） */
export interface BonusDetailEntry {
  id: string
  name: string
  /** 单次分值；继承类为总分值 */
  points: number
  /** 次数（标签可累加选择） */
  count: number
  kind: BonusEntryKind
  tagId?: string
  /** 继承来源表格 */
  fromInstanceId?: string
  fromTitle?: string
  at: number
}

/** 奖励分继承匹配结果 */
export interface BonusInheritMatch {
  rowIndex: number
  playerId: string
  points: number
}

export interface BonusInheritPayload {
  fromInstanceId: string
  fromTitle: string
  matches: BonusInheritMatch[]
}

/** 奖励分列的固定 key */
export const BONUS_COL_KEY = 'bonusScore'

export const PRESET_COLUMNS: ColumnConfig[] = [
  { key: 'playerId', label: '玩家ID', type: 'base', isEditable: true },
  { key: 'power', label: '战力', type: 'base', isEditable: true },
  { key: 'loginDays', label: '上线天数', type: 'base', isEditable: true },
  { key: 'battleCount', label: '参战次数', type: 'base', isEditable: true },
  { key: 'winRate', label: '胜率', type: 'base', isEditable: true },
  { key: 'remarkCoeff', label: '备注系数', type: 'base', isEditable: true },
  { key: BONUS_COL_KEY, label: '奖励分', type: 'base', isEditable: false },
]

export const DEFAULT_SCORE_TIERS: ScoreTier[] = [
  { min: 0, max: 3000, label: '普通', gift: '基础礼包', quantity: '无限' },
  { min: 3000, max: 6000, label: '精英', gift: '精英礼包', quantity: 3 },
  { min: 6000, max: null, label: '传说', gift: '传说礼包', quantity: 1 },
]

export const DEFAULT_FORMULA = 'floor(power/1000) + loginDays * 20 + battleCount * 10 + bonusScore'

/** 预设奖励分标签（首次使用时播种到标签库） */
export const PRESET_BONUS_TAGS: Omit<BonusTag, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: '全勤奖', points: 100, builtin: true },
  { name: '贡献奖', points: 200, builtin: true },
  { name: '活跃奖', points: 50, builtin: true },
  { name: '最佳新人', points: 100, builtin: true },
  { name: '特殊贡献', points: 300, builtin: true },
]
