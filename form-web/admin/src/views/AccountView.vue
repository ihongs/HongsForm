<template>
  <main class="py-4">
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
                <form @submit.prevent="handleUpdate" class="d-flex flex-column gap-3">
                  <div>
                    <label class="form-label">用户名 <span class="text-danger">*</span></label>
                    <input 
                      v-model="accountForm.account" 
                      type="text" 
                      class="form-control" 
                      placeholder="请设置用户名"
                    />
                  </div>
                  <div>
                    <label class="form-label">旧密码</label>
                    <input 
                      v-model="accountForm.oldPassword" 
                      type="password" 
                      class="form-control" 
                      placeholder="请输入当前密码（修改密码时必填）"
                    />
                  </div>
                  <div>
                    <label class="form-label">新密码</label>
                    <input 
                      v-model="accountForm.newPassword" 
                      type="password" 
                      class="form-control" 
                      placeholder="请输入新密码（至少6位）"
                    />
                  </div>
                  <div>
                    <label class="form-label">确认新密码</label>
                    <input 
                      v-model="accountForm.confirmPassword" 
                      type="password" 
                      class="form-control" 
                      placeholder="请再次输入新密码"
                    />
                  </div>
                  <div class="d-flex justify-content-end">
                    <button 
                      type="submit" 
                      class="btn btn-primary" 
                      :disabled="accountForm.loading"
                    >
                      {{ accountForm.loading ? '保存中...' : '保存' }}
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
                  <div>
                    <label class="form-label">验证码</label>
                    <input 
                      v-model="phoneForm.code" 
                      type="text" 
                      class="form-control" 
                      placeholder="请输入验证码"
                    />
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
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { adminApi, getUser, setSession } from '../api'

const loading = ref(true)
const error = ref('')
const profile = ref({})

const nicknameForm = ref({
  nickname: '',
  loading: false
})

const accountForm = ref({
  account: '',
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
  loading: false
})

const emailForm = ref({
  email: '',
  loading: false
})

const phoneForm = ref({
  phone: '',
  code: '',
  loading: false
})

async function loadProfile() {
  loading.value = true
  error.value = ''
  try {
    const data = await adminApi.getProfile()
    profile.value = data
    nicknameForm.value.nickname = data.nickname || ''
    accountForm.value.account = data.account || ''
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
    await adminApi.updateNickname(nicknameForm.value.nickname)
    const user = getUser()
    if (user) {
      user.nickname = nicknameForm.value.nickname
      setSession({ token: localStorage.getItem('hongs_admin_token'), user })
    }
    profile.value.nickname = nicknameForm.value.nickname
    alert('昵称更新成功')
  } catch (err) {
    alert(err.message || '更新失败')
  } finally {
    nicknameForm.value.loading = false
  }
}

async function handleUpdate() {
  const updates = []
  const hasAccount = accountForm.value.account.trim() && accountForm.value.account.trim() !== profile.value.account
  const hasPassword = accountForm.value.newPassword

  if (!hasAccount && !hasPassword) {
    alert('请至少修改用户名或密码')
    return
  }

  if (hasAccount) {
    updates.push(adminApi.updateAccount(accountForm.value.account.trim()))
  }

  if (hasPassword) {
    if (accountForm.value.newPassword.length < 6) {
      alert('新密码至少需要6位')
      return
    }
    if (accountForm.value.newPassword !== accountForm.value.confirmPassword) {
      alert('两次输入的密码不一致')
      return
    }
    updates.push(adminApi.updatePassword(accountForm.value.oldPassword, accountForm.value.newPassword))
  }

  accountForm.value.loading = true
  try {
    await Promise.all(updates)
    
    if (hasAccount) {
      const user = getUser()
      if (user) {
        user.username = accountForm.value.account.trim()
        setSession({ token: localStorage.getItem('hongs_admin_token'), user })
      }
      profile.value.account = accountForm.value.account.trim()
    }
    
    accountForm.value.oldPassword = ''
    accountForm.value.newPassword = ''
    accountForm.value.confirmPassword = ''
    alert('设置成功')
  } catch (err) {
    alert(err.message || '设置失败')
  } finally {
    accountForm.value.loading = false
  }
}

async function handleBindEmail() {
  if (!emailForm.value.email.trim()) {
    alert('请输入邮箱')
    return
  }
  emailForm.value.loading = true
  try {
    await adminApi.bindEmail(emailForm.value.email)
    const user = getUser()
    if (user) {
      user.email = emailForm.value.email
      setSession({ token: localStorage.getItem('hongs_admin_token'), user })
    }
    profile.value.email = emailForm.value.email
    alert('邮箱绑定成功')
  } catch (err) {
    alert(err.message || '绑定失败')
  } finally {
    emailForm.value.loading = false
  }
}

async function handleUnbindEmail() {
  if (!confirm('确定要解绑邮箱吗？')) {
    return
  }
  emailForm.value.loading = true
  try {
    await adminApi.unbindEmail()
    const user = getUser()
    if (user) {
      user.email = ''
      setSession({ token: localStorage.getItem('hongs_admin_token'), user })
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
    await adminApi.bindPhone(phoneForm.value.phone, phoneForm.value.code)
    const user = getUser()
    if (user) {
      user.phone = phoneForm.value.phone
      setSession({ token: localStorage.getItem('hongs_admin_token'), user })
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
    await adminApi.unbindPhone()
    const user = getUser()
    if (user) {
      user.phone = ''
      setSession({ token: localStorage.getItem('hongs_admin_token'), user })
    }
    profile.value.phone = ''
    phoneForm.value.phone = ''
    phoneForm.value.code = ''
    alert('手机解绑成功')
  } catch (err) {
    alert(err.message || '解绑失败')
  } finally {
    phoneForm.value.loading = false
  }
}

async function handleAvatarUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    const processedFile = await processAvatar(file)
    const fileHash = await computeFileHash(processedFile)

    const configResponse = await fetch('/api/rpc/common', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'upload.getConfig',
        params: {
          fileHash,
          fileSize: processedFile.size,
          fileName: processedFile.name,
          type: 'image',
          scene: 'avatar'
        },
        id: 1
      })
    })

    const configResult = await configResponse.json()

    if (configResult.error) {
      throw new Error(configResult.error.message)
    }

    const { token, url, exists, uploadUrl } = configResult.result

    let avatarUrl = url

    if (!exists || !url) {
      const formData = new FormData()
      formData.append('file', processedFile)

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'X-Upload-Token': token
        },
        body: formData
      })

      if (!uploadResponse.ok) {
        const errorResult = await uploadResponse.json()
        throw new Error(errorResult.error || '上传失败')
      }

      const uploadResult = await uploadResponse.json()
      avatarUrl = uploadResult.url
    }

    await adminApi.updateAvatar(avatarUrl)
    const user = getUser()
    if (user) {
      user.avatar = avatarUrl
      setSession({ token: localStorage.getItem('hongs_admin_token'), user })
    }
    profile.value.avatar = avatarUrl
    alert('头像更新成功')
  } catch (err) {
    alert(err.message || '更新失败')
  }
}

async function processAvatar(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
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
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
          } else {
            reject(new Error('图片处理失败'))
          }
        }, 'image/jpeg', 0.9)
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function computeFileHash(file) {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return 'sha256:' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

onMounted(loadProfile)
</script>