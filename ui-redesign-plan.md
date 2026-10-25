# 忍战发包工具 — 火影忍者手游风格 UI 优化方案

> 目标：将全站 UI 统一到火影忍者手游推广页的视觉风格（羊皮纸卷轴质感、金色3D按钮、暗红描边、忍者风配色）。

---

## 一、参考风格分析

参考图片 `style-test.png` 核心视觉特征：

| 特征 | 具体表现 |
|------|---------|
| **背景** | 羊皮纸/卷轴纹理，暖黄色渐变底色 |
| **按钮** | 金色渐变 + 3px 暗红边框 + 底部实心阴影（3D立体感）+ 顶部白色高光条 |
| **卡片/面板** | 暖白底色 + 金色描边 + 内层虚线边框装饰 |
| **边框** | 统一使用 `#8b0000`（暗红）或 `#d4ac0d`（金） |
| **文字** | 深棕色 `#4a2c00` / 深红色 `#8b0000`，白色按钮文字 |
| **配色** | 红（`#c0392b`）、金（`#f1c40f`）、琥珀（`#fef3e2`）、深褐（`#8b0000`） |

---

## 二、当前项目差距分析

### 已覆盖（无需改动）
- `style.css`：已有 `.ninja-btn`、`.ninja-card`、`.ninja-title` 基础类
- `HomePage.vue`：已使用 ninja 类
- `TemplateEditor.vue`：已使用 ninja 类
- `Settings.vue`：已使用 ninja 类
- `OCRImport.vue`：已使用 ninja 类

### 需要改造的组件

| 组件 | 问题 | 优先级 |
|------|------|--------|
| `DynamicTable.vue` | 表格使用灰色系（`bg-gray-50`/`bg-gray-100`/`border-gray-200`），按钮用蓝色（`text-blue-500`） | P0 |
| `ColumnManager.vue` | 全灰色系，按钮用蓝色（`bg-blue-500`/`border-blue-200`） | P0 |
| `FormulaEditor.vue` | 全灰色系，按钮用蓝色，提示区域用 `bg-blue-50` | P0 |
| `QRCodeSync.vue` | 全灰色系，按钮用蓝色（`bg-blue-500`） | P0 |
| `OCRCorrectionDialog.vue` | 需确认是否存在，如存在需检查 | P1 |

---

## 三、详细改造方案

### Step 1：style.css 增强

**文件**: `src/style.css`

在当前文件末尾追加以下内容：

