<template>
  <div>
    <nav v-if="showShell" class="navbar navbar-expand fixed-top bg-body border-bottom shadow-sm">
      <div class="container-fluid px-4">
        <router-link class="navbar-brand fw-semibold d-flex align-items-center gap-2" to="/dashboard">
          <i class="bi bi-ui-checks-grid" aria-hidden="true"></i>
          <span>HongsForm</span>
        </router-link>
        <div class="navbar-nav flex-row align-items-center gap-3 w-full justify-content-between">
          <div class="d-flex flex-row align-items-center gap-3">
            <router-link class="nav-link" to="/dashboard">首页</router-link>
            <router-link class="nav-link" to="/forms">表单管理</router-link>
            <router-link class="nav-link" to="/users">用户管理</router-link>
          </div>
          
          <!-- 用户头像与下拉菜单 -->
          <div 
            class="dropdown"
            :class="{ 'show': showDropdown }"
          >
            <button 
              class="btn p-0 dropdown-toggle d-flex align-items-center gap-2" 
              type="button" 
              @click="toggleDropdown"
              aria-expanded="showDropdown"
              data-bs-toggle="dropdown"
            >
              <img 
                :src="userAvatar" 
                alt="用户头像"
                class="rounded-square avatar-img"
              />
              <span class="user-name-truncate">{{ userName }}</span>
            </button>
            <Transition name="dropdown">
              <div 
                v-show="showDropdown" 
                class="dropdown-menu dropdown-menu-end"
                :class="{ 'show': showDropdown }"
              >
                <button class="dropdown-item" type="button" @click.stop="openThemeModal(); showDropdown = false;">
                  <i class="bi bi-circle-half me-2"></i>主题颜色
                </button>
                <button class="dropdown-item" type="button" @click.stop="showDropdown = false;">
                  <i class="bi bi-person me-2"></i>我的账号
                </button>
                <router-link class="dropdown-item" to="/api-keys" @click.native="showDropdown = false">
                  <i class="bi bi-key me-2"></i>API Key
                </router-link>
                <hr class="dropdown-divider">
                <button class="dropdown-item text-danger" @click="logout">
                  <i class="bi bi-box-arrow-right me-2"></i>退出登录
                </button>
              </div>
            </Transition>
          </div>
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
import { clearSession, getUser } from './api'

const THEME_KEY = 'hongs_theme'
const DEFAULT_DARK_TIME = '18000600'
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
const route = useRoute()
const router = useRouter()
const showShell = computed(() => route.path !== '/login')
const showThemeModal = ref(false)
const showDropdown = ref(false)
const themeValue = localStorage.getItem(THEME_KEY) || '0'
const themeMode = ref(themeValue.startsWith('3:') ? '3' : themeValue)
const scheduleStart = ref(formatTimeInput(themeValue.startsWith('3:') ? themeValue.slice(2, 6) : DEFAULT_DARK_TIME.slice(0, 4)))
const scheduleEnd = ref(formatTimeInput(themeValue.startsWith('3:') ? themeValue.slice(6, 10) : DEFAULT_DARK_TIME.slice(4, 8)))
let themeTimer = null

const user = computed(() => getUser())
const userAvatar = computed(() => {
  return user.value?.avatar || '/static/assets/images/user.jpg'
})
const userName = computed(() => {
  return user.value?.nickname || user.value?.name || user.value?.email || '用户'
})

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
    document.documentElement.setAttribute('data-bs-theme', 'dark')
  } else if (themeMode.value === '3') {
    document.documentElement.setAttribute('data-bs-theme', isScheduledDark() ? 'dark' : 'light')
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

function toggleDropdown() {
  showDropdown.value = !showDropdown.value
}

function handleClickOutside(event) {
  const dropdown = document.querySelector('.dropdown')
  if (dropdown && !dropdown.contains(event.target)) {
    showDropdown.value = false
  }
}

function handleSystemThemeChange() {
  if (!['1', '2', '3'].includes(themeMode.value)) applyTheme()
}

onMounted(() => {
  applyTheme()
  themeTimer = window.setInterval(applyTheme, 60000)
  mediaQuery.addEventListener('change', handleSystemThemeChange)
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  if (themeTimer) window.clearInterval(themeTimer)
  mediaQuery.removeEventListener('change', handleSystemThemeChange)
  document.removeEventListener('click', handleClickOutside)
})

function logout() {
  clearSession()
  router.push('/login')
}
</script>

<style scoped>
.dropdown-toggle-none::after {
  display: none;
}

.avatar-img {
  width: 32px;
  height: 32px;
  object-fit: cover;
}

.rounded-square {
  border-radius: 8px;
}

.dropdown {
  width: 160px;
}

.dropdown-menu {
  min-width: 160px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-name-truncate {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>