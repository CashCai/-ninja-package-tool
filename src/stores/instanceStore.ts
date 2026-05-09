import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { instanceRepo } from '@/db/repositories/instanceRepo'
import { templateRepo } from '@/db/repositories/templateRepo'
import type { FormInstance, FormTemplate } from '@/types'
import { nanoid } from '@/utils/id'
import { evaluateFormula, extractDependencies } from '@/services/formula'

export const useInstanceStore = defineStore('instance', () => {
  const instances = ref<FormInstance[]>([])
  const currentInstance = ref<FormInstance | null>(null)
  const loading = ref(false)

  async function loadInstances() {
    loading.value = true
    try {
      instances.value = await instanceRepo.getAll()
    } finally {
      loading.value = false
    }
  }

  async function createInstance(templateId: string, title: string): Promise<FormInstance> {
    const instance = await instanceRepo.create({
      templateId,
      title,
      data: [],
    })
    await loadInstances()
    return instance
  }

  async function saveInstance(id: string, data: Partial<FormInstance>) {
    await instanceRepo.update(id, data)
    if (currentInstance.value?.id === id) {
      Object.assign(currentInstance.value, data, { updatedAt: Date.now() })
    }
    await loadInstances()
  }

  async function deleteInstance(id: string) {
    await instanceRepo.delete(id)
    if (currentInstance.value?.id === id) {
      currentInstance.value = null
    }
    await loadInstances()
  }

  async function cloneInstance(id: string): Promise<FormInstance | null> {
    const original = await instanceRepo.getById(id)
    if (!original) return null
    const clone = await instanceRepo.create({
      templateId: original.templateId,
      title: original.title + '-副本',
      data: JSON.parse(JSON.stringify(original.data)),
    })
    await loadInstances()
    return clone
  }

  async function loadInstance(id: string) {
    const instance = await instanceRepo.getById(id)
    if (instance) {
      currentInstance.value = instance
    }
    return instance
  }

  function setCurrentInstance(instance: FormInstance | null) {
    currentInstance.value = instance
  }

  function addRow(row?: Record<string, any>) {
    if (!currentInstance.value) return
    currentInstance.value.data.push(row || {})
    saveInstance(currentInstance.value.id, { data: currentInstance.value.data })
  }

  function updateRow(index: number, data: Record<string, any>) {
    if (!currentInstance.value) return
    currentInstance.value.data[index] = data
    saveInstance(currentInstance.value.id, { data: currentInstance.value.data })
  }

  function deleteRow(index: number) {
    if (!currentInstance.value) return
    currentInstance.value.data.splice(index, 1)
    saveInstance(currentInstance.value.id, { data: currentInstance.value.data })
  }

  function recalculateAll(template: FormTemplate) {
    if (!currentInstance.value) return
    const { expression } = template.formulaConfig
    const rows = currentInstance.value.data

    for (const row of rows) {
      const vars: Record<string, number> = {}
      for (const col of template.columns) {
        const val = Number(row[col.key])
        vars[col.key] = isNaN(val) ? 0 : val
      }
      row[template.formulaConfig.targetColumn] = evaluateFormula(expression, vars)
    }

    saveInstance(currentInstance.value.id, { data: currentInstance.value.data })
  }

  const instanceList = computed(() => instances.value)

  return {
    instances,
    currentInstance,
    loading,
    instanceList,
    loadInstances,
    createInstance,
    saveInstance,
    deleteInstance,
    cloneInstance,
    loadInstance,
    setCurrentInstance,
    addRow,
    updateRow,
    deleteRow,
    recalculateAll,
  }
})