```css
/* ===== 表格忍者风 ===== */
.ninja-table {
  border: 2px solid #d4ac0d;
  border-radius: 8px;
  overflow: hidden;
  background: #fef9e7;
  box-shadow: 0 2px 8px rgba(139, 0, 0, 0.15);
}

.ninja-table thead th {
  background: linear-gradient(180deg, #f9e076 0%, #d4ac0d 100%);
  color: #4a2c00;
  font-weight: bold;
  border-bottom: 2px solid #8b0000;
  text-shadow: 1px 1px 0 rgba(255, 255, 255, 0.5);
}

.ninja-table tbody tr {
  border-bottom: 1px solid #e8d5a3;
}

.ninja-table tbody tr:hover {
  background: #fff3cd;
}

.ninja-table tbody tr:nth-child(even) {
  background: #fdf6e3;
}

.ninja-table tbody tr:nth-child(even):hover {
  background: #fff3cd;
}

.ninja-table td {
  color: #4a2c00;
}

/* ===== 表单输入框忍者风 ===== */
.ninja-input {
  border: 2px solid #d4ac0d !important;
  border-radius: 8px !important;
  background: #fffaf0 !important;
  color: #4a2c00 !important;
  outline: none;
  transition: border-color 0.2s;
}

.ninja-input:focus {
  border-color: #8b0000 !important;
  box-shadow: 0 0 0 3px rgba(192, 57, 43, 0.15);
}

.ninja-input::placeholder {
  color: #b8945a !important;
}

/* ===== select 下拉忍者风 ===== */
.ninja-select {
  border: 2px solid #d4ac0d !important;
  border-radius: 8px !important;
  background: #fffaf0 !important;
  color: #4a2c00 !important;
}

/* ===== 弹出层/对话框忍者风 ===== */
.ninja-dialog-title {
  background: linear-gradient(180deg, #8b0000 0%, #c0392b 50%, #8b0000 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(1px 1px 0 #f1c40f);
}

.ninja-dialog {
  background: linear-gradient(180deg, #fffaf0 0%, #fef9e7 100%) !important;
  border: 3px solid #d4ac0d;
  border-radius: 12px;
}

/* ===== 分割线/标签区域忍者风 ===== */
.ninja-section-label {
  color: #d4ac0d;
  font-weight: bold;
  font-size: 0.875rem;
}

.ninja-section-bg {
  background: linear-gradient(180deg, #fffaf0 0%, #fef9e7 100%);
  border: 2px solid #d4ac0d;
  border-radius: 8px;
}

/* ===== 进度条忍者风 ===== */
.ninja-progress {
  background: #d4ac0d !important;
}

/* ===== 空状态提示 ===== */
.ninja-empty {
  color: #b8945a;
}

/* ===== Vant 组件覆盖 ===== */
/* 覆盖 Vant 默认的蓝色系 */
.van-button--primary {
  background: linear-gradient(180deg, #f9e076 0%, #d4ac0d 50%, #b7950b 100%) !important;
  border-color: #8b0000 !important;
  color: #4a2c00 !important;
}

.van-search {
  background: #fffaf0 !important;
}

.van-nav-bar {
  background: linear-gradient(180deg, #f9e076 0%, #d4ac0d 100%) !important;
}

.van-nav-bar__title {
  color: #4a2c00 !important;
  font-weight: bold;
}

.van-nav-bar__text {
  color: #8b0000 !important;
}

.van-cell {
  background: transparent !important;
  color: #4a2c00 !important;
}

.van-field__label {
  color: #8b0000 !important;
}

.van-action-bar {
  background: linear-gradient(180deg, #f9e076 0%, #d4ac0d 100%) !important;
}

.van-popup {
  background: linear-gradient(180deg, #fffaf0 0%, #fef9e7 100%) !important;
}

/* tag/chip 风格 */
.ninja-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
}

.ninja-tag-input {
  background: linear-gradient(180deg, #58d68d 0%, #2ecc71 100%);
  color: #fff;
  border: 1px solid #1e8449;
}

.ninja-tag-derived {
  background: linear-gradient(180deg, #a569bd 0%, #9b59b6 100%);
  color: #fff;
  border: 1px solid #5b2c6f;
}

/* ===== 滚动条美化 ===== */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #fef3e2;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #d4ac0d, #b7950b);
  border-radius: 4px;
  border: 1px solid #8b0000;
}

::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #e8c830, #d4ac0d);
}
```

---

### Step 2：DynamicTable.vue 改造

**文件**: `src/components/DynamicTable.vue`

#### 改造点清单

| 位置 | 当前样式 | 替换为 |
|------|---------|--------|
| `div.dynamic-table` | `border border-gray-200 rounded-lg` | `ninja-table` |
| `thead tr` | `bg-gray-50` | 删除（由 `.ninja-table thead th` 覆盖） |
| `th.sticky` | `bg-gray-50` | `ninja-table thead th` 已覆盖 |
| `th` (hover) | `bg-gray-100` | 删除，改为 `ninja-table thead th` |
| `td` (derived) | `bg-gray-50` | `#fdf6e3` (amber tint) |
| `td` (hover) | `bg-blue-50 ring-blue-300` | `bg-amber-100 ring-amber-400` |
| `td.sticky` | `bg-white` | `#fffaf0` |
| `input` (编辑中) | `border-blue-400` | `ninja-input` |
| 空数据提示 | `text-gray-400` | `ninja-empty` |
| `+ 添加行` 按钮 | `text-blue-500` | `ninja-btn` 样式或 `text-amber-700` |
| `删除` 按钮 | `text-red-400` | 保留红色，改为 `text-red-700` |
| 表格行 hover | `hover:bg-gray-50` | `.ninja-table tbody tr:hover` 已覆盖 |

#### 关键替换（template 部分）

```vue
<!-- 原第1行 -->
<div ref="tableRef" class="dynamic-table overflow-x-auto ninja-table">

<!-- 原第10行 thead tr -->
<tr>

<!-- 原第11行 th.sticky -->
<th class="sticky left-0 z-10 border-r border-b px-3 py-2 text-left font-medium">

<!-- 原第17行 th -->
<th
  class="relative border-r border-b px-3 py-2 text-left font-medium cursor-pointer select-none"
>

<!-- 原第41行 tr -->
<tr v-for="(row, idx) in sortedData" :key="idx" @paste="(e: ClipboardEvent) => onPaste(e, idx)">

<!-- 原第42行 td.sticky -->
<td class="sticky left-0 border-r border-b px-3 py-1.5 text-xs">

<!-- 原第48行 td -->
<td
  class="border-r border-b px-1 py-0 transition-colors"
  :class="{
    'bg-[#fdf6e3]': col.type === 'derived',
    'bg-amber-100 ring-1 ring-inset ring-amber-400': isHovered(idx, col.key) && col.isEditable,
  }"
>

<!-- 原第60行 input -->
<input
  v-model="editValue"
  class="w-full px-2 py-1 ninja-input outline-none text-sm"
  autofocus
  ...
/>

<!-- 原第74行 空值样式 -->
'text-[#b8945a] italic': row[col.key] == null || row[col.key] === '',

<!-- 原第81行 删除按钮 -->
<button class="text-red-700 hover:text-red-900 text-xs" @click="emit('deleteRow', idx)">删除</button>

<!-- 原第86行 底部栏 -->
<div v-if="editable" class="p-3 border-t border-[#d4ac0d] bg-[#fffaf0]">
  <button class="ninja-btn px-3 py-1.5 text-xs" @click="emit('addRow')">
    + 添加行
  </button>
  <span class="text-xs text-[#b8945a] ml-3">{{ data.length }} 行</span>
</div>

<!-- 原第92行 空数据 -->
<div v-if="data.length === 0" class="p-8 text-center ninja-empty">暂无数据，请添加行或导入数据</div>
```

---

### Step 3：ColumnManager.vue 改造

**文件**: `src/components/ColumnManager.vue`

#### 改造点清单

| 位置 | 当前样式 | 替换为 |
|------|---------|--------|
| `h3` 标题 | 无特殊样式 | `text-lg font-bold ninja-dialog-title mb-4` |
| `p.text-sm.text-gray-500` | 灰色标签 | `ninja-section-label` |
| 列项容器 | `bg-gray-50 rounded` | `ninja-section-bg p-2` |
| 拖拽图标 | `text-gray-400` | `text-amber-600` |
| 列名 input | `border rounded` | `ninja-input px-2 py-1 text-sm` |
| 类型 tag (计算) | `bg-blue-100 text-blue-600` | `ninja-tag ninja-tag-derived` |
| 类型 tag (输入) | `bg-green-100 text-green-600` | `ninja-tag ninja-tag-input` |
| 删除按钮 | `text-red-400` | `text-red-700` |
| 预设按钮 | `border-blue-200 text-blue-600 hover:bg-blue-50` | `ninja-btn px-3 py-1.5 text-xs` |
| 自定义 input | `border rounded` | `ninja-input` |
| 自定义 添加按钮 | `bg-blue-500 text-white rounded` | `ninja-btn ninja-btn-green px-3 py-1.5 text-xs` |
| 保存按钮 | `py-2 bg-blue-500 text-white rounded` | `ninja-btn py-2 text-sm` |
| 取消按钮 | `py-2 bg-gray-100 text-gray-600 rounded` | `ninja-btn ninja-btn-gray py-2 text-sm` |

#### 关键替换（template 部分）

```vue
<!-- 第4行 标题 -->
<h3 class="text-lg font-bold ninja-dialog-title mb-4">管理指标</h3>

<!-- 第7行 标签 -->
<p class="ninja-section-label mb-2">当前列</p>

<!-- 第10-12行 列项 -->
<div
  v-for="(col, idx) in localColumns"
  :key="col.key"
  class="flex items-center gap-2 ninja-section-bg p-2"
>
  <!-- 第14行 拖拽图标 -->
  <span class="text-amber-600 cursor-move">⠿</span>
  <!-- 第15行 input -->
  <input v-model="col.label" class="flex-1 ninja-input px-2 py-1 text-sm" />
  <!-- 第16-18行 tag -->
  <span class="ninja-tag" :class="col.type === 'derived' ? 'ninja-tag-derived' : 'ninja-tag-input'">
    {{ col.type === 'derived' ? '计算' : '输入' }}
  </span>
  <!-- 第19行 删除 -->
  <button v-if="col.key !== 'playerId'" class="text-red-700 text-xs" @click="removeColumn(idx)">删除</button>
</div>

<!-- 第25行 标签 -->
<p class="ninja-section-label mb-2">添加指标</p>

<!-- 第27-34行 预设按钮 -->
<button
  v-for="preset in presetColumns"
  :key="preset.key"
  class="ninja-btn px-3 py-1.5 text-xs"
  @click="addPresetColumn(preset)"
>
  + {{ preset.label }}
</button>

<!-- 第37行 自定义 input -->
<input v-model="customColumnName" class="flex-1 ninja-input px-2 py-1.5 text-sm" placeholder="自定义列名" />

<!-- 第38行 添加按钮 -->
<button class="ninja-btn ninja-btn-green px-3 py-1.5 text-xs" @click="addCustomColumn">添加</button>

<!-- 第43-44行 底部按钮 -->
<button class="flex-1 ninja-btn py-2 text-sm" @click="save">保存</button>
<button class="flex-1 ninja-btn ninja-btn-gray py-2 text-sm" @click="emit('close')">取消</button>
```

---

### Step 4：FormulaEditor.vue 改造

**文件**: `src/components/FormulaEditor.vue`

#### 改造点清单

| 位置 | 当前样式 | 替换为 |
|------|---------|--------|
| `h3` 标题 | 无特殊样式 | `ninja-dialog-title` |
| `label.text-gray-500` | 灰色标签 | `ninja-section-label` |
| 公式 input | `border rounded` / `border-red-400` | `ninja-input` / `border-red-600` |
| 错误提示 | `text-red-500` | `text-red-700` |
| 依赖列提示 | `text-gray-400` | `text-amber-600` |
| 函数区域 | `bg-gray-50` | `ninja-section-bg` |
| 运算符区域 | `bg-gray-50` | `ninja-section-bg` |
| 列区域 | `bg-blue-50` | 用 `ninja-section-bg` + 调整文字色 |
| 可点击 chip | `bg-white border-gray-300 hover:bg-blue-50` | `ninja-btn px-2 py-1 text-xs` |
| 档位 input | `border rounded` | `ninja-input` |
| 添加档位按钮 | `text-blue-500` | `ninja-btn px-3 py-1.5 text-xs` |
| 保存/取消按钮 | 蓝/灰 | `ninja-btn` / `ninja-btn-gray` |

#### 关键替换（template 部分）

```vue
<!-- 第4行 标题 -->
<h3 class="text-lg font-bold ninja-dialog-title">公式配置</h3>

<!-- 第8行 label -->
<label class="ninja-section-label block mb-1">总积分公式</label>

<!-- 第9-13行 input -->
<input
  ref="inputRef"
  v-model="localExpression"
  class="w-full ninja-input px-3 py-2 text-sm font-mono outline-none"
  :class="formulaError ? 'border-red-600' : ''"
  placeholder="输入公式，如 floor(战力/1000) + 上线天数*20"
  @input="onInput"
/>

<!-- 第17行 错误 -->
<p v-if="formulaError" class="text-red-700 text-xs mt-1">{{ formulaError }}</p>

<!-- 第18行 依赖 -->
<p v-else-if="deps.length" class="text-amber-600 text-xs mt-1">
  依赖列: {{ deps.map(k => labelMap[k] || k).join(', ') }}
</p>

<!-- 第24-33行 函数区域 -->
<div class="ninja-section-bg p-3">
  <p class="text-xs text-amber-600 mb-2">常用函数（点击插入）</p>
  <div class="flex flex-wrap gap-1.5">
    <span
      v-for="fn in FUNCTIONS"
      :key="fn.name"
      class="ninja-btn px-2 py-1 text-xs cursor-pointer font-mono"
      @click="insertAtCursor(fn.insert)"
    >{{ fn.label }}</span>
  </div>
</div>

<!-- 第37-46行 运算符区域 -->
<div class="ninja-section-bg p-3">
  <p class="text-xs text-amber-600 mb-2">运算符（点击插入）</p>
  <div class="flex flex-wrap gap-1.5">
    <span
      v-for="op in OPERATORS"
      :key="op"
      class="ninja-btn px-2.5 py-1 text-sm cursor-pointer font-mono"
      @click="insertAtCursor(op)"
    >{{ op }}</span>
  </div>
</div>

<!-- 第50-61行 列区域 -->
<div class="ninja-section-bg p-3">
  <p class="text-xs text-amber-600 mb-2">可用列（点击插入）</p>
  <div class="flex flex-wrap gap-1.5">
    <span
      v-for="col in availableColumns"
      :key="col.key"
      class="ninja-btn px-2 py-1 text-xs cursor-pointer"
      @click="insertAtCursor(col.label)"
    >
      {{ col.label }}
    </span>
  </div>
</div>

<!-- 第66行 label -->
<label class="ninja-section-label block mb-1">档位配置</label>

<!-- 第68-88行 档位 inputs -->
<input v-model="tier.label" class="ninja-input px-2 py-1 text-sm" style="width: 56px" placeholder="档位名" />
<input v-model.number="tier.min" type="number" class="ninja-input px-2 py-1 text-sm" style="width: 72px" />
<input v-model="tier.max" type="number" class="ninja-input px-2 py-1 text-sm" style="width: 72px" :placeholder="tier.max === null ? '∞' : ''" />
<input v-model="tier.gift" class="ninja-input px-2 py-1 text-sm flex-1 min-w-[80px]" placeholder="礼包" />
<input v-model="tier.quantity" class="ninja-input px-2 py-1 text-sm" style="width: 64px" :placeholder="tier.quantity === '无限' ? '无限' : ''" @focus="onQuantityFocus(tier)" @blur="onQuantityBlur(tier)" />

<!-- 第90行 删除 -->
<button v-if="localTiers.length > 1" class="text-red-700 text-xs flex-shrink-0" @click="localTiers.splice(idx, 1)">删除</button>

<!-- 第92行 添加 -->
<button class="ninja-btn px-3 py-1.5 text-xs" @click="addTier">+ 添加档位</button>

<!-- 第98-99行 底部按钮 -->
<button class="flex-1 ninja-btn py-2 text-sm" @click="save">保存</button>
<button class="flex-1 ninja-btn ninja-btn-gray py-2 text-sm" @click="emit('close')">取消</button>
```

---

### Step 5：QRCodeSync.vue 改造

**文件**: `src/components/QRCodeSync.vue`

#### 改造点清单

| 位置 | 当前样式 | 替换为 |
|------|---------|--------|
| `h3` 标题 | 无特殊样式 | `ninja-dialog-title` |
| QR placeholder | `bg-gray-100 text-gray-400` | `bg-[#fef3e2] text-amber-600 ninja-section-bg` |
| QR 边框 | 无 | 加 `ninja-section-bg p-4` 包裹 |
| 提示文字 | `text-gray-400` | `text-amber-700` |
| 数据大小文字 | `text-orange-500` / `text-green-500` | `text-red-600` / `text-green-700` |
| label | `text-gray-500` | `ninja-section-label` |
| textarea | `border rounded` | `ninja-input font-mono` |
| 导入按钮 | `bg-blue-500 text-white` | `ninja-btn` |
| 切换/关闭按钮 | `bg-gray-100 text-gray-600` | `ninja-btn ninja-btn-gray` |

#### 关键替换（template 部分）

