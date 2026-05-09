import Tesseract from 'tesseract.js'

export interface OCRResult {
  text: string
  confidence: number
}

export async function recognizeImage(imageData: string, onProgress?: (p: number) => void): Promise<OCRResult> {
  const result = await Tesseract.recognize(imageData, 'chi_sim+eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && m.progress !== undefined && onProgress) {
        onProgress(m.progress)
      }
    }
  })
  return {
    text: result.data.text,
    confidence: result.data.confidence,
  }
}
