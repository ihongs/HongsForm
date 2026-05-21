<template>
  <textarea
    :value="modelValue"
    @input="$emit('update:modelValue', $event.target.value)"
    :class="['form-input', 'form-textarea', { error }]"
    :placeholder="field.placeholder || ''"
  ></textarea>
</template>

<script setup>
defineProps({
  modelValue: String,
  field: Object,
  name: String,
  error: [String, Object]
})

defineEmits(['update:modelValue'])
</script>
