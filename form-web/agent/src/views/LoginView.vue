<template>
  <main class="min-vh-100 d-flex align-items-center py-5">
    <div class="container">
      <form class="card shadow-sm mx-auto" style="max-width: 420px;" @submit.prevent="submit">
        <div class="card-body p-4 p-md-5">
          <h1 class="h3 mb-2">登录 / 注册</h1>
          <p class="text-secondary mb-4">登录后管理自己的表单和提交数据</p>

          <div class="mb-3">
            <ul class="nav nav-pills nav-justified mb-3">
              <li class="nav-item">
                <button class="nav-link" :class="{ active: authType === 'password' }" @click="authType = 'password'">密码</button>
              </li>
              <li class="nav-item">
                <button class="nav-link" :class="{ active: authType === 'email' }" @click="authType = 'email'">邮箱</button>
              </li>
              <li class="nav-item">
                <button class="nav-link" :class="{ active: authType === 'phone' }" @click="authType = 'phone'">手机</button>
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
              <label class="form-label">验证码</label>
              <div class="input-group">
                <input v-model="code" class="form-control" maxlength="6" />
                <button type="button" class="btn btn-outline-secondary" :disabled="sendingCode || countdown > 0" @click="showSlideCaptcha('email')">
                  {{ countdown > 0 ? `${countdown}秒后重试` : sendingCode ? '发送中...' : '获取验证码' }}
                </button>
              </div>
            </div>
          </div>

          <div v-if="authType === 'phone'">
            <div class="mb-3">
              <label class="form-label">手机号码</label>
              <input v-model.trim="phone" type="tel" class="form-control" autocomplete="tel" />
            </div>
            <div class="mb-3">
              <label class="form-label">验证码</label>
              <div class="input-group">
                <input v-model="code" class="form-control" maxlength="6" />
                <button type="button" class="btn btn-outline-secondary" :disabled="sendingCode || countdown > 0" @click="showSlideCaptcha('phone')">
                  {{ countdown > 0 ? `${countdown}秒后重试` : sendingCode ? '发送中...' : '获取验证码' }}
                </button>
              </div>
            </div>
          </div>

          <div v-if="error" class="alert alert-danger py-2" role="alert">{{ error }}</div>
          <button class="btn btn-primary w-100" :disabled="loading || (authType === 'password' && computing)">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
            {{ loading ? '处理中...' : (computing && authType === 'password' ? '验证中...' : (authType === 'password' ? '登录' : '登录 / 注册')) }}
          </button>
        </div>
      </form>
    </div>

    <!-- 滑块验证码弹窗 -->
    <div v-if="showCaptchaModal" class="modal fade show" style="display: block;" @click.self="closeCaptchaModal">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">拖动准星瞄准标靶</h5>
            <button type="button" class="btn-close" @click="closeCaptchaModal"></button>
          </div>
          <div class="modal-body">
            <div v-if="captchaLoading" class="text-center py-4">
              <div class="spinner-border" role="status">
                <span class="visually-hidden">加载中...</span>
              </div>
            </div>
            <div v-else-if="captchaData" class="d-flex justify-content-center">
              <div class="captcha-container" :style="{ width: captchaData.captchaWidth + 'px', height: captchaData.captchaHeight + 'px' }">
                <!-- 背景图 -->
                <img :src="captchaData.backgroundImage" 
                     :width="captchaData.captchaWidth" 
                     :height="captchaData.captchaHeight"
                     class="captcha-bg" 
                     draggable="false" />
                
                <!-- 滑块轨道 -->
                <div class="slider-track" 
                     :style="{ width: captchaData.captchaWidth + 'px', height: '50px', bottom: '0' }">
                  <!-- 滑块 -->
                  <div class="slider"
                       :style="{ 
                         width: captchaData.sliderWidth + 'px', 
                         height: captchaData.sliderHeight + 'px',
                         left: sliderPosition + 'px'
                       }"
                       :class="{ dragging: isDragging }"
                       @mousedown="startDrag"
                       @touchstart.prevent="startDrag">
                    <img :src="captchaData.sliderImage" 
                         :width="captchaData.sliderWidth" 
                         :height="captchaData.sliderHeight" 
                         draggable="false" />
                  </div>
                </div>
              </div>
            </div>
            <div v-if="captchaError" class="alert alert-danger mt-3">{{ captchaError }}</div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { agentApi, verifyApi, setSession } from '../api'

