# 发包表制作软件 — 项目规则文档

> 本文档用于指导 Claude Code 生成完整的项目代码。请严格遵守以下规范，确保实现一个**零后端、PWA可安装、支持动态指标配置**的跨端工具。

---

## 1. 项目概述

### 1.1 项目名称
**Ninja Package Tool**（忍战发包工具）——基于网页开发的考勤与奖励分发系统

### 1.2 核心目标
- 替代手工录入游戏数据，通过**截图OCR自动识别**玩家信息
- 支持**动态添加/修改计算指标**（如“上线天数”“参战次数”），**自定义总积分公式**
- 实现电脑/手机跨端使用，数据本地存储，无后端依赖
- 提供历史表单管理、Excel导入导出、二维码/Gist同步

### 1.3 用户场景
- 游戏公会管理：会长使用电脑录入截图数据，成员手机扫码查看自己的礼包档位
- 多赛季规则迭代：每个赛季可保存不同计算公式，支持克隆复用

---

## 2. 技术栈（严格按此执行）

| 类别        | 技术选型                                  | 说明                                                 |
| ----------- | ----------------------------------------- | ---------------------------------------------------- |
| 前端框架    | Vue 3.4+ & TypeScript 5.x                 | 组合式API + `<script setup>`                         |
| 构建工具    | Vite 5.x                                  | 配置 PWA 插件                                        |
| UI组件库    | Vant 4.x + Tailwind CSS 3.x               | Vant 移动优先，Tailwind辅助布局                      |
| 状态管理    | Pinia                                     | 管理表格模板、当前表单、OCR结果                      |
| 数据存储    | Dexie.js (IndexedDB) + localStorage       | 表单模板、历史实例、OCR临时缓存、用户偏好            |
| OCR引擎     | Tesseract.js (主) + 百度OCR API (备)      | 本地优先，云端降级                                   |
| 表格组件    | 自定义实现（基于原生 `<table>` 或 `div`） | 支持动态列、单元格编辑、公式计算（集成 `expr-eval`） |
| 公式解析    | `expr-eval` 或 `formula.js`               | 解析用户自定义公式，如 `战力/1000 + 上线天数*20`     |
| 导出        | SheetJS (XLSX)                            | 导出为 Excel                                         |
| 二维码/同步 | `qrcode` + GitHub Gist API + WebRTC       | 提供跨设备数据同步                                   |
| PWA         | `vite-plugin-pwa`                         | 生成 manifest，支持离线缓存                          |
| HTTP请求    | `axios`                                   | 调用百度OCR API、GitHub Gist API                     |

### 2.1 为什么不用 Luckysheet？
- 本项目需要**动态列增减、用户自定义指标库**，自定义表格更灵活。
- 公式解析只需轻量引擎，无需重型电子表格。

---

## 3. 系统架构

```text
┌─────────────────────────────────────────────────┐
│                   PWA Shell                      │
│  (manifest.json, Service Worker, 离线缓存)        │
├─────────────────────────────────────────────────┤
│                   视图层                          │
│  ┌────────────┐ ┌────────────┐ ┌─────────────┐  │
│  │ 截图识别页  │ │ 表格编辑页  │ │ 历史表单页   │  │
│  │ (OCR工作台) │ │ (动态列+公式)│ │ (列表/克隆)  │  │
│  └─────┬──────┘ └─────┬──────┘ └──────┬──────┘  │
├────────┴──────────────┴──────────────┴──────────┤
│                   业务逻辑层                      │
│  ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │OCR服务   │ │表格引擎  │ │公式计算引擎    │  │
│  │(本地+云端)│ │(动态列)  │ │(expr-eval)     │  │
│  └──────────┘ └──────────┘ └────────────────┘  │
├─────────────────────────────────────────────────┤
│                   数据持久层                      │
│  ┌────────────────────────────────────────────┐  │
│  │            IndexedDB (Dexie.js)             │  │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────┐  │  │
│  │  │ 表单模板  │ │ 历史实例  │ │ OCR缓存   │  │  │
│  │  └──────────┘ └──────────┘ └───────────┘  │  │
│  └────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────┐  │
│  │          localStorage (用户配置)            │  │
│  │  - 最近使用的模板ID                         │  │
│  │  - 百度OCR API Key (可选)                  │  │
│  │  - GitHub Gist Token (可选)                │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## 4. 数据模型（核心）

### 4.1 表单模板 (FormTemplate)
```typescript
interface FormTemplate {
  id: string;                    // 自增主键或uuid
  name: string;                  // 模板名，如“2026五一活动”
  columns: ColumnConfig[];       // 列配置
  formulaConfig: FormulaConfig;  // 总积分公式及依赖
  createdAt: number;             // 时间戳
  updatedAt: number;
}

