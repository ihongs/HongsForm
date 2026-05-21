<template>
  <div class="form-checkbox-group">
    <label v-for="item in options" :key="item.value" class="form-checkbox">
      <input
        type="checkbox"
        :value="item.value"
        :checked="isChecked(item.value)"
        @change="handleChange(item.value, $event.target.checked)"
      />
      <span>{{ item.label }}</span>
    </label>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: Array,
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

function isChecked(value) {
  const arr = props.modelValue || []
  return arr.includes(value)
}

function handleChange(value, checked) {
  const arr = [...(props.modelValue || [])]
  const index = arr.indexOf(value)

  if (checked && index === -1) {
    arr.push(value)
  } else if (!checked && index !== -1) {
    arr.splice(index, 1)
  }

  emit('update:modelValue', arr)
}
</script>
