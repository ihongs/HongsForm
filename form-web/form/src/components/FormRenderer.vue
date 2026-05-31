<template>
  <FormScript
    v-if="script"
    ref="formScriptRef"
    :script="script"
    :fields="fields"
    v-model="formData"
    @update:fieldChanges="fieldChanges = $event"
  />

  <form @submit.prevent="handleSubmit" class="card shadow-sm border-0">
    <div class="card-body p-4 p-md-5">
      <template v-for="field in fields" :key="field.name">
        <div v-if="!isFieldHidden(field.name)" class="mb-4">
          <legend v-if="field.inputType === 'legend'" class="form-section-legend">{{ field.title || field.name }}</legend>

          <div v-else-if="field.inputType === 'figure'" v-html="renderMarkdown(field.description || '')"></div>

          <template v-else>
            <label class="form-label fw-medium">
              {{ field.label || field.title || field.name }}
              <span v-if="isRequired(field)" class="text-danger ms-1">*</span>
            </label>

            <div v-if="(field.name === 'phone' && oncePerPhone) || (field.name === 'email' && oncePerEmail)" class="input-group">
              <component
                :is="getFieldComponent(field)"
                v-model="formData[field.name]"
                :field="field"
                :name="field.name"
                :error="errors[field.name]"
                @update:modelValue="(v) => { formScriptRef?.notifyChange(field.name, v); delete errors[field.name] }"
              />
              <button
                type="button"
                class="btn btn-outline-secondary"
                @click="handleSendCaptcha(field.name)"
              >
                <span v-if="captchaSending" class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
                {{ captchaSending ? '发送中...' : (countdown[field.name] && countdown[field.name] > 0 ? `${countdown[field.name]}秒后重发` : '获取验证码') }}
              </button>
            </div>
            <component
              v-else
              :is="getFieldComponent(field)"
              v-model="formData[field.name]"
              :field="field"
              :name="field.name"
              :error="errors[field.name]"
              @update:modelValue="(v) => { formScriptRef?.notifyChange(field.name, v); delete errors[field.name] }"
            />

            <div v-if="(field.name === 'phone' && oncePerPhone) || (field.name === 'email' && oncePerEmail)" class="mt-2">
              <input
                type="text"
                :class="['form-control', { 'is-invalid': errors[`${field.name}Code`] }]"
                :placeholder="`请输入${field.name === 'phone' ? '手机' : '邮箱'}验证码`"
                v-model="captchaCodes[field.name]"
                autocomplete="one-time-code"
              />
              <div v-if="errors[`${field.name}Code`]" class="invalid-feedback d-block">{{ errors[`${field.name}Code`] }}</div>
            </div>

            <div v-if="field.description" class="form-text">{{ field.description }}</div>
            <div v-if="errors[field.name]" class="invalid-feedback d-block">{{ errors[field.name] }}</div>
          </template>
        </div>
      </template>

      <button type="submit" class="btn btn-primary w-100" :disabled="submitting">
        <span v-if="submitting" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
        {{ submitting ? '提交中...' : '提交' }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive, onUnmounted, watch } from 'vue'
import MarkdownIt from 'markdown-it'
import FormInput from './fields/FormInput.vue'
import FormTextarea from './fields/FormTextarea.vue'
import FormSelect from './fields/FormSelect.vue'
import FormRadio from './fields/FormRadio.vue'
import FormCheckbox from './fields/FormCheckbox.vue'
import FormScript from './FormScript.vue'
import type { FieldChanges } from '../utils/form-script'

const zodMessages: Record<string, (params: Record<string, unknown>) => string> = {
  invalid_type: (p) => `类型应为 ${p.expected}`,
  too_small: (p) => `最小值为 ${p.minimum}`,
  too_big: (p) => `最大值为 ${p.maximum}`,
  invalid_format: () => '格式无效',
  not_multiple_of: (p) => `必须是 ${p.multipleOf} 的倍数`
}

function translateZodError(code: string, params?: Record<string, unknown>): string {
  const translator = zodMessages[code]
  if (translator && params) {
    return translator(params)
  }
  return code
}

