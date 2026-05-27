<template>
  <form @submit.prevent="handleSubmit" class="card shadow-sm border-0">
    <div class="card-body p-4 p-md-5">
      <div v-for="(field, key) in schema.properties" :key="key" class="mb-4">
        <legend v-if="field.inputType === 'legend'" class="form-section-legend">{{ field.title || key }}</legend>

        <div v-else-if="field.inputType === 'figure'" v-html="renderMarkdown(field.description || '')"></div>

        <template v-else>
          <label class="form-label fw-medium">
            {{ field.label || field.title || key }}
            <span v-if="isRequired(key, field)" class="text-danger ms-1">*</span>
          </label>

          <div v-if="(key === 'phone' && oncePerPhone) || (key === 'email' && oncePerEmail)" class="input-group">
            <component
              :is="getFieldComponent(field)"
              v-model="formData[key]"
              :field="field"
              :name="key"
              :error="errors[key]"
            />
            <button
              type="button"
              class="btn btn-outline-secondary"
              :disabled="captchaSending || !formData[key] || (countdown[key] && countdown[key] > 0)"
              @click="handleSendCaptcha(key)"
            >
              <span v-if="captchaSending" class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
              {{ captchaSending ? '发送中...' : (countdown[key] && countdown[key] > 0 ? `${countdown[key]}秒后重发` : '获取验证码') }}
            </button>
          </div>
          <component
            v-else
            :is="getFieldComponent(field)"
            v-model="formData[key]"
            :field="field"
            :name="key"
            :error="errors[key]"
          />

          <!-- 验证码输入框 -->
          <div v-if="(key === 'phone' && oncePerPhone) || (key === 'email' && oncePerEmail)" class="mt-2">
            <input
              type="text"
              :class="['form-control', { 'is-invalid': errors[`${key}Code`] }]"
              :placeholder="`请输入${key === 'phone' ? '手机' : '邮箱'}验证码`"
              v-model="captchaCodes[key]"
              autocomplete="off"
            />
            <div v-if="errors[`${key}Code`]" class="invalid-feedback d-block">{{ errors[`${key}Code`] }}</div>
          </div>

          <div v-if="field.description" class="form-text">{{ field.description }}</div>
          <div v-if="errors[key]" class="invalid-feedback d-block">{{ errors[key] }}</div>
        </template>
      </div>

      <button type="submit" class="btn btn-primary w-100" :disabled="submitting">
        <span v-if="submitting" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
        {{ submitting ? '提交中...' : '提交' }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { ref, reactive, onUnmounted } from 'vue'
import MarkdownIt from 'markdown-it'
import FormInput from './fields/FormInput.vue'
import FormTextarea from './fields/FormTextarea.vue'
import FormSelect from './fields/FormSelect.vue'
import FormRadio from './fields/FormRadio.vue'
import FormCheckbox from './fields/FormCheckbox.vue'

const props = defineProps({
  schema: {
    type: Object,
    required: true
  },
  oncePerPhone: {
    type: Boolean,
    default: false
  },
  oncePerEmail: {
    type: Boolean,
    default: false
  },
  formId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['submit', 'sendSmsCode', 'sendEmailCode'])

const formData = reactive({})
const captchaCodes = reactive({})
const errors = reactive({})
const submitting = ref(false)
const captchaSending = ref(false)
const countdown = reactive({ phone: 0, email: 0 })
const timers = reactive({ phone: null, email: null })
const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true })

function isRequired(key, field) {
  return field.required === true || props.schema.required?.includes(key)
}

function renderMarkdown(content) {
  return markdown.render(content)
}

function getFieldComponent(field) {
  const inputType = field.inputType || field.type

  switch (inputType) {
    case 'textarea':
      return FormTextarea
    case 'select':
      return FormSelect
    case 'radio':
      return FormRadio
    case 'checkbox':
    case 'check':
      return FormCheckbox
    default:
      return FormInput
  }
}

function initDefaults() {
  for (const [key, field] of Object.entries(props.schema.properties || {})) {
    if (field.default !== undefined) {
      formData[key] = field.default
    } else if (field.type === 'array') {
      formData[key] = []
    } else if (field.type === 'boolean') {
      formData[key] = false
    }
  }
}

function clearErrors() {
  Object.keys(errors).forEach(key => {
    delete errors[key]
  })
}

function setErrors(errorData) {
  clearErrors()
  
  if (Array.isArray(errorData)) {
    for (const error of errorData) {
      const fieldName = error.instanceName || error.instancePath?.replace(/^\//, '').replace(/\//g, '.')
      if (fieldName && error.message) {
        errors[fieldName] = error.message
      }
    }
  } else {
    Object.assign(errors, errorData)
  }
}

function startCountdown(fieldKey) {
  if (timers[fieldKey]) {
    clearInterval(timers[fieldKey])
  }
  
  countdown[fieldKey] = 60
  timers[fieldKey] = setInterval(() => {
    countdown[fieldKey]--
    if (countdown[fieldKey] <= 0) {
      clearInterval(timers[fieldKey])
      timers[fieldKey] = null
    }
  }, 1000)
}

async function handleSendCaptcha(fieldKey) {
  captchaSending.value = true
  try {
    const value = formData[fieldKey]
    const verifyToken = await window.verifySlideCaptcha()
    
    if (fieldKey === 'phone') {
      await emit('sendSmsCode', props.formId, value, verifyToken)
    } else if (fieldKey === 'email') {
      await emit('sendEmailCode', props.formId, value, verifyToken)
    }
    
    // 发送成功后开始倒计时
    startCountdown(fieldKey)
  } catch (err) {
    errors[`${fieldKey}Code`] = err.message || '发送验证码失败'
  } finally {
    captchaSending.value = false
  }
}

onUnmounted(() => {
  // 组件卸载时清理所有定时器
  if (timers.phone) clearInterval(timers.phone)
  if (timers.email) clearInterval(timers.email)
})

async function handleSubmit() {
  clearErrors()
  submitting.value = true

  try {
    // 日期组件已直接返回时间戳，无需额外转换
    const submitData = {
      ...formData,
      phoneCode: captchaCodes.phone || null,
      emailCode: captchaCodes.email || null
    }
    await emit('submit', submitData)
  } finally {
    submitting.value = false
  }
}

defineExpose({
  setErrors,
  clearErrors,
  formData,
  captchaCodes
})

initDefaults()
</script>
