# 忍战发包工具 — 开发记录

## 概述

零后端、PWA 可安装、支持动态指标配置的礼包分配表工具。替代手工录入游戏活动数据，支持截图 OCR 识别、自定义积分公式、跨设备同步。

---

## 项目结构

```
src/
├── main.ts                  # 入口，注册 PWA
├── App.vue
├── router.ts                # 路由配置
├── style.css                # 全局样式 + Tailwind
├── pages/
│   ├── HomePage.vue         — 历史表单列表（搜索、克隆、导出、删除）
│   ├── TemplateEditor.vue   — 核心编辑页（表格 + 所有功能入口）
│   ├── OCRImport.vue        — 截图识别流程
│   └── Settings.vue         — API Key 配置 + 数据管理
├── components/
│   ├── DynamicTable.vue     — 自定义动态表格（双击编辑、排序、粘贴）
│   ├── ColumnManager.vue    — 指标管理弹窗（预设库 + 自定义）
│   ├── FormulaEditor.vue    — 公式编辑 + 档位配置弹窗
│   ├── OCRCorrectionDialog.vue — OCR 识别结果校对 + 字段映射
│   └── QRCodeSync.vue       — 二维码生成与导入
├── stores/
│   ├── templateStore.ts     — 模板状态管理
│   └── instanceStore.ts     — 实例状态管理（含公式重算）
├── services/
│   ├── formula.ts           — expr-eval 公式解析引擎
│   ├── export.ts            — SheetJS Excel 导出
│   ├── ocr/
│   │   ├── tesseract.ts     — Tesseract.js 本地 OCR
│   │   ├── baiduOcr.ts      — 百度 OCR API 调用
│   │   └── ocrManager.ts    — 双引擎调度（本地优先，云端降级）
│   └── sync/
│       ├── qrcode.ts        — 二维码生成
│       ├── gist.ts           — GitHub Gist 上传/下载
│       └── fileTransfer.ts  — .ninja 加密文件导入导出
├── db/
│   ├── dexie.ts             — IndexedDB 初始化（3 张表）
│   └── repositories/
│       ├── templateRepo.ts  — 模板 CRUD
│       └── instanceRepo.ts  — 实例 CRUD
├── types/
│   └── index.ts             — 完整类型定义
└── utils/
    ├── id.ts                — nanoid 主键生成
    ├── hash.ts              — 图片 SHA-256 哈希
    └── compress.ts          — lz-string 压缩/解压
```

---

## 开发过程

### 第一阶段：项目骨架与依赖

创建 Vite 5 + Vue 3.4 + TypeScript 5 项目，安装全部依赖：

| 依赖 | 用途 |
|---|---|
| Vant 4 + Tailwind 3 | 移动端 UI 组件 + 辅助布局 |
| Pinia | 状态管理 |
| Dexie.js | IndexedDB 封装 |
| Tesseract.js | 本地 OCR 识别 |
| expr-eval | 公式解析引擎 |
| SheetJS (xlsx) | Excel 导出 |
| qrcode + lz-string | 二维码生成与数据压缩 |
| crypto-js | .ninja 文件加密 |
| axios | HTTP 请求 |
| vite-plugin-pwa | PWA 离线支持 |

### 第二阶段：数据模型与存储

**核心类型定义**（`src/types/index.ts`）：
- `FormTemplate` — 表单模板（列配置、公式配置、档位配置）
- `FormInstance` — 表单实例（具体数据行）
- `OCRCache` — OCR 结果缓存

**IndexedDB 设计**（`src/db/dexie.ts`）：
- 通过 Dexie.js 建立 3 张表，按 `updatedAt` 倒序索引
- 仓库层（`repositories/`）封装 CRUD 操作，生成 nanoid 主键

### 第三阶段：自定义动态表格

核心难点，没有使用第三方表格库。

- 基于原生 `<table>`，支持横向滚动
- 首列固定（序号），派生列背景灰色不可编辑
- 双击单元格进入编辑模式，回车/失焦提交，Escape 取消
- 表头点击排序（数值/字符串）
- 支持从 Excel 直接 Ctrl+V 批量粘贴

### 第四阶段：公式引擎

基于 expr-eval 的 Parser：
- 注册自定义函数：floor、ceil、round、max、min、abs、if(cond, t, f)
- 支持表达式如 `floor(power/1000) + loginDays * 20 + if(battleCount>=3, 500, 0)`
- `validateFormula()` 语法检查 + `extractDependencies()` 自动提取依赖列

### 第五阶段：OCR 模块

双引擎调度策略：
1. 优先 Tesseract.js（本地，中文+英文语言包）
2. 置信度 < 70% 自动切换到百度 OCR API
3. 百度 OCR 需要用户自行填写 API Key（可选）

