<template>
  <input
    :type="getInputType()"
    :value="modelValue"
    @input="$emit('update:modelValue', $event.target.value)"
    :class="['form-input', { error }]"
    :placeholder="field.placeholder || ''"
    :min="field.minimum"
    :max="field.maximum"
    step="any"
  />
</template>

<script setup>
const props = defineProps({
  modelValue: [String, Number],
  field: Object,
  name: String,
  error: [String, Object]
})

const emit = defineEmits(['update:modelValue'])

function getInputType() {
  const type = props.field.type
  const inputType = props.field.inputType

  if (inputType && inputType !== type) {
    return inputType
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
