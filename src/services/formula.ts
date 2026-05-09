import { Parser } from 'expr-eval'

const parser = new Parser({
  operators: {
    conditional: true,
    comparison: true,
    concatenate: false,
    logical: true,
    power: true,
    multiplication: true,
    division: true,
    assignment: false,
    factorial: false,
  }
}) as any

parser.functions.floor = Math.floor
parser.functions.ceil = Math.ceil
parser.functions.round = Math.round
parser.functions.max = Math.max
parser.functions.min = Math.min
parser.functions.abs = Math.abs
parser.functions.if = function (cond: number, tVal: number, fVal: number) {
  return cond ? tVal : fVal
}

export function evaluateFormula(expression: string, variables: Record<string, number>): number {
  try {
    const expr = parser.parse(expression)
    const result = expr.evaluate(variables)
    return Math.round((result as number) * 100) / 100
  } catch (e) {
    console.error('Formula evaluation error:', e)
    return 0
  }
}

function translateError(raw: string): string {
  if (!raw) return '公式语法错误'
  // expr-eval errors look like: "parse error [1:65]: Expected EOF"
  if (raw.includes('Expected EOF')) return '公式末尾有多余字符，请检查括号是否配对'
  if (raw.includes('Expected')) {
    const m = raw.match(/Expected\s+(.+)$/)
    if (m) return `此处缺少: ${m[1].replace(/"/g, '')}`
  }
  if (raw.includes('Unexpected')) {
    const m = raw.match(/Unexpected\s+(.+)$/)
    if (m) return `此处不应出现: ${m[1].replace(/"/g, '')}`
  }
  if (raw.includes('Unknown identifier')) {
    const m = raw.match(/Unknown identifier\s*['"]?(\w+)['"]?/)
    if (m) return `无法识别的列名或函数: "${m[1]}"`
  }
  if (raw.includes('Division by zero')) return '除数为零'
  // Strip "parse error [line:col]: " prefix
  return raw.replace(/^parse error\s*\[[\d:]+\]:\s*/, '语法错误: ')
}

export function validateFormula(expression: string): { valid: boolean; error?: string } {
  if (!expression.trim()) return { valid: false, error: '公式不能为空' }
  try {
    parser.parse(expression)
    return { valid: true }
  } catch (e: any) {
    return { valid: false, error: translateError(e.message || '') }
  }
}

/** 将表达式中的列中文标签替换为英文 key */
export function expressionToEnglish(expr: string, columns: { key: string; label: string }[]): string {
  const sorted = [...columns].sort((a, b) => b.label.length - a.label.length)
  let result = expr
  for (const col of sorted) {
    result = result.split(col.label).join(col.key)
  }
  return result
}

/** 将表达式中的列英文 key 替换为中文标签 */
export function expressionToChinese(expr: string, columns: { key: string; label: string }[]): string {
  const sorted = [...columns].sort((a, b) => b.key.length - a.key.length)
  let result = expr
  for (const col of sorted) {
    result = result.split(col.key).join(col.label)
  }
  return result
}

export function extractDependencies(expression: string): string[] {
  const deps = new Set<string>()
  const tokenPattern = /[a-zA-Z_]\w*/g
  let match
  while ((match = tokenPattern.exec(expression)) !== null) {
    const token = match[0]
    if (!/^(floor|ceil|round|max|min|abs|if|true|false|and|or|not)$/i.test(token)) {
      deps.add(token)
    }
  }
  return Array.from(deps)
}