OCR 结果处理：
- `parseOCRText()` 将识别文本解析为结构化行数据
- 字段映射：OCR 识别的列名可手动映射到模板列
- 多图批量识别，基于 SHA-256 去重

### 第六阶段：核心功能 UI

**ColumnManager** — 指标管理弹窗：
- 从预设库（战力、上线天数、参战次数等）选择添加
- 支持自定义列名
- 删除非必要列（playerId 除外）

**FormulaEditor** — 公式编辑弹窗：
- 编辑总积分表达式，显示可用列列表，点击插入
- 语法实时校验，错误高亮
- 档位配置（如 0-3000=普通，3000-6000=精英，6000+=传说）

### 第七阶段：页面与路由

三页面架构：
- `/` — 历史表单列表（卡片式、搜索、克隆、导出、删除）
- `/editor/:id` — 核心编辑页（表格 + 所有功能按钮）
- `/settings` — 设置（API Keys、Gist Token、数据导入导出）

### 第八阶段：跨端同步

三种同步方式：

| 方式 | 适用场景 | 实现 |
|---|---|---|
| 二维码 | 小数据、面对面 | lz-string 压缩 → qrcode 生成 → 扫码/粘贴还原 |
| GitHub Gist | 大数据、远程 | 用户 Token → 上传 Gist → 从 Gist 列表恢复 |
| .ninja 文件 | 备份/迁移 | AES 加密 + lz-string 压缩 → 文件导入导出 |

### 第九阶段：PWA 配置

- `vite-plugin-pwa`：预缓存所有静态资源
- 运行时缓存 Tesseract.js worker 文件
- manifest.json：standalone 模式、图标、主题色
- `_headers`：Netlify 部署所需的 Service Worker 作用域配置

---

## 架构决策记录

### 为什么不用 Luckysheet？
项目需要动态列增减、自定义指标库，Luckysheet 太重且不便于深度定制。自实现表格更灵活。

### 为什么用 IndexedDB 而不是 localStorage？
表单数据可能包含数百行 × 多列，IndexedDB 更适合结构化大数据，支持索引查询。

### OCR 为什么双引擎？
Tesseract.js 离线可用但精度一般，百度 OCR 云端精度高但需要 API Key。双引擎降级策略保证基础功能始终可用。

### 二维码为什么用 lz-string 压缩？
二维码内容有大小限制（约 2KB），lz-string 压缩可将 JSON 数据缩减 50-70%。

---

## 构建验证

- 类型检查 `vue-tsc`：零错误
- 生产构建 `vite build`：成功
  - CSS: 245 KB (gzip 81 KB)
  - JS: 905 KB (gzip 322 KB) — 主要来自 Vant 组件库
  - PWA: 10 个预缓存条目

---

## 使用说明

```bash
npm install     # 安装依赖
npm run dev     # 启动开发服务器 (http://localhost:5173)
npm run build   # 生产构建，输出到 dist/
```

部署 dist/ 到任意静态托管服务（Vercel / Netlify / GitHub Pages）即可使用。

---

## 验收清单

- [x] 上传/粘贴截图，OCR 识别并填入表格
- [x] 动态添加指标列（预设 + 自定义）
- [x] 自定义总积分公式，保存后立即重算所有行
- [x] 表格单元格双击编辑，支持排序、粘贴
- [x] 计算档位，预览礼包分组
- [x] Excel 导出（含档位和礼包内容）
- [x] 历史表单管理（列表、搜索、克隆、删除）
- [x] 二维码 / Gist / 文件三种同步方式
- [x] PWA 离线可用
- [x] 零后端，纯前端方案

---

## 开发日志

### Bug 修复与体验优化记录（2026-05-10）

#### 表格交互优化
- **点击编辑**：从双击编辑改为鼠标悬浮高亮 + 点击直接编辑，减少一次点击
- **列宽拖拽**：表头右侧添加拖拽手柄，支持鼠标拖拽调整列宽（60px–500px）

#### 公式编辑器改造
- **中文列名**：公式输入框改用中文列名（如 `floor(战力/1000) + 上线天数*20`），保存时自动转为英文 key 存入
- **点击插入**：常用函数、运算符、可用列均通过 `<span>` 点击插入，光标自动定位到括号/逗号内
- **错误提示中文化**：`Expected EOF` → "公式末尾有多余字符"，`Unknown identifier` → "无法识别的列名或函数"，去掉 `parse error [line:col]` 前缀

#### DataCloneError 修复
- **根因**：Vue 响应式代理对象传给 IndexedDB 时无法被结构化克隆
- **修复**：`templateRepo.update` 和 `instanceRepo.update` 写入前做 `JSON.parse(JSON.stringify())` 深拷贝

