<template>
  <van-popup :show="visible" position="bottom" round :style="{ maxHeight: '85vh' }" @close="emit('close')">
    <div class="p-4 space-y-4">
      <h3 class="text-base font-semibold ninja-title tracking-wide">公式配置</h3>

      <!-- Formula expression -->
      <div>
        <label class="text-sm text-sub block mb-1">总积分公式</label>
        <input
          ref="inputRef"
          v-model="localExpression"
          class="w-full px-3 py-2 text-sm font-mono"
          :class="formulaError ? 'border-[#c0564a]' : ''"
          placeholder="输入公式，如 floor(战力/1000) + 上线天数*20"
          @input="onInput"
        />
        <p v-if="formulaError" class="text-danger text-xs mt-1">{{ formulaError }}</p>
        <p v-else-if="deps.length" class="text-faint text-xs mt-1">
          依赖列: {{ deps.map(k => labelMap[k] || k).join(', ') }}
        </p>
      </div>

      <!-- Click-to-insert: Functions -->
      <div class="rounded-md bg-panel-2 border border-line-soft p-3">
        <p class="text-xs text-faint mb-2">常用函数（点击插入）</p>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="fn in FUNCTIONS"
            :key="fn.name"
            class="ninja-chip px-2 py-1 text-xs font-mono"
            @click="insertAtCursor(fn.insert)"
          >{{ fn.label }}</span>
        </div>
      </div>

      <!-- Click-to-insert: Operators -->
      <div class="rounded-md bg-panel-2 border border-line-soft p-3">
        <p class="text-xs text-faint mb-2">运算符（点击插入）</p>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="op in OPERATORS"
            :key="op"
            class="ninja-chip px-2.5 py-1 text-sm font-mono"
            @click="insertAtCursor(op)"
          >{{ op }}</span>
        </div>
      </div>

      <!-- Click-to-insert: Columns -->
      <div class="rounded-md bg-panel-2 border border-line p-3">
        <p class="text-xs text-faint mb-2">可用列（点击插入）</p>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="col in availableColumns"
            :key="col.key"
            class="ninja-chip px-2 py-1 text-xs text-gold"
            @click="insertAtCursor(col.label)"
          >
            {{ col.label }}
          </span>
        </div>
      </div>

      <!-- Score tiers -->
      <div>
        <label class="text-sm text-sub block mb-1">档位配置</label>
        <div v-for="(tier, idx) in localTiers" :key="idx" class="flex items-center gap-1.5 mb-2 flex-wrap">
          <input v-model="tier.label" class="px-2 py-1 text-sm w-14" placeholder="档位名" />
          <span class="text-xs text-faint">≥</span>
          <input v-model.number="tier.min" type="number" class="px-2 py-1 text-sm" style="width: 72px" />
          <span class="text-xs text-faint">&lt;</span>
          <input
            v-model="tier.max"
            type="number"
            class="px-2 py-1 text-sm"
            style="width: 72px"
            :placeholder="tier.max === null ? '∞' : ''"
          />
          <input v-model="tier.gift" class="px-2 py-1 text-sm flex-1 min-w-[80px]" placeholder="礼包" />
          <div class="flex items-center gap-1 flex-shrink-0">
            <span class="text-xs text-faint">数量</span>
            <input
              v-model="tier.quantity"
              class="px-2 py-1 text-sm w-16"
              :placeholder="tier.quantity === '无限' ? '无限' : ''"
              @focus="onQuantityFocus(tier)"
              @blur="onQuantityBlur(tier)"
            />
          </div>
          <button v-if="localTiers.length > 1" class="text-danger hover:text-danger-strong text-xs flex-shrink-0" @click="localTiers.splice(idx, 1)">删除</button>
        </div>
        <button class="text-sm text-gold hover:underline underline-offset-4" @click="addTier">
          + 添加档位
        </button>
      </div>

      <div class="flex gap-3 pt-2">
        <button class="flex-1 ninja-btn py-2 text-sm" @click="save">保存</button>
        <button class="flex-1 ninja-btn-ghost py-2 text-sm" @click="emit('close')">取消</button>
      </div>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { ColumnConfig, FormulaConfig, ScoreTier } from '@/types'
import { validateFormula, extractDependencies, expressionToEnglish, expressionToChinese } from '@/services/formula'

