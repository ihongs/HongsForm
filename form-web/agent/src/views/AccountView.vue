<template>
  <main class="container py-4">
    <div class="mb-4">
      <h1 class="h3 mb-1">账号设置</h1>
      <p class="text-secondary mb-0">管理您的个人资料和安全设置</p>
    </div>

    <div v-if="loading" class="card shadow-sm">
      <div class="card-body text-center text-secondary py-5">加载中...</div>
    </div>
    <div v-else-if="error" class="alert alert-danger" role="alert">{{ error }}</div>
    <template v-else>
      <div class="row g-3">
        <div class="col-12 col-lg-4">
          <section class="card shadow-sm">
            <div class="card-body text-center">
              <div class="mb-3">
                <img 
                  :src="profile.avatar || '/static/assets/images/user.jpg'" 
                  alt="头像" 
                  class="rounded-square avatar-img" 
                  style="width: 120px; height: 120px; object-fit: cover"
                />
              </div>
              <h2 class="h5 mb-1">{{ profile.nickname || profile.account || '用户' }}</h2>
              <p class="text-secondary small mb-3">{{ profile.email || profile.phone || '未绑定邮箱和手机' }}</p>
              <div class="d-grid gap-2">
                <label class="btn btn-outline-primary">
                  更换头像
                  <input type="file" class="d-none" accept="image/*" @change="handleAvatarUpload" />
                </label>
              </div>
            </div>
          </section>
        </div>
        <div class="col-12 col-lg-8">
          <div class="d-flex flex-column gap-3">
            <section class="card shadow-sm">
              <div class="card-body">
                <h2 class="h5 mb-3">基本资料</h2>
                <form @submit.prevent="handleUpdateNickname" class="d-flex flex-column gap-3">
                  <div>
                    <label class="form-label">昵称</label>
                    <input 
                      v-model="nicknameForm.nickname" 
                      type="text" 
                      class="form-control" 
                      placeholder="请输入昵称"
                    />
                  </div>
                  <div class="d-flex justify-content-end">
                    <button 
                      type="submit" 
                      class="btn btn-primary" 
                      :disabled="nicknameForm.loading"
                    >
                      {{ nicknameForm.loading ? '保存中...' : '保存' }}
                    </button>
                  </div>
                </form>
              </div>
            </section>

            <section class="card shadow-sm">
              <div class="card-body">
                <h2 class="h5 mb-3">账号与密码</h2>
                <form @submit.prevent="handleUpdatePassword" class="d-flex flex-column gap-3">
                  <div>
                    <label class="form-label">用户名 <span class="text-danger">*</span></label>
                    <input 
                      v-model="passwordForm.username" 
                      type="text" 
                      class="form-control" 
                      placeholder="请设置用户名"
                    />
                  </div>
                  <div v-if="profile.hasPassword">
                    <label class="form-label">旧密码 <span class="text-danger">*</span></label>
                    <input 
                      v-model="passwordForm.oldPassword" 
                      type="password" 
                      class="form-control" 
                      placeholder="请输入当前密码"
                    />
                  </div>
                  <div>
                    <label class="form-label">新密码 <span class="text-danger">*</span></label>
                    <input 
                      v-model="passwordForm.newPassword" 
                      type="password" 
                      class="form-control" 
                      placeholder="请输入新密码（至少6位）"
                    />
                  </div>
                  <div>
                    <label class="form-label">确认新密码 <span class="text-danger">*</span></label>
                    <input 
                      v-model="passwordForm.confirmPassword" 
                      type="password" 
                      class="form-control" 
                      placeholder="请再次输入新密码"
                    />
                  </div>
                  <div class="d-flex justify-content-end">
                    <button 
                      type="submit" 
                      class="btn btn-primary" 
                      :disabled="passwordForm.loading"
                    >
                      {{ passwordForm.loading ? '保存中...' : '保存' }}
                    </button>
                  </div>
                </form>
              </div>
            </section>

            <section class="card shadow-sm">
              <div class="card-body">
                <h2 class="h5 mb-3">邮箱绑定</h2>
                <form @submit.prevent="handleBindEmail" class="d-flex flex-column gap-3">
                  <div>
                    <label class="form-label">邮箱</label>
                    <input 
                      v-model="emailForm.email" 
                      type="email" 
                      class="form-control" 
                      placeholder="请输入邮箱"
                    />
                  </div>
                  <div class="d-flex gap-2">
                    <input 
                      v-model="emailForm.code" 
                      type="text" 
                      class="form-control" 
                      placeholder="请输入验证码"
                    />
                    <button 
                      type="button" 
                      class="btn btn-outline-secondary" 
                      :disabled="emailForm.sendingCode || !emailForm.email"
                      @click="handleSendEmailCode"
                      style="width: 120px; flex-shrink: 0"
                    >
                      {{ emailForm.sendingCode ? '发送中...' : (emailForm.countdown > 0 ? `${emailForm.countdown}s` : '发送验证码') }}
                    </button>
                  </div>
                  <div class="d-flex justify-content-end gap-2">
                    <button 
                      v-if="profile.email"
                      type="button" 
                      class="btn btn-outline-secondary" 
                      :disabled="emailForm.loading"
                      @click="handleUnbindEmail"
                    >
                      {{ emailForm.loading ? '解绑中...' : '解绑邮箱' }}
                    </button>
                    <button 
                      type="submit" 
                      class="btn btn-primary" 
                      :disabled="emailForm.loading"
                    >
                      {{ emailForm.loading ? '保存中...' : (profile.email ? '换绑邮箱' : '绑定邮箱') }}
                    </button>
                  </div>
                </form>
              </div>
            </section>

            <section class="card shadow-sm">
              <div class="card-body">
                <h2 class="h5 mb-3">手机绑定</h2>
                <form @submit.prevent="handleBindPhone" class="d-flex flex-column gap-3">
                  <div>
                    <label class="form-label">手机号</label>
                    <input 
                      v-model="phoneForm.phone" 
                      type="tel" 
                      class="form-control" 
                      placeholder="请输入手机号"
                    />
                  </div>
                  <div class="d-flex gap-2">
                    <input 
                      v-model="phoneForm.code" 
                      type="text" 
                      class="form-control" 
                      placeholder="请输入验证码"
                    />
                    <button 
                      type="button" 
                      class="btn btn-outline-secondary" 
                      :disabled="phoneForm.sendingCode || !phoneForm.phone"
                      @click="handleSendSmsCode"
                      style="width: 120px; flex-shrink: 0"
                    >
                      {{ phoneForm.sendingCode ? '发送中...' : (phoneForm.countdown > 0 ? `${phoneForm.countdown}s` : '发送验证码') }}
                    </button>
                  </div>
                  <div class="d-flex justify-content-end gap-2">
                    <button 
                      v-if="profile.phone"
                      type="button" 
                      class="btn btn-outline-secondary" 
                      :disabled="phoneForm.loading"
                      @click="handleUnbindPhone"
                    >
                      {{ phoneForm.loading ? '解绑中...' : '解绑手机' }}
                    </button>
                    <button 
                      type="submit" 
                      class="btn btn-primary" 
                      :disabled="phoneForm.loading"
                    >
                      {{ phoneForm.loading ? '保存中...' : (profile.phone ? '换绑手机' : '绑定手机') }}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </div>
      </div>
    </template>

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
                <img :src="captchaData.backgroundImage" 
                     :width="captchaData.captchaWidth" 
                     :height="captchaData.captchaHeight"
                     class="captcha-bg" 
                     draggable="false" />
                <div class="slider-track" 
                     :style="{ width: captchaData.captchaWidth + 'px', height: '50px', bottom: '0' }">
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
import { onMounted, ref } from 'vue'
import { agentApi, verifyApi, getUser, setSession } from '../api'

