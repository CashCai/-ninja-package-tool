<template>
  <van-popup :show="visible" position="bottom" round :style="{ maxHeight: '85vh' }" @close="emit('close')">
    <div class="p-4 space-y-4" style="max-height: 80vh; overflow-y: auto">
      <h3 class="text-base font-semibold ninja-title tracking-wide">奖励分继承</h3>
      <p class="text-xs text-faint leading-5">
        从其他表格按「玩家ID」匹配，将其未消耗的奖励分一键导入当前表格，并与当期录入的奖励分累加
      </p>

      <!-- 选择来源表格 -->
      <div>
        <p class="text-xs text-faint mb-2">选择来源表格</p>
        <div v-if="others.length === 0" class="text-xs text-faint py-2">暂无其他表格可继承</div>
        <div class="space-y-2">
          <div
            v-for="inst in others"
            :key="inst.id"
            class="flex items-center gap-2 p-2.5 rounded-md border cursor-pointer"
            :class="sourceId === inst.id ? 'border-line bg-cell-hover' : 'border-line-soft bg-panel-2'"
            @click="selectSource(inst.id)"
          >
            <span class="flex-1 text-sm truncate">{{ inst.title }}</span>
            <span class="text-xs text-faint flex-shrink-0">{{ formatTime(inst.updatedAt) }}</span>
          </div>
        </div>
      </div>

      <!-- 匹配预览 -->
      <div v-if="source">
        <p class="text-xs text-faint mb-2">匹配预览（按玩家ID）</p>
        <div v-if="matches.length === 0" class="text-xs text-faint py-2">
          {{ sourceHasBonus ? '当前表格没有玩家能与来源表格匹配（需存在相同玩家ID）' : '来源表格中没有奖励分数据' }}
        </div>
        <template v-else>
          <div class="rounded-md bg-panel-2 border border-line-soft p-2" style="max-height: 224px; overflow-y: auto">
            <div
              v-for="m in matches"
              :key="m.rowIndex"
              class="flex items-center gap-2 py-1.5 text-sm border-b border-line-faint last:border-0"
            >
              <span class="flex-1 truncate">{{ m.playerId }}</span>
              <span class="text-xs text-faint flex-shrink-0">当前 {{ m.currentBonus }}</span>
              <span class="text-gold flex-shrink-0">+{{ m.points }}</span>
              <span class="text-xs text-sub flex-shrink-0">= {{ (m.currentBonus || 0) + m.points }}</span>
            </div>
          </div>
          <p v-if="unmatchedCount > 0" class="text-xs text-faint mt-1">
            另有 {{ unmatchedCount }} 名玩家未匹配（需在来源表格中存在相同玩家ID）
          </p>
        </template>
      </div>

      <div class="flex gap-3 pt-1">
        <button class="flex-1 ninja-btn py-2 text-sm" :disabled="matches.length === 0" @click="doImport">
          一键导入{{ matches.length ? `（${matches.length}人）` : '' }}
        </button>
        <button class="flex-1 ninja-btn-ghost py-2 text-sm" @click="emit('close')">取消</button>
      </div>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { FormInstance, BonusInheritPayload } from '@/types'
import { instanceRepo } from '@/db/repositories/instanceRepo'

const props = defineProps<{
  visible: boolean
  currentInstanceId: string
  rows: Record<string, any>[]
}>()

const emit = defineEmits<{
  import: [payload: BonusInheritPayload]
  close: []
}>()

const others = ref<FormInstance[]>([])
const sourceId = ref('')
const source = ref<FormInstance | null>(null)

watch(
  () => props.visible,
  async v => {
    if (v) {
      sourceId.value = ''
      source.value = null
      const all = await instanceRepo.getAll()
      others.value = all.filter(i => i.id !== props.currentInstanceId)
    }
  }
)

/** 来源表格：玩家ID(小写) -> 奖励分 */
const sourceBonusMap = computed(() => {
  const map = new Map<string, number>()
  if (!source.value) return map
  for (const row of source.value.data) {
    const pid = String(row.playerId ?? '').trim().toLowerCase()
    if (!pid) continue
    map.set(pid, Number(row.bonusScore) || 0)
  }
  return map
})

const sourceHasBonus = computed(() => {
  for (const v of sourceBonusMap.value.values()) {
    if (v > 0) return true
  }
  return false
})

const matches = computed(() => {
  const res: { rowIndex: number; playerId: string; points: number; currentBonus: number }[] = []
  props.rows.forEach((row, idx) => {
    const pid = String(row.playerId ?? '').trim()
    if (!pid) return
    const pts = sourceBonusMap.value.get(pid.toLowerCase()) ?? 0
    if (pts > 0) {
      res.push({ rowIndex: idx, playerId: pid, points: pts, currentBonus: Number(row.bonusScore) || 0 })
    }
  })
  return res
})

const unmatchedCount = computed(() =>
  props.rows.filter(r => {
    const pid = String(r.playerId ?? '').trim()
    if (!pid) return false
    return (sourceBonusMap.value.get(pid.toLowerCase()) ?? 0) <= 0
  }).length
)

async function selectSource(id: string) {
  sourceId.value = id
  source.value = (await instanceRepo.getById(id)) || null
}

function doImport() {
  if (!source.value || matches.value.length === 0) return
  emit('import', {
    fromInstanceId: source.value.id,
    fromTitle: source.value.title,
    matches: matches.value.map(m => ({ ...m })),
  })
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
</script>
