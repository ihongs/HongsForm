<template>
  <form @submit.prevent="handleSubmit" class="card shadow-sm border-0">
    <div class="card-body p-4 p-md-5">
      <div v-for="(field, key) in schema.properties" :key="key" class="mb-4">
        <label class="form-label fw-medium">
          {{ field.label || field.title || key }}
          <span v-if="isRequired(key, field)" class="text-danger ms-1">*</span>
        </label>

        <component
          :is="getFieldComponent(field)"
          v-model="formData[key]"
          :field="field"
          :name="key"
          :error="errors[key]"
        />

        <div v-if="field.description" class="form-text">{{ field.description }}</div>
        <div v-if="errors[key]" class="invalid-feedback d-block">{{ errors[key] }}</div>
      </div>

      <button type="submit" class="btn btn-primary w-100" :disabled="submitting">
        <span v-if="submitting" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
        {{ submitting ? '提交中...' : '提交' }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { ref, reactive } from 'vue'
import FormInput from './fields/FormInput.vue'
import FormTextarea from './fields/FormTextarea.vue'
import FormSelect from './fields/FormSelect.vue'
import FormRadio from './fields/FormRadio.vue'
import FormCheckbox from './fields/FormCheckbox.vue'

const props = defineProps({
  schema: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['submit'])

const formData = reactive({})
const errors = reactive({})
const submitting = ref(false)

function isRequired(key, field) {
  return field.required === true || props.schema.required?.includes(key)
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

function setErrors(errorMap) {
  Object.assign(errors, errorMap)
}

async function handleSubmit() {
  clearErrors()
  submitting.value = true

  try {
    await emit('submit', { ...formData })
  } finally {
    submitting.value = false
  }
}

defineExpose({
  setErrors,
  clearErrors
})

initDefaults()
</script>