interface ColumnConfig {
  key: string;                   // 唯一标识，如 "loginDays"
  label: string;                 // 显示标题，如“上线天数”
  type: 'base' | 'derived';      // base=从OCR/手动录入，derived=公式计算
  formula?: string;              // 若type=derived，存计算公式（如 "=score*0.1"）
  isEditable: boolean;           // base列通常可编辑，derived列只读
}

interface FormulaConfig {
  targetColumn: string;          // 要计算的目标列key，如 "totalScore"
  expression: string;            // 表达式，如 "floor(战力/1000) + 上线天数*50 + 备注系数"
  dependencies: string[];        // 自动解析出的依赖列key，如 ["战力", "上线天数", "备注系数"]
}
```

### 4.2 表单实例 (FormInstance)
```typescript
interface FormInstance {
  id: string;
  templateId: string;            // 所属模板ID
  title: string;                 // 实例名称，可自定义
  data: Record<string, any>[];   // 行数据，每行为 { 玩家ID: "xxx", 战力: 12345, 上线天数: 3, totalScore: 3600, ... }
  createdAt: number;
  updatedAt: number;
}
```

### 4.3 OCR识别结果缓存
```typescript
interface OCRCache {
  id?: string;
  imageHash: string;             // 图片md5或缩略图hash
  rawText: string;               // Tesseract原始输出
  parsedRows: Record<string, any>[]; // 解析后的行对象
  confidence: number;
  usedAt: number;
}
```

---

## 5. 功能模块详细要求

### 5.1 截图智能录入模块（重点）

**流程**：  
用户上传/粘贴截图 → 图片预览 → 调用OCR识别 → 结果校对弹窗 → 将数据追加到当前表格。

**详细规则**：
- 支持多图批量识别，自动去重（基于图片哈希）。
- 识别结果展示表格形式，允许用户逐行修正错误文字。
- 提供“字段映射”功能：OCR识别的列名（如“玩家ID”“战 力”）可手动映射到模板中的列。
- 若识别置信度低于70%，自动切换到百度OCR API（需用户在设置中填写API Key）。
- 用户修正后的识别结果存入 IndexedDB 的 `OCRCache`，用于未来相同图片特征时直接返回修正后数据。

**UI组件要求**：
- 使用 Vant `Uploader` 组件，允许拍照或从相册选择。
- 识别进度条（Tesseract.js 较慢，需显示“识别中...”）。
- 校对弹窗使用 Vant `Popup` + 轻量表格。

### 5.2 动态指标与公式管理

**添加指标**：
- 表格上方提供【添加指标】按钮 → 弹出指标选择器（从预设库或自定义）。
- 预设库包含：`上线天数`、`参战次数`、`胜率`、`备注系数` 等。
- 用户选择后，自动在表格右侧插入新列（类型为 `base` 或 `derived`）。
- 若为 `base` 列，用户可手动填入每行数值；若为 `derived` 列，需同时输入计算公式。

**修改总积分公式**：
- 提供一个【公式配置】按钮 → 打开公式编辑器。
- 编辑器展示当前总积分公式，高亮依赖列。
- 支持语法检查，错误时提示。
- 保存后立即重新计算表格所有行的 `totalScore` 列。

**公式引擎**：
- 使用 `expr-eval` 的 `Parser`，允许表达式如：`floor(战力/1000) + 上线天数 * 20 + if(参战次数>=3, 500, 0)`。
- 依赖列从 `FormTemplate.columns` 中取 `key`，在表达式中可直接引用。
- 计算结果保留两位小数。

### 5.3 表格编辑与展示

**表格组件要求**（不依赖第三方表格库，自己实现）：
- 基于 `<div>` 或 `<table>`，支持横向滚动。
- 首列固定为“玩家ID”（不可删除），其他动态列可左右拖动排序。
- 单元格点击进入编辑模式（`input` 或 `textarea`）。
- 派生列（derived）不可编辑，背景色浅灰。
- 支持行内复制、粘贴（Ctrl+C/V），可批量粘贴从Excel复制的数据。
- 表头支持排序（按数值或字符串）。

**性能建议**：使用虚拟滚动（`vue-virtual-scroller`）处理超过200行的表格。

### 5.4 历史表单管理

- 首页默认展示所有历史 `FormInstance` 列表（卡片式）。
- 每个卡片显示：标题、所属模板名、最后修改时间。
- 操作：打开、复制（克隆为新实例）、导出Excel、删除。
- 克隆时：创建新的 `FormInstance`，`data` 深拷贝原数据，`title` 加“-副本”。
- 支持搜索（按标题/模板名）。

### 5.5 跨端同步（无后端）

提供三种方式，用户可任选：

1. **二维码传输（局域网直连）**  
   - 电脑端生成当前 `FormInstance` 的JSON数据 → 压缩 → 生成二维码（`qrcode`）。  
   - 手机端扫码 → 解析 → 覆盖/合并本地数据（需确认）。  
   - 要求：二维码内容小于2KB（大数据可分批次或压缩）。

2. **GitHub Gist 同步**  
   - 用户配置个人 Token（存在 localStorage）。  
   - 点击上传 → 将 `FormInstance` 保存为新的 Gist（文件名自动含时间戳）。  
   - 下载列表 → 从用户的 Gist 列表中选择恢复。  
   - 注意：Gist 公开，但数据不敏感（游戏组织数据）。

3. **导出/导入文件**  
   - 导出 `.ninja` 格式（实际为加密JSON，`AES` 简单加密，密码默认“ninja123”）。  
   - 导入文件时解密并验证格式。

### 5.6 发包计算与分发

- 根据用户配置的 `totalScore` 计算档位：  
  档位阈值可配置（例如：3000以下=普通，3000~6000=精英，6000以上=传说）。
- 【预览礼包】按钮：弹窗显示按档位筛选后的玩家列表，支持复制名单。
- 支持一键导出“本次发包清单”（Excel，含玩家ID、档位、礼包内容）。

---

## 6. 目录结构与关键文件

```text
src/
├── main.ts                  // 入口，注册PWA
├── App.vue
├── pages/
│   ├── HomePage.vue         // 历史表单列表
│   ├── TemplateEditor.vue   // 模板/表格编辑页（核心）
│   ├── OCRImport.vue        // 截图识别页
│   └── Settings.vue         // 设置页（API Keys, Gist Token）
├── components/
│   ├── DynamicTable.vue     // 自定义动态表格组件
│   ├── FormulaEditor.vue    // 公式编辑器弹窗
│   ├── ColumnManager.vue    // 添加/删除/排序列
│   ├── OCRCorrectionDialog.vue
│   └── QRCodeSync.vue
├── stores/
│   ├── templateStore.ts     // 管理 FormTemplate
│   ├── instanceStore.ts     // 管理 FormInstance
│   └── ocrCacheStore.ts
├── services/
│   ├── ocr/
│   │   ├── tesseract.ts     // 封装Tesseract调用
│   │   ├── baiduOcr.ts      // 百度OCR调用
│   │   └── ocrManager.ts    // 本地+云端调度
│   ├── formula.ts           // 公式解析封装
│   ├── sync/
│   │   ├── gist.ts
│   │   ├── qrcode.ts
│   │   └── fileTransfer.ts
│   └── export.ts            // SheetJS导出
├── db/
│   ├── dexie.ts             // 初始化IndexedDB
│   └── repositories/        // 各表的CRUD
├── types/
│   └── index.ts
└── utils/
    ├── hash.ts              // 图片哈希
    └── compress.ts          // 数据压缩（lz-string）