const FUNCTIONS = [
  { name: 'floor', label: 'floor(x) 向下取整', insert: 'floor()' },
  { name: 'ceil', label: 'ceil(x) 向上取整', insert: 'ceil()' },
  { name: 'round', label: 'round(x) 四舍五入', insert: 'round()' },
  { name: 'max', label: 'max(a,b) 取较大值', insert: 'max(,)' },
  { name: 'min', label: 'min(a,b) 取较小值', insert: 'min(,)' },
  { name: 'abs', label: 'abs(x) 绝对值', insert: 'abs()' },
  { name: 'if', label: 'if(条件,是,否) 条件判断', insert: 'if(, , )' },
]

const OPERATORS = ['+', '-', '*', '/', '(', ')', ',', '>', '<', '>=', '<=', '==', '!=']

const props = defineProps<{
  visible: boolean
  formulaConfig: FormulaConfig
  scoreTiers: ScoreTier[]
  availableColumns: ColumnConfig[]
}>()

const emit = defineEmits<{
  save: [config: { formulaConfig: FormulaConfig; scoreTiers: ScoreTier[] }]
  close: []
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const localExpression = ref('')
const localTiers = ref<ScoreTier[]>([])
const formulaError = ref('')
const deps = ref<string[]>([])

/** English key → Chinese label mapping */
const labelMap = computed(() => {
  const map: Record<string, string> = {}
  for (const col of props.availableColumns) {
    map[col.key] = col.label
  }
  return map
})
watch(() => props.visible, (v) => {
  if (v) {
    localExpression.value = expressionToChinese(props.formulaConfig.expression, props.availableColumns)
    localTiers.value = JSON.parse(JSON.stringify(props.scoreTiers))
    validate()
  }
})

function onInput() {
  validate()
}

function validate() {
  // Convert to English before passing to expr-eval parser
  const eng = expressionToEnglish(localExpression.value, props.availableColumns)
  const result = validateFormula(eng)
  if (result.valid) {
    formulaError.value = ''
    deps.value = extractDependencies(eng)
  } else {
    formulaError.value = result.error || '公式语法错误'
    deps.value = []
  }
}

function insertAtCursor(text: string) {
  const input = inputRef.value
  if (!input) {
    localExpression.value += text
    validate()
    return
  }
  const start = input.selectionStart ?? localExpression.value.length
  const end = input.selectionEnd ?? localExpression.value.length
  const before = localExpression.value.substring(0, start)
  const after = localExpression.value.substring(end)
  localExpression.value = before + text + after
  validate()
  // Move cursor after inserted text or inside parentheses
  nextTick(() => {
    const parenIdx = text.indexOf('()')
    const commaIdx = text.indexOf(',')
    const textLen = text.length
    if (parenIdx >= 0) {
      const pos = start + parenIdx + 1
      input.setSelectionRange(pos, pos)
    } else if (commaIdx >= 0) {
      const pos = start + commaIdx + 2
      input.setSelectionRange(pos, pos)
    } else {
      input.setSelectionRange(start + textLen, start + textLen)
    }
    input.focus()
  })
}

function onQuantityFocus(tier: ScoreTier) {
  if (tier.quantity === '无限') {
    tier.quantity = '' as any
  }
}

function onQuantityBlur(tier: ScoreTier) {
  if (tier.quantity === ('' as any) || tier.quantity == null) {
    tier.quantity = '无限'
  }
}

function addTier() {
  localTiers.value.push({ min: 0, max: null, label: '', gift: '', quantity: '无限' })
}

function save() {
  // Convert Chinese labels back to English keys before saving
  const englishExpression = expressionToEnglish(localExpression.value, props.availableColumns)
  const engResult = validateFormula(englishExpression)
  if (!engResult.valid) {
    formulaError.value = engResult.error || '公式语法错误'
    return
  }
  // Normalize tier quantities: convert string numbers, empty → '无限'
  function normalizeQuantity(val: any): number | '无限' {
    if (val == null || val === '' || val === '无限') return '无限'
    const num = Number(val)
    return isNaN(num) ? '无限' : Math.floor(num)
  }
  const tiers = localTiers.value.map(t => ({
    ...t,
    quantity: normalizeQuantity(t.quantity),
  }))
  emit('save', {
    formulaConfig: {
      targetColumn: props.formulaConfig.targetColumn,
      expression: englishExpression,
      dependencies: extractDependencies(englishExpression),
    },
    scoreTiers: tiers,
  })
}
</script>
