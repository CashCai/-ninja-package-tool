<template>
  <div class="p-4 pb-20">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold ninja-title">忍战发包工具</h1>
      <div class="flex gap-2 items-center">
        <ThemeToggle />
        <button class="ninja-btn px-4 py-2 text-sm" @click="showNewDialog = true">
          新建表单
        </button>
        <button class="ninja-btn-ghost px-4 py-2 text-sm" @click="handleImport">导入</button>
      </div>
    </div>

    <van-search v-model="searchQuery" placeholder="搜索表单标题或模板名" shape="round" />

    <!-- 使用指引 -->
    <div class="mt-3 ninja-card overflow-hidden">
      <div
        class="ninja-card-header flex items-center justify-between cursor-pointer select-none"
        @click="showGuide = !showGuide"
      >
        <span class="flex items-center gap-1.5">
          使用指引
          <svg
            class="w-3.5 h-3.5 transition-transform duration-300"
            :class="showGuide ? 'rotate-180' : ''"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <span class="text-xs font-normal text-faint">上手只需3步</span>
      </div>
      <div v-show="showGuide" class="px-4 pb-4">
        <ol class="text-sm text-sub space-y-2 mt-3">
          <li class="flex items-start gap-2">
            <span class="flex-shrink-0 w-5 h-5 rounded-full border border-line text-gold text-[11px] flex items-center justify-center mt-0.5">1</span>
            <span><b class="text-main">新建表单</b> → 输入标题，选择或创建模板（已内置常用指标）</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="flex-shrink-0 w-5 h-5 rounded-full border border-line text-gold text-[11px] flex items-center justify-center mt-0.5">2</span>
            <span><b class="text-main">编辑数据</b> → 点击单元格选中，再次点击进入编辑；支持从Excel直接粘贴</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="flex-shrink-0 w-5 h-5 rounded-full border border-line text-gold text-[11px] flex items-center justify-center mt-0.5">3</span>
            <span><b class="text-main">导出分发</b> → 预览礼包档位，导出Excel清单</span>
          </li>
        </ol>
        <p class="text-xs text-faint mt-3">
          提示：首次启动已为你创建参考表单；若未显示，点击下方按钮手动加载。
        </p>
        <button
          class="mt-2 ninja-btn-ghost px-4 py-1.5 text-xs"
          @click="loadExample"
        >
          加载示例表单
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-8">
      <van-loading />
    </div>

    <div v-else-if="filteredInstances.length === 0" class="text-center py-12 text-sub">
      <p class="text-lg mb-2">暂无表单</p>
      <p class="text-sm mb-4 text-faint">点击"新建表单"或加载示例快速体验</p>
      <button class="ninja-btn px-4 py-2 text-sm" @click="loadExample">
        加载示例表单
      </button>
    </div>

    <div v-else class="space-y-3 mt-3">
      <div
        v-for="inst in filteredInstances"
        :key="inst.id"
        class="ninja-card p-4"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-lg text-main truncate">{{ inst.title }}</h3>
            <p class="text-xs text-faint mt-1">
              模板: {{ getTemplateName(inst.templateId) }} | {{ formatDate(inst.updatedAt) }}
            </p>
            <p class="text-xs text-faint">{{ inst.data.length }} 行数据</p>
          </div>
        </div>
        <div class="flex gap-2 mt-3 flex-wrap">
          <button class="ninja-btn px-3 py-1.5 text-xs" @click="openInstance(inst.id)">打开</button>
          <button class="ninja-btn-ghost px-3 py-1.5 text-xs" @click="cloneInstance(inst.id)">克隆</button>
          <button class="ninja-btn-ghost px-3 py-1.5 text-xs" @click="exportInstance(inst.id)">导出</button>
          <button class="ninja-btn-danger px-3 py-1.5 text-xs" @click="deleteInstance(inst.id)">删除</button>
        </div>
      </div>
    </div>

    <van-dialog v-model:show="showNewDialog" title="新建表单" show-cancel-button @confirm="createNewInstance">
      <div class="p-4">
        <input
          v-model="newTitle"
          class="w-full px-3 py-2 text-sm mb-3"
          placeholder="表单标题"
        />
        <select v-model="newTemplateId" class="w-full px-3 py-2 text-sm">
          <option value="">选择模板...</option>
          <option v-for="tpl in templateList" :key="tpl.id" :value="tpl.id">
            {{ tpl.name }}
          </option>
          <option value="__new__">+ 创建新模板</option>
        </select>
        <input
          v-if="newTemplateId === '__new__'"
          v-model="newTemplateName"
          class="w-full px-3 py-2 text-sm mt-2"
          placeholder="新模板名称"
        />
      </div>
    </van-dialog>

    <van-action-bar>
      <van-action-bar-button text="设置" @click="router.push('/settings')" />
    </van-action-bar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showDialog } from 'vant'
