<template>
  <div class="flex flex-col min-h-screen">
    <van-nav-bar
      :title="instance?.title || '表格编辑'"
      left-text="返回"
      right-text="保存"
      @click-left="router.push('/')"
      @click-right="saveCurrent"
    />

    <div class="flex-1 overflow-auto p-3 pb-24">
      <div class="flex flex-wrap gap-2 mb-3">
        <button class="px-3 py-1.5 bg-blue-50 text-blue-600 rounded text-sm" @click="showColumnManager = true">
          管理指标
        </button>
        <button class="px-3 py-1.5 bg-green-50 text-green-600 rounded text-sm" @click="showFormulaEditor = true">
          公式配置
        </button>
        <button class="px-3 py-1.5 bg-purple-50 text-purple-600 rounded text-sm" @click="showOCR = true">
          截图识别
        </button>
        <button class="px-3 py-1.5 bg-orange-50 text-orange-600 rounded text-sm" @click="showQR = true">
          二维码
        </button>
        <button class="px-3 py-1.5 bg-gray-50 text-gray-600 rounded text-sm" @click="previewGift">
          预览礼包
        </button>
        <button class="px-3 py-1.5 bg-red-50 text-red-600 rounded text-sm" @click="exportExcel">
          导出Excel
        </button>
      </div>

      <div v-if="template && instance" class="text-xs text-gray-400 mb-2">
        鼠标悬浮单元格高亮，点击直接编辑；支持 Ctrl+V 从 Excel 粘贴；拖拽表头右边框调整列宽
      </div>
      <DynamicTable
        v-if="template && instance"
        :columns="template.columns"
        :data="instance.data"
        :column-hints="formulaHints"
        @update-cell="handleUpdateCell"
        @delete-row="handleDeleteRow"
        @add-row="handleAddRow"
        @paste-rows="handlePasteRows"
      />
    </div>

    <ColumnManager
      :visible="showColumnManager"
      :columns="template?.columns || []"
      @save="handleColumnsSave"
      @close="showColumnManager = false"
    />

    <FormulaEditor
      :visible="showFormulaEditor"
      :formula-config="template?.formulaConfig || { targetColumn: 'totalScore', expression: '', dependencies: [] }"
      :score-tiers="template?.scoreTiers || []"
      :available-columns="template?.columns || []"
      @save="handleFormulaSave"
      @close="showFormulaEditor = false"
    />

    <OCRImport
      :visible="showOCR"
      :template-columns="template?.columns || []"
      @import="handleOCRImport"
      @close="showOCR = false"
    />

    <QRCodeSync
      :visible="showQR"
      :data="qrData"
      @import-data="handleQRImport"
      @close="showQR = false"
    />

    <van-dialog v-model:show="showGiftPreview" title="礼包预览" :style="{ maxHeight: '70vh', overflow: 'auto' }">
      <div class="p-4">
        <div v-for="(group, tierLabel) in giftGroups" :key="tierLabel" class="mb-4">
          <h4 class="font-medium text-sm mb-2">{{ tierLabel }}</h4>
          <p v-for="(player, idx) in group" :key="idx" class="text-sm text-gray-600 py-0.5">
            {{ player.playerId || `玩家${idx + 1}` }}
          </p>
        </div>
      </div>
    </van-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import type { ColumnConfig, FormTemplate, ScoreTier } from '@/types'
import { useInstanceStore } from '@/stores/instanceStore'
import { useTemplateStore } from '@/stores/templateStore'
import { templateRepo } from '@/db/repositories/templateRepo'
import { evaluateFormula, expressionToChinese } from '@/services/formula'
import { exportToExcel, getScoreTier } from '@/services/export'
import DynamicTable from '@/components/DynamicTable.vue'
import ColumnManager from '@/components/ColumnManager.vue'
import FormulaEditor from '@/components/FormulaEditor.vue'
import OCRImport from '@/pages/OCRImport.vue'
import QRCodeSync from '@/components/QRCodeSync.vue'

const route = useRoute()
const router = useRouter()
const instanceStore = useInstanceStore()
const templateStore = useTemplateStore()

const instance = computed(() => instanceStore.currentInstance)
const template = ref<FormTemplate | null>(null)

const formulaHints = computed(() => {
  if (!template.value) return {}
  const hints: Record<string, string> = {}
  const expr = template.value.formulaConfig.expression
  if (expr) {
    hints[template.value.formulaConfig.targetColumn] =
      `公式: ${expressionToChinese(expr, template.value.columns)}`
  }
  return hints
})

const showColumnManager = ref(false)
const showFormulaEditor = ref(false)
const showOCR = ref(false)
const showQR = ref(false)
const showGiftPreview = ref(false)

const qrData = computed(() => {
  if (!instance.value || !template.value) return null
  return {
    templateId: template.value.id,
    title: instance.value.title,
    data: instance.value.data,
    columns: template.value.columns,
    formulaConfig: template.value.formulaConfig,
    scoreTiers: template.value.scoreTiers,
  }
})