```

---

## 7. 开发与构建要求

### 7.1 环境配置
- Node.js 20+，pnpm 推荐。
- 创建 `.env` 文件可选：
  ```
  VITE_BAIDU_OCR_API_KEY=xxx  # 可选
  VITE_GITHUB_CLIENT_ID=xxx   # 可选
  ```

### 7.2 PWA 配置
使用 `vite-plugin-pwa`，策略：
- 预缓存所有静态资源。
- 运行时缓存 `https://cdn.jsdelivr.net/npm/tesseract.js@...` 的 worker 文件。
- 提供“离线可用”提示。

### 7.3 兼容性要求
- 现代浏览器（Chrome 90+, Safari 14+, 移动端 WebView）。
- Tesseract.js 需要 WebAssembly，不支持 IE。

### 7.4 打包输出
- `dist/` 文件夹可部署到 Vercel/Netlify/GitHub Pages。
- 需包含 `_headers` 文件（Netlify）以正确配置 Service Worker 作用域。

---

## 8. 关键开发顺序（建议 Claude 按此生成）

1. **基础骨架**：Vue3 + Vite + Vant + Tailwind + Pinia + Dexie。
2. **数据模型与存储**：实现 IndexedDB 的 CRUD，创建示例模板。
3. **自定义动态表格组件**：实现基础渲染、单元格编辑、列配置动态绑定。
4. **公式引擎集成**：输入表达式，计算派生列，测试。
5. **OCR 模块**：集成 Tesseract.js，完成图片上传→识别→校对→存入表格。
6. **指标添加/公式修改 UI**：ColumnManager 和 FormulaEditor。
7. **历史表单管理**：列表、克隆、删除。
8. **跨端同步功能**：二维码、Gist、文件导入导出。
9. **PWA 配置**：manifest, service worker。
10. **最终测试与打包**。

