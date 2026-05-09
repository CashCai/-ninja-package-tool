import axios from 'axios'

const GIST_API = 'https://api.github.com/gists'

interface GistFile {
  filename: string
  content: string
}

export async function uploadToGist(token: string, files: GistFile[], description: string): Promise<string> {
  const res = await axios.post(
    GIST_API,
    { description, public: true, files: files.reduce((acc, f) => ({ ...acc, [f.filename]: { content: f.content } }), {}) },
    { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
  )
  return res.data.html_url
}

export async function listUserGists(token: string): Promise<any[]> {
  const res = await axios.get(GIST_API, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
    params: { per_page: 50 }
  })
  return res.data
}

export async function getGistContent(gist: any): Promise<{ filename: string; content: string } | null> {
  const files = gist.files
  if (!files) return null
  const keys = Object.keys(files)
  if (keys.length === 0) return null
  const firstFile = files[keys[0]]
  if (firstFile.truncated && firstFile.raw_url) {
    const res = await axios.get(firstFile.raw_url)
    return { filename: keys[0], content: typeof res.data === 'string' ? res.data : JSON.stringify(res.data) }
  }
  return { filename: keys[0], content: firstFile.content }
}
