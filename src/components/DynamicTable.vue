<template>
  <div ref="tableRef" class="dynamic-table overflow-x-auto ninja-table">
    <table class="min-w-full border-collapse text-sm" style="table-layout: fixed">
      <colgroup>
        <col style="width: 60px; min-width: 60px">
        <col v-for="col in columns" :key="col.key" :style="{ width: (colWidths[col.key] || 120) + 'px' }">
        <col v-if="editable" style="width: 56px; min-width: 56px">
      </colgroup>
      <thead>
        <tr>
          <th class="sticky left-0 z-10 border-r border-b px-3 py-2 text-left font-medium">
            序号
          </th>
          <th
            v-for="col in columns"
            :key="col.key"
            class="relative border-r border-b px-3 py-2 text-left font-medium cursor-pointer select-none"
            :class="{ 'is-derived': col.type === 'derived' }"
            @click="toggleSort(col.key)"
          >
            <div class="flex items-center gap-1 pr-3 overflow-hidden">
              <span class="truncate">{{ col.label }}</span>
              <span
                v-if="col.type === 'derived' && columnHints?.[col.key]"
                class="cursor-help flex-shrink-0 text-gold"
                :title="columnHints[col.key]"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.2" />
                  <path d="M8 7.2v3.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
                  <circle cx="8" cy="4.9" r="0.9" fill="currentColor" />
                </svg>
              </span>
              <span v-if="sortColumn === col.key" class="text-xs flex-shrink-0">
                {{ sortDirection === 'asc' ? '▲' : '▼' }}
              </span>
            </div>
            <div
              class="col-resizer absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-20"
              @mousedown.stop="startResize($event, col.key)"
            />
          </th>
          <th v-if="editable" class="border-b px-2 py-2 w-14">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, idx) in sortedData" :key="idx" @paste="(e: ClipboardEvent) => onPaste(e, idx)">
          <td class="sticky left-0 bg-panel border-r border-b px-3 py-1.5 text-faint text-xs">
            {{ idx + 1 }}
          </td>
          <td
            v-for="col in columns"
            :key="col.key"
            class="border-r border-b px-1 py-0 transition-colors"
            :class="{
              'bg-cell-derived': col.type === 'derived',
              'bg-cell-hover ring-1 ring-inset ring-gold-soft': isHovered(idx, col.key) && (col.isEditable || col.key === BONUS_COL_KEY),
            }"
            @mouseenter="onCellEnter(idx, col.key)"
            @mouseleave="onCellLeave"
            @click="onCellClick(idx, col)"
          >
            <div v-if="editingCell?.row === idx && editingCell?.col === col.key">
              <input
                v-model="editValue"
                class="w-full px-2 py-1 text-sm"
                autofocus
                @blur="commitEdit"
                @keydown.enter="commitEdit"
                @keydown.escape="cancelEdit"
                @click.stop
              />
            </div>
            <div
              v-else-if="col.key === BONUS_COL_KEY"
              class="px-2 py-1.5 min-h-[32px] flex items-center gap-1.5 overflow-hidden whitespace-nowrap cursor-pointer"
              title="点击选择奖励标签"
            >
              <template v-if="bonusEntryCount(row) > 0">
                <svg class="w-3.5 h-3.5 flex-shrink-0 text-gold" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2h5l7 7-5 5-7-7V2z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
                  <circle cx="5.2" cy="5.2" r="1.1" fill="currentColor" />
                </svg>
                <span
                  class="text-sm font-medium"
                  :class="(Number(row[col.key]) || 0) >= 0 ? 'text-gold' : 'text-danger'"
                >{{ row[col.key] ?? 0 }}</span>
                <span class="text-[10px] text-faint flex-shrink-0">x{{ bonusEntryCount(row) }}</span>
              </template>
              <span v-else class="text-faint italic text-sm">点击录入</span>
            </div>
            <div
              v-else
              class="px-2 py-1.5 min-h-[32px] overflow-hidden text-ellipsis whitespace-nowrap"
              :class="{
                'cursor-text': col.isEditable,
                'cursor-default': !col.isEditable || col.type === 'derived',
                'text-faint italic': row[col.key] == null || row[col.key] === '',
            }"
            >
              {{ row[col.key] ?? '—' }}
            </div>
          </td>
          <td v-if="editable" class="border-b px-2 py-1">
            <button class="text-danger hover:text-danger-strong text-xs" @click="emit('deleteRow', idx)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="editable" class="p-3 border-t border-line-faint">
      <button class="text-sm text-gold hover:underline underline-offset-4" @click="emit('addRow')">
        + 添加行
      </button>
      <span class="text-xs text-faint ml-3">{{ data.length }} 行</span>
    </div>
    <div v-if="data.length === 0" class="p-8 text-center text-faint">暂无数据，请添加行或导入数据</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue'
