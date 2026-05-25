<template>
  <main class="min-vh-100 d-flex align-items-center py-5">
    <div class="container">
      <form class="card border-0 shadow-sm mx-auto" style="max-width: 420px;" @submit.prevent="submit">
        <div class="card-body p-4 p-md-5">
          <h1 class="h3 mb-2">管理员登录</h1>
          <p class="text-secondary mb-4">登录后管理全站用户、表单和提交数据</p>

          <div class="mb-3">
            <label class="form-label">用户名</label>
            <input v-model.trim="username" class="form-control" autocomplete="username" />
          </div>
          <div class="mb-3">
            <label class="form-label">密码</label>
            <input v-model="password" class="form-control" type="password" autocomplete="current-password" />
          </div>

          <div v-if="error" class="alert alert-danger py-2" role="alert">{{ error }}</div>
          <button class="btn btn-primary w-100" :disabled="loading || computing">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
            {{ loading ? '登录中...' : (computing ? '验证中...' : '登录') }}
          </button>
        </div>
      </form>
    </div>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi, verifyApi, setSession } from '../api'

const router = useRouter()
const username = ref('')
const password = ref('')
const loading = ref(false)
const computing = ref(false)
const error = ref('')

async function sha256(str) {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

async function computeAnswer(nonce, difficulty) {
  const prefix = '0'.repeat(difficulty)
  let answer = 0
  while (true) {
    const hash = await sha256(nonce + answer)
    if (hash.startsWith(prefix)) {
      return answer
    }
    answer++
  }
}

async function submit() {
  error.value = ''
  if (!username.value || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }

  loading.value = true
  try {
    computing.value = true
    let session
    try {
      const { token, nonce, difficulty } = await verifyApi.generateToken()
      const answer = await computeAnswer(nonce, difficulty)
      session = await adminApi.login(username.value, password.value, token, nonce, answer)
    } finally {
      computing.value = false
    }
    setSession(session)
    router.push('/forms')
  } catch (err) {
    error.value = err.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>
