<template>
  <van-popup :show="visible" position="bottom" round :style="{ maxHeight: '70vh' }" @close="emit('close')">
    <div class="p-4">
      <h3 class="text-base font-semibold mb-1 ninja-title tracking-wide">管理标签</h3>
      <p class="text-xs text-faint mb-3">调整标签名称与预设分值；删除后不可恢复</p>

      <div class="space-y-2" style="max-height: 44vh; overflow-y: auto">
        <div
          v-for="tag in tagStore.tags"
          :key="tag.id"
          class="flex items-center gap-2 p-2 rounded-md bg-panel-2 border border-line-soft"
        >
          <span
            class="flex-shrink-0 text-[11px] px-1.5 py-0.5 rounded border"
            :class="tag.builtin ? 'border-line text-gold' : 'border-line-neutral text-faint'"
          >
            {{ tag.builtin ? '预设' : '自定义' }}
          </span>
          <input
            v-model="tag.name"
            class="flex-1 px-2 py-1 text-sm min-w-0"
            placeholder="标签名"
            @change="saveName(tag)"
          />
          <input
            v-model="tag.points"
            type="number"
            class="px-2 py-1 text-sm w-20 flex-shrink-0"
            @change="savePoints(tag)"
          />
          <button class="text-danger hover:text-danger-strong text-xs flex-shrink-0" @click="removeTag(tag)">
            删除
          </button>
        </div>
        <div v-if="tagStore.tags.length === 0" class="text-xs text-faint py-2">暂无标签</div>
      </div>

      <button class="w-full ninja-btn py-2 text-sm mt-4" @click="emit('close')">完成</button>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import type { BonusTag } from '@/types'
import { useBonusTagStore } from '@/stores/bonusTagStore'

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const tagStore = useBonusTagStore()

watch(
  () => tagStore.tags.length,
  () => {
    tagStore.loadTags()
  },
  { immediate: true }
)

async function saveName(tag: BonusTag) {
  const name = String(tag.name ?? '').trim()
  if (!name) {
    showToast('标签名不能为空')
    await tagStore.loadTags(true)
    return
  }
  await tagStore.updateTag(tag.id, { name })
}

async function savePoints(tag: BonusTag) {
  const num = Number(tag.points)
  const points = isNaN(num) ? 0 : Math.round(num * 100) / 100
  await tagStore.updateTag(tag.id, { points })
}

function removeTag(tag: BonusTag) {
  showConfirmDialog({
    title: '删除标签',
    message: `确定删除「${tag.name}」吗？已录入的积分明细不受影响。`,
  })
    .then(() => tagStore.deleteTag(tag.id))
    .catch(() => {})
}
</script>
