<template>
  <van-popup :show="visible" position="bottom" round :style="{ maxHeight: '90vh' }" @close="emit('close')">
    <div class="p-4">
      <h3 class="text-lg font-bold mb-2 ninja-title">📸 截图识别</h3>

      <!-- 操作指引 -->
      <div class="mb-4 ninja-card overflow-hidden">
        <div
          class="flex items-center justify-between px-3 py-2 cursor-pointer select-none bg-gradient-to-r from-amber-100 to-amber-50"
          @click="showGuide = !showGuide"
        >
          <span class="text-sm font-bold text-amber-900">
            {{ showGuide ? '📜 收起指引 ▲' : '📜 使用指引 ▼' }}
          </span>
        </div>
        <div v-show="showGuide" class="px-3 pb-3 text-xs text-amber-800 space-y-1 mt-2">
          <p>1. 上传或粘贴游戏截图（支持多张），系统自动识别玩家数据</p>
          <p>2. 在「字段映射」中将识别出的列名对应到模板中的列</p>
          <p>3. 点击「导入到表格」将数据追加到当前表单</p>
          <p class="text-amber-600">💡 已配置视觉大模型时将优先使用（自动按信息格/表格结构提取：一格 = 一名成员 = 一行，战力自动去除「战」字），字段映射自动完成；未配置时使用本地 Tesseract 识别（不支持信息格结构），可在「设置」中配置大模型</p>
        </div>
      </div>

      <van-uploader
        v-model="fileList"
        multiple
        :max-count="9"
        :after-read="afterRead"
        accept="image/*"
        :preview-options="{
          closeable: true,
          closeOnPopstate: true,
        }"
        class="mb-4"
      />

      <div v-if="recognizing" class="mb-4">
        <p class="text-sm text-amber-700 mb-2">🔄 识别中... {{ Math.round(progress * 100) }}%</p>
        <van-progress :percentage="Math.round(progress * 100)" :stroke-width="8" color="#d4ac0d" />
      </div>

      <div v-if="ocrText" class="mb-4 ninja-card p-3">
        <p class="text-sm text-amber-700 mb-2 font-bold">📝 原始识别结果</p>
        <pre class="bg-amber-50 p-3 rounded text-xs whitespace-pre-wrap max-h-32 overflow-y-auto text-amber-900">{{ ocrText }}</pre>
      </div>

      <div v-if="fallbackReason && !recognizing" class="mb-4 ninja-card p-3 bg-red-50 border-red-300">
        <p class="text-xs text-red-700 leading-5">
          ⚠️ 视觉大模型识别失败，已降级为本地引擎：<br>
          <span class="text-red-600">{{ fallbackReason }}</span>
        </p>
        <p class="text-xs text-red-500 mt-1">请检查设置中的 API Key / 模型名，或截图清晰度后重试</p>
      </div>

      <template v-if="parsedRows.length > 0 && !recognizing">
        <p class="text-sm text-amber-700 mb-2">
          ✅ 识别到 {{ parsedRows.length }} 行数据
          <span class="text-xs text-amber-600">(置信度: {{ confidence }}% · 引擎: {{ sourceLabel }})</span>
        </p>

        <div class="mb-4 ninja-card p-3">
          <p class="text-sm text-amber-700 mb-2 font-bold">🔗 字段映射</p>
          <div v-for="(header, idx) in parsedHeaders" :key="idx" class="flex items-center gap-2 mb-1">
            <span class="text-sm w-20 truncate text-amber-900">{{ header }}</span>
            <span class="text-amber-600">→</span>
            <select v-model="fieldMapping[header]" class="flex-1 border-2 border-amber-400 rounded-lg px-2 py-1 text-sm bg-amber-50 text-amber-900 focus:outline-none focus:border-amber-600">
              <option value="">— 跳过 —</option>
              <option v-for="col in templateColumns" :key="col.key" :value="col.key">
                {{ col.label }}
              </option>
            </select>
          </div>
        </div>

        <div class="flex gap-3">
          <button class="flex-1 ninja-btn py-2 text-sm" @click="confirmImport">导入到表格</button>
          <button class="flex-1 ninja-btn ninja-btn-gray py-2 text-sm" @click="emit('close')">取消</button>
        </div>
      </template>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { showToast } from 'vant'