#### 礼包数量限制
- **新增字段**：`ScoreTier.quantity`（`number | '无限'`），普通档默认无限
- **分配逻辑**：从最高档位开始按数量限制分配，超出数量的高分玩家自动降级到下一档
- **Bug 修复**：`v-model` 绑定的数量值为字符串 `"1"` 而非数字 `1`，导致 `typeof === 'number'` 为 false → 数量被当成 Infinity。新增 `normalizeQuantity()` 统一转换

#### Ctrl+V 粘贴修复
- **根因**：Excel 剪贴板含 `\r\n` 换行符、BOM 字符，且逐单元格 emit 存在竞态问题
- **修复**：
  - 统一处理 `\r\n` / `\r` / BOM 字符
  - 改为单次 `pasteRows` 事件批量传递解析后的行数据
  - 父组件一次性添加行、写入数据、最后只调用一次 `recalculate()`

#### OCR 截图识别
- 弹窗顶部增加可折叠操作指引（上传→映射→导入三步）
- Uploader 图片预览增加关闭按钮和遮罩层关闭支持



### 更新：视觉大模型 OCR 接入（2026-10-26）

- **新增 VLM 识别模块**（`src/services/ocr/vlmOCR.ts`）：默认 `glm-4.6v-flash` 走 OpenAI 兼容 `chat/completions`，按「信息格」规则结构化提取（一格 = 一名成员 = 一行），字段映射自动完成
- **GLM-OCR 适配**：模型切换为 `glm-ocr` 时走 `layout_parsing` 文档解析接口，支持 HTML 表格 / Markdown 表格 / 信息格布局三种解析方式
- **字段提取规则系统**：内置 ID、战力、参战次数等常见字段规则（战力自动去除「战」字只保留数字、ID 保持原样）
- **修复 ID 与战力粘连**：GLM-OCR 输出如「116-爱你如子战6742538」时自动拆分，从右取最后一个「战+长数字」剥离战力，兼容 ID 名字本身含「战」字（如 战神、战3）的情况
- **OCR 调度改造**：视觉大模型优先，失败时降级本地引擎，并在截图识别弹窗透传降级原因（不再静默）
- **设置页新增配置**：视觉大模型识别卡片（API 地址 / API Key / 模型名），默认 glm-4.6v-flash（免费），可切换 glm-ocr







## TODO:

- [ ] 粘贴Excel表格内容时，第一个单元格内容丢失
- [ ] 引导用户使用【千问】完成图片文字信息提取
- [ ] 优化网页样式，参考 ui-redesign-plan.md 文件
- [ ] 数据正确性隐患（最优先修复）

1. 公式算错时静默返回 0

formula.ts#L27-L36 中`evaluateFormula` 出错返回`0` 。公式写错 → 全表总积分变 0 → 用户导出 Excel 才发现，这比报错严重得多。 应返回`null` 并在对应单元格标红 ，排序/档位计算时跳过。

2. 每次单元格提交触发全量持久化

instanceStore.ts#L79-L89 中`updateRow` /`deleteRow` 每次都`saveInstance` → 全表写 IndexedDB +`loadInstances()` 重查整个列表。编辑一个单元格 = 一次全表写库 + 一次全列表重查。 建议改为：编辑只改内存，debounce 500ms 自动落库 ，同时去掉手动"保存"按钮（或保留为"另存"）。plan 的验收标准是 200 行流畅，当前架构下每次按键提交都在做 O(全表) 的 IO。

3. 派生列循环依赖未检测

plan.md 第 10 节明确要求"禁止派生列依赖其他派生列"， FormulaEditor.vue 中没有任何循环检测，`extractDependencies` 只提取 token。保存公式时需做一次依赖闭包检查。

- [ ] 功能缺口（对照 plan 验收标准）

| plan 要求            | 现状                                                         |
| :------------------- | :----------------------------------------------------------- |
| 手机扫码导入数    据 | ❌ qrcode.ts 只有生成二维码和`JSON.parse` ， 没有相机扫码实现 ，手机端实际只能手动粘贴压缩文本 |
| 二维码超限时分批     | ❌ 未实现，超 2KB 直接无提示                                  |
| 虚拟滚动（200+ 行）  | ❌ DynamicTable.vue#L41 直接 v-for 全量渲染                   |
| Gist 同步            | ⚠️ 实现了，但`public: true` （ gist.ts#L13 ），玩家ID+战力数据公开可读，建议 secret gist 或复用已有的 AES 加密后再上传 |
| 撤销/重做            | ❌ 完全没有——Excel 粘贴错了无法撤销，对表格工具是核心体验缺失 |

