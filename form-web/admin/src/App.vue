<template>
  <div>
    <div v-if="showShell" class="admin-shell" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <nav class="admin-topbar">
        <div class="topbar-left">
          <button class="sidebar-toggle btn btn-link" type="button" @click="toggleSidebar">
            <i class="bi bi-list"></i>
          </button>
          <router-link class="navbar-brand fw-semibold d-flex align-items-center gap-2" to="/dashboard">
            <i class="bi bi-ui-checks-grid" aria-hidden="true"></i>
            <span>HongsForm</span>
          </router-link>
          <nav aria-label="breadcrumb" class="topbar-breadcrumb">
            <ol class="breadcrumb mb-0">
              <li class="breadcrumb-item">
                <router-link to="/dashboard">首页</router-link>
              </li>
              <li v-for="item in breadcrumbs" :key="item.path" class="breadcrumb-item">
                <router-link v-if="item.path" :to="item.path">{{ item.name }}</router-link>
                <span v-else>{{ item.name }}</span>
              </li>
            </ol>
          </nav>
        </div>
        <div class="topbar-right">
          <div class="dropdown">
            <button class="btn dropdown-toggle d-flex align-items-center gap-2" type="button" data-bs-toggle="dropdown" aria-expanded="false">
              <img :src="userAvatar" alt="用户头像" class="rounded-square avatar-img" />
              <span class="user-name-truncate">{{ userName }}</span>
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li>
                <button class="dropdown-item" type="button" @click="openThemeModal()">
                  <i class="bi bi-circle-half me-2"></i>主题颜色
                </button>
              </li>
              <li>
                <router-link class="dropdown-item" to="/account">
                  <i class="bi bi-person me-2"></i>我的账号
                </router-link>
              </li>
              <li>
                <router-link class="dropdown-item" to="/api-keys">
                  <i class="bi bi-key me-2"></i>API Key
                </router-link>
              </li>
              <li><hr class="dropdown-divider"></li>
              <li>
                <button class="dropdown-item text-danger" @click="logout">
                  <i class="bi bi-box-arrow-right me-2"></i>退出登录
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <aside class="admin-sidebar">
        <nav class="sidebar-nav">
          <router-link class="nav-item" to="/dashboard">
            <i class="bi bi-speedometer2"></i>
            <span>首页</span>
          </router-link>
          <router-link class="nav-item" to="/forms" :class="{ active: currentRoute.startsWith('/forms') }">
            <i class="bi bi-file-earmark-text"></i>
            <span>表单管理</span>
          </router-link>
          <router-link class="nav-item" to="/users">
            <i class="bi bi-people"></i>
            <span>用户管理</span>
          </router-link>
        </nav>
      </aside>

      <main class="admin-content">
        <div class="content-inner">
          <router-view />
          <footer class="admin-footer">
            <a class="text-secondary text-decoration-none" href="https://github.com/ihongs/" target="_blank" rel="noopener noreferrer">&copy;Hongs 2026</a>
          </footer>
        </div>
      </main>

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
    <div v-else class="login-shell">
      <router-view />
    </div>
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
const currentRoute = computed(() => route.path)
const showThemeModal = ref(false)
const sidebarCollapsed = ref(false)
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

const routeNameMap = {
  '/dashboard': '仪表盘',
  '/forms': '表单管理',
  '/users': '用户管理',
  '/api-keys': 'API Key',
  '/form-record': '表单记录'
}

const breadcrumbs = computed(() => {
  const path = route.path
  const items = []

  if (path.startsWith('/forms/') && path.includes('/record')) {
    items.push({ name: '表单管理', path: '/forms' })
    items.push({ name: '表单记录', path: null })
  } else if (path.startsWith('/forms/')) {
    items.push({ name: '表单管理', path: null })
  } else {
    const name = routeNameMap[path]
    if (name) {
      items.push({ name, path: null })
    }
  }

  return items
})

const themeOptions = [
  { value: '' , label: '自动', icon: 'bi bi-circle-half'  , description: '跟随系统颜色设置' },
  { value: '1', label: '浅色', icon: 'bi bi-sun'          , description: '始终使用浅色模式' },
  { value: '2', label: '深色', icon: 'bi bi-moon-stars'   , description: '始终使用深色模式' },
  { value: '3', label: '定时', icon: 'bi bi-clock-history', description: '按时间段自动开启深色模式' }
]

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

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
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

<style scoped>
.admin-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-width: 960px;
}

.admin-topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  background: var(--bs-body-bg);
  border-bottom: 1px solid var(--bs-border-color);
  z-index: 1000;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sidebar-toggle {
  padding: 0.5rem;
  font-size: 1.25rem;
  color: var(--bs-body-color);
  text-decoration: none;
}

.sidebar-toggle:hover {
  color: var(--bs-primary);
}

.topbar-breadcrumb {
  display: flex;
  align-items: center;
  margin-left: 1rem;
}

.topbar-breadcrumb .breadcrumb {
  margin-bottom: 0;
  font-size: 0.875rem;
}

.topbar-breadcrumb .breadcrumb-item + .breadcrumb-item::before {
  content: "/";
}

.topbar-right {
  display: flex;
  align-items: center;
}

.admin-sidebar {
  position: fixed;
  top: 56px;
  left: 0;
  bottom: 0;
  width: 200px;
  background: var(--bs-body-bg);
  border-right: 1px solid var(--bs-border-color);
  overflow-y: auto;
  transition: width 0.2s ease;
  z-index: 999;
}

.admin-shell.sidebar-collapsed .admin-sidebar {
  width: 56px;
}

.admin-shell.sidebar-collapsed .sidebar-nav .nav-item span {
  display: none;
}

.admin-shell.sidebar-collapsed .sidebar-nav .nav-item {
  justify-content: center;
  padding: 0.875rem;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
}

.sidebar-nav .nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  color: var(--bs-body-color);
  text-decoration: none;
  border-radius: 0.375rem;
  margin-bottom: 0.25rem;
  transition: background-color 0.15s ease;
}

.sidebar-nav .nav-item:hover {
  background-color: var(--bs-tertiary-bg);
}

.sidebar-nav .nav-item.router-link-active,
.sidebar-nav .nav-item.active {
  background-color: var(--bs-primary);
  color: #fff;
}

.sidebar-nav .nav-item i {
  font-size: 1.125rem;
  width: 1.5rem;
  text-align: center;
}

.admin-content {
  margin-top: 56px;
  margin-left: 200px;
  flex: 1;
  overflow-y: auto;
  transition: margin-left 0.2s ease;
}

.admin-shell.sidebar-collapsed .admin-content {
  margin-left: 56px;
}

.content-inner {
  padding: 0 1.5rem;
  min-height: calc(100vh - 56px);
}

.admin-footer {
  padding: 1.5rem 0;
  text-align: center;
}

.login-shell {
  min-height: 100vh;
}

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

.admin-topbar .dropdown-menu {
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
  max-width: 6em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>