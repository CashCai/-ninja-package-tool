import { computed, ref } from 'vue'

export type Theme = 'dark' | 'light'

const THEME_KEY = 'nz-theme'
const META_COLORS: Record<Theme, string> = {
  dark: '#0b0912',
  light: '#f7f4ec',
}

function loadTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', META_COLORS[theme])
}

const theme = ref<Theme>(loadTheme())

/** 主题状态与切换（跨组件共享同一份响应式状态） */
export function useTheme() {
  const isDark = computed(() => theme.value === 'dark')

  function setTheme(t: Theme) {
    theme.value = t
    try {
      localStorage.setItem(THEME_KEY, t)
    } catch {
      /* 忽略存储异常（如隐私模式） */
    }
    applyTheme(t)
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return { theme, isDark, setTheme, toggleTheme }
}

/** 应用启动时调用，避免主题闪烁 */
export function initTheme() {
  applyTheme(theme.value)
}