import type { ColumnConfig } from '@/types'
import { runOCR, parseOCRText } from '@/services/ocr/ocrManager'
import { getVLMConfigFromStorage } from '@/services/ocr/vlmOCR'
import { imageHash } from '@/utils/hash'

const props = defineProps<{
  visible: boolean
  templateColumns: ColumnConfig[]
}>()

const emit = defineEmits<{
  import: [rows: Record<string, any>[]]
  close: []
}>()

const showGuide = ref(true)
const fileList = ref<any[]>([])
const recognizing = ref(false)
const progress = ref(0)
const ocrText = ref('')
const ocrSource = ref<'vlm' | 'tesseract' | 'baidu'>('tesseract')
const fallbackReason = ref('')
const parsedRows = ref<Record<string, any>[]>([])
const parsedHeaders = ref<string[]>([])
const confidence = ref(0)
const fieldMapping = ref<Record<string, string>>({})

const sourceLabel = computed(() => {
  switch (ocrSource.value) {
    case 'vlm': return '视觉大模型'
    case 'baidu': return '百度云端 OCR'
    default: return 'Tesseract 本地'
  }
})

watch(() => props.visible, () => {
  if (!props.visible) {
    ocrText.value = ''
    ocrSource.value = 'tesseract'
    fallbackReason.value = ''
    parsedRows.value = []
    parsedHeaders.value = []
    confidence.value = 0
    fieldMapping.value = {}
    fileList.value = []
    progress.value = 0
  }
})

async function afterRead(item: any) {
  if (!item.file) return
  recognizing.value = true
  progress.value = 0

  try {
    const hash = await imageHash(item.file)
    const reader = new FileReader()
    reader.onload = async () => {
      const imageData = reader.result as string
      try {
        // 只传可录入的 base 列，派生列由公式计算，不需要识别
        const templateLabels = props.templateColumns
          .filter(c => c.type === 'base' && c.isEditable)
          .map(c => c.label)
        const result = await runOCR(imageData, {
          onProgress: (p) => { progress.value = p },
          vlmConfig: getVLMConfigFromStorage(),
          templateLabels,
        })
        ocrText.value = result.text
        ocrSource.value = result.source
        confidence.value = result.confidence
        fallbackReason.value = result.fallbackReason || ''
        // 大模型模式直接返回按列名结构化的行数据
        parsedRows.value = result.parsedRows && result.parsedRows.length > 0
          ? result.parsedRows
          : parseOCRText(result.text)
        parsedHeaders.value = parsedRows.value.length > 0
          ? Object.keys(parsedRows.value[0])
          : []

        const autoMap: Record<string, string> = {}
        const colMap = new Map(props.templateColumns.map(c => [c.label, c.key]))
        parsedHeaders.value.forEach(h => {
          const matched = colMap.get(h.trim())
          if (matched) autoMap[h] = matched
        })
        fieldMapping.value = autoMap

        if (parsedRows.value.length === 0) {
          showToast('未能识别到有效数据')
        }
      } catch (err: any) {
        showToast('识别失败: ' + (err.message || '未知错误'))
      } finally {
        recognizing.value = false
      }
    }
    reader.onerror = () => {
      recognizing.value = false
      showToast('图片读取失败')
    }
    reader.readAsDataURL(item.file)
  } catch {
    recognizing.value = false
    showToast('图片处理失败')
  }
}

function confirmImport() {
  const mappedRows = parsedRows.value.map(row => {
    const mapped: Record<string, any> = {}
    for (const [header, targetKey] of Object.entries(fieldMapping.value)) {
      if (targetKey) {
        mapped[targetKey] = row[header] ?? ''
      }
    }
    return mapped
  }).filter(r => Object.keys(r).length > 0)

  emit('import', mappedRows)
}
</script>
