<template>
  <van-popup :show="visible" position="bottom" round :style="{ maxHeight: '70vh' }" @close="emit('close')">
    <div class="p-4">
      <h3 class="text-base font-semibold mb-4 ninja-title tracking-wide">管理指标</h3>

      <div class="mb-4">
        <p class="text-xs text-faint mb-2">当前列</p>
        <div class="space-y-2">
          <div
            v-for="(col, idx) in localColumns"
            :key="col.key"
            class="flex items-center gap-2 p-2 rounded-md bg-panel-2 border border-line-soft"
          >
            <span class="text-faint cursor-move flex-shrink-0">
              <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="5.5" cy="3" r="1.2" />
                <circle cx="10.5" cy="3" r="1.2" />
                <circle cx="5.5" cy="8" r="1.2" />
                <circle cx="10.5" cy="8" r="1.2" />
                <circle cx="5.5" cy="13" r="1.2" />
                <circle cx="10.5" cy="13" r="1.2" />
              </svg>
            </span>
            <input v-model="col.label" class="flex-1 px-2 py-1 text-sm" />
            <span
              class="flex-shrink-0 text-[11px] px-1.5 py-0.5 rounded border"
              :class="col.type === 'derived' ? 'border-line text-gold' : 'border-line-neutral text-faint'"
            >
              {{ col.type === 'derived' ? '计算' : '输入' }}
            </span>
            <button v-if="col.key !== 'playerId'" class="text-danger hover:text-danger-strong text-xs flex-shrink-0" @click="removeColumn(idx)">删除</button>
          </div>
        </div>
      </div>

      <div class="mb-4">
        <p class="text-xs text-faint mb-2">添加指标</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="preset in presetColumns"
            :key="preset.key"
            class="ninja-chip px-3 py-1.5 text-sm"
            @click="addPresetColumn(preset)"
          >
            + {{ preset.label }}
          </button>
        </div>
        <div class="flex gap-2 mt-2">
          <input v-model="customColumnName" class="flex-1 px-2 py-1.5 text-sm" placeholder="自定义列名" />
          <button class="ninja-btn-ghost px-3 py-1.5 text-sm" @click="addCustomColumn">添加</button>
        </div>
      </div>

      <div class="flex gap-3 pt-2">
        <button class="flex-1 ninja-btn py-2 text-sm" @click="save">保存</button>
        <button class="flex-1 ninja-btn-ghost py-2 text-sm" @click="emit('close')">取消</button>
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
