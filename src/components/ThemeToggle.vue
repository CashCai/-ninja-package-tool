<template>
  <button
    class="theme-toggle"
    :title="isDark ? '切换到日间模式' : '切换到夜间模式'"
    :aria-label="isDark ? '切换到日间模式' : '切换到夜间模式'"
    @click="toggleTheme"
  >
    <!-- 日间：太阳 -->
    <svg v-if="isDark" class="w-4 h-4" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3.2" stroke="currentColor" stroke-width="1.4" />
      <path
        d="M8 1.2v1.8M8 13v1.8M1.2 8H3M13 8h1.8M3.2 3.2l1.3 1.3M11.5 11.5l1.3 1.3M12.8 3.2l-1.3 1.3M4.5 11.5l-1.3 1.3"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linecap="round"
      />
    </svg>
    <!-- 夜间：月亮 -->
    <svg v-else class="w-4 h-4" viewBox="0 0 16 16" fill="none">
      <path
        d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8z"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linejoin="round"
      />
    </svg>
  </button>
</template>

<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'

const { isDark, toggleTheme } = useTheme()
</script>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 4px;
  background: transparent;
  border: 1px solid var(--nz-line);
  color: var(--nz-gold);
  cursor: pointer;
  transition: background-color 0.25s ease, filter 0.25s ease;
  flex-shrink: 0;
}

.theme-toggle:hover {
  background: var(--nz-cell-hover);
}

.theme-toggle:active {
  transform: scale(0.94);
}
</style>
