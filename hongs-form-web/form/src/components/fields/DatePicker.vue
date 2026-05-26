<template>
  <div class="input-group" style="width: auto;">
    <input
      type="number"
      class="form-control text-center"
      style="width: 6em;"
      v-model.number="year"
      placeholder="年"
      min="1970"
      max="2100"
      @change="handleMonthChange"
    />
    <span class="input-group-text" style="">年</span>
    <input
      type="number"
      class="form-control text-center"
      style="width: 4em;"
      v-model.number="month"
      placeholder="月"
      min="1"
      max="12"
      @change="handleMonthChange"
    />
    <span class="input-group-text" style="">月</span>
    <input
      type="number"
      class="form-control text-center"
      style="width: 4em;"
      v-model.number="day"
      placeholder="日"
      :min="1"
      :max="maxDay"
      @change="emitValue"
    />
    <span class="input-group-text" style="">日</span>
    <span class="input-group-text">
      <a href="#" @click.prevent="setNow" title="设为今天">
        <i class="bi bi-smartwatch"></i>
      </a>
    </span>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const year = ref(new Date().getFullYear())
const month = ref(new Date().getMonth() + 1)
const day = ref(new Date().getDate())

// 获取当月最大天数
const maxDay = computed(() => {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  const isLeapYear = (year.value % 4 === 0 && year.value % 100 !== 0) || year.value % 400 === 0
  const baseDays = daysInMonth[month.value - 1] || 31
  return month.value === 2 && isLeapYear ? 29 : baseDays
})

// 监听外部 modelValue 变化
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    const date = new Date(newVal)
    year.value = date.getFullYear()
    month.value = date.getMonth() + 1
    day.value = date.getDate()
  }
}, { immediate: true })

// 处理月份变化，调整日期
function handleMonthChange() {
  if (day.value > maxDay.value) {
    day.value = maxDay.value
  }
  emitValue()
}

// 发射新值
function emitValue() {
  if (!year.value || !month.value || !day.value) {
    emit('update:modelValue', null)
    return
  }
  const date = new Date(year.value, month.value - 1, day.value)
  emit('update:modelValue', date.getTime())
}

// 设为今天
function setNow() {
  const now = new Date()
  year.value = now.getFullYear()
  month.value = now.getMonth() + 1
  day.value = now.getDate()
  emitValue()
}

// 公共方法：获取 Date 对象
function getDate() {
  if (!year.value || !month.value || !day.value) {
    return null
  }
  return new Date(year.value, month.value - 1, day.value)
}

// 公共方法：获取时间戳
function getTimestamp() {
  const date = getDate()
  return date ? date.getTime() : null
}

defineExpose({
  getDate,
  getTimestamp
})
</script>
