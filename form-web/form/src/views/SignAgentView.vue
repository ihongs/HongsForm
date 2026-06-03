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

          <div v-else>
            <h2 class="h4 mb-2">{{ form.title || form.name }}</h2>
            <p class="text-secondary mb-4">请扫描下方二维码进行签到</p>
            
            <div class="mb-4">
              <QRCode :value="signUrl" :size="200" />
            </div>

            <div v-if="!form.config?.oncePerPhone && !form.config?.oncePerEmail" class="alert alert-warning">
              请先在表单设置中开启手机号或邮箱验证
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { formApi } from '../api'
import QRCode from '../components/QRCode.vue'

const route = useRoute()

const loading = ref(true)
const error = ref(null)
const form = ref(null)

const signUrl = computed(() => {
  const origin = window.location.origin
  return `${origin}/form/${route.params.formId}/sign-guest/${route.params.checksum}`
})

async function loadForm() {
  try {
    const result = await formApi.checkFormChecksum(
      route.params.formId,
      route.params.checksum
    )

    if (!result.success) {
      error.value = result.message
      return
    }

    form.value = result.form
  } catch (err) {
    error.value = err.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadForm()
})
</script>
