<template>
  <div>
    <nav v-if="showShell" class="navbar navbar-expand fixed-top bg-white border-bottom shadow-sm">
      <div class="container-fluid px-4">
        <router-link class="navbar-brand fw-semibold d-flex align-items-center gap-2" to="/dashboard">
          <i class="bi bi-ui-checks-grid" aria-hidden="true"></i>
          <span>HongsForm</span>
        </router-link>
        <div class="navbar-nav flex-row align-items-center gap-3">
          <router-link class="nav-link" to="/dashboard">首页</router-link>
          <router-link class="nav-link" to="/forms">表单管理</router-link>
          <router-link class="nav-link" to="/users">用户管理</router-link>
          <button class="btn btn-outline-secondary btn-sm" type="button" @click="logout">退出</button>
        </div>
      </div>
    </nav>
    <div :class="{ 'app-main': showShell }">
      <router-view />
      <footer v-if="showShell" class="py-4 text-center small text-secondary">
        <a class="text-secondary text-decoration-none" href="https://github.com/ihongs/" target="_blank" rel="noopener noreferrer">@Hongs 2026</a>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { clearSession } from './api'

const route = useRoute()
const router = useRouter()
const showShell = computed(() => route.path !== '/login')

function logout() {
  clearSession()
  router.push('/login')
}
</script>
