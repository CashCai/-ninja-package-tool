import LZString from 'lz-string'

export function compress(data: unknown): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(data))
}

export function decompress<T>(str: string): T | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(str)
    if (!json) return null
    return JSON.parse(json) as T
  } catch {
    return null
  }
}
