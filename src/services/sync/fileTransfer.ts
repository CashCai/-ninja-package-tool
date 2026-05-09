import CryptoJS from 'crypto-js'
import LZString from 'lz-string'

const DEFAULT_PASSWORD = 'ninja123'

export function encryptData(data: unknown, password = DEFAULT_PASSWORD): string {
  const json = JSON.stringify(data)
  const compressed = LZString.compressToBase64(json)
  return CryptoJS.AES.encrypt(compressed, password).toString()
}

export function decryptData(encrypted: string, password = DEFAULT_PASSWORD): unknown | null {
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, password)
    const compressed = bytes.toString(CryptoJS.enc.Utf8)
    if (!compressed) return null
    const json = LZString.decompressFromBase64(compressed)
    if (!json) return null
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function exportToFile(data: unknown, filename: string): void {
  const encrypted = encryptData(data)
  const blob = new Blob([encrypted], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.ninja`
  a.click()
  URL.revokeObjectURL(url)
}

export function importFromFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = decryptData(reader.result as string)
      if (result) resolve(result)
      else reject(new Error('解密失败，文件格式不正确或密码错误'))
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}
