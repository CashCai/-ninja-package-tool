import QRCode from 'qrcode'

export async function generateQRCode(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    width: 256,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  })
}

export function parseQRData(data: string): any {
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}
