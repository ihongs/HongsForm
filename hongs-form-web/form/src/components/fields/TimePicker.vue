<template>
  <div class="input-group" style="width: auto;">
    <input
      type="number"
      class="form-control text-center"
      style="width: 4em;"
      v-model.number="hour"
      placeholder="时"
      min="0"
      max="23"
      @change="emitValue"
    />
    <span class="input-group-text" style="">时</span>
    <input
      type="number"
      class="form-control text-center"
      style="width: 4em;"
      v-model.number="minute"
      placeholder="分"
      min="0"
      max="59"
      @change="emitValue"
    />
    <span class="input-group-text" style="">分</span>
    <span class="input-group-text">
      <a href="#" @click.prevent="setNow" title="设为当前时间">
        <i class="bi bi-smartwatch"></i>
      </a>
    </span>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const hour = ref(new Date().getHours())
const minute = ref(new Date().getMinutes())

// 监听外部 modelValue 变化
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    const date = new Date(newVal)
    hour.value = date.getHours()
    minute.value = date.getMinutes()
  }
}, { immediate: true })

// 发射新值
function emitValue() {
  const today = new Date()
  today.setHours(hour.value || 0)
  today.setMinutes(minute.value || 0)
  today.setSeconds(0)
  today.setMilliseconds(0)
  emit('update:modelValue', today.getTime())
}

// 设为当前时间
function setNow() {
  const now = new Date()
  hour.value = now.getHours()
  minute.value = now.getMinutes()
  emitValue()
}

// 公共方法：获取 Date 对象
function getDate() {
  const today = new Date()
  today.setHours(hour.value || 0)
  today.setMinutes(minute.value || 0)
  today.setSeconds(0)
  today.setMilliseconds(0)
  return today
}

// 公共方法：获取时间戳
function getTimestamp() {
  return getDate().getTime()
}

defineExpose({
  getDate,
  getTimestamp
})
</script>
