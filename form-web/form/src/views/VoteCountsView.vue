<template>
  <main class="container py-5">
    <div class="mx-auto" style="max-width: 720px;">
      <!-- 加载状态 -->
      <div v-if="loading" class="text-center text-secondary py-5">
        <div class="spinner-border mb-3" role="status" aria-hidden="true"></div>
        <div>加载中...</div>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="alert alert-danger" role="alert">
        <h2 class="h5 alert-heading">出错了</h2>
        <p class="mb-0">{{ error }}</p>
      </div>

      <!-- 统计结果展示 -->
      <div v-else>
        <div class="card shadow-sm border-0">
          <div class="card-header bg-primary text-white">
            <h2 class="h5 mb-0">{{ form.title }}</h2>
          </div>
          <div class="card-body">
            <VoteResultBar :form="form" :counts="counts" :animated="!autoRefresh" />
          </div>
          <div class="card-footer text-center text-secondary text-sm">
            统计时间：{{ countedAtStr }}
          </div>
        </div>

        <!-- 自动刷新控制 -->
        <div v-if="showAutoRefresh" class="card shadow-sm border-0 mt-3">
          <div class="card-body">
            <div class="d-flex align-items-center justify-content-between">
              <div class="form-check form-switch">
                <input 
                  class="form-check-input" 
                  type="checkbox" 
                  role="switch" 
                  id="autoRefreshSwitch"
                  v-model="autoRefresh"
                >
                <label class="form-check-label" for="autoRefreshSwitch">
                  自动刷新
                </label>
              </div>
              <select 
                v-if="autoRefresh" 
                class="form-select form-select-sm" 
                style="width: auto;"
                v-model="refreshInterval"
              >
                <option :value="30000">30 秒</option>
                <option :value="10000">10 秒</option>
                <option :value="5000">5 秒</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { formApi } from '../api'
import VoteResultBar from '../components/VoteResultBar.vue'

const route = useRoute()
const form = ref({})
const counts = ref({})
const countedAt = ref(null)
const loading = ref(true)
const error = ref(null)
const autoRefresh = ref(false)
const refreshInterval = ref(30000) // 默认 30 秒
let refreshTimer = null

const countedAtStr = computed(() => {
  if (!countedAt.value) return '未知'
  const date = new Date(countedAt.value)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
})

const showAutoRefresh = computed(() => {
  // 活动没结束（endAt 没到或为空）才显示自动刷新
  if (!form.value.endAt) return true
  const endTime = new Date(form.value.endAt).getTime()
  const now = Date.now()
  return now < endTime
})

async function loadData(refresh = false) {
  if (!refresh) {
    loading.value = true
  }
  error.value = null
  
  try {
    const countsResult = await formApi.getCounts(route.params.formId)
    counts.value = countsResult.counts || {}
    countedAt.value = countsResult.countedAt
    
    if (!refresh) {
      const formData = await formApi.getSchema(route.params.formId)
      form.value = formData
    }
  } catch (err) {
    console.error('[VoteCountsView] 加载失败:', err)
    error.value = err.message || '加载统计结果失败'
  } finally {
    if (!refresh) {
      loading.value = false
    }
  }
}

function startAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
  refreshTimer = setInterval(() => {
    loadData(true)
  }, refreshInterval.value)
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

watch(autoRefresh, (newVal) => {
  if (newVal) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
})

watch(refreshInterval, () => {
  if (autoRefresh.value) {
    startAutoRefresh()
  }
})

onMounted(() => {
  loadData()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>
