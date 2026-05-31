<template>
  <VueDatePicker v-model="selectedDate" picker-type="time" placeholder="选择时间" @update:modelValue="handleChange" />
</template>

<script setup>
import { ref, watch } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

const props = defineProps({
  modelValue: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const selectedDate = ref(props.modelValue ? new Date(props.modelValue) : null)

watch(() => props.modelValue, (newVal) => {
  selectedDate.value = newVal ? new Date(newVal) : null
})

function handleChange(value) {
  if (value instanceof Date) {
    emit('update:modelValue', value.getTime())
  } else {
    emit('update:modelValue', null)
  }
}

function getDate() {
  return selectedDate.value
}

function getTimestamp() {
  return selectedDate.value ? selectedDate.value.getTime() : null
}

defineExpose({
  getDate,
  getTimestamp
})
</script>
