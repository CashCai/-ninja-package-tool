import axios from 'axios'

export interface VLMConfig {
  apiUrl: string
  apiKey: string
  model: string
}

/** 默认使用智谱开放平台，免费视觉模型 GLM-4.6V-Flash（浏览器可直调） */
export const DEFAULT_VLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4'
export const DEFAULT_VLM_MODEL = 'glm-4.6v-flash'
/** 专用 OCR 模型，走文档解析接口，复杂表格识别更准 */
export const GLM_OCR_MODEL = 'glm-ocr'

function isGLMOcr(model: string): boolean {
  return model.toLowerCase() === GLM_OCR_MODEL
}

/** 从 localStorage 读取视觉大模型配置，未配置 API Key 时返回 null */
export function getVLMConfigFromStorage(): VLMConfig | null {
  const apiKey = localStorage.getItem('vlm_api_key')
  if (!apiKey) return null
  return {
    apiUrl: localStorage.getItem('vlm_api_url') || DEFAULT_VLM_API_URL,
    apiKey,
    model: localStorage.getItem('vlm_model') || DEFAULT_VLM_MODEL,
  }
}

/* ===================== 字段提取规则系统 ===================== */

interface FieldRule {
  /** 匹配模板列名 */
  match: RegExp
  /** 规则标识（power=战力，供粘连剥离结果直接赋值） */
  key?: string
  /** 给视觉大模型的提取规则描述（信息格布局） */
  promptRule: string
  /** 本地文本提取正则（GLM-OCR md_results 解析用，需含 1 个捕获组） */
  patterns?: RegExp[]
  /** 提取结果后处理 */
  clean?: (s: string) => string
  /** 行首锚点：该字段位于信息格首行时，以行首特征作为新信息格的起点 */
  anchorTest?: RegExp
}

/**
 * 内置常见游戏成员字段的提取规则。
 * 「信息格」指截图中的成员卡片：一个格子 = 一条完整的成员数据（一行），
 * 布局特征（ID 在最上方、战力带「战」前缀等）在此统一描述。
 */
const FIELD_RULES: FieldRule[] = [
  {
    match: /玩家ID|^ID$|编号|成员/,
    promptRule: '信息格最上方的 ID 信息，保持原样输出（如 115-空白）',
    patterns: [/(\d+(?:\s*-\s*\S+)?)/],
    anchorTest: /^\d/,
  },
  {
    match: /战力/,
    key: 'power',
    promptRule: '信息格中间的战力数据，去除数字前面的「战」字，只保留数字',
    patterns: [/战\s*([0-9][0-9.,]*)/],
    clean: (s) => s.replace(/[^0-9.]/g, ''),
  },
  {
    match: /参战/,
    promptRule: '信息格中「参战次数」后面的数字',
    patterns: [/参战次数\D*(\d+)/],
  },
  {
    match: /上线天数|登录天数/,
    promptRule: '信息格中「上线天数」后面的数字',
    patterns: [/上线天数\D*(\d+)/],
  },
  {
    match: /胜率/,
    promptRule: '信息格中「胜率」后面的百分比数字，只保留数字，不保留百分号',
    patterns: [/胜率\D*([\d.]+)/],
  },
  {
    match: /备注/,
    promptRule: '信息格中备注相关的文字内容，没有则填空字符串',
    patterns: [/备注\D{0,3}(\S+)/],
  },
]

/** 获取列名对应的提取规则，未命中内置规则时返回通用规则 */
function getRuleForLabel(label: string): FieldRule {
  const hit = FIELD_RULES.find(r => r.match.test(label))
  if (hit) return hit
  return {
    match: /.*/,
    promptRule: `信息格中与「${label}」相关的数据，找不到则填空字符串`,
  }
}

/** 构建信息格布局的结构化提取 prompt */
function buildPrompt(labels: string[]): string {
  const rules = labels.map(label => `- ${label}：${getRuleForLabel(label).promptRule}`)
  return [
    '你是游戏成员信息截图识别助手。',
    '',
    '图片结构说明：图片由若干个信息格组成，单个信息格表示一条完整的成员数据，一个信息格对应输出表格中的一行。',
    '',
    '请逐个信息格提取以下字段（字段名按此顺序）：',
    ...rules,
    '',
    '要求：',
    '1. 每个信息格输出一个 JSON 对象，键必须严格使用上述字段名',
    '2. 严格遵守每个字段的提取规则（如战力需去除「战」字只保留数字）',
    '3. ID 与战力在截图中紧密相连时也必须拆分为独立字段（如 116-爱你如子战6742538 → ID 为 116-爱你如子、战力为 6742538）',
    '4. 数值保持截图中的原始数字，不要换算单位、不要添加百分号或千分位逗号',
    '5. 玩家名称/ID 保持截图原样，不要翻译或转拼音',
    '6. 信息格中提取不到的字段填空字符串 ""',
    '7. 不要遗漏任何信息格；只输出一个 JSON 数组，不要输出任何解释文字或 markdown 标记',
    '',
    `输出格式示例：\n[${labels.map(l => `"${l}":""`).join(', ')}]`,
  ].join('\n')
}

