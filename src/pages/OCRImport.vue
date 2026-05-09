<template>
  <van-popup :show="visible" position="bottom" round :style="{ maxHeight: '90vh' }" @close="emit('close')">
    <div class="p-4">
      <h3 class="text-lg font-bold mb-2">截图识别</h3>

      <!-- 操作指引 -->
      <div class="mb-4 bg-amber-50 border border-amber-200 rounded-lg overflow-hidden">
        <div
          class="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
          @click="showGuide = !showGuide"
        >
          <span class="text-sm font-medium text-amber-700">
            {{ showGuide ? '收起指引 ▲' : '使用指引 ▼' }}
          </span>
        </div>
        <div v-show="showGuide" class="px-3 pb-3 text-xs text-amber-800 space-y-1">
          <p>1. 上传或粘贴游戏截图（支持多张），系统自动识别玩家数据</p>
          <p>2. 在「字段映射」中将识别出的列名对应到模板中的列</p>
          <p>3. 点击「导入到表格」将数据追加到当前表单</p>
          <p class="text-amber-600">提示：Tesseract.js 首次识别需下载语言包（约 15MB），请耐心等待；若结果不准确可尝试手动编辑</p>
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
        <p class="text-sm text-gray-500 mb-2">识别中... {{ Math.round(progress * 100) }}%</p>
        <van-progress :percentage="Math.round(progress * 100)" :stroke-width="8" />
      </div>

      <div v-if="ocrText" class="mb-4">
        <p class="text-sm text-gray-500 mb-2">原始识别结果</p>
        <pre class="bg-gray-50 p-3 rounded text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">{{ ocrText }}</pre>
      </div>

      <template v-if="parsedRows.length > 0 && !recognizing">
        <p class="text-sm text-gray-500 mb-2">
          识别到 {{ parsedRows.length }} 行数据
          <span class="text-xs text-gray-400">(置信度: {{ confidence }}%)</span>
        </p>

        <div class="mb-4">
          <p class="text-sm text-gray-500 mb-2">字段映射</p>
          <div v-for="(header, idx) in parsedHeaders" :key="idx" class="flex items-center gap-2 mb-1">
            <span class="text-sm w-20 truncate">{{ header }}</span>
            <span class="text-gray-400">→</span>
            <select v-model="fieldMapping[header]" class="flex-1 border rounded px-2 py-1 text-sm">
              <option value="">— 跳过 —</option>
              <option v-for="col in templateColumns" :key="col.key" :value="col.key">
                {{ col.label }}
              </option>
            </select>
          </div>
        </div>

        <div class="flex gap-3">
          <button class="flex-1 py-2 bg-blue-500 text-white rounded text-sm" @click="confirmImport">导入到表格</button>
          <button class="flex-1 py-2 bg-gray-100 text-gray-600 rounded text-sm" @click="emit('close')">取消</button>
        </div>
      </template>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { showToast } from 'vant'
import type { ColumnConfig } from '@/types'
import { runOCR, parseOCRText } from '@/services/ocr/ocrManager'
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
const parsedRows = ref<Record<string, any>[]>([])
const parsedHeaders = ref<string[]>([])
const confidence = ref(0)
const fieldMapping = ref<Record<string, string>>({})

watch(() => props.visible, () => {
  if (!props.visible) {
    ocrText.value = ''
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
        const result = await runOCR(imageData, {
          onProgress: (p) => { progress.value = p },
        })
        ocrText.value = result.text
        confidence.value = result.confidence
        parsedRows.value = parseOCRText(result.text)
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
      }
    }
    reader.readAsDataURL(item.file)
  } catch {
    showToast('图片处理失败')
  } finally {
    recognizing.value = false
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
