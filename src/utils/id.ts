export function nanoid(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const arr = new Uint8Array(length)
  crypto.getRandomValues(arr)
  for (let i = 0; i < length; i++) {
    result += chars[arr[i] % chars.length]
  }
  return result
}
