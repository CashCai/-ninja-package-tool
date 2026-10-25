import { recognizeImage } from './tesseract'
import { baiduOCR } from './baiduOcr'
import { vlmExtract, extractVLMError, type VLMConfig } from './vlmOCR'

export interface OCRManagerOptions {
  onProgress?: (p: number) => void
  baiduApiKey?: string
  baiduSecretKey?: string
  preferBaidu?: boolean
  /** 视觉大模型配置，已配置时优先使用（结构化提取，按模板列直接产出） */
  vlmConfig?: VLMConfig | null
  /** 模板中可录入的列名（base 列），供大模型按列提取 */
  templateLabels?: string[]
}

export interface OCRResult {
  text: string
  confidence: number
  source: 'vlm' | 'tesseract' | 'baidu'
  /** 大模型模式直接返回按列名结构化的行数据 */
  parsedRows?: Record<string, any>[]
  /** 视觉大模型识别失败、降级到本地/云端引擎时的原因（供 UI 提示） */
  fallbackReason?: string
}

export async function runOCR(
  imageData: string,
  options: OCRManagerOptions = {}
): Promise<OCRResult> {
  const { onProgress, baiduApiKey, baiduSecretKey, preferBaidu, vlmConfig, templateLabels } = options
  let fallbackReason: string | undefined

  // 1. 视觉大模型优先：识别率远超本地 OCR，且直接按模板列结构化输出
  if (vlmConfig && templateLabels && templateLabels.length > 0) {
    try {
      onProgress?.(0.3)
      const result = await vlmExtract(imageData, templateLabels, vlmConfig)
      onProgress?.(1)
      return {
        text: result.text,
        confidence: result.confidence,
        source: 'vlm',
        parsedRows: result.rows,
      }
    } catch (e) {
      fallbackReason = extractVLMError(e)
      console.warn('VLM OCR failed, falling back to local OCR:', e)
      onProgress?.(0)
    }
  }

  if (preferBaidu && baiduApiKey && baiduSecretKey) {
    try {
      const result = await baiduOCR(imageData, baiduApiKey, baiduSecretKey)
      return { ...result, source: 'baidu', fallbackReason }
    } catch (e) {
      console.warn('Baidu OCR failed, falling back to Tesseract:', e)
    }
  }

  const result = await recognizeImage(imageData, onProgress)
  if (result.confidence < 70 && baiduApiKey && baiduSecretKey) {
    try {
      const baiduResult = await baiduOCR(imageData, baiduApiKey, baiduSecretKey)
      return { ...baiduResult, source: 'baidu', fallbackReason }
    } catch {
      // fallback to tesseract result
    }
  }
  return { ...result, source: 'tesseract', fallbackReason }
}

export function parseOCRText(text: string): Record<string, any>[] {
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length === 0) return []

  const rows: Record<string, any>[] = []
  const headerLine = lines[0]
  const headers = headerLine.split(/[\t,，\s]+/).filter(h => h.trim())

  if (headers.length < 2) {
    return lines.map(line => ({ 识别文本: line.trim() }))
  }

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(/[\t,，\s]+/).filter(c => c.trim())
    const row: Record<string, any> = {}
    headers.forEach((h, idx) => {
      row[h.trim()] = cells[idx]?.trim() || ''
    })
    if (Object.values(row).some(v => v !== '')) {
      rows.push(row)
    }
  }
  return rows
}
