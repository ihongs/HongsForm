<template>
  <textarea
    :value="modelValue"
    @input="$emit('update:modelValue', $event.target.value)"
    :class="['form-control', { 'is-invalid': error }]"
    :placeholder="field.placeholder || ''"
    rows="4"
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
