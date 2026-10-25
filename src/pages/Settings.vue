<template>
  <div class="min-h-screen">
    <van-nav-bar title="设置" left-text="返回" @click-left="router.push('/')" />

    <div class="p-4 space-y-4">
      <div class="ninja-card overflow-hidden">
        <div class="ninja-card-header">外观</div>
        <div class="p-4 flex items-center justify-between">
          <div>
            <p class="text-sm text-main">界面主题</p>
            <p class="text-xs text-faint mt-0.5">夜间适合暗光环境，日间为暖白纸感</p>
          </div>
          <div class="flex gap-2">
            <button
              class="px-3 py-1.5 text-xs"
              :class="theme === 'light' ? 'ninja-btn' : 'ninja-btn-ghost'"
              @click="setTheme('light')"
            >
              日间
            </button>
            <button
              class="px-3 py-1.5 text-xs"
              :class="theme === 'dark' ? 'ninja-btn' : 'ninja-btn-ghost'"
              @click="setTheme('dark')"
            >
              夜间
            </button>
          </div>
        </div>
      </div>

      <div class="ninja-card overflow-hidden">
        <div class="ninja-card-header">视觉大模型识别（推荐）</div>
        <div class="p-4 space-y-3">
          <van-field
            v-model="vlmApiUrl"
            label="API 地址"
            placeholder="默认智谱 open.bigmodel.cn，可填中转"
            @blur="saveSettings"
          />
          <van-field
            v-model="vlmApiKey"
            label="API Key"
            type="password"
            placeholder="填写后截图识别优先走大模型"
            @blur="saveSettings"
          />
          <van-field
            v-model="vlmModel"
            label="模型名"
            placeholder="默认 glm-4.6v-flash（免费），可填 glm-ocr"
            @blur="saveSettings"
          />
          <van-cell title="如何获取 API Key?" is-link @click="showVLMGuide = true" />
        </div>
      </div>

      <div class="ninja-card overflow-hidden">
        <div class="ninja-card-header">百度 OCR 设置（备用）</div>
        <div class="p-4 space-y-3">
          <van-field
            v-model="baiduApiKey"
            label="百度OCR API Key"
            placeholder="可选，本地识别置信度低时自动切换"
            @blur="saveSettings"
          />
          <van-field
            v-model="baiduSecretKey"
            label="百度OCR Secret Key"
            type="password"
            placeholder="可选"
            @blur="saveSettings"
          />
        </div>
      </div>

      <div class="ninja-card overflow-hidden">
        <div class="ninja-card-header">Gist 同步设置</div>
        <div class="p-4 space-y-3">
          <van-field
            v-model="gistToken"
            label="GitHub Token"
            type="password"
            placeholder="需 gist 权限"
            @blur="saveSettings"
          />
          <van-cell title="如何获取 Token?" is-link @click="showTokenGuide = true" />
        </div>
      </div>

      <div class="ninja-card overflow-hidden">
        <div class="ninja-card-header">数据管理</div>
        <div class="p-4">
          <van-cell title="导出所有数据 (JSON)" is-link @click="exportAllData" />
          <van-cell title="导入数据" is-link @click="importData" />
          <van-cell title="清除所有数据" is-link @click="clearAllData" />
        </div>
      </div>

      <div class="ninja-card overflow-hidden">
        <div class="ninja-card-header">关于</div>
        <div class="p-4">
          <van-cell title="版本" value="1.0.0" />
          <van-cell title="数据存储方式" value="本地 IndexedDB" />
        </div>
      </div>
    </div>

    <van-dialog v-model:show="showVLMGuide" title="配置视觉大模型">
      <div class="p-4 text-sm text-sub space-y-2">
        <p>推荐使用智谱开放平台（默认模型 glm-4.6v-flash 免费）：</p>
        <p>1. 访问 <a class="text-gold underline underline-offset-2" href="https://open.bigmodel.cn" target="_blank">智谱开放平台</a> 注册</p>
        <p>2. 在「API 密钥」页面创建并复制 Key</p>
        <p>3. 粘贴到上方 API Key 输入框即可（地址和模型留空使用默认值）</p>
        <p class="text-xs text-faint pt-1 leading-5">
          模型选择：
          <br>· glm-4.6v-flash（默认，免费）— 按模板列名直接结构化提取，字段映射自动完成
          <br>· glm-ocr — 专用文档解析模型，复杂表格（合并单元格/多层表头）识别更准，识别后仍需确认字段映射，费用极低（0.2元/百万tokens）
          <br>· 也支持任意 OpenAI 兼容视觉模型（如 gpt-4o-mini），修改 API 地址与模型名即可
        </p>
      </div>
    </van-dialog>

    <van-dialog v-model:show="showTokenGuide" title="获取 GitHub Token">
      <div class="p-4 text-sm text-sub space-y-2">
        <p>1. 访问 <a class="text-gold underline underline-offset-2" href="https://github.com/settings/tokens" target="_blank">GitHub Token 设置</a></p>
        <p>2. 点击 "Generate new token (classic)"</p>
        <p>3. 勾选 <code class="bg-panel-2 text-gold px-1.5 py-0.5 rounded">gist</code> 权限</p>
        <p>4. 生成后复制 Token 粘贴到上方</p>
      </div>
    </van-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { db } from '@/db/dexie'
