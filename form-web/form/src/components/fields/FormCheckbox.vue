<template>
  <div v-if="isSingle">
    <div class="form-check">
      <input
        class="form-check-input"
        type="checkbox"
        :id="name"
        :checked="Boolean(modelValue)"
        @change="$emit('update:modelValue', $event.target.checked)"
      />
      <label class="form-check-label" :for="name">{{ field.label || field.title || name }}</label>
    </div>
  </div>
  <div v-else class="d-grid gap-2">
    <div v-for="item in options" :key="item.value" class="form-check">
      <input
        class="form-check-input"
        type="checkbox"
        :id="`${name}-${item.value}`"
        :value="item.value"
        :checked="isChecked(item.value)"
        @change="handleChange(item.value, $event.target.checked)"
      />
      <label class="form-check-label" :for="`${name}-${item.value}`">{{ item.label }}</label>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: [Array, Boolean],
  field: Object,
  name: String,
  error: [String, Object]
})

const emit = defineEmits(['update:modelValue'])

const isSingle = computed(() => {
  return !props.field?.items?.enum && props.field?.type !== 'array'
})

const options = computed(() => {
  const field = props.field
  const enumValues = field?.items?.enum || field?.enum || []
  if (enumValues.length > 0) {
    return enumValues.map(value => ({
      value,
      label: field.labels?.[value] ?? value
    }))
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