```vue
<!-- 第4行 标题 -->
<h3 class="text-lg font-bold ninja-dialog-title mb-4">二维码同步</h3>

<!-- 第6-14行 生成模式 -->
<div v-if="mode === 'generate'" class="flex flex-col items-center gap-4">
  <!-- QR 加边框 -->
  <div class="ninja-section-bg p-4 inline-block">
    <img :src="qrDataUrl" alt="QR Code" class="w-48 h-48" v-if="qrDataUrl" />
    <div v-else class="w-48 h-48 flex items-center justify-center text-amber-600 text-sm">
      生成中...
    </div>
  </div>
  <p class="text-xs text-amber-700">手机扫码即可导入此表单数据</p>
  <p v-if="dataSize" class="text-xs" :class="dataSize > 1000 ? 'text-red-600' : 'text-green-700'">
    数据大小: {{ dataSize }} 字节 {{ dataSize > 1000 ? '(超出建议限制，建议使用 Gist 同步)' : '' }}
  </p>
</div>

<!-- 第18行 label -->
<p class="ninja-section-label mb-2">从二维码数据导入</p>

<!-- 第19-22行 textarea -->
<textarea
  v-model="importText"
  class="w-full ninja-input p-2 text-sm font-mono"
  rows="4"
  placeholder="在此粘贴从另一台设备获取的二维码数据字符串..."
></textarea>

<!-- 第25-28行 导入按钮 -->
<button
  class="w-full mt-2 ninja-btn py-2 text-sm"
  :disabled="!importText.trim()"
  @click="handleImport"
>
  导入数据
</button>

<!-- 第34-38行 底部按钮 -->
<button class="flex-1 ninja-btn ninja-btn-gray py-2 text-sm" @click="toggleMode">
  {{ mode === 'generate' ? '切换到导入' : '切换到生成' }}
</button>
<button class="flex-1 ninja-btn ninja-btn-gray py-2 text-sm" @click="emit('close')">关闭</button>
```

---

### Step 6：OCRCorrectionDialog.vue 检查

**文件**: `src/components/OCRCorrectionDialog.vue`

> **操作**: 先用 Glob 确认此文件是否存在。若存在，按 Step 3/4 的模式改造（灰色→金色、蓝色→红金）。若不存在则跳过。

---

### Step 7：Vant 组件全局覆盖

在 `style.css` 的 Vant 覆盖部分（已在 Step 1 中包含），确认以下覆盖生效：

| Vant 组件 | 覆盖目标 |
|-----------|---------|
| `van-nav-bar` | 金色渐变背景 + 深褐文字 |
| `van-search` | 暖白背景 |
| `van-button--primary` | 金色按钮替代蓝色 |
| `van-cell` | 暖白背景 + 深褐文字 |
| `van-field__label` | 暗红文字 |
| `van-action-bar` | 金色渐变背景 |
| `van-popup` | 暖白渐变背景 |
| `van-dialog` | 暖白渐变背景 |
| `van-progress` | 金色进度条 |

---

## 四、执行顺序

```
1. style.css 增强 (Step 1)     ← 基础，必须先做
2. DynamicTable.vue (Step 2)   ← 核心组件，影响面最大
3. ColumnManager.vue (Step 3)  ← 弹窗组件
4. FormulaEditor.vue (Step 4)  ← 弹窗组件
5. QRCodeSync.vue (Step 5)     ← 弹窗组件
6. OCRCorrectionDialog.vue (Step 6) ← 如存在则改造
7. 全局验证 (Step 7)           ← 启动 dev server 逐页检查
```

---

## 五、验证清单

执行完毕后，启动 `npm run dev` 逐项检查：

- [ ] **HomePage**: 标题金色渐变、卡片金色边框+虚线内框、按钮3D金色效果、搜索框暖白背景
- [ ] **TemplateEditor**: 工具栏按钮3D效果、表格金色表头+暖白行、编辑输入框金色边框
- [ ] **Settings**: 各设置卡片统一风格、van-field 标签暗红色
- [ ] **OCRImport**: 弹窗暖白背景、进度条金色、按钮统一
- [ ] **ColumnManager**: 所有灰/蓝色替换完成、tag 用紫/绿忍者风
- [ ] **FormulaEditor**: 函数/运算符/列 chip 金色按钮、输入框金色边框
- [ ] **QRCodeSync**: QR码金色边框、textarea 金色边框
- [ ] **滚动条**: 金色滚动条替代默认灰色
- [ ] **移动端适配**: 各页面在手机宽度下无溢出

---

## 六、注意事项

1. **保留功能性**: 所有替换仅改 CSS class，不改动 JS 逻辑
2. **Tailwind 优先级**: 使用 `!important` 的地方仅限于 Vant 组件覆盖，业务代码尽量用自定义 class 替代 Tailwind
3. **颜色变量**: 新增颜色值建议同步到 `:root` CSS 变量中方便后续维护
4. **暗色模式**: 本项目不做暗色模式，无需考虑
5. **字体**: 保持现有字体栈，参考图中无特殊字体要求