/* ===================== 结果解析 ===================== */

/** 从模型返回文本中健壮地提取 JSON 数组 */
function extractJSON(raw: string): Record<string, string>[] {
  let text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('模型未返回有效的表格数据')
  }
  const parsed = JSON.parse(text.slice(start, end + 1))
  if (!Array.isArray(parsed) || parsed.some(r => typeof r !== 'object' || r === null)) {
    throw new Error('模型返回的数据格式不正确')
  }
  return parsed.map((r: any) => {
    const row: Record<string, string> = {}
    for (const [k, v] of Object.entries(r)) {
      row[k] = v == null ? '' : String(v)
    }
    return row
  })
}

/** 解析 HTML 表格（GLM-OCR 的表格 content 为 HTML 代码） */
function parseHTMLTable(html: string): Record<string, string>[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const table = doc.querySelector('table')
  if (!table) return []

  const headerCells = Array.from(table.querySelectorAll('thead th, thead td'))
  const headers = headerCells.map(c => c.textContent?.trim() || '')
  let bodyRows: Element[] = Array.from(table.querySelectorAll('tbody tr'))

  // 无 thead 时以第一行 tr 作为表头
  if (!headerCells.length) {
    const allTrs = Array.from(table.querySelectorAll('tr'))
    if (allTrs.length < 2) return []
    const first = allTrs[0].querySelectorAll('th, td')
    if (!first.length) return []
    headers.splice(0, headers.length, ...Array.from(first).map(c => c.textContent?.trim() || ''))
    bodyRows = allTrs.slice(1)
  }
  if (!headers.length) return []

  return bodyRows.map(tr => {
    const cells = Array.from(tr.querySelectorAll('th, td'))
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = cells[i]?.textContent?.trim() || '' })
    return row
  }).filter(r => Object.values(r).some(v => v !== ''))
}

/** 解析 markdown 表格（| a | b | 格式，含分隔行） */
function parseMarkdownTable(md: string): Record<string, string>[] {
  const lines = md.split('\n').map(l => l.trim()).filter(l => l.startsWith('|'))
  if (lines.length < 2) return []
  const split = (l: string) => l.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())
  const headers = split(lines[0])
  if (!headers.length) return []
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    if (/^[\s|:-]+$/.test(lines[i])) continue
    const cells = split(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, j) => { row[h] = cells[j] ?? '' })
    if (Object.values(row).some(v => v !== '')) rows.push(row)
  }
  return rows
}

/**
 * 从行文本中剥离粘连的战力（「战」+数字）：
 * GLM-OCR 常将 ID 与战力连在一起输出（如 116-爱你如子战6742538）。
 * 从右取最后一个「战+数字(≥4位)」匹配，兼容 ID 名字本身含「战」字的情况：
 * - 117-战神战6742538 → ID=117-战神、战力=6742538（「战神」的战后是非数字，不会误切）
 * - 118-战3战54321 → ID=118-战3、战力=54321（「战3」数字不足 4 位视为名字一部分）
 * - 119-小战3（无战力粘连）→ 不剥离
 */
function splitPowerFromLine(line: string): { rest: string; power: string } {
  const re = /战\s*([0-9][0-9.,]{3,})/g
  let last: RegExpExecArray | null = null
  let m: RegExpExecArray | null
  while ((m = re.exec(line)) !== null) last = m
  if (!last) return { rest: line, power: '' }
  // 挖掉战力段，保留其前后的文本（同行可能还有参战次数等字段）
  const rest = (line.slice(0, last.index) + ' ' + line.slice(last.index + last[0].length)).trim()
  return { rest, power: last[1] }
}

/**
 * 从 GLM-OCR 的 markdown 文本中解析「信息格」布局：
 * 以锚点行（ID 行首特征）为界切块，每个块 = 一个信息格 = 一行数据，
 * 块内按字段规则正则提取。兼容信息格在 md 中为多行或单行两种形态，
 * 并预处理剥离与 ID 粘连的战力（如 116-爱你如子战6742538）。
 */