---

## 9. 验收标准（必须满足）

- [ ] 用户可上传或粘贴截图，自动识别出“玩家ID、战力”等字段并填入表格。
- [ ] 用户可点击【添加指标】，选择“上线天数”后，表格出现新列，且可手动编辑。
- [ ] 用户可在公式编辑器中修改总积分公式（例如改为 `战力/1000 + 上线天数*30`），表格所有行的总积分立即重新计算。
- [ ] 表格支持 200 行数据流畅滚动和编辑。
- [ ] 可以在手机和电脑上互通数据（通过二维码/Gist）。
- [ ] 安装到手机桌面后，离线打开仍可查看历史表单。
- [ ] 无任何后端 API 必须部署（除可能使用的百度OCR、GitHub Gist，它们均为可选外部服务）。

---

## 10. 注意事项与陷阱

- **Tesseract.js 性能**：首次加载会下载语言包（约15MB），建议先提醒用户。识别时 UI 不卡（使用 Web Worker）。
- **公式依赖循环**：前端检查，禁止派生列依赖其他派生列（避免递归）。
- **IndexedDB 兼容**：在隐私模式下可能不可用，需提示用户切换普通模式。
- **二维码数据量**：如果 FormInstance 数据超过 1KB，切分多次二维码或提示使用 Gist。
- **GitHub Gist 权限**：需要用户生成 personal access token（仅需 `gist` 权限），引导用户创建。

---

**文档结束。Claude Code 请严格按照以上规则生成完整项目代码。**