import { exportToFile, importFromFile } from '@/services/sync/fileTransfer'
import { useTheme } from '@/composables/useTheme'

const router = useRouter()
const { theme, setTheme } = useTheme()

const vlmApiUrl = ref('')
const vlmApiKey = ref('')
const vlmModel = ref('')
const baiduApiKey = ref('')
const baiduSecretKey = ref('')
const gistToken = ref('')
const showVLMGuide = ref(false)
const showTokenGuide = ref(false)

onMounted(() => {
  vlmApiUrl.value = localStorage.getItem('vlm_api_url') || ''
  vlmApiKey.value = localStorage.getItem('vlm_api_key') || ''
  vlmModel.value = localStorage.getItem('vlm_model') || ''
  baiduApiKey.value = localStorage.getItem('baidu_api_key') || ''
  baiduSecretKey.value = localStorage.getItem('baidu_secret_key') || ''
  gistToken.value = localStorage.getItem('gist_token') || ''
})

/** 空值时移除存储，未保存的 VLM 字段在读取端回退默认值 */
function persist(key: string, value: string) {
  if (value) localStorage.setItem(key, value)
  else localStorage.removeItem(key)
}

function saveSettings() {
  persist('vlm_api_url', vlmApiUrl.value.trim())
  persist('vlm_api_key', vlmApiKey.value.trim())
  persist('vlm_model', vlmModel.value.trim())
  localStorage.setItem('baidu_api_key', baiduApiKey.value)
  localStorage.setItem('baidu_secret_key', baiduSecretKey.value)
  localStorage.setItem('gist_token', gistToken.value)
  showToast('设置已保存')
}

async function exportAllData() {
  const templates = await db.templates.toArray()
  const instances = await db.instances.toArray()
  exportToFile({ templates, instances }, `ninja_backup_${Date.now()}`)
  showToast('导出成功')
}

function importData() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.ninja'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const data = await importFromFile(file) as any
      if (data?.templates) {
        await db.templates.bulkPut(data.templates)
      }
      if (data?.instances) {
        await db.instances.bulkPut(data.instances)
      }
      showToast('导入成功，请刷新页面')
    } catch (err: any) {
      showToast(err.message || '导入失败')
    }
  }
  input.click()
}

function clearAllData() {
  showConfirmDialog({
    title: '清除所有数据',
    message: '确定要清除所有数据吗？此操作不可恢复！',
  }).then(async () => {
    await db.templates.clear()
    await db.instances.clear()
    showToast('已清除')
    router.push('/')
  })
}
</script>