const giftGroups = computed(() => {
  if (!template.value || !instance.value) return {}
  const tiers = [...template.value.scoreTiers].sort((a, b) => a.min - b.min)

  // Determine each player's tier index
  const assigned: { tierIdx: number; row: any }[] = []
  for (const row of instance.value.data) {
    const score = Number(row[template.value.formulaConfig.targetColumn]) || 0
    let tierIdx = -1
    for (let i = tiers.length - 1; i >= 0; i--) {
      const t = tiers[i]
      if (t.max === null ? score >= t.min : score >= t.min && score < t.max) {
        tierIdx = i
        break
      }
    }
    if (tierIdx >= 0) assigned.push({ tierIdx, row })
  }

  // Sort by score descending for limited-tier allocation
  assigned.sort((a, b) => {
    const sa = Number(a.row[template.value!.formulaConfig.targetColumn]) || 0
    const sb = Number(b.row[template.value!.formulaConfig.targetColumn]) || 0
    return sb - sa
  })

  // Allocate: for limited tiers, take top scorers; rest go to unlimited
  function getTierQuantity(t: ScoreTier): number | '无限' {
    const q = t.quantity
    if (q === '无限' || q == null || q === ('' as any)) return '无限'
    const num = Number(q)
    return isNaN(num) ? '无限' : num
  }
  const unlimitedIdx = tiers.findIndex(t => getTierQuantity(t) === '无限')
  const used = new Set<number>()
  const groups: Record<string, any[]> = {}

  for (let i = tiers.length - 1; i >= 0; i--) {
    if (i === unlimitedIdx) continue
    const t = tiers[i]
    const qtyRaw = getTierQuantity(t)
    const qty = typeof qtyRaw === 'number' ? qtyRaw : Infinity
    const label = `${t.label} (${t.gift})`
    groups[label] = []
    let count = 0
    for (let ai = 0; ai < assigned.length && count < qty; ai++) {
      const a = assigned[ai]
      if (a.tierIdx === i) {
        groups[label].push(a.row)
        used.add(ai)
        count++
      }
    }
  }

  // Everything unused goes to unlimited tier
  if (unlimitedIdx >= 0) {
    const t = tiers[unlimitedIdx]
    const label = `${t.label} (${t.gift})`
    groups[label] = []
    for (let ai = 0; ai < assigned.length; ai++) {
      if (!used.has(ai)) {
        groups[label].push(assigned[ai].row)
      }
    }
  }

  return groups
})

onMounted(async () => {
  const id = route.params.id as string
  if (id) {
    const inst = await instanceStore.loadInstance(id)
    if (inst) {
      template.value = await templateRepo.getById(inst.templateId) || null
      recalculate()
    }
  }
})

function saveCurrent() {
  if (!instance.value) return
  instanceStore.saveInstance(instance.value.id, { data: instance.value.data })
  showToast('已保存')
}

function handleUpdateCell(rowIndex: number, key: string, value: any) {
  if (!instance.value) return
  instance.value.data[rowIndex][key] = value
  recalculate()
}

function handlePasteRows(startRow: number, pastedRows: Record<string, string>[]) {
  if (!instance.value || !template.value) return
  // Add rows as needed
  const needed = Math.max(0, startRow + pastedRows.length - instance.value.data.length)
  for (let i = 0; i < needed; i++) {
    const newRow: Record<string, any> = {}
    for (const col of template.value.columns) {
      if (col.type === 'base') newRow[col.key] = ''
    }
    instance.value.data.push(newRow)
  }
  // Write all cell data at once
  for (let ri = 0; ri < pastedRows.length; ri++) {
    const targetRow = startRow + ri
    if (targetRow >= instance.value.data.length) break
    for (const [key, val] of Object.entries(pastedRows[ri])) {
      instance.value.data[targetRow][key] = val
    }
  }
  // Single recalculation at the end
  recalculate()
}

function handleDeleteRow(rowIndex: number) {
  if (!instance.value) return
  instance.value.data.splice(rowIndex, 1)
  recalculate()
}

function handleAddRow() {
  if (!instance.value || !template.value) return
  const newRow: Record<string, any> = {}
  for (const col of template.value.columns) {
    if (col.type === 'base') {
      newRow[col.key] = ''
    }
  }
  instance.value.data.push(newRow)
}

function recalculate() {
  if (!template.value || !instance.value) return
  const { expression } = template.value.formulaConfig
  for (const row of instance.value.data) {
    const vars: Record<string, number> = {}
    for (const col of template.value.columns) {
      const val = Number(row[col.key])
      vars[col.key] = isNaN(val) ? 0 : val
    }
    row[template.value.formulaConfig.targetColumn] = evaluateFormula(expression, vars)
  }
}

async function handleColumnsSave(columns: ColumnConfig[]) {
  if (!template.value) return
  template.value.columns = columns
  await templateStore.saveTemplate(template.value.id, { columns })
  showColumnManager.value = false
  recalculate()
  showToast('指标已更新')
}

async function handleFormulaSave(config: { formulaConfig: any; scoreTiers: ScoreTier[] }) {
  if (!template.value) return
  template.value.formulaConfig = config.formulaConfig
  template.value.scoreTiers = config.scoreTiers
  await templateStore.saveTemplate(template.value.id, {
    formulaConfig: config.formulaConfig,
    scoreTiers: config.scoreTiers,
  })
  showFormulaEditor.value = false
  recalculate()
  showToast('公式已更新')
}

function handleOCRImport(rows: Record<string, any>[]) {
  if (!instance.value || !template.value) return
  for (const row of rows) {
    const newRow: Record<string, any> = {}
    for (const col of template.value.columns) {
      newRow[col.key] = row[col.key] ?? ''
    }
    instance.value.data.push(newRow)
  }
  recalculate()
  showOCR.value = false
  showToast(`已导入 ${rows.length} 行数据`)
}

function handleQRImport(data: any) {
  if (data?.data) {
    if (instance.value) {
      instance.value.data = data.data
      recalculate()
      showToast('已导入二维码数据')
    }
  }
  showQR.value = false
}

function previewGift() {
  showGiftPreview.value = true
}

function exportExcel() {
  if (!template.value || !instance.value) return
  exportToExcel(instance.value.data, template.value.columns, template.value.scoreTiers, instance.value.title)
  showToast('导出成功')
}
</script>
