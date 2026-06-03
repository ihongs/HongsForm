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
  <DateTimePicker
    v-else-if="field.inputType === 'datetime'"
    :model-value="modelValue"
    :class="{ 'is-invalid': error }"
    @update:modelValue="$emit('update:modelValue', $event)"
  />
  <DatePicker
    v-else-if="field.inputType === 'date'"
    :model-value="modelValue"
    :class="{ 'is-invalid': error }"
    @update:modelValue="$emit('update:modelValue', $event)"
  />
  <TimePicker
    v-else-if="field.inputType === 'time'"
    :model-value="modelValue"
    :class="{ 'is-invalid': error }"
    @update:modelValue="$emit('update:modelValue', $event)"
  />
  <FormImage
    v-else-if="field.inputType === 'image'"
    :model-value="modelValue"
    :field="field"
    :name="name"
    :error="error"
    @update:modelValue="$emit('update:modelValue', $event)"
  />
  <FormFile
    v-else-if="field.inputType === 'file'"
    :model-value="modelValue"
    :field="field"
    :name="name"
    :error="error"
    @update:modelValue="$emit('update:modelValue', $event)"
  />
  <div v-if="field.inputType === 'range'">
    <input
      :type="getInputType()"
      :value="modelValue"
      @input="handleInput"
      :class="['form-range', { 'is-invalid': error }]"
      :min="field.minimum"
      :max="field.maximum"
      step="any"
    />
    <output class="form-range-output" style="min-width: 3ch">{{ modelValue ?? field.minimum ?? 0 }}</output>
  </div>
  <input
    v-else
    :type="getInputType()"
    :value="modelValue"
    @input="handleInput"
    :class="['form-control', { 'is-invalid': error }]"
    :placeholder="field.placeholder || ''"
    :min="field.minimum"
    :max="field.maximum"
    step="any"
  />
</template>

<script setup>
import DateTimePicker from './DateTimePicker.vue'
import DatePicker from './DatePicker.vue'
import TimePicker from './TimePicker.vue'
import FormFile from './FormFile.vue'
import FormImage from './FormImage.vue'

const props = defineProps({
  modelValue: [String, Number, Boolean, Date],
  field: Object,
  name: String,
  error: [String, Object]
})

const emit = defineEmits(['update:modelValue'])

function handleInput(event) {
  const value = event.target.value
  if (props.field.type === 'number' || props.field.type === 'integer') {
    emit('update:modelValue', value === '' ? '' : Number(value))
    return
  }
  emit('update:modelValue', value)
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
