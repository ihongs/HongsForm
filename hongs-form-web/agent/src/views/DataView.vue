<template>
  <main class="container py-4">
    <div class="d-flex flex-column flex-md-row justify-content-between gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">提交数据</h1>
        <p class="text-secondary mb-0">{{ formTitle }}</p>
      </div>
      <router-link class="btn btn-outline-secondary align-self-start" to="/forms">返回列表</router-link>
    </div>

    <div class="row g-3 mb-4">
      <div class="col-6 col-md-3">
        <section class="card border-0 shadow-sm">
          <div class="card-body">
            <div class="h3 mb-1">{{ stats.total ?? '-' }}</div>
            <div class="text-secondary small">总提交</div>
          </div>
        </section>
      </div>
      <div class="col-6 col-md-3">
        <section class="card border-0 shadow-sm">
          <div class="card-body">
            <div class="h3 mb-1">{{ stats.today ?? '-' }}</div>
            <div class="text-secondary small">今日提交</div>
          </div>
        </section>
      </div>
    </div>

    <div v-if="loading" class="card border-0 shadow-sm">
      <div class="card-body text-center text-secondary py-5">加载中...</div>
    </div>
    <div v-else-if="error" class="alert alert-danger" role="alert">{{ error }}</div>
    <div v-else-if="items.length === 0" class="card border-0 shadow-sm">
      <div class="card-body text-center text-secondary py-5">暂无数据</div>
    </div>
    <div v-else class="card border-0 shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>提交时间</th>
              <th>渠道</th>
              <th>数据</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item._id">
              <td class="text-nowrap">{{ formatTime(item.createdAt) }}</td>
              <td>{{ item.channel || '-' }}</td>
              <td><pre class="mb-0 small">{{ JSON.stringify(item.data, null, 2) }}</pre></td>
              <td><button class="btn btn-outline-danger btn-sm" type="button" @click="remove(item)">删除</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { agentApi } from '../api'

const route = useRoute()
const loading = ref(true)
const error = ref('')
const items = ref([])
const stats = ref({})
const formTitle = ref('')

function formatTime(value) {
  return value ? new Date(value).toLocaleString() : '-'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [form, dataResult, statsResult] = await Promise.all([
      agentApi.getForm(route.params.id),
      agentApi.listData({ formId: route.params.id }),
      agentApi.getStats(route.params.id)
    ])
    formTitle.value = form.title || form.name
    items.value = dataResult.items || []
    stats.value = statsResult
  } catch (err) {
    error.value = err.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function remove(item) {
  if (!confirm('确定删除这条数据吗？')) return
  await agentApi.deleteData(item._id)
  await load()
}

onMounted(load)
</script>
