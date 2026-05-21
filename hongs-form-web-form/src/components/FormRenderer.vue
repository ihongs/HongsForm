<template>
  <form @submit.prevent="handleSubmit" class="form-card">
    <div v-for="(field, key) in schema.properties" :key="key" class="form-group">
      <label class="form-label">
        {{ field.title || key }}
        <span v-if="schema.required?.includes(key)" class="required">*</span>
      </label>

      <component
        :is="getFieldComponent(field)"
        v-model="formData[key]"
        :field="field"
        :name="key"
        :error="errors[key]"
      />

      <div v-if="errors[key]" class="form-error">{{ errors[key] }}</div>
    </div>

    <button type="submit" class="form-submit" :disabled="submitting">
      {{ submitting ? '提交中...' : '提交' }}
    </button>
  </form>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
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

// 根据字段类型选择组件
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
      return FormCheckbox
    default:
      return FormInput
  }
}

// 初始化表单默认值
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

// 清除错误
function clearErrors() {
  Object.keys(errors).forEach(key => {
    delete errors[key]
  })
}

// 设置错误
function setErrors(errorMap) {
  Object.assign(errors, errorMap)
}

// 提交处理
async function handleSubmit() {
  clearErrors()
  submitting.value = true

  try {
    await emit('submit', { ...formData })
  } finally {
    submitting.value = false
  }
}

// 暴露方法给父组件
defineExpose({
  setErrors,
  clearErrors
})

// 初始化
initDefaults()
</script>
