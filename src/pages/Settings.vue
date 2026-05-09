<template>
  <div class="min-h-screen bg-gray-50">
    <van-nav-bar title="设置" left-text="返回" @click-left="router.push('/')" />

    <div class="p-4 space-y-4">
      <van-cell-group title="OCR 设置">
        <van-field
          v-model="baiduApiKey"
          label="百度OCR API Key"
          placeholder="可选，用于云端OCR"
          @blur="saveSettings"
        />
        <van-field
          v-model="baiduSecretKey"
          label="百度OCR Secret Key"
          type="password"
          placeholder="可选"
          @blur="saveSettings"
        />
      </van-cell-group>

      <van-cell-group title="Gist 同步设置">
        <van-field
          v-model="gistToken"
          label="GitHub Token"
          type="password"
          placeholder="需 gist 权限"
          @blur="saveSettings"
        />
        <van-cell title="如何获取 Token?" is-link @click="showTokenGuide = true" />
      </van-cell-group>

      <van-cell-group title="数据管理">
        <van-cell title="导出所有数据 (JSON)" is-link @click="exportAllData" />
        <van-cell title="导入数据" is-link @click="importData" />
        <van-cell title="清除所有数据" is-link @click="clearAllData" />
      </van-cell-group>

      <van-cell-group title="关于">
        <van-cell title="版本" value="1.0.0" />
        <van-cell title="数据存储方式" value="本地 IndexedDB" />
      </van-cell-group>
    </div>

    <van-dialog v-model:show="showTokenGuide" title="获取 GitHub Token">
      <div class="p-4 text-sm text-gray-600 space-y-2">
        <p>1. 访问 <a class="text-blue-500" href="https://github.com/settings/tokens" target="_blank">GitHub Token 设置</a></p>
        <p>2. 点击 "Generate new token (classic)"</p>
        <p>3. 勾选 <code class="bg-gray-100 px-1">gist</code> 权限</p>
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

const router = useRouter()

const baiduApiKey = ref('')
const baiduSecretKey = ref('')
const gistToken = ref('')
const showTokenGuide = ref(false)

onMounted(() => {
  baiduApiKey.value = localStorage.getItem('baidu_api_key') || ''
  baiduSecretKey.value = localStorage.getItem('baidu_secret_key') || ''
  gistToken.value = localStorage.getItem('gist_token') || ''
})

function saveSettings() {
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
