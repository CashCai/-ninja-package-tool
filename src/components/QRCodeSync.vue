<template>
  <van-popup :show="visible" position="bottom" round :style="{ maxHeight: '80vh' }" @close="emit('close')">
    <div class="p-4">
      <h3 class="text-base font-semibold mb-4 ninja-title tracking-wide">二维码同步</h3>

      <div v-if="mode === 'generate'" class="flex flex-col items-center gap-4">
        <div v-if="qrDataUrl" class="inline-flex p-2 rounded-md border border-line bg-white">
          <img :src="qrDataUrl" alt="QR Code" class="w-44 h-44" />
        </div>
        <div v-else class="w-44 h-44 flex items-center justify-center rounded-md border border-dashed border-line-soft bg-panel-2 text-faint text-sm">
          生成中...
        </div>
        <p class="text-xs text-faint">手机扫码即可导入此表单数据</p>
        <p v-if="dataSize" class="text-xs" :class="dataSize > 1000 ? 'text-danger' : 'text-success'">
          数据大小: {{ dataSize }} 字节 {{ dataSize > 1000 ? '(超出建议限制，建议使用 Gist 同步)' : '' }}
        </p>
      </div>

      <div class="mt-4">
        <p class="text-sm text-sub mb-2">从二维码数据导入</p>
        <textarea
          v-model="importText"
          class="w-full p-2 text-sm font-mono"
          rows="4"
          placeholder="在此粘贴从另一台设备获取的二维码数据字符串..."
        ></textarea>
        <button
          class="w-full mt-2 ninja-btn py-2 text-sm"
          :disabled="!importText.trim()"
          @click="handleImport"
        >
          导入数据
        </button>
      </div>

      <div class="flex gap-3 mt-4">
        <button class="flex-1 ninja-btn-ghost py-2 text-sm" @click="toggleMode">
          {{ mode === 'generate' ? '切换到导入' : '切换到生成' }}
        </button>
        <button class="flex-1 ninja-btn-ghost py-2 text-sm" @click="emit('close')">关闭</button>
      </div>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { showToast } from 'vant'
import { generateQRCode } from '@/services/sync/qrcode'
import { compress, decompress } from '@/utils/compress'

const props = defineProps<{
  visible: boolean
  data: any
}>()

const emit = defineEmits<{
  importData: [data: any]
  close: []
}>()

const mode = ref<'generate' | 'import'>('generate')
const qrDataUrl = ref('')
const dataSize = ref(0)
const importText = ref('')

watch(() => props.visible, async (v) => {
  if (v && props.data) {
    mode.value = 'generate'
    importText.value = ''
    const compressed = compress(props.data)
    dataSize.value = compressed.length
    await nextTick()
    qrDataUrl.value = await generateQRCode(compressed)
  }
})

function toggleMode() {
  mode.value = mode.value === 'generate' ? 'import' : 'generate'
}

function handleImport() {
  const decoded = decompress(importText.value.trim())
  if (decoded) {
    emit('importData', decoded)
    showToast('导入成功')
  } else {
    showToast('数据格式不正确，请检查')
  }
}
</script>
