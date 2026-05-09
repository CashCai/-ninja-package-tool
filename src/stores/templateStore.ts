import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { templateRepo } from '@/db/repositories/templateRepo'
import type { FormTemplate, ColumnConfig, FormulaConfig, ScoreTier } from '@/types'
import { PRESET_COLUMNS, DEFAULT_FORMULA, DEFAULT_SCORE_TIERS } from '@/types'

export const useTemplateStore = defineStore('template', () => {
  const templates = ref<FormTemplate[]>([])
  const currentTemplate = ref<FormTemplate | null>(null)
  const loading = ref(false)

  async function loadTemplates() {
    loading.value = true
    try {
      templates.value = await templateRepo.getAll()
    } finally {
      loading.value = false
    }
  }

  async function createTemplate(name: string): Promise<FormTemplate> {
    const template = await templateRepo.create({
      name,
      columns: [...PRESET_COLUMNS, {
        key: 'totalScore',
        label: '总积分',
        type: 'derived',
        formula: DEFAULT_FORMULA,
        isEditable: false,
      }],
      formulaConfig: {
        targetColumn: 'totalScore',
        expression: DEFAULT_FORMULA,
        dependencies: ['power', 'loginDays', 'battleCount'],
      },
      scoreTiers: [...DEFAULT_SCORE_TIERS],
    })
    await loadTemplates()
    return template
  }

  async function saveTemplate(id: string, data: Partial<FormTemplate>) {
    await templateRepo.update(id, data)
    if (currentTemplate.value?.id === id) {
      Object.assign(currentTemplate.value, data, { updatedAt: Date.now() })
    }
    await loadTemplates()
  }

  async function deleteTemplate(id: string) {
    await templateRepo.delete(id)
    if (currentTemplate.value?.id === id) {
      currentTemplate.value = null
    }
    await loadTemplates()
  }

  function setCurrentTemplate(template: FormTemplate | null) {
    currentTemplate.value = template
  }

  const templateList = computed(() => templates.value)

  return {
    templates,
    currentTemplate,
    loading,
    templateList,
    loadTemplates,
    createTemplate,
    saveTemplate,
    deleteTemplate,
    setCurrentTemplate,
  }
})
