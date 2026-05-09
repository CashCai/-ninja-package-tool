# Ninja Package Tool（忍战发包工具）

## 项目简介
某游戏的礼包分配表制作工具。支持截图OCR识别玩家信息、动态指标与公式配置、表格编辑、历史表单管理、跨端同步（二维码/Gist/文件）。

## 技术栈
- Vue 3.4+ + TypeScript 5.x + Vite 5.x
- Vant 4.x UI 组件库 + Tailwind CSS 3.x
- Pinia 状态管理
- Dexie.js (IndexedDB) 数据持久化
- Tesseract.js OCR 识别
- expr-eval 公式解析
- SheetJS Excel 导出
- vite-plugin-pwa PWA 支持

## 开发命令
- `npm run dev` — 启动开发服务器
- `npm run build` — 类型检查 + 生产构建
- `npm run preview` — 预览构建结果

## 目录结构
```
src/
├── main.ts                  # 入口
├── App.vue
├── router.ts                # 路由配置
├── pages/                   # 页面组件
│   ├── HomePage.vue         # 历史表单列表
│   ├── TemplateEditor.vue   # 表格编辑页（核心）
│   ├── OCRImport.vue        # 截图识别弹窗
│   └── Settings.vue         # 设置页
├── components/              # 通用组件
│   ├── DynamicTable.vue     # 动态表格
│   ├── FormulaEditor.vue    # 公式编辑器
│   ├── ColumnManager.vue    # 指标管理
│   ├── OCRCorrectionDialog.vue
│   └── QRCodeSync.vue       # 二维码同步
├── stores/                  # Pinia 状态
│   ├── templateStore.ts
│   └── instanceStore.ts
├── services/                # 业务服务
│   ├── formula.ts
│   ├── export.ts
│   ├── ocr/{tesseract,baiduOcr,ocrManager}.ts
│   └── sync/{qrcode,gist,fileTransfer}.ts
├── db/                      # IndexedDB
│   ├── dexie.ts
│   └── repositories/
├── types/index.ts           # 类型定义
└── utils/                   # 工具函数
```

## 关键约定
- 所有数据存储在本机 IndexedDB，无需后端
- 公式使用 expr-eval 引擎，依赖列直接引用 column.key
- OCR 优先级：Tesseract.js（本地）→ 百度OCR API（云端）
- 跨设备同步：二维码（小数据）、Gist（大数据）、.ninja 文件（加密导入导出）
