<template>
  <main class="container py-4">
    <div class="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">表单管理</h1>
        <p class="text-secondary mb-0">查看全站表单和提交数据，不提供表单创建和修改操作</p>
      </div>
      <form class="d-flex flex-wrap gap-2 align-self-start" @submit.prevent="searchForms">
        <input v-model.trim="keyword" class="form-control" style="width: 220px" placeholder="搜索表单" />
        <select v-model="status" class="form-select" style="width: 140px">
          <option value="">全部状态</option>
          <option value="1">草稿</option>
          <option value="2">已发布</option>
          <option value="0">禁用</option>
        </select>
        <button class="btn btn-outline-primary" type="submit">查询</button>
      </form>
    </div>

    <div v-if="loading" class="card shadow-sm">
      <div class="card-body text-center text-secondary py-5">加载中...</div>
    </div>
    <div v-else-if="error" class="alert alert-danger" role="alert">{{ error }}</div>
    <div v-else-if="forms.length === 0" class="card shadow-sm">
      <div class="card-body text-center text-secondary py-5">暂无表单</div>
    </div>
    <template v-else>
      <div class="row g-3">
        <div v-for="form in forms" :key="form._id" class="col-12">
          <section class="card shadow-sm">
            <div class="card-body d-flex flex-column flex-lg-row justify-content-between gap-3">
              <div>
                <h2 class="h5 mb-2">{{ form.title || form.name }}</h2>
                <p class="text-secondary mb-3">{{ form.description || '无描述' }}</p>
                <div class="d-flex flex-wrap gap-2 align-items-center small text-secondary">
                  <span :class="['badge', statusClass(form.status)]">{{ statusText(form.status) }}</span>
                  <span>{{ form.name }}</span>
                  <span>{{ fieldCount(form) }} 个字段</span>
                  <span>{{ form.dataCount || 0 }} 条数据</span>
                  <span>创建者 {{ formatId(form.userId) }}</span>
                  <span>创建 {{ formatTime(form.createdAt) }}</span>
                  <span>更新 {{ formatTime(form.updatedAt) }}</span>
                </div>
              </div>
              <div class="d-flex flex-wrap gap-2 align-items-start">
                <router-link class="btn btn-outline-secondary btn-sm" :to="`/forms/${form._id}/data`">数据</router-link>
                <a v-if="form.status === 2" class="btn btn-outline-secondary btn-sm" :href="`/form/${form._id}/`" target="_blank">打开</a>
              </div>
            </div>
          </section>
        </div>
      </div>
      <div class="card shadow-sm mt-3">
        <div class="card-footer bg-body d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div class="text-secondary small">共 {{ total }} 个表单，第 {{ page }} / {{ totalPages }} 页</div>
          <div class="d-flex align-items-center gap-2">
            <select v-model.number="pageSize" class="form-select form-select-sm" style="width: 110px" @change="changePageSize">
              <option :value="10">每页 10</option>
              <option :value="20">每页 20</option>
              <option :value="50">每页 50</option>
              <option :value="100">每页 100</option>
            </select>
            <nav aria-label="表单分页">
              <ul class="pagination pagination-sm mb-0">
                <li :class="['page-item', page <= 1 ? 'disabled' : '']">
                  <button class="page-link" type="button" @click="goPage(1)">首页</button>
                </li>
                <li :class="['page-item', page <= 1 ? 'disabled' : '']">
                  <button class="page-link" type="button" @click="goPage(page - 1)">‹</button>
                </li>
                <li v-for="item in pageItems" :key="item" :class="['page-item', item === page ? 'active' : '']">
                  <button class="page-link" type="button" @click="goPage(item)">{{ item }}</button>
                </li>
                <li :class="['page-item', page >= totalPages ? 'disabled' : '']">
                  <button class="page-link" type="button" @click="goPage(page + 1)">›</button>
                </li>
                <li :class="['page-item', page >= totalPages ? 'disabled' : '']">
                  <button class="page-link" type="button" @click="goPage(totalPages)">末页</button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </template>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { adminApi } from '../api'

const loading = ref(true)
const error = ref('')
const forms = ref([])
const keyword = ref('')
const status = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const pageItems = computed(() => {
  const start = Math.max(1, page.value - 2)
  const end = Math.min(totalPages.value, start + 4)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
})

function fieldCount(form) {
  return Object.keys(form.schema?.properties || {}).length
}

function formatId(value) {
  if (!value) return '-'
  return typeof value === 'string' ? value : value.toString()
}

function formatTime(value) {
  return value ? new Date(value).toLocaleString() : '-'
}

function statusText(value) {
  if (value === 2) return '已发布'
  if (value === 1) return '草稿'
  if (value === 0) return '禁用'
  return '未知'
}

function statusClass(value) {
  if (value === 2) return 'text-bg-success'
  if (value === 1) return 'text-bg-warning'
  if (value === 0) return 'text-bg-secondary'
  return 'text-bg-light'
}

async function searchForms() {
  page.value = 1
  await loadForms()
}

async function changePageSize() {
  page.value = 1
  await loadForms()
}

async function goPage(nextPage) {
  if (nextPage < 1 || nextPage > totalPages.value || nextPage === page.value) return
  page.value = nextPage
  await loadForms()
}

async function loadForms() {
  loading.value = true
  error.value = ''
  try {
    const params = {
      keyword: keyword.value,
      page: page.value,
      pageSize: pageSize.value
    }
    if (status.value !== '') params.status = Number(status.value)
    const result = await adminApi.listForms(params)
    forms.value = result.items || []
    total.value = result.total || 0
  } catch (err) {
    error.value = err.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadForms)
</script>