function parseInfoCards(md: string, labels: string[]): Record<string, string>[] {
  const rules = labels.map(label => ({ label, rule: getRuleForLabel(label) }))
  const anchor = rules.find(r => r.rule.anchorTest)

  const rawLines = md.split('\n').map(l => l.trim())
    .filter(l => l !== '' && !l.startsWith('![') && !/^[-=*_]{3,}$/.test(l))
  if (!rawLines.length) return []

  // 无锚点字段时切块不可靠，放弃本地解析
  if (!anchor) return []

  // 预处理：剥离粘连战力，rest 为剩余文本（ID 等字段所在）
  const parts = rawLines.map(line => splitPowerFromLine(line))

  // 以锚点行（ID 行首特征，按剥离后文本判定）为界切分信息格
  const blocks: { rest: string; power: string }[][] = []
  let current: { rest: string; power: string }[] = []
  for (const part of parts) {
    const isAnchorLine = part.rest !== '' && !!anchor.rule.anchorTest?.test(part.rest)
    if (isAnchorLine && current.length > 0) {
      blocks.push(current)
      current = []
    }
    current.push(part)
  }
  if (current.length) blocks.push(current)

  const rows: Record<string, string>[] = []
  for (const block of blocks) {
    // 块文本只拼接剥离后的部分，避免战力数字干扰 ID 等字段提取
    const text = block.map(p => p.rest).filter(r => r !== '').join('\n')
    // 战力优先取剥离值（块内第一个非空）
    const strippedPower = block.map(p => p.power).find(p => p !== '') || ''
    const row: Record<string, string> = {}
    let hit = 0
    for (const { label, rule } of rules) {
      let value = ''
      if (rule.key === 'power' && strippedPower) {
        value = strippedPower
      } else {
        for (const p of rule.patterns ?? []) {
          const m = text.match(p)
          if (m) {
            value = m[1] ?? m[0]
            break
          }
        }
      }
      if (rule.clean) value = rule.clean(value)
      row[label] = value.trim()
      if (row[label]) hit++
    }
    // 至少命中两个字段才算有效行，过滤噪声块
    if (hit >= 2 || (hit >= 1 && labels.length === 1)) rows.push(row)
  }
  return rows
}

/* ===================== API 调用 ===================== */

interface LayoutParsingResponse {
  md_results?: string
  layout_details?: Array<Array<{
    label?: string
    content?: string
  }>>
}

/** 从 axios 错误中提取对用户友好的信息 */
export function extractVLMError(e: unknown): string {
  const err = e as any
  return err?.response?.data?.error?.message
    || err?.response?.data?.msg
    || err?.message
    || '请求失败'
}

/**
 * GLM-OCR：调用文档解析接口。
 * 依次尝试：结构化表格 → markdown 表格 → 信息格布局解析。
 * 注意：GLM-OCR 不接受指令 prompt，信息格/表格字段仍需字段映射对齐。
 */
async function glmOcrExtract(
  imageData: string,
  labels: string[],
  config: VLMConfig
): Promise<{ rows: Record<string, string>[]; text: string; confidence: number }> {
  const url = `${config.apiUrl.replace(/\/+$/, '')}/layout_parsing`
  const res = await axios.post<LayoutParsingResponse>(
    url,
    { model: GLM_OCR_MODEL, file: imageData },
    {
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      timeout: 60000,
    }
  )

  const md = res.data.md_results || ''

  // 1. 截图本身是表格：优先用结构化表格元素
  const tables: string[] = []
  for (const page of res.data.layout_details || []) {
    for (const el of page) {
      if (el.label === 'table' && el.content) tables.push(el.content)
    }
  }
  let rows = tables.flatMap(parseHTMLTable)
  // 2. markdown 表格
  if (rows.length === 0) rows = parseMarkdownTable(md)
  // 3. 信息格布局：以 ID 行为锚点切块，块内按字段规则提取
  if (rows.length === 0) rows = parseInfoCards(md, labels)
  if (rows.length === 0) throw new Error('未从截图中识别到表格或信息格数据')
  return { rows, text: md || JSON.stringify(rows, null, 2), confidence: 95 }
}

/**
 * 调用视觉大模型提取表格数据：
 * - glm-ocr → 文档解析接口（表格/信息格解析，输出截图原字段，需字段映射）
 * - 其他（glm-4.6v-flash 等）→ OpenAI 兼容 chat/completions，按信息格规则直接结构化输出
 */
export async function vlmExtract(
  imageData: string,
  labels: string[],
  config: VLMConfig
): Promise<{ rows: Record<string, string>[]; text: string; confidence: number }> {
  if (isGLMOcr(config.model)) {
    return glmOcrExtract(imageData, labels, config)
  }
  return chatExtract(imageData, labels, config)
}

async function chatExtract(
  imageData: string,
  labels: string[],
  config: VLMConfig
): Promise<{ rows: Record<string, string>[]; text: string; confidence: number }> {
  const url = `${config.apiUrl.replace(/\/+$/, '')}/chat/completions`
  const res = await axios.post(
    url,
    {
      model: config.model,
      temperature: 0.1,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: buildPrompt(labels) },
          { type: 'image_url', image_url: { url: imageData } },
        ],
      }],
    },
    {
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      timeout: 60000,
    }
  )
  const content = res.data.choices?.[0]?.message?.content
  if (!content) throw new Error('视觉模型返回为空')
  const rows = extractJSON(content)
  return {
    rows,
    text: JSON.stringify(rows, null, 2),
    confidence: 95,
  }
}
