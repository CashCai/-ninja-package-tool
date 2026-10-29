<template>
  <van-popup :show="visible" position="bottom" round :style="{ maxHeight: '85vh' }" @close="emit('close')">
    <div class="p-4 space-y-4" style="max-height: 80vh; overflow-y: auto">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold ninja-title tracking-wide">奖励分</h3>
        <span class="text-xs text-faint truncate ml-4">{{ row?.playerId || '未命名玩家' }}</span>
      </div>

      <!-- 积分明细 -->
      <div class="rounded-md bg-panel-2 border border-line-soft p-3">
        <div class="flex items-center justify-between mb-1">
          <p class="text-xs text-faint">积分明细</p>
          <p class="text-sm">
            合计
            <span class="text-gold font-semibold">{{ total >= 0 ? '+' : '' }}{{ total }}</span>
            分
          </p>
        </div>
        <div v-if="entries.length === 0" class="text-xs text-faint py-2">
          暂无明细，点击下方标签开始录入
        </div>
        <div
          v-for="e in entries"
          :key="e.id"
          class="flex items-center gap-2 py-1.5 border-b border-line-faint last:border-0"
        >
          <span class="kind-badge" :class="`kind-${e.kind}`">{{ kindLabel(e.kind) }}</span>
          <span class="text-sm flex-1 truncate">
            {{ e.name }}
            <span v-if="e.kind === 'inherited' && e.fromTitle" class="text-faint text-xs">（{{ e.fromTitle }}）</span>
          </span>
          <template v-if="e.kind !== 'inherited'">
            <button class="step-btn" @click="decCount(e)">-</button>
            <span class="text-xs w-7 text-center text-sub">x{{ e.count }}</span>
            <button class="step-btn" @click="incCount(e)">+</button>
          </template>
          <span
            class="text-sm w-16 text-right flex-shrink-0"
            :class="entryTotal(e) >= 0 ? 'text-gold' : 'text-danger'"
          >
            {{ entryTotal(e) >= 0 ? '+' : '' }}{{ entryTotal(e) }}
          </span>
          <button class="text-danger hover:text-danger-strong text-xs flex-shrink-0" @click="removeEntry(e.id)">✕</button>
        </div>
      </div>

      <!-- 选择标签 -->
      <div>
        <p class="text-xs text-faint mb-2">选择标签（点击累加，可在明细中调整次数）</p>
        <div v-if="tagStore.tags.length === 0" class="text-xs text-faint py-1">
          暂无标签，可在下方自定义添加
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="tag in tagStore.tags"
            :key="tag.id"
            class="ninja-chip relative px-3 py-1.5 text-sm"
            :class="{ 'tag-selected': selectedCount(tag.id) > 0 }"
            @click="selectTag(tag)"
          >
            <span>{{ tag.name }}</span>
            <span class="ml-1 text-xs" :class="tag.points >= 0 ? 'text-gold' : 'text-danger'">
              {{ tag.points >= 0 ? '+' : '' }}{{ tag.points }}
            </span>
            <span v-if="selectedCount(tag.id) > 0" class="count-badge">{{ selectedCount(tag.id) }}</span>
          </button>
        </div>
      </div>

      <!-- 自定义标签 -->
      <div>
        <p class="text-xs text-faint mb-2">自定义标签（保存后可复用，支持负分扣减）</p>
        <div class="flex gap-2">
          <input v-model="customName" class="flex-1 px-2 py-1.5 text-sm min-w-0" placeholder="标签名，如 手动调整" />
          <input v-model="customPoints" type="number" class="px-2 py-1.5 text-sm w-24 flex-shrink-0" placeholder="分值" />
          <button class="ninja-btn-ghost px-3 py-1.5 text-sm flex-shrink-0" @click="addCustom">添加</button>
        </div>
      </div>

      <div class="flex gap-3 pt-1">
        <button class="flex-1 ninja-btn-ghost py-2 text-sm" @click="showTagManager = true">管理标签</button>
        <button class="flex-1 ninja-btn py-2 text-sm" @click="save">保存</button>
        <button class="flex-1 ninja-btn-ghost py-2 text-sm" @click="emit('close')">取消</button>
      </div>
    </div>

    <BonusTagManager :visible="showTagManager" @close="showTagManager = false" />
  </van-popup>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { showToast } from 'vant'