import type { ColumnConfig } from '@/types'
import { BONUS_COL_KEY } from '@/types'

const props = withDefaults(defineProps<{
  columns: ColumnConfig[]
  data: Record<string, any>[]
  editable?: boolean
  columnHints?: Record<string, string>
}>(), {
  editable: true,
})

const emit = defineEmits<{
  updateCell: [rowIndex: number, key: string, value: any]
  deleteRow: [rowIndex: number]
  addRow: []
  pasteRows: [startRow: number, rows: Record<string, string>[]]
  editBonus: [rowIndex: number]
}>()

const editingCell = ref<{ row: number; col: string } | null>(null)
const hoveredCell = ref<{ row: number; col: string } | null>(null)
const editValue = ref('')
const sortColumn = ref<string | null>(null)
const sortDirection = ref<'asc' | 'desc'>('asc')
const tableRef = ref<HTMLElement | null>(null)

// Column resize state
const colWidths = ref<Record<string, number>>({})
const resizing = ref<{ key: string; startX: number; startWidth: number } | null>(null)

const sortedData = computed(() => {
  if (!sortColumn.value) return props.data
  const col = sortColumn.value
  const dir = sortDirection.value === 'asc' ? 1 : -1
  return [...props.data].sort((a, b) => {
    const va = a[col]
    const vb = b[col]
    if (va == null) return 1
    if (vb == null) return -1
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
    return String(va).localeCompare(String(vb)) * dir
  })
})

function isHovered(row: number, col: string): boolean {
  return hoveredCell.value?.row === row && hoveredCell.value?.col === col
}

function onCellEnter(row: number, col: string) {
  hoveredCell.value = { row, col }
}

function onCellLeave() {
  hoveredCell.value = null
}

function onCellClick(row: number, col: ColumnConfig) {
  if (!props.editable) return
  if (col.key === BONUS_COL_KEY) {
    // sortedData 为排序后的展示序列，需换算回原始数据下标
    const realRow = props.data.indexOf(sortedData.value[row])
    if (realRow >= 0) emit('editBonus', realRow)
    return
  }
  if (col.type === 'derived' || !col.isEditable) return
  startEdit(row, col.key, props.data[row]?.[col.key])
}

function bonusEntryCount(row: Record<string, any>): number {
  return Array.isArray(row?.bonusDetail) ? row.bonusDetail.length : 0
}

function startEdit(row: number, key: string, value: any) {
  editingCell.value = { row, col: key }
  editValue.value = value ?? ''
  hoveredCell.value = null
}

function commitEdit() {
  if (!editingCell.value) return
  emit('updateCell', editingCell.value.row, editingCell.value.col, editValue.value)
  editingCell.value = null
}

function cancelEdit() {
  editingCell.value = null
}

function toggleSort(key: string) {
  if (sortColumn.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = key
    sortDirection.value = 'asc'
  }
}

function onPaste(e: ClipboardEvent, startRow: number) {
  const text = e.clipboardData?.getData('text')
  if (!text) return
  e.preventDefault()

  // Strip BOM and normalize line endings
  const clean = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const rawRows = clean.split('\n')
  // Remove trailing empty rows only
  let end = rawRows.length
  while (end > 0 && rawRows[end - 1].trim() === '') end--
  const rows = rawRows.slice(0, end)
  if (!rows.length) return

  const editableCols = props.columns.filter(c => c.isEditable)
  if (!editableCols.length) return

  // Parse clipboard rows into column-keyed objects
  const parsedRows: Record<string, string>[] = []
  for (const rowStr of rows) {
    const cells = rowStr.split('\t')
    const rowData: Record<string, string> = {}
    for (let ci = 0; ci < cells.length && ci < editableCols.length; ci++) {
      rowData[editableCols[ci].key] = cells[ci].trim()
    }
    if (Object.keys(rowData).length > 0) parsedRows.push(rowData)
  }
  if (!parsedRows.length) return

  // Emit as a single batch — parent handles row creation and writes atomically
  emit('pasteRows', startRow, parsedRows)
}

// Column resize
function startResize(e: MouseEvent, key: string) {
  resizing.value = {
    key,
    startX: e.clientX,
    startWidth: colWidths.value[key] || 120,
  }
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
  e.preventDefault()
}

function onResizeMove(e: MouseEvent) {
  if (!resizing.value) return
  const delta = e.clientX - resizing.value.startX
  const newWidth = Math.max(60, Math.min(500, resizing.value.startWidth + delta))
  colWidths.value = { ...colWidths.value, [resizing.value.key]: newWidth }
}

function onResizeEnd() {
  resizing.value = null
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
})
</script>

<style scoped>
.dynamic-table {
  max-height: 70vh;
  overflow-y: auto;
}
.dynamic-table table {
  width: max-content;
  min-width: 100%;
}
.sticky {
  position: sticky;
}
</style>