const loading = ref(true)
const error = ref('')
const profile = ref({})

const nicknameForm = ref({
  nickname: '',
  loading: false
})

const passwordForm = ref({
  username: '',
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
  loading: false
})

const emailForm = ref({
  email: '',
  code: '',
  loading: false,
  sendingCode: false,
  countdown: 0
})

const phoneForm = ref({
  phone: '',
  code: '',
  sendingCode: false,
  countdown: 0
})

// 滑块验证码相关
const showCaptchaModal = ref(false)
const captchaLoading = ref(false)
const captchaData = ref(null)
const captchaError = ref('')
const isDragging = ref(false)
const sliderPosition = ref(0)
const currentCaptchaType = ref('')

let captchaStartX = 0
let captchaStartSliderX = 0

async function loadProfile() {
  loading.value = true
  error.value = ''
  try {
    const data = await agentApi.getProfile()
    profile.value = data
    nicknameForm.value.nickname = data.nickname || ''
    passwordForm.value.username = data.account || ''
    emailForm.value.email = data.email || ''
    phoneForm.value.phone = data.phone || ''
  } catch (err) {
    error.value = err.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function handleUpdateNickname() {
  if (!nicknameForm.value.nickname.trim()) {
    alert('请输入昵称')
    return
  }
  nicknameForm.value.loading = true
  try {
    await agentApi.updateNickname(nicknameForm.value.nickname)
    const user = getUser()
    if (user) {
      user.nickname = nicknameForm.value.nickname
      setSession({ token: localStorage.getItem('hongs_agent_token'), user })
    }
    alert('昵称更新成功')
  } catch (err) {
    alert(err.message || '更新失败')
  } finally {
    nicknameForm.value.loading = false
  }
}

async function handleUpdatePassword() {
  if (!passwordForm.value.username.trim()) {
    alert('请输入用户名')
    return
  }
  if (!passwordForm.value.newPassword) {
    alert('请输入新密码')
    return
  }
  if (passwordForm.value.newPassword.length < 6) {
    alert('新密码至少需要6位')
    return
  }
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    alert('两次输入的密码不一致')
    return
  }
  if (profile.value.hasPassword && !passwordForm.value.oldPassword) {
    alert('请输入旧密码')
    return
  }
  passwordForm.value.loading = true
  try {
    const verify = await verifyApi.generateToken()
    const answer = await solveProof(verify.nonce, verify.difficulty)
    await agentApi.updatePassword(passwordForm.value.oldPassword, passwordForm.value.newPassword, passwordForm.value.username, {
      token: verify.token,
      nonce: verify.nonce,
      answer
    })
    passwordForm.value.oldPassword = ''
    passwordForm.value.newPassword = ''
    passwordForm.value.confirmPassword = ''
    alert('账号与密码设置成功')
  } catch (err) {
    alert(err.message || '设置失败')
  } finally {
    passwordForm.value.loading = false
  }
}

function solveProof(nonce, difficulty) {
  let answer = 0
  const prefix = '0'.repeat(difficulty)
  while (true) {
    const hash = sha256(`${nonce}${answer}`)
    if (hash.startsWith(prefix)) {
      return answer
    }
    answer++
  }
}

function sha256(str) {
  const buffer = new TextEncoder().encode(str)
  return crypto.subtle.digest('SHA-256', buffer).then(hash => {
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
  })
}

async function handleBindEmail() {
  if (!emailForm.value.email.trim()) {
    alert('请输入邮箱')
    return
  }
  if (!emailForm.value.code.trim()) {
    alert('请输入验证码')
    return
  }
  emailForm.value.loading = true
  try {
    await agentApi.bindEmail(emailForm.value.email, emailForm.value.code)
    const user = getUser()
    if (user) {
      user.email = emailForm.value.email
      setSession({ token: localStorage.getItem('hongs_agent_token'), user })
    }
    profile.value.email = emailForm.value.email
    emailForm.value.code = ''
    alert('邮箱绑定成功')
  } catch (err) {
    alert(err.message || '绑定失败')
  } finally {
    emailForm.value.loading = false
  }
}

async function handleSendEmailCode() {
  if (!emailForm.value.email.trim()) {
    alert('请输入邮箱')
    return
  }
  showSlideCaptcha('email')
}

async function handleUnbindEmail() {
  if (!confirm('确定要解绑邮箱吗？')) {
    return
  }
  emailForm.value.loading = true
  try {
    await agentApi.unbindEmail()
    const user = getUser()
    if (user) {
      user.email = ''
      setSession({ token: localStorage.getItem('hongs_agent_token'), user })
    }
    profile.value.email = ''
    emailForm.value.email = ''
    alert('邮箱解绑成功')
  } catch (err) {
    alert(err.message || '解绑失败')
  } finally {
    emailForm.value.loading = false
  }
}

async function handleSendSmsCode() {
  if (!phoneForm.value.phone.trim()) {
    alert('请输入手机号')
    return
  }
  showSlideCaptcha('phone')
}

async function handleBindPhone() {
  if (!phoneForm.value.phone.trim()) {
    alert('请输入手机号')
    return
  }
  if (!phoneForm.value.code.trim()) {
    alert('请输入验证码')
    return
  }
  phoneForm.value.loading = true
  try {
    await agentApi.bindPhone(phoneForm.value.phone, phoneForm.value.code)
    const user = getUser()
    if (user) {
      user.phone = phoneForm.value.phone
      setSession({ token: localStorage.getItem('hongs_agent_token'), user })
    }
    profile.value.phone = phoneForm.value.phone
    phoneForm.value.code = ''
    alert('手机绑定成功')
  } catch (err) {
    alert(err.message || '绑定失败')
  } finally {
    phoneForm.value.loading = false
  }
}

async function handleUnbindPhone() {
  if (!confirm('确定要解绑手机吗？')) {
    return
  }
  phoneForm.value.loading = true
  try {
    await agentApi.unbindPhone()
    const user = getUser()
    if (user) {
      user.phone = ''
      setSession({ token: localStorage.getItem('hongs_agent_token'), user })
    }
    profile.value.phone = ''
    phoneForm.value.phone = ''
    phoneForm.value.verifyCode = ''
    alert('手机解绑成功')
  } catch (err) {
    alert(err.message || '解绑失败')
  } finally {
    phoneForm.value.loading = false
  }
}

function handleAvatarUpload(event) {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const img = new Image()
      img.onload = async () => {
        const canvas = document.createElement('canvas')
        const size = 300
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#f5f5f5'
        ctx.fillRect(0, 0, size, size)
        
        let width = img.width
        let height = img.height
        let x = 0
        let y = 0
        
        if (width > height) {
          height = size
          width = (img.width / img.height) * size
          x = (size - width) / 2
        } else {
          width = size
          height = (img.height / img.width) * size
          y = (size - height) / 2
        }
        
        ctx.drawImage(img, x, y, width, height)
        const avatar = canvas.toDataURL('image/jpeg', 0.9)
        
        try {
          await agentApi.updateAvatar(avatar)
          const user = getUser()
          if (user) {
            user.avatar = avatar
            setSession({ token: localStorage.getItem('hongs_agent_token'), user })
          }
          profile.value.avatar = avatar
          alert('头像更新成功')
        } catch (err) {
          alert(err.message || '更新失败')
        }
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

// 滑块验证码相关方法
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
  captchaStartX = e.clientX || e.touches[0].clientX
  captchaStartSliderX = sliderPosition.value
  
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
  const diffX = currentX - captchaStartX
  let newPosition = captchaStartSliderX + diffX
  newPosition = Math.max(0, Math.min(newPosition, captchaData.value.captchaWidth - captchaData.value.sliderWidth))
  
  sliderPosition.value = newPosition
}

function stopDrag() {
  if (!isDragging.value) return
  
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)
  
  if (captchaData.value) {
    verifyCaptcha()
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
  if (!emailForm.value.email.trim()) {
    alert('请输入邮箱')
    return
  }

  emailForm.value.sendingCode = true
  try {
    await verifyApi.sendEmailCode(verifyToken, emailForm.value.email)
    emailForm.value.countdown = 60
    const timer = setInterval(() => {
      emailForm.value.countdown--
      if (emailForm.value.countdown <= 0) {
        clearInterval(timer)
        emailForm.value.countdown = 0
      }
    }, 1000)
  } catch (err) {
    alert(err.message || '发送失败')
  } finally {
    emailForm.value.sendingCode = false
  }
}

async function sendSmsCode(verifyToken) {
  if (!phoneForm.value.phone.trim()) {
    alert('请输入手机号')
    return
  }

  phoneForm.value.sendingCode = true
  try {
    await verifyApi.sendSmsCode(verifyToken, phoneForm.value.phone)
    phoneForm.value.countdown = 60
    const timer = setInterval(() => {
      phoneForm.value.countdown--
      if (phoneForm.value.countdown <= 0) {
        clearInterval(timer)
        phoneForm.value.countdown = 0
      }
    }, 1000)
  } catch (err) {
    alert(err.message || '发送失败')
  } finally {
    phoneForm.value.sendingCode = false
  }
}

onMounted(loadProfile)
</script>
