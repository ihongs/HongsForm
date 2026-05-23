<template>
  <select
    :value="modelValue"
    @change="$emit('update:modelValue', $event.target.value)"
    :class="['form-select', { 'is-invalid': error }]"
  >
    <option value="">请选择</option>
    <option v-for="item in options" :key="item.value" :value="item.value">
      {{ item.label }}
    </option>
  </select>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: [String, Number],
  field: Object,
  name: String,
  error: [String, Object]
})

defineEmits(['update:modelValue'])

const options = computed(() => {
  const field = props.field
  if (field.options) {
    return Object.entries(field.options).map(([value, label]) => ({ value, label }))
  }
  if (field.enum) {
    return field.enum.map(value => ({ value, label: value }))
  }
  return []
})
</script>
