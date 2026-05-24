<template>
  <div>
    <nav v-if="showShell" class="navbar navbar-expand fixed-top bg-body border-bottom shadow-sm">
      <div class="container-fluid px-4">
        <router-link class="navbar-brand fw-semibold d-flex align-items-center gap-2" to="/dashboard">
          <i class="bi bi-ui-checks-grid" aria-hidden="true"></i>
          <span>HongsForm</span>
        </router-link>
        <div class="navbar-nav flex-row align-items-center gap-3">
          <router-link class="nav-link" to="/dashboard">首页</router-link>
          <router-link class="nav-link" to="/forms">表单</router-link>
          <router-link class="nav-link" to="/api-keys">API Key</router-link>
          <button class="btn btn-outline-secondary btn-sm" type="button" title="主题设置" @click="openThemeModal">
            <i :class="themeIcon" aria-hidden="true"></i>
            <span class="visually-hidden">主题设置</span>
          </button>
          <button class="btn btn-outline-secondary btn-sm" type="button" @click="logout">退出</button>
        </div>
      </div>
    </nav>
    <div :class="{ 'app-main': showShell }">
      <router-view />
      <footer v-if="showShell" class="py-4 text-center small text-secondary">
        <a class="text-secondary text-decoration-none" href="https://github.com/ihongs/" target="_blank" rel="noopener noreferrer">&copy;Hongs 2026</a>
      </footer>
    </div>

    <div v-if="showThemeModal" class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="themeModalTitle">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="themeModalTitle" class="modal-title h5">主题设置</h2>
            <button class="btn-close" type="button" aria-label="关闭" @click="closeThemeModal"></button>
          </div>
          <div class="modal-body">
            <div class="list-group mb-4">
              <label v-for="option in themeOptions" :key="option.value" class="list-group-item d-flex gap-3 align-items-start">
                <input v-model="themeMode" class="form-check-input mt-1" type="radio" name="themeMode" :value="option.value" @change="saveThemeSettings" />
                <span>
                  <span class="d-flex align-items-center gap-2 fw-medium">
                    <i :class="option.icon" aria-hidden="true"></i>
                    {{ option.label }}
                  </span>
                  <span class="d-block small text-secondary">{{ option.description }}</span>
                </span>
              </label>
            </div>

            <fieldset :disabled="themeMode !== '3'" class="border rounded-3 p-3">
              <legend class="float-none w-auto px-2 fs-6 mb-0">定时深色模式</legend>
              <div class="row g-3 mt-1">
                <div class="col-6">
                  <label class="form-label">开始</label>
                  <input v-model="scheduleStart" class="form-control" type="time" step="600" @change="saveThemeSettings" />
                </div>
                <div class="col-6">
                  <label class="form-label">结束</label>
                  <input v-model="scheduleEnd" class="form-control" type="time" step="600" @change="saveThemeSettings" />
                </div>
              </div>
              <div class="form-text">默认 18:00 到 06:00，开始时间晚于结束时间时按跨天处理。</div>
            </fieldset>
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary" type="button" @click="closeThemeModal">完成</button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showThemeModal" class="modal-backdrop fade show" @click="closeThemeModal"></div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { clearSession } from './api'

const THEME_KEY = 'hongs_theme'
const DEFAULT_DARK_TIME = '18000600'
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
const route = useRoute()
const router = useRouter()
const showShell = computed(() => route.path !== '/login')
const showThemeModal = ref(false)
const themeValue = localStorage.getItem(THEME_KEY) || '0'
const themeMode = ref(themeValue.startsWith('3:') ? '3' : themeValue)
const scheduleStart = ref(formatTimeInput(themeValue.startsWith('3:') ? themeValue.slice(2, 6) : DEFAULT_DARK_TIME.slice(0, 4)))
const scheduleEnd = ref(formatTimeInput(themeValue.startsWith('3:') ? themeValue.slice(6, 10) : DEFAULT_DARK_TIME.slice(4, 8)))
let themeTimer = null

const themeOptions = [
  { value: '' , label: '自动', icon: 'bi bi-circle-half'  , description: '跟随系统颜色设置' },
  { value: '1', label: '浅色', icon: 'bi bi-sun'          , description: '始终使用浅色模式' },
  { value: '2', label: '深色', icon: 'bi bi-moon-stars'   , description: '始终使用深色模式' },
  { value: '3', label: '定时', icon: 'bi bi-clock-history', description: '按时间段自动开启深色模式' }
]

const themeIcon = computed(() => {
  if (themeMode.value === '1') return 'bi bi-sun'
  if (themeMode.value === '2') return 'bi bi-moon-stars'
  if (themeMode.value === '3') return 'bi bi-clock-history'
  return 'bi bi-circle-half'
})

function currentTimeCode() {
  const now = new Date()
  return now.getHours() * 100 + now.getMinutes()
}

function compactTime(value) {
  return value.replace(':', '')
}

function formatTimeInput(value) {
  return `${value.slice(0, 2)}:${value.slice(2, 4)}`
}

function isScheduledDark() {
  const start = Number(compactTime(scheduleStart.value))
  const end = Number(compactTime(scheduleEnd.value))
  const current = currentTimeCode()
  return start > end ? current >= start || current < end : current >= start && current < end
}

function applyTheme() {
  if (themeMode.value === '1') {
    document.documentElement.setAttribute('data-bs-theme', 'light')
  } else if (themeMode.value === '2') {
    document.documentElement.setAttribute('data-bs-theme', 'dark' )
  } else if (themeMode.value === '3') {
    document.documentElement.setAttribute('data-bs-theme', isScheduledDark( ) ? 'dark' : 'light')
  } else {
    document.documentElement.setAttribute('data-bs-theme', mediaQuery.matches ? 'dark' : 'light')
  }
}

function saveThemeSettings() {
  const value = themeMode.value === '3' ? `3:${compactTime(scheduleStart.value)}${compactTime(scheduleEnd.value)}` : themeMode.value
  localStorage.setItem(THEME_KEY, value)
  applyTheme()
}

function openThemeModal() {
  showThemeModal.value = true
}

function closeThemeModal() {
  showThemeModal.value = false
}

function handleSystemThemeChange() {
  if (!['1', '2', '3'].includes(themeMode.value)) applyTheme()
}

onMounted(() => {
  applyTheme()
  themeTimer = window.setInterval(applyTheme, 60000)
  mediaQuery.addEventListener('change', handleSystemThemeChange)
})

onBeforeUnmount(() => {
  if (themeTimer) window.clearInterval(themeTimer)
  mediaQuery.removeEventListener('change', handleSystemThemeChange)
})

function logout() {
  clearSession()
  router.push('/login')
}
</script>
