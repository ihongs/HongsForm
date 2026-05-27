<template>
  <main class="container py-5">
    <div class="mx-auto" style="max-width: 720px;">
      <div v-if="loading" class="text-center text-secondary py-5">
        <div class="spinner-border mb-3" role="status" aria-hidden="true"></div>
        <div>加载中...</div>
      </div>

      <div v-else-if="loadError" class="alert alert-danger" role="alert">
        <h2 class="h5 alert-heading">出错了</h2>
        <p class="mb-0">{{ loadError }}</p>
      </div>

      <!-- 已提交提示 -->
      <div v-else-if="alreadySubmitted" class="card shadow-sm border-0">
        <div class="card-body text-center p-5">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="#10b981" class="mb-3" viewBox="0 0 24 24" stroke-width="0" stroke="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <h1 class="h3 mb-3">您已填写过此表单</h1>
          <p class="text-secondary mb-0">感谢您的参与，每个访客仅限提交一次。</p>
        </div>
      </div>

      <template v-else>
        <header class="text-center mb-4">
          <h1 class="h3 mb-2">{{ form.title }}</h1>
          <p v-if="form.description" class="text-secondary mb-0">{{ form.description }}</p>
        </header>

        <div v-if="submitError" class="alert alert-danger mb-4" role="alert">
          <p class="mb-0">{{ submitError }}</p>
        </div>

        <FormRenderer
          ref="formRef"
          :schema="form.schema"
          :oncePerPhone="form.config?.oncePerPhone"
          :oncePerEmail="form.config?.oncePerEmail"
          :formId="route.params.id"
          @submit="handleSubmit"
          @sendSmsCode="handleSendSmsCode"
          @sendEmailCode="handleSendEmailCode"
        />
      </template>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formApi, getGuestToken } from '../api'
import FormRenderer from '../components/FormRenderer.vue'

const route = useRoute()
const router = useRouter()

const formRef = ref(null)
const form = ref({})
const loading = ref(true)
const loadError = ref(null)
const submitError = ref(null)
const alreadySubmitted = ref(false)

// 检查本地是否有提交记录
function checkLocalStorage(formId) {
  const key = `hongs_form_submitted_${formId}`
  const token = getGuestToken()
  const submitted = localStorage.getItem(key)
  return submitted === token
}

// 记录访客已提交此表单
function markSubmitted(formId) {
  const key = `hongs_form_submitted_${formId}`
  const token = getGuestToken()
  localStorage.setItem(key, token)
}

async function loadForm() {
  loading.value = true
  loadError.value = null

  try {
    const data = await formApi.getFormSchema(route.params.id)
    form.value = data
    
    // 如果启用了访客限填一次
    if (data.config?.oncePerGuest) {
      // 先检查本地存储（快速检查）
      const localSubmitted = checkLocalStorage(route.params.id)
      
      if (localSubmitted) {
        alreadySubmitted.value = true
      } else {
        // 再调用后端检查（确保准确性）
        const result = await formApi.checkFormRecordSubmitted(route.params.id)
        if (result.submitted) {
          alreadySubmitted.value = true
          // 同步到本地存储
          markSubmitted(route.params.id)
        }
      }
    }
  } catch (err) {
    console.error('[FormView] 加载表单失败:', err)
    loadError.value = err.message || '加载表单失败'
  } finally {
    loading.value = false
  }
}

async function handleSendSmsCode(formId, phone, verifyToken) {
  try {
    await formApi.sendSmsCode(formId, phone, verifyToken)
    alert('验证码发送成功')
  } catch (err) {
    console.error('[FormView] 发送短信验证码失败:', err)
    submitError.value = err.message || '发送验证码失败'
  }
}

async function handleSendEmailCode(formId, email, verifyToken) {
  try {
    await formApi.sendEmailCode(formId, email, verifyToken)
    alert('验证码发送成功')
  } catch (err) {
    console.error('[FormView] 发送邮箱验证码失败:', err)
    submitError.value = err.message || '发送验证码失败'
  }
}

async function handleSubmit(data) {
  submitError.value = null
  formRef.value?.clearErrors()

  try {
    const { phoneCode, emailCode, ...formData } = data
    await formApi.createFormRecord(route.params.id, formData, null, phoneCode, emailCode)
    // 标记为已提交
    markSubmitted(route.params.id)
    router.push({ name: 'success', params: { id: route.params.id } })
  } catch (err) {
    console.error('[FormView] 提交失败:', err)
    
    if (err.data?.errors) {
      formRef.value?.setErrors(err.data.errors)
    } else {
      submitError.value = err.message || '未知错误'
    }
  }
}

onMounted(loadForm)
</script>