const router = useRouter()
const authType = ref('password')
const username = ref('')
const password = ref('')
const email = ref('')
const phone = ref('')
const code = ref('')
const loading = ref(false)
const sendingCode = ref(false)
const computing = ref(false)
const countdown = ref(0)
const error = ref('')

// 滑块验证码相关
const showCaptchaModal = ref(false)
const captchaLoading = ref(false)
const captchaData = ref(null)
const captchaError = ref('')
const isDragging = ref(false)
const sliderPosition = ref(0)
const currentCaptchaType = ref('')

let countdownTimer = null
let startX = 0
let startSliderX = 0

watch(authType, () => {
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

async function loadCaptcha() {
  captchaLoading.value = true
  captchaError.value = ''
  try {
    captchaData.value = await verifyApi.generateSlideCaptcha()
    sliderPosition.value = 0
  } catch (err) {
    captchaError.value = err.message || '加载验证码失败'
  } finally {
    captchaLoading.value = false
  }
}

function showSlideCaptcha(type) {
  currentCaptchaType.value = type
  captchaData.value = null
  captchaError.value = ''
  showCaptchaModal.value = true
  loadCaptcha()
}

function closeCaptchaModal() {
  showCaptchaModal.value = false
  captchaData.value = null
  captchaError.value = ''
  sliderPosition.value = 0
}

function startDrag(e) {
  if (!captchaData.value || isDragging.value) return
  
  e.preventDefault()
  e.stopPropagation()
  
  isDragging.value = true
  startX = e.clientX || e.touches[0].clientX
  startSliderX = sliderPosition.value
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onDrag)
  document.addEventListener('touchend', stopDrag)
}

function onDrag(e) {
  if (!isDragging.value || !captchaData.value) return
  
  e.preventDefault()
  e.stopPropagation()
  
  const currentX = e.clientX || e.touches[0].clientX
  const diffX = currentX - startX
  let newPosition = startSliderX + diffX
  newPosition = Math.max(0, Math.min(newPosition, captchaData.value.captchaWidth - captchaData.value.sliderWidth))
  
  sliderPosition.value = newPosition
}

async function stopDrag() {
  if (!isDragging.value) return
  
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)
  
  if (captchaData.value) {
    await verifyCaptcha()
  }
}

async function verifyCaptcha() {
  captchaLoading.value = true
  captchaError.value = ''
  
  try {
    const result = await verifyApi.verifySlideCaptcha(captchaData.value.captchaId, sliderPosition.value)
    
    if (result.success) {
      closeCaptchaModal()
      if (currentCaptchaType.value === 'email') {
        await sendEmailCode(result.verifyToken)
      } else if (currentCaptchaType.value === 'phone') {
        await sendSmsCode(result.verifyToken)
      }
    }
  } catch (err) {
    captchaError.value = err.message || '验证失败'
    await loadCaptcha()
  } finally {
    captchaLoading.value = false
    sliderPosition.value = 0
  }
}

async function sendEmailCode(verifyToken) {
  error.value = ''
  if (!email.value) {
    error.value = '请输入邮箱地址'
    return
  }

  sendingCode.value = true
  try {
    await verifyApi.sendEmailCode(verifyToken, email.value)
    startCountdown()
  } catch (err) {
    error.value = err.message || '发送失败'
  } finally {
    sendingCode.value = false
  }
}

async function sendSmsCode(verifyToken) {
  error.value = ''
  if (!phone.value) {
    error.value = '请输入手机号码'
    return
  }

  sendingCode.value = true
  try {
    await verifyApi.sendSmsCode(verifyToken, phone.value)
    startCountdown()
  } catch (err) {
    error.value = err.message || '发送失败'
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
      computing.value = true
        try {
          const { token, nonce, difficulty } = await verifyApi.generateToken()
          const answer = await computeAnswer(nonce, difficulty)
          session = await agentApi.login(username.value, password.value, { token, nonce, answer })
        } finally {
          computing.value = false
        }
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

onMounted(() => {
  // 可以在这里添加一些初始化逻辑
})

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)
})
</script>

<style>
.captcha-container {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  border: 2px solid #e0e0e0;
  user-select: none;
  -webkit-user-select: none;
}

.captcha-bg {
  display: block;
}

.slider-track {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
}

.slider {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  transition: transform 0.1s ease;
  user-select: none;
  -webkit-user-select: none;
}

.slider:hover {
  transform: translateY(-50%) scale(1.05);
}

.slider.dragging {
  transform: translateY(-50%) scale(1.1);
  transition: none;
}

.slider img {
  display: block;
}

.modal-backdrop.show {
  opacity: 0.5;
}
</style>