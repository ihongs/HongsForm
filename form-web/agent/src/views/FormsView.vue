<template>
  <main class="container py-4">
    <div class="d-flex flex-column flex-md-row justify-content-between gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">我的表单</h1>
        <p class="text-secondary mb-0">设计表单、发布表单并查看提交数据</p>
      </div>
      <router-link class="btn btn-primary align-self-start" to="/forms/new">新建表单</router-link>
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
                  <span :class="['badge', form.status === 2 ? 'text-bg-success' : 'text-bg-warning']">
                    {{ form.status === 2 ? '已发布' : '草稿' }}
                  </span>
                  <span>{{ fieldCount(form) }} 个字段</span>
                  <span>{{ form.dataCount || 0 }} 条数据</span>
                  <span>创建 {{ formatTime(form.createdAt) }}</span>
                  <span>更新 {{ formatTime(form.updatedAt) }}</span>
                </div>
              </div>
              <div class="d-flex flex-wrap gap-2 align-items-start">
                <router-link class="btn btn-outline-primary btn-sm" :to="`/forms/${form._id}/design`">编辑</router-link>
                <router-link class="btn btn-outline-secondary btn-sm" :to="`/forms/${form._id}/record`">数据</router-link>
                <a v-if="form.status === 2" class="btn btn-outline-secondary btn-sm" :href="`/form/${form._id}/`" target="_blank">打开</a>
                <button class="btn btn-outline-success btn-sm" type="button" @click="togglePublish(form)">
                  {{ form.status === 2 ? '取消发布' : '发布' }}
                </button>
                <button class="btn btn-outline-danger btn-sm" type="button" @click="remove(form)">删除</button>
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
import { agentApi } from '../api'

const loading = ref(true)
const error = ref('')
const forms = ref([])
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
  return (form.fields || []).length
}

function formatTime(value) {
  return value ? new Date(value).toLocaleString() : '-'
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
    const result = await agentApi.listForms({
      page: page.value,
      pageSize: pageSize.value
    })
    forms.value = result.items || []
    total.value = result.total || 0
  } catch (err) {
    error.value = err.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function togglePublish(form) {
  if (form.status === 2) {
    await agentApi.unpublishForm(form._id)
  } else {
    await agentApi.publishForm(form._id)
  }
  await loadForms()
}

async function remove(form) {
  if (!confirm(`确定删除 ${form.title || form.name} 吗？`)) return
  await agentApi.deleteForm(form._id)
  if (forms.value.length === 1 && page.value > 1) page.value -= 1
  await loadForms()
}

onMounted(loadForms)
</script>
