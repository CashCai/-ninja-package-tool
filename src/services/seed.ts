import { templateRepo } from '@/db/repositories/templateRepo'
import { instanceRepo } from '@/db/repositories/instanceRepo'
import { PRESET_COLUMNS, DEFAULT_FORMULA, DEFAULT_SCORE_TIERS } from '@/types'

const SEED_KEY = 'ninja_tool_seeded_v1'

async function createReferenceTemplate() {
  return templateRepo.create({
    name: '2026五月忍战活动',
    columns: [
      ...PRESET_COLUMNS,
      {
        key: 'totalScore',
        label: '总积分',
        type: 'derived' as const,
        formula: DEFAULT_FORMULA,
        isEditable: false,
      },
    ],
    formulaConfig: {
      targetColumn: 'totalScore',
      expression: DEFAULT_FORMULA,
      dependencies: ['power', 'loginDays', 'battleCount'],
    },
    scoreTiers: [...DEFAULT_SCORE_TIERS],
  })
}

async function createReferenceInstance(templateId: string) {
  return instanceRepo.create({
    templateId,
    title: '五月活动 — 第1期',
    data: [
      { playerId: '火影忍者', power: 28500, loginDays: 28, battleCount: 15, winRate: 0.73, remarkCoeff: 1.0 },
      { playerId: '风影我爱罗', power: 31200, loginDays: 30, battleCount: 20, winRate: 0.85, remarkCoeff: 1.2 },
      { playerId: '雷影艾', power: 26500, loginDays: 25, battleCount: 12, winRate: 0.67, remarkCoeff: 0.9 },
      { playerId: '水影照美冥', power: 29800, loginDays: 27, battleCount: 18, winRate: 0.78, remarkCoeff: 1.1 },
      { playerId: '土影大野木', power: 24100, loginDays: 22, battleCount: 10, winRate: 0.55, remarkCoeff: 0.8 },
      { playerId: '宇智波佐助', power: 35000, loginDays: 30, battleCount: 25, winRate: 0.92, remarkCoeff: 1.5 },
      { playerId: '春野樱', power: 22000, loginDays: 26, battleCount: 14, winRate: 0.71, remarkCoeff: 1.0 },
      { playerId: '旗木卡卡西', power: 33100, loginDays: 29, battleCount: 22, winRate: 0.88, remarkCoeff: 1.3 },
    ],
  })
}

/** 首次访问自动创建参考数据（无感静默） */
export async function seedReferenceData(): Promise<boolean> {
  if (localStorage.getItem(SEED_KEY)) return false

  const templates = await templateRepo.getAll()
  if (templates.length > 0) {
    localStorage.setItem(SEED_KEY, '1')
    return false
  }

  const template = await createReferenceTemplate()
  await createReferenceInstance(template.id)

  localStorage.setItem(SEED_KEY, '1')
  return true
}

/** 用户主动点击"加载示例"——始终创建，无论是否已种子化 */
export async function forceSeedReference(): Promise<void> {
  const template = await createReferenceTemplate()
  await createReferenceInstance(template.id)
}
