<template>
  <div class="d-grid gap-2">
    <div v-for="item in options" :key="item.value" class="form-check">
      <input
        class="form-check-input"
        type="radio"
        :id="`${name}-${item.value}`"
        :name="name"
        :value="item.value"
        :checked="modelValue === item.value"
        @change="$emit('update:modelValue', item.value)"
      />
      <label class="form-check-label" :for="`${name}-${item.value}`">{{ item.label }}</label>
    </div>
  </div>
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
