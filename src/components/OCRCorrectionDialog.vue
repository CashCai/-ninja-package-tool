<template>
  <van-popup :show="visible" position="bottom" round :style="{ maxHeight: '85vh' }" @close="emit('close')">
    <div class="p-4">
      <h3 class="text-lg font-bold mb-1">校对识别结果</h3>
      <p class="text-xs text-gray-400 mb-3">置信度: {{ confidence }}% | 来源: {{ source }}</p>

      <div class="overflow-x-auto mb-4">
        <table class="min-w-full border-collapse text-sm border">
          <thead>
            <tr class="bg-gray-50">
              <th v-for="header in parsedHeaders" :key="header" class="border px-2 py-1 text-left">
                <input
                  :value="header"
                  class="w-full bg-transparent outline-none text-sm"
                  @change="(e: any) => renameHeader(header, e.target.value)"
                />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, ri) in localRows" :key="ri">
              <td v-for="header in parsedHeaders" :key="header" class="border px-1 py-0">
                <input
                  v-model="row[header]"
                  class="w-full px-1 py-1 outline-none text-sm bg-transparent"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mb-4">
        <p class="text-sm text-gray-500 mb-2">字段映射到模板列</p>
        <div v-for="(header, idx) in parsedHeaders" :key="idx" class="flex items-center gap-2 mb-1">
          <span class="text-sm w-24 truncate">{{ header }}</span>
          <span class="text-gray-400">→</span>
          <select v-model="mapping[header]" class="flex-1 border rounded px-2 py-1 text-sm">
            <option value="">— 跳过 —</option>
            <option v-for="col in templateColumns" :key="col.key" :value="col.key">
              {{ col.label }} ({{ col.key }})
            </option>
          </select>
        </div>
      </div>

      <div class="flex gap-3">
        <button class="flex-1 py-2 bg-blue-500 text-white rounded text-sm" @click="confirm">导入到表格</button>
        <button class="flex-1 py-2 bg-gray-100 text-gray-600 rounded text-sm" @click="emit('close')">取消</button>
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
