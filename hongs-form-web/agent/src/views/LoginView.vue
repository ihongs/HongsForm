<template>
  <main class="min-vh-100 d-flex align-items-center py-5">
    <div class="container">
      <form class="card border-0 shadow-sm mx-auto" style="max-width: 420px;" @submit.prevent="submit">
        <div class="card-body p-4 p-md-5">
          <h1 class="h3 mb-2">登录 / 注册</h1>
          <p class="text-secondary mb-4">登录后管理自己的表单和提交数据</p>

          <div class="mb-3">
            <ul class="nav nav-pills nav-justified mb-3">
              <li class="nav-item">
                <button class="nav-link" :class="{ active: authType === 'email' }" @click="authType = 'email'">邮箱</button>
              </li>
              <li class="nav-item">
                <button class="nav-link" :class="{ active: authType === 'phone' }" @click="authType = 'phone'">手机</button>
              </li>
              <li class="nav-item">
                <button class="nav-link" :class="{ active: authType === 'password' }" @click="authType = 'password'">密码</button>
              </li>
            </ul>
          </div>

          <div v-if="authType === 'password'">
            <div class="mb-3">
              <label class="form-label">用户名</label>
              <input v-model.trim="username" class="form-control" autocomplete="username" />
            </div>
            <div class="mb-3">
              <label class="form-label">密码</label>
              <input v-model="password" class="form-control" type="password" autocomplete="current-password" />
            </div>
          </div>

          <div v-if="authType === 'email'">
            <div class="mb-3">
              <label class="form-label">邮箱地址</label>
              <input v-model.trim="email" type="email" class="form-control" autocomplete="email" />
            </div>
            <div class="mb-3">
              <SliderVerify v-if="!captchaVerified" @success="onCaptchaSuccess" />
              <div v-if="captchaVerified" class="mb-3">
                <label class="form-label">验证码</label>
                <div class="input-group">
                  <input v-model="code" class="form-control" maxlength="6" />
                  <button type="button" class="btn btn-outline-secondary" :disabled="sendingCode || countdown > 0" @click="sendEmailCode">
                    {{ countdown > 0 ? `${countdown}秒后重试` : sendingCode ? '发送中...' : '获取验证码' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="authType === 'phone'">
            <div class="mb-3">
              <label class="form-label">手机号码</label>
              <input v-model.trim="phone" type="tel" class="form-control" autocomplete="tel" />
            </div>
            <div class="mb-3">
              <SliderVerify v-if="!captchaVerified" @success="onCaptchaSuccess" />
              <div v-if="captchaVerified" class="mb-3">
                <label class="form-label">验证码</label>
                <div class="input-group">
                  <input v-model="code" class="form-control" maxlength="6" />
                  <button type="button" class="btn btn-outline-secondary" :disabled="sendingCode || countdown > 0" @click="sendSmsCode">
                    {{ countdown > 0 ? `${countdown}秒后重试` : sendingCode ? '发送中...' : '获取验证码' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="error" class="alert alert-danger py-2" role="alert">{{ error }}</div>
          <button class="btn btn-primary w-100" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
            {{ loading ? '处理中...' : (authType === 'password' ? '登录' : '登录 / 注册') }}
          </button>
        </div>
      </form>
    </div>
  </main>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { agentApi, setSession } from '../api'
import SliderVerify from './SliderVerify.vue'

const router = useRouter()
const authType = ref('email')
const username = ref('')
const password = ref('')
const email = ref('')
const phone = ref('')
const code = ref('')
const loading = ref(false)
const sendingCode = ref(false)
const countdown = ref(0)
const error = ref('')
const captchaVerified = ref(false)
let captchaAnswer = null

let countdownTimer = null

watch(authType, () => {
  captchaVerified.value = false
  captchaAnswer = null
  code.value = ''
})

function startCountdown() {
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
    }
  }, 1000)
}

function onCaptchaSuccess(answer) {
  captchaAnswer = answer
  captchaVerified.value = true
}

async function sendEmailCode() {
  error.value = ''
  if (!email.value) {
    error.value = '请输入邮箱地址'
    return
  }
  if (!captchaAnswer) {
    error.value = '请先完成验证码验证'
    return
  }

  sendingCode.value = true
  try {
    await agentApi.sendEmailVerificationCode(email.value, captchaAnswer)
    startCountdown()
  } catch (err) {
    error.value = err.message || '发送失败'
    captchaVerified.value = false
    captchaAnswer = null
  } finally {
    sendingCode.value = false
  }
}

async function sendSmsCode() {
  error.value = ''
  if (!phone.value) {
    error.value = '请输入手机号码'
    return
  }
  if (!captchaAnswer) {
    error.value = '请先完成验证码验证'
    return
  }

  sendingCode.value = true
  try {
    await agentApi.sendSmsVerificationCode(phone.value, captchaAnswer)
    startCountdown()
  } catch (err) {
    error.value = err.message || '发送失败'
    captchaVerified.value = false
    captchaAnswer = null
  } finally {
    sendingCode.value = false
  }
}

async function submit() {
  error.value = ''
  loading.value = true

  try {
    let session
    if (authType.value === 'password') {
      if (!username.value || !password.value) {
        error.value = '请输入用户名和密码'
        loading.value = false
        return
      }
      session = await agentApi.login(username.value, password.value)
    } else if (authType.value === 'email') {
      if (!email.value || !code.value) {
        error.value = '请输入邮箱和验证码'
        loading.value = false
        return
      }
      session = await agentApi.loginOrRegisterByEmail(email.value, code.value)
    } else {
      if (!phone.value || !code.value) {
        error.value = '请输入手机号和验证码'
        loading.value = false
        return
      }
      session = await agentApi.loginOrRegisterByPhone(phone.value, code.value)
    }

    setSession(session)
    router.push('/forms')
  } catch (err) {
    error.value = err.message || '操作失败'
  } finally {
    loading.value = false
  }
}
</script>
