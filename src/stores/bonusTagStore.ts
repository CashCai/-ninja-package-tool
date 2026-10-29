import { defineStore } from 'pinia'
import { ref } from 'vue'
import { bonusTagRepo } from '@/db/repositories/bonusTagRepo'
import type { BonusTag } from '@/types'

export const useBonusTagStore = defineStore('bonusTag', () => {
  const tags = ref<BonusTag[]>([])
  const loaded = ref(false)

  async function loadTags(force = false) {
    if (loaded.value && !force) return
    await bonusTagRepo.ensureSeeded()
    tags.value = await bonusTagRepo.getAll()
    loaded.value = true
  }

  async function addTag(name: string, points: number): Promise<BonusTag> {
    const tag = await bonusTagRepo.create({ name, points, builtin: false })
    await loadTags(true)
    return tag
  }

  async function updateTag(id: string, data: Partial<BonusTag>) {
    await bonusTagRepo.update(id, data)
    await loadTags(true)
  }

  async function deleteTag(id: string) {
    await bonusTagRepo.delete(id)
    await loadTags(true)
  }

  return { tags, loaded, loadTags, addTag, updateTag, deleteTag }
})