import { useTemplateStore } from '@/stores/templateStore'
import { useInstanceStore } from '@/stores/instanceStore'
import { templateRepo } from '@/db/repositories/templateRepo'
import { exportToExcel } from '@/services/export'
import { exportToFile, importFromFile } from '@/services/sync/fileTransfer'
import { seedReferenceData, forceSeedReference } from '@/services/seed'
import ThemeToggle from '@/components/ThemeToggle.vue'

const router = useRouter()
const templateStore = useTemplateStore()
const instanceStore = useInstanceStore()

const searchQuery = ref('')
const showNewDialog = ref(false)
const newTitle = ref('')
const newTemplateId = ref('')
const newTemplateName = ref('')
const loading = ref(true)
const showGuide = ref(true)

const templateList = computed(() => templateStore.templateList)
const instances = computed(() => instanceStore.instanceList)

const filteredInstances = computed(() => {
  const q = searchQuery.value.toLowerCase()
  if (!q) return instances.value
  return instances.value.filter(inst =>
    inst.title.toLowerCase().includes(q) ||
    getTemplateName(inst.templateId).toLowerCase().includes(q)
  )
})

onMounted(async () => {
  await seedReferenceData()
  await Promise.all([templateStore.loadTemplates(), instanceStore.loadInstances()])
  loading.value = false
})

function getTemplateName(templateId: string): string {
  return templateList.value.find(t => t.id === templateId)?.name || '未知模板'
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('zh-CN')
}

async function createNewInstance() {
  if (!newTitle.value.trim()) {
    showToast('请输入表单标题')
    return
  }
  let templateId = newTemplateId.value
  if (templateId === '__new__') {
    if (!newTemplateName.value.trim()) {
      showToast('请输入模板名称')
      return
    }
    const tpl = await templateStore.createTemplate(newTemplateName.value.trim())
    templateId = tpl.id
  }
  if (!templateId) {
    showToast('请选择模板')
    return
  }
  await instanceStore.createInstance(templateId, newTitle.value.trim())
  showToast('创建成功')
  newTitle.value = ''
}

function openInstance(id: string) {
  router.push(`/editor/${id}`)
}

async function cloneInstance(id: string) {
  await instanceStore.cloneInstance(id)
  showToast('克隆成功')
}

async function deleteInstance(id: string) {
  showDialog({
    title: '确认删除',
    message: '确定要删除此表单吗？此操作不可恢复。',
    showCancelButton: true,
  }).then(async (confirmed) => {
    if (confirmed) {
      await instanceStore.deleteInstance(id)
      showToast('已删除')
    }
  })
}

async function exportInstance(id: string) {
  const inst = instances.value.find(i => i.id === id)
  if (!inst) return
  const tpl = await templateRepo.getById(inst.templateId)
  if (!tpl) return
  exportToExcel(inst.data, tpl.columns, tpl.scoreTiers, inst.title)
}

async function loadExample() {
  loading.value = true
  try {
    await forceSeedReference()
    await Promise.all([templateStore.loadTemplates(), instanceStore.loadInstances()])
    showToast('示例表单已加载')
  } catch (err: any) {
    showToast('加载失败: ' + err.message)
  } finally {
    loading.value = false
  }
}

function handleImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.ninja'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const data = await importFromFile(file) as any
      if (data?.templateId && data?.data) {
        await instanceStore.createInstance(data.templateId, data.title || '导入的表单')
        showToast('导入成功')
      } else {
        showToast('文件格式不正确')
      }
    } catch (err: any) {
      showToast(err.message || '导入失败')
    }
  }
  input.click()
}
</script>
