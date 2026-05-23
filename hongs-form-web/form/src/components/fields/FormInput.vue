<template>
  <div v-if="field.inputType === 'switch'" class="form-check form-switch">
    <input
      class="form-check-input"
      type="checkbox"
      role="switch"
      :id="name"
      :checked="Boolean(modelValue)"
      @change="$emit('update:modelValue', $event.target.checked)"
    />
    <label class="form-check-label" :for="name">{{ modelValue ? '是' : '否' }}</label>
  </div>
  <input
    v-else
    :type="getInputType()"
    :value="field.inputType === 'file' ? undefined : modelValue"
    @input="handleInput"
    @change="handleChange"
    :class="['form-control', { 'is-invalid': error }]"
    :placeholder="field.placeholder || ''"
    :min="field.minimum"
    :max="field.maximum"
    step="any"
  />
</template>

<script setup>
const props = defineProps({
  modelValue: [String, Number, Boolean],
  field: Object,
  name: String,
  error: [String, Object]
})

const emit = defineEmits(['update:modelValue'])

function handleInput(event) {
  if (props.field.inputType === 'file') return

  const value = event.target.value
  if (props.field.type === 'number' || props.field.type === 'integer') {
    emit('update:modelValue', value === '' ? '' : Number(value))
    return
  }
  emit('update:modelValue', value)
}

function handleChange(event) {
  if (props.field.inputType !== 'file') return
  const file = event.target.files?.[0]
  emit('update:modelValue', file ? file.name : '')
}

function getInputType() {
  const type = props.field.type
  const inputType = props.field.inputType

  switch (inputType) {
    case 'email':
      return 'email'
    case 'phone':
      return 'tel'
    case 'range':
      return 'range'
    case 'datetime':
      return 'datetime-local'
    case 'date':
      return 'date'
    case 'time':
      return 'time'
    case 'file':
      return 'file'
    default:
      break
  }

  switch (type) {
    case 'integer':
    case 'number':
      return 'number'
    default:
      return 'text'
  }
}
</script>
