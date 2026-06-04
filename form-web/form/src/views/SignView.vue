<template>
  <main class="container py-5">
    <div class="mx-auto" style="max-width: 540px;">
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

      <!-- 统一显示模式 -->
      <div v-else>
        <div class="card shadow-sm border-0">
          <div class="card-header bg-primary text-white text-center">
            <h2 class="h5 mb-0">{{ form.title || form.name }}</h2>
          </div>
          <div class="card-body text-center">
            <!-- 姓名 -->
            <div class="card border-0 bg-light mb-4">
              <div class="card-body">
                <p class="mb-0 h4">{{ record.data.name }}</p>
              </div>
            </div>

            <!-- 签到暗语 -->
            <div v-if="form.config?.signWord" class="alert alert-info mb-4">
              <strong>签到暗语：</strong>{{ form.config.signWord }}
            </div>

            <!-- 二维码区域 -->
            <div class="position-relative d-inline-block mb-3" style="width: 200px; height: 200px;">
              <!-- 正常二维码 -->
              <QRCode :value="currentUrl" :size="200" />
              
              <!-- agentMode，已签到：绿色到和圈，可点 -->
              <div 
                v-if="isAgentMode && record.status === 2" 
                class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                style="cursor: pointer;"
                @click="handleCheckin"
              >
                <div class="bg-white bg-opacity-75 rounded-circle d-flex align-items-center justify-content-center" style="width: 100px; height: 100px; border: 4px solid #198754;">
                  <span class="text-success fw-bold" style="font-size: 2rem;">到</span>
                </div>
              </div>

              <!-- agentMode，未签到：蓝色到和圈，可点 -->
              <div 
                v-if="isAgentMode && record.status !== 2" 
                class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                style="cursor: pointer;"
                @click="handleCheckin"
              >
                <div class="bg-white bg-opacity-75 rounded-circle d-flex align-items-center justify-content-center" style="width: 100px; height: 100px; border: 4px solid #0d6efd;">
                  <span class="text-primary fw-bold" style="font-size: 2rem;">到</span>
                </div>
              </div>

              <!-- 非 agentMode，已签到：绿色到和圈，不可点 -->
              <div 
                v-if="!isAgentMode && record.status === 2" 
                class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
              >
                <div class="bg-white bg-opacity-75 rounded-circle d-flex align-items-center justify-content-center" style="width: 100px; height: 100px; border: 4px solid #198754;">
                  <span class="text-success fw-bold" style="font-size: 2rem;">到</span>
                </div>
              </div>

              <!-- 加载状态 -->
              <div 
                v-if="signing" 
                class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75"
              >
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">处理中...</span>
                </div>
              </div>
            </div>

          </div>
          <div class="card-footer text-center text-secondary text-sm">
            <span v-if="isAgentMode && record.status === 2">贵客到，请进</span>
            <span v-if="isAgentMode && record.status !== 2">贵客到，请点"到"签到</span>
            <span v-if="!isAgentMode && record.status === 2">签到时间：{{ record.signedAt ? new Date(record.signedAt).toLocaleString() : '-' }}</span>
            <span v-if="!isAgentMode && record.status !== 2">请收藏或截图此页面，签到时出示此二维码</span>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formApi, getAgentToken } from '../api'
import QRCode from '../components/QRCode.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref(null)
const record = ref(null)
const form = ref(null)
const isAgentMode = ref(false)
const signing = ref(false)

const currentUrl = computed(() => {
  return window.location.href
})

async function loadRecord() {
  try {
    const agentToken = getAgentToken()
    const result = await formApi.checkRecordChecksum(
      route.params.id,
      route.params.checksum,
      agentToken
    );

    if (!result.success) {
      error.value = result.message;
      return;
    }

    record.value = result.record;
    form.value = result.form;
    isAgentMode.value = result.isAgentMode;
  } catch (err) {
    error.value = err.message || '加载失败';
  } finally {
    loading.value = false;
  }
}

async function handleCheckin() {
  if (signing.value) return
  signing.value = true

  try {
    const agentToken = getAgentToken()
    await formApi.checkin(route.params.id, form.value._id, agentToken)
    record.value.status = 2
  } catch (err) {
    alert('签到失败：' + (err.message || '未知错误'))
  } finally {
    signing.value = false
  }
}

onMounted(() => {
  loadRecord()
})
</script>
