import { recognizeImage } from './tesseract'
import { baiduOCR } from './baiduOcr'

export interface OCRManagerOptions {
  onProgress?: (p: number) => void
  baiduApiKey?: string
  baiduSecretKey?: string
  preferBaidu?: boolean
}

export async function runOCR(
  imageData: string,
  options: OCRManagerOptions = {}
): Promise<{ text: string; confidence: number; source: 'tesseract' | 'baidu' }> {
  const { onProgress, baiduApiKey, baiduSecretKey, preferBaidu } = options

  if (preferBaidu && baiduApiKey && baiduSecretKey) {
    try {
      const result = await baiduOCR(imageData, baiduApiKey, baiduSecretKey)
      return { ...result, source: 'baidu' }
    } catch (e) {
      console.warn('Baidu OCR failed, falling back to Tesseract:', e)
    }
  }

  const result = await recognizeImage(imageData, onProgress)
  if (result.confidence < 70 && baiduApiKey && baiduSecretKey) {
    try {
      const baiduResult = await baiduOCR(imageData, baiduApiKey, baiduSecretKey)
      return { ...baiduResult, source: 'baidu' }
    } catch {
      // fallback to tesseract result
    }
  }
  return { ...result, source: 'tesseract' }
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
