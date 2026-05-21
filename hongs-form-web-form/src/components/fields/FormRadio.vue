<template>
  <div class="form-radio-group">
    <label v-for="item in options" :key="item.value" class="form-radio">
      <input
        type="radio"
        :value="item.value"
        :checked="modelValue === item.value"
        @change="$emit('update:modelValue', item.value)"
      />
      <span>{{ item.label }}</span>
    </label>
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

const emit = defineEmits(['update:modelValue'])

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
