<template>
  <main class="container py-5">
    <div class="mx-auto" style="max-width: 540px;">
      <div class="card shadow-sm border-0">
        <div class="card-body text-center p-5">
          <div v-if="loading" class="py-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">加载中...</span>
            </div>
            <p class="text-secondary mt-3">加载中...</p>
          </div>

          <div v-else-if="error" class="py-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="#ef4444" class="mb-3" viewBox="0 0 24 24" stroke-width="0" stroke="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <h2 class="h4 mb-3 text-danger">错误</h2>
            <p class="text-secondary">{{ error }}</p>
            <button v-if="showRegisterBtn" class="btn btn-primary mt-3" @click="goToRegister">
              立即报名
            </button>
          </div>

          <div v-else-if="signSuccess">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="#10b981" class="mb-3" viewBox="0 0 24 24" stroke-width="0" stroke="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <h2 class="h4 mb-3 text-success">
              {{ isFirstSign ? '签到成功' : '已签到' }}
            </h2>
            <button class="btn btn-primary mt-3" @click="goToSignPage">
              查看签到码
            </button>
          </div>

          <div v-else>
            <h2 class="h4 mb-2">{{ form.title || form.name }}</h2>
            <p class="text-secondary mb-4">请完成身份验证</p>

            <!-- 手机号验证 -->
            <template v-if="form.config?.oncePerPhone">
              <div class="mb-3 text-start">
                <label class="form-label">手机号</label>
                <input 
                  v-model="phone" 
                  type="tel" 
                  class="form-control" 
                  placeholder="请输入手机号"
                />
              </div>
              <div class="mb-3 text-start">
                <label class="form-label">验证码</label>
                <div class="input-group">
                  <input 
                    v-model="verifyCode" 
                    type="text" 
                    class="form-control" 
                    placeholder="请输入验证码"
                  />
                  <button 
                    class="btn btn-outline-secondary" 
                    type="button"
                    :disabled="sendingCode"
                    @click="sendPhoneCode"
                  >
                    {{ sendingCode ? '发送中...' : (countdown > 0 ? `${countdown}s` : '发送验证码') }}
                  </button>
                </div>
              </div>
              <button 
                class="btn btn-primary btn-lg w-100" 
                :disabled="signing" 
                @click="signByPhone"
              >
                <span v-if="signing" class="spinner-border spinner-border-sm me-2" role="status"></span>
                {{ signing ? '处理中...' : '签到' }}
              </button>
            </template>

            <!-- 邮箱验证 -->
            <template v-else-if="form.config?.oncePerEmail">
              <div class="mb-3 text-start">
                <label class="form-label">邮箱</label>
                <input 
                  v-model="email" 
                  type="email" 
                  class="form-control" 
                  placeholder="请输入邮箱"
                />
              </div>
              <div class="mb-3 text-start">
                <label class="form-label">验证码</label>
                <div class="input-group">
                  <input 
                    v-model="verifyCode" 
                    type="text" 
                    class="form-control" 
                    placeholder="请输入验证码"
                  />
                  <button 
                    class="btn btn-outline-secondary" 
                    type="button"
                    :disabled="sendingCode"
                    @click="sendEmailCode"
                  >
                    {{ sendingCode ? '发送中...' : (countdown > 0 ? `${countdown}s` : '发送验证码') }}
                  </button>
                </div>
              </div>
              <button 
                class="btn btn-primary btn-lg w-100" 
                :disabled="signing" 
                @click="signByEmail"
              >
                <span v-if="signing" class="spinner-border spinner-border-sm me-2" role="status"></span>
                {{ signing ? '处理中...' : '签到' }}
              </button>
            </template>

            <div v-else class="alert alert-warning">
              请联系管理员开启签到验证
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formApi } from '../api'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref(null)
const form = ref(null)
const phone = ref('')
const email = ref('')
const verifyCode = ref('')
const sendingCode = ref(false)
const signing = ref(false)
const countdown = ref(0)
const signSuccess = ref(false)
const isFirstSign = ref(false)
const signRecordId = ref(null)
const signChecksum = ref(null)
const showRegisterBtn = ref(false)

let countdownTimer = null

function startCountdown() {
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
    }
  }, 1000)
}

async function loadForm() {
  try {
    const result = await formApi.checkFormChecksum(
      route.params.formId,
      route.params.checksum
    )

    if (!result.success) {
      error.value = result.message
      return
    }

    form.value = result.form
  } catch (err) {
    error.value = err.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function sendPhoneCode() {
  if (!phone.value) {
    alert('请输入手机号')
    return
  }

  sendingCode.value = true
  try {
    const verifyToken = crypto.randomUUID()
    await formApi.sendSmsCode(route.params.formId, phone.value, verifyToken)
    startCountdown()
    alert('验证码已发送')
  } catch (err) {
    alert('发送失败：' + (err.message || '未知错误'))
  } finally {
    sendingCode.value = false
  }
}

async function sendEmailCode() {
  if (!email.value) {
    alert('请输入邮箱')
    return
  }

  sendingCode.value = true
  try {
    const verifyToken = crypto.randomUUID()
    await formApi.sendEmailCode(route.params.formId, email.value, verifyToken)
    startCountdown()
    alert('验证码已发送')
  } catch (err) {
    alert('发送失败：' + (err.message || '未知错误'))
  } finally {
    sendingCode.value = false
  }
}

async function signByPhone() {
  if (!phone.value || !verifyCode.value) {
    alert('请填写完整信息')
    return
  }

  signing.value = true
  try {
    const result = await formApi.signByPhone(
      route.params.formId,
      phone.value,
      verifyCode.value
    )

    if (!result.success) {
      if (result.code === 'NOT_REGISTERED') {
        error.value = result.message
        showRegisterBtn.value = true
        return
      }
      throw new Error(result.message)
    }

    isFirstSign.value = result.isFirstSign
    signRecordId.value = result.id
    signChecksum.value = result.checksum
    signSuccess.value = true
  } catch (err) {
    alert('签到失败：' + (err.message || '未知错误'))
  } finally {
    signing.value = false
  }
}

async function signByEmail() {
  if (!email.value || !verifyCode.value) {
    alert('请填写完整信息')
    return
  }

  signing.value = true
  try {
    const result = await formApi.signByEmail(
      route.params.formId,
      email.value,
      verifyCode.value
    )

    if (!result.success) {
      if (result.code === 'NOT_REGISTERED') {
        error.value = result.message
        showRegisterBtn.value = true
        return
      }
      throw new Error(result.message)
    }

    isFirstSign.value = result.isFirstSign
    signRecordId.value = result.id
    signChecksum.value = result.checksum
    signSuccess.value = true
  } catch (err) {
    alert('签到失败：' + (err.message || '未知错误'))
  } finally {
    signing.value = false
  }
}

function goToSignPage() {
  router.push({
    name: 'sign',
    params: {
      formId: route.params.formId,
      id: signRecordId.value,
      checksum: signChecksum.value
    }
  })
}

function goToRegister() {
  router.push({
    name: 'form',
    params: {
      id: route.params.formId
    }
  })
}

onMounted(() => {
  loadForm()
})
</script>