import type { BonusDetailEntry, BonusTag, BonusEntryKind } from '@/types'
import { sumBonusEntries, makeBonusEntry } from '@/services/bonus'
import { useBonusTagStore } from '@/stores/bonusTagStore'
import BonusTagManager from './BonusTagManager.vue'

const props = defineProps<{
  visible: boolean
  rowIndex: number
  row: Record<string, any> | null
}>()

const emit = defineEmits<{
  save: [rowIndex: number, entries: BonusDetailEntry[]]
  close: []
}>()

const tagStore = useBonusTagStore()

const entries = ref<BonusDetailEntry[]>([])
const showTagManager = ref(false)
const customName = ref('')
const customPoints = ref('')

const total = computed(() => sumBonusEntries(entries.value))

watch(
  () => props.visible,
  v => {
    if (v) {
      entries.value = JSON.parse(JSON.stringify(props.row?.bonusDetail || []))
      customName.value = ''
      customPoints.value = ''
      tagStore.loadTags()
    }
  }
)

function kindLabel(kind: BonusEntryKind): string {
  if (kind === 'tag') return '标签'
  if (kind === 'custom') return '自定义'
  return '继承'
}

function entryTotal(e: BonusDetailEntry): number {
  return (Number(e.points) || 0) * (Number(e.count) || 1)
}

function selectedCount(tagId: string): number {
  return entries.value
    .filter(e => e.tagId === tagId)
    .reduce((s, e) => s + (Number(e.count) || 1), 0)
}

function selectTag(tag: BonusTag) {
  const existing = entries.value.find(e => e.tagId === tag.id)
  if (existing) {
    existing.count = (Number(existing.count) || 1) + 1
  } else {
    entries.value.push(
      makeBonusEntry({
        name: tag.name,
        points: tag.points,
        kind: tag.builtin ? 'tag' : 'custom',
        tagId: tag.id,
      })
    )
  }
}

async function addCustom() {
  const name = customName.value.trim()
  if (!name) {
    showToast('请输入标签名')
    return
  }
  if (customPoints.value === '' || isNaN(Number(customPoints.value))) {
    showToast('请输入标签分值')
    return
  }
  const points = Math.round(Number(customPoints.value) * 100) / 100
  const existing = tagStore.tags.find(t => t.name === name)
  if (existing) {
    selectTag(existing)
    showToast('标签已存在，已为你选中')
  } else {
    const tag = await tagStore.addTag(name, points)
    selectTag(tag)
  }
  customName.value = ''
  customPoints.value = ''
}

function incCount(e: BonusDetailEntry) {
  e.count = (Number(e.count) || 1) + 1
}

function decCount(e: BonusDetailEntry) {
  e.count = Math.max(1, (Number(e.count) || 1) - 1)
}

function removeEntry(id: string) {
  entries.value = entries.value.filter(e => e.id !== id)
}

function save() {
  emit('save', props.rowIndex, entries.value)
}
</script>

<style scoped>
.kind-badge {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid;
  flex-shrink: 0;
}
.kind-tag {
  color: var(--nz-gold);
  border-color: var(--nz-line);
}
.kind-custom {
  color: var(--nz-text-3);
  border-color: var(--nz-line-neutral);
}
.kind-inherited {
  color: var(--nz-success);
  border-color: rgba(159, 214, 174, 0.4);
}

.tag-selected {
  border-color: var(--nz-gold);
  background: var(--nz-cell-hover);
  color: var(--nz-gold);
}

.count-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: var(--nz-gold);
  color: var(--nz-ink);
  font-size: 10px;
  border-radius: 999px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  text-align: center;
}

.step-btn {
  width: 20px;
  height: 20px;
  border: 1px solid var(--nz-line-soft);
  border-radius: 3px;
  color: var(--nz-text-2);
  font-size: 12px;
  line-height: 1;
  flex-shrink: 0;
  cursor: pointer;
}
.step-btn:hover {
  border-color: var(--nz-line);
  color: var(--nz-gold);
}
</style>