const props = defineProps<{
  fields: Array<{
    name: string
    inputType?: string
    type?: string
    options?: Array<{ label: string; value: unknown }>
    value?: unknown
    hidden?: boolean
    required?: boolean
    label?: string
    title?: string
    description?: string
    default?: unknown
  }>
  oncePerPhone?: boolean
  oncePerEmail?: boolean
  formId?: string
  script?: string
}>()

const emit = defineEmits<{
  submit: [data: Record<string, unknown>]
  sendSmsCode: [formId: string, phone: string, verifyToken: string]
  sendEmailCode: [formId: string, email: string, verifyToken: string]
}>()

const formData = reactive<Record<string, unknown>>({})
const captchaCodes = reactive<Record<string, string>>({})
const errors = reactive<Record<string, string>>({})
const submitting = ref(false)
const captchaSending = ref(false)
const countdown = reactive<Record<string, number>>({ phone: 0, email: 0 })
const timers = reactive<Record<string, ReturnType<typeof setInterval> | null>>({ phone: null, email: null })
const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true })
const fieldChanges = ref<FieldChanges>({})
const formScriptRef = ref<InstanceType<typeof FormScript> | null>(null)

function isFieldHidden(fieldName: string): boolean {
  return fieldChanges.value[fieldName]?.hidden ?? false
}

function isRequired(field: { required?: boolean }): boolean {
  return field.required === true
}

function renderMarkdown(content: string): string {
  return markdown.render(content)
}

function getFieldComponent(field: { inputType?: string; type?: string }) {
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
  for (const field of (props.fields || [])) {
    if (field.default !== undefined) {
      formData[field.name] = field.default
    } else if (field.type === 'array') {
      formData[field.name] = []
    } else if (field.type === 'boolean') {
      formData[field.name] = false
    }
  }
}

function clearErrors() {
  Object.keys(errors).forEach(key => {
    delete errors[key]
  })
}

function setErrors(errorData: unknown) {
  clearErrors()

  if (Array.isArray(errorData)) {
    for (const error of errorData) {
      const err = error as { path?: string[]; code?: string; message?: string; params?: Record<string, unknown> }
      if (err.path && err.path.length > 0) {
        const fieldName = err.path.join('.')
        const errorMessage = err.code ? translateZodError(err.code, err.params) : (err.message || '未知错误')
        errors[fieldName] = errorMessage
      }
    }
  } else if (errorData && typeof errorData === 'object') {
    const data = errorData as { errors?: unknown[] }
    if (data.errors && Array.isArray(data.errors)) {
      setErrors(data.errors)
      return
    }
    Object.assign(errors, errorData as Record<string, string>)
  }
}

function startCountdown(fieldKey: string) {
  if (timers[fieldKey]) {
    clearInterval(timers[fieldKey]!)
  }

  countdown[fieldKey] = 60
  timers[fieldKey] = setInterval(() => {
    countdown[fieldKey]--
    if (countdown[fieldKey] <= 0) {
      clearInterval(timers[fieldKey]!)
      timers[fieldKey] = null
    }
  }, 1000)
}

async function handleSendCaptcha(fieldKey: string) {
  if (captchaSending.value) {
    return
  }
  if (countdown[fieldKey] && countdown[fieldKey] > 0) {
    return
  }
  const value = formData[fieldKey]
  if (!value) {
    const fieldLabel = fieldKey === 'phone' ? '手机号' : '邮箱'
    errors[fieldKey] = `请填写${fieldLabel}`
    return
  }

  try {
    const verifyToken = await window.verifySlideCaptcha()
    captchaSending.value = true

    if (fieldKey === 'phone') {
      emit('sendSmsCode', props.formId, value as string, verifyToken)
    } else if (fieldKey === 'email') {
      emit('sendEmailCode', props.formId, value as string, verifyToken)
    }

    startCountdown(fieldKey)
  } catch (err) {
    errors[`${fieldKey}Code`] = (err as Error).message || '发送验证码失败'
  } finally {
    captchaSending.value = false
  }
}

watch(() => props.fields, () => {
  initDefaults()
}, { immediate: true })

onUnmounted(() => {
  if (timers.phone) clearInterval(timers.phone)
  if (timers.email) clearInterval(timers.email)
})

async function handleSubmit() {
  clearErrors()
  submitting.value = true

  try {
    const submitData = {
      ...formData,
      phoneCode: captchaCodes.phone || null,
      emailCode: captchaCodes.email || null
    }
    emit('submit', submitData)
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
