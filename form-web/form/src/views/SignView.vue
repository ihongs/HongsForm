<template>
  <main class="container py-5">
    <div class="mx-auto" style="max-width: 540px;">
      <div class="card shadow-sm border-0">
        <div class="card-body text-center p-5">
          <div v-if="loading" class="py-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">加载中...</span>
            </div>
            <p class="text-secondary mt-3">加载中...</p>
          </div>

          <div v-else-if="error" class="py-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="#ef4444" class="mb-3" viewBox="0 0 24 24" stroke-width="0" stroke="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <h2 class="h4 mb-3 text-danger">错误</h2>
            <p class="text-secondary">{{ error }}</p>
          </div>

          <!-- 代理模式 -->
          <div v-else-if="isAgentMode">
            <div v-if="record.status === 2">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="#10b981" class="mb-3" viewBox="0 0 24 24" stroke-width="0" stroke="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <h2 class="h4 mb-3 text-success">已签到</h2>
            </div>

            <div v-else>
              <div class="mb-4 text-start">
                <h2 class="h4 mb-2">{{ form.title || form.name }}</h2>
                <div class="card border-0 bg-light">
                  <div class="card-body">
                    <p class="mb-1"><strong>姓名：</strong>{{ record.data.name }}</p>
                    <p v-for="(value, key) in record.data" :key="key" v-if="key !== 'name'">
                      <strong>{{ key }}：</strong>{{ value }}
                    </p>
                    <p class="mb-0 text-muted small">
                      提交时间：{{ record.createdAt.toLocaleString() }}
                    </p>
                  </div>
                </div>
              </div>

              <button 
                class="btn btn-success btn-lg w-100" 
                :disabled="signing" 
                @click="handleConfirmSign"
              >
                <span v-if="signing" class="spinner-border spinner-border-sm me-2" role="status"></span>
                {{ signing ? '处理中...' : '确认签到' }}
              </button>
            </div>
          </div>

          <!-- 客户模式 -->
          <div v-else>
            <div v-if="record.status === 2">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="#10b981" class="mb-3" viewBox="0 0 24 24" stroke-width="0" stroke="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <h2 class="h4 mb-3 text-success">签到成功</h2>
            </div>

            <div v-else>
              <h2 class="h4 mb-3">请保存您的签到码</h2>
              <p class="text-secondary mb-4">{{ form.title || form.name }}</p>
              
              <div class="mb-4">
                <QRCode :value="currentUrl" :size="200" />
              </div>

              <div v-if="form.config?.signWord" class="alert alert-info">
                <strong>签到暗语：</strong>{{ form.config.signWord }}
              </div>

              <p class="text-muted small">请保存或截图此页面，签到时出示此二维码</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formApi } from '../api'
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
    const result = await formApi.checkRecordChecksum(
      route.params.id,
      route.params.checksum
    )

    if (!result.success) {
      error.value = result.message
      return
    }

    record.value = result.record
    form.value = result.form
    isAgentMode.value = result.isAgentMode
  } catch (err) {
    error.value = err.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function handleConfirmSign() {
  if (signing.value) return
  signing.value = true

  try {
    await fetch('/api/rpc/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'formRecord.confirmSign',
        params: {
          id: route.params.id,
          formId: route.params.formId
        },
        id: Date.now()
      }),
      credentials: 'include'
    })

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
