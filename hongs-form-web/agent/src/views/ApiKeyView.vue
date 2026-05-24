<template>
  <main class="container py-4">
    <div class="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">API Key 管理</h1>
        <p class="text-secondary mb-0">用于 MCP 接口调用的凭证，最多 5 个</p>
      </div>
      <button class="btn btn-primary align-self-start" :disabled="loading || keys.length >= 5" @click="createKey">
        <span v-if="creating" class="spinner-border spinner-border-sm me-1"></span>
        新建 Key
      </button>
    </div>

    <div v-if="error" class="alert alert-danger" role="alert">{{ error }}</div>

    <div v-if="newKey" class="alert alert-success alert-dismissible fade show" role="alert">
      <strong>新 Key 已创建，请立即复制保存！</strong>关闭后将不再显示完整密钥。
      <div class="input-group mt-2">
        <input type="text" class="form-control font-monospace small" :value="newKey" readonly />
        <button class="btn btn-outline-success" type="button" @click="copyKey">复制</button>
      </div>
      <button type="button" class="btn-close position-absolute top-0 end-0" aria-label="关闭" @click="newKey = null"></button>
    </div>

    <div v-if="loading && keys.length === 0" class="card border-0 shadow-sm">
      <div class="card-body text-center text-secondary py-5">加载中...</div>
    </div>
    <div v-else-if="keys.length === 0" class="card border-0 shadow-sm">
      <div class="card-body text-center text-secondary py-5">暂无 API Key</div>
    </div>
    <div v-else class="card border-0 shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead>
            <tr>
              <th>名称</th>
              <th>密钥</th>
              <th>创建时间</th>
              <th class="text-end">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="key in keys" :key="key._id">
              <td>{{ key.name }}</td>
              <td><code class="font-monospace small">{{ key.sk }}</code></td>
              <td class="text-secondary small">{{ formatDate(key.createdAt) }}</td>
              <td class="text-end">
                <button class="btn btn-outline-danger btn-sm" @click="deleteKey(key._id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { agentApi } from '../api'

const loading = ref(true)
const creating = ref(false)
const error = ref('')
const keys = ref([])
const newKey = ref(null)

async function loadKeys() {
  loading.value = true
  error.value = ''
  try {
    keys.value = await agentApi.listApiKeys()
  } catch (err) {
    error.value = err.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function createKey() {
  const name = prompt('请输入 Key 名称（可选）：')
  creating.value = true
  error.value = ''
  try {
    const result = await agentApi.createApiKey(name || undefined)
    newKey.value = result.sk
    keys.value.unshift(result)
  } catch (err) {
    error.value = err.message || '创建失败'
  } finally {
    creating.value = false
  }
}

async function deleteKey(id) {
  if (!confirm('确定要删除这个 API Key 吗？')) return
  error.value = ''
  try {
    await agentApi.deleteApiKey(id)
    keys.value = keys.value.filter(k => k._id !== id)
  } catch (err) {
    error.value = err.message || '删除失败'
  }
}

function copyKey() {
  navigator.clipboard.writeText(newKey.value)
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

onMounted(loadKeys)
</script>
