<template>
  <div>
    <nav v-if="showShell" class="navbar navbar-expand fixed-top bg-white border-bottom shadow-sm">
      <div class="container-fluid px-4">
        <router-link class="navbar-brand fw-semibold" to="/forms">HongsForm</router-link>
        <div class="navbar-nav flex-row align-items-center gap-3">
          <router-link class="nav-link" to="/forms">表单</router-link>
          <button class="btn btn-outline-secondary btn-sm" type="button" @click="logout">退出</button>
        </div>
      </div>
    </nav>
    <div :class="{ 'app-main': showShell }">
      <router-view />
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
