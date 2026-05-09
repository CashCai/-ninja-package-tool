import axios from 'axios'

interface BaiduTokenResponse {
  access_token: string
  error?: string
}

interface BaiduOCRResponse {
  words_result: Array<{ words: string }>
  error_msg?: string
}

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(apiKey: string, secretKey: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token
  }
  const res = await axios.post<BaiduTokenResponse>(
    'https://aip.baidubce.com/oauth/2.0/token',
    null,
    { params: { grant_type: 'client_credentials', client_id: apiKey, client_secret: secretKey } }
  )
  if (res.data.error) throw new Error(res.data.error)
  cachedToken = {
    token: res.data.access_token,
    expiresAt: Date.now() + 25 * 24 * 60 * 60 * 1000,
  }
  return res.data.access_token
}

export async function baiduOCR(
  imageBase64: string,
  apiKey: string,
  secretKey: string
): Promise<{ text: string; confidence: number }> {
  const token = await getAccessToken(apiKey, secretKey)
  const base64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64

  const res = await axios.post<BaiduOCRResponse>(
    `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic`,
    { image: base64 },
    { params: { access_token: token }, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )
  if (res.data.error_msg) throw new Error(res.data.error_msg)
  const text = res.data.words_result.map(w => w.words).join('\n')
  return { text, confidence: 90 }
}
