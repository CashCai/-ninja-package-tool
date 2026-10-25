<template>
  <van-popup :show="visible" position="bottom" round :style="{ maxHeight: '85vh' }" @close="emit('close')">
    <div class="p-4">
      <h3 class="text-base font-semibold mb-1 ninja-title tracking-wide">校对识别结果</h3>
      <p class="text-xs text-faint mb-3">置信度: {{ confidence }}% | 来源: {{ source }}</p>

      <div class="overflow-x-auto mb-4">
        <table class="min-w-full border-collapse text-sm border border-line-soft rounded-md">
          <thead>
            <tr>
              <th v-for="header in parsedHeaders" :key="header" class="border border-line-faint bg-panel-2 px-2 py-1 text-left">
                <input
                  :value="header"
                  class="w-full bg-transparent border-none outline-none text-sm text-gold"
                  @change="(e: any) => renameHeader(header, e.target.value)"
                />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, ri) in localRows" :key="ri">
              <td v-for="header in parsedHeaders" :key="header" class="border border-line-faint px-1 py-0">
                <input
                  v-model="row[header]"
                  class="w-full px-1 py-1 outline-none text-sm bg-transparent border-none text-main"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mb-4">
        <p class="text-sm text-sub mb-2">字段映射到模板列</p>
        <div v-for="(header, idx) in parsedHeaders" :key="idx" class="flex items-center gap-2 mb-1">
          <span class="text-sm w-24 truncate text-main">{{ header }}</span>
          <span class="text-faint">→</span>
          <select v-model="mapping[header]" class="flex-1 px-2 py-1 text-sm">
            <option value="">— 跳过 —</option>
            <option v-for="col in templateColumns" :key="col.key" :value="col.key">
              {{ col.label }} ({{ col.key }})
            </option>
          </select>
        </div>
      </div>

      <div class="flex gap-3">
        <button class="flex-1 ninja-btn py-2 text-sm" @click="confirm">导入到表格</button>
        <button class="flex-1 ninja-btn-ghost py-2 text-sm" @click="emit('close')">取消</button>
      </div>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ColumnConfig } from '@/types'

const props = defineProps<{
  visible: boolean
  parsedRows: Record<string, any>[]
  confidence: number
  source: string
  templateColumns: ColumnConfig[]
}>()

const emit = defineEmits<{
  confirm: [rows: Record<string, any>[], mapping: Record<string, string>]
  close: []
}>()

const localRows = ref<Record<string, any>[]>([])
const parsedHeaders = ref<string[]>([])
const mapping = ref<Record<string, string>>({})

watch(() => props.visible, (v) => {
  if (v && props.parsedRows.length) {
    localRows.value = JSON.parse(JSON.stringify(props.parsedRows))
    parsedHeaders.value = Object.keys(props.parsedRows[0] || {})
    const autoMap: Record<string, string> = {}
    const colMap = new Map(props.templateColumns.map(c => [c.label, c.key]))
    parsedHeaders.value.forEach(h => {
      const matched = colMap.get(h.trim())
      if (matched) autoMap[h] = matched
    })
    mapping.value = autoMap
  }
})

function renameHeader(oldName: string, newName: string) {
  if (oldName === newName || !newName.trim()) return
  localRows.value.forEach(row => {
    row[newName.trim()] = row[oldName]
    delete row[oldName]
  })
  const idx = parsedHeaders.value.indexOf(oldName)
  if (idx !== -1) parsedHeaders.value[idx] = newName.trim()
  if (mapping.value[oldName]) {
    mapping.value[newName.trim()] = mapping.value[oldName]
    delete mapping.value[oldName]
  }
}

function confirm() {
  emit('confirm', localRows.value, { ...mapping.value })
}
</script>
