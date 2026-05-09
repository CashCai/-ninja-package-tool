<template>
  <van-popup :show="visible" position="bottom" round :style="{ maxHeight: '70vh' }" @close="emit('close')">
    <div class="p-4">
      <h3 class="text-lg font-bold mb-4">管理指标</h3>

      <div class="mb-4">
        <p class="text-sm text-gray-500 mb-2">当前列</p>
        <div class="space-y-2">
          <div
            v-for="(col, idx) in localColumns"
            :key="col.key"
            class="flex items-center gap-2 p-2 bg-gray-50 rounded"
          >
            <span class="text-gray-400 cursor-move">⠿</span>
            <input v-model="col.label" class="flex-1 border rounded px-2 py-1 text-sm" />
            <span class="text-xs px-1.5 py-0.5 rounded" :class="col.type === 'derived' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'">
              {{ col.type === 'derived' ? '计算' : '输入' }}
            </span>
            <button v-if="col.key !== 'playerId'" class="text-red-400 text-xs" @click="removeColumn(idx)">删除</button>
          </div>
        </div>
      </div>

      <div class="mb-4">
        <p class="text-sm text-gray-500 mb-2">添加指标</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="preset in presetColumns"
            :key="preset.key"
            class="px-3 py-1.5 border border-blue-200 text-blue-600 rounded text-sm hover:bg-blue-50"
            @click="addPresetColumn(preset)"
          >
            + {{ preset.label }}
          </button>
        </div>
        <div class="flex gap-2 mt-2">
          <input v-model="customColumnName" class="flex-1 border rounded px-2 py-1.5 text-sm" placeholder="自定义列名" />
          <button class="px-3 py-1.5 bg-blue-500 text-white rounded text-sm" @click="addCustomColumn">添加</button>
        </div>
      </div>

      <div class="flex gap-3 pt-2">
        <button class="flex-1 py-2 bg-blue-500 text-white rounded text-sm" @click="save">保存</button>
        <button class="flex-1 py-2 bg-gray-100 text-gray-600 rounded text-sm" @click="emit('close')">取消</button>
      </div>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ColumnConfig } from '@/types'
import { PRESET_COLUMNS } from '@/types'
import { nanoid } from '@/utils/id'

const props = defineProps<{
  visible: boolean
  columns: ColumnConfig[]
}>()

const emit = defineEmits<{
  save: [columns: ColumnConfig[]]
  close: []
}>()

const localColumns = ref<ColumnConfig[]>([])
const customColumnName = ref('')

const presetColumns = computed(() => {
  const existing = new Set(localColumns.value.map(c => c.key))
  return PRESET_COLUMNS.filter(c => !existing.has(c.key))
})

watch(() => props.visible, (v) => {
  if (v) {
    localColumns.value = JSON.parse(JSON.stringify(props.columns))
  }
})

function addPresetColumn(preset: ColumnConfig) {
  localColumns.value.push({ ...preset })
}

function addCustomColumn() {
  const name = customColumnName.value.trim()
  if (!name) return
  const key = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
  localColumns.value.push({
    key: key || 'col_' + nanoid(4),
    label: name,
    type: 'base',
    isEditable: true,
  })
  customColumnName.value = ''
}

function removeColumn(idx: number) {
  localColumns.value.splice(idx, 1)
}

function save() {
  emit('save', localColumns.value)
}
</script>
