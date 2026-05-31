<template>
  <main class="container py-4">
    <div class="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">首页</h1>
        <p class="text-secondary mb-0">查看表单发布和提交概况</p>
      </div>
      <router-link class="btn btn-primary align-self-start" to="/forms/new">新建表单</router-link>
    </div>

    <div v-if="loading" class="card shadow-sm">
      <div class="card-body text-center text-secondary py-5">加载中...</div>
    </div>
    <div v-else-if="error" class="alert alert-danger" role="alert">{{ error }}</div>
    <template v-else>
      <div class="row g-3 mb-4">
        <div class="col-6 col-lg-3">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <div class="text-secondary small mb-2">表单总数</div>
              <div class="display-6 fw-semibold">{{ total }}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <div class="text-secondary small mb-2">已发布</div>
              <div class="display-6 fw-semibold text-success">{{ publishedTotal }}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <div class="text-secondary small mb-2">草稿</div>
              <div class="display-6 fw-semibold text-warning">{{ draftTotal }}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <div class="text-secondary small mb-2">已加载表单提交量</div>
              <div class="display-6 fw-semibold text-primary">{{ loadedSubmissionTotal }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="forms.length === 0" class="card shadow-sm">
        <div class="card-body text-center text-secondary py-5">暂无表单</div>
      </div>
      <template v-else>
        <div class="row g-3 mb-4">
          <div class="col-12 col-lg-5">
            <section class="card shadow-sm h-100">
              <div class="card-body">
                <h2 class="h5 mb-3">表单状态</h2>
                <div class="d-flex justify-content-between small mb-1">
                  <span>已发布</span>
                  <span>{{ publishedTotal }}</span>
                </div>
                <div class="progress mb-3" style="height: 10px">
                  <div class="progress-bar bg-success" :style="{ width: `${percent(publishedTotal, total)}%` }"></div>
                </div>
                <div class="d-flex justify-content-between small mb-1">
                  <span>草稿</span>
                  <span>{{ draftTotal }}</span>
                </div>
                <div class="progress" style="height: 10px">
                  <div class="progress-bar bg-warning" :style="{ width: `${percent(draftTotal, total)}%` }"></div>
                </div>
              </div>
            </section>
          </div>
          <div class="col-12 col-lg-7">
            <section class="card shadow-sm h-100">
              <div class="card-body">
                <h2 class="h5 mb-3">提交量排行</h2>
                <div v-if="topForms.length === 0" class="text-secondary text-center py-4">暂无提交数据</div>
                <div v-else class="d-flex flex-column gap-3">
                  <router-link v-for="form in topForms" :key="form._id" class="text-decoration-none text-body" :to="`/forms/${form._id}/data`">
                    <div class="d-flex justify-content-between small mb-1">
                      <span class="text-truncate me-3">{{ form.title || form.name }}</span>
                      <span class="text-secondary">{{ safeNumber(form.dataCount) }}</span>
                    </div>
                    <div class="progress" style="height: 8px">
                      <div class="progress-bar" :style="{ width: `${percent(safeNumber(form.dataCount), maxSubmissionCount)}%` }"></div>
                    </div>
                  </router-link>
                </div>
              </div>
            </section>
          </div>
        </div>

        <section class="card shadow-sm">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h2 class="h5 mb-0">最近表单</h2>
              <router-link class="btn btn-outline-secondary btn-sm" to="/forms">全部表单</router-link>
            </div>
            <div class="row g-3">
              <div v-for="form in recentForms" :key="form._id" class="col-12">
                <div class="border rounded-3 p-3 d-flex flex-column flex-lg-row justify-content-between gap-3">
                  <div>
                    <h3 class="h6 mb-2">{{ form.title || form.name }}</h3>
                    <div class="d-flex flex-wrap gap-2 align-items-center small text-secondary">
                      <span :class="['badge', statusClass(form.status)]">{{ statusText(form.status) }}</span>
                      <span>{{ fieldCount(form) }} 个字段</span>
                      <span>{{ safeNumber(form.dataCount) }} 条数据</span>
                    </div>
                  </div>
                  <div class="d-flex flex-wrap gap-2 align-items-start">
                    <router-link class="btn btn-outline-primary btn-sm" :to="`/forms/${form._id}/design`">编辑</router-link>
                    <router-link class="btn btn-outline-secondary btn-sm" :to="`/forms/${form._id}/data`">数据</router-link>
                    <a v-if="form.status === 2" class="btn btn-outline-secondary btn-sm" :href="`/form/${form._id}/`" target="_blank">打开</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </template>
    </template>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { agentApi } from '../api'

const loading = ref(true)
const error = ref('')
const forms = ref([])
const total = ref(0)
const publishedTotal = ref(0)
const draftTotal = ref(0)

const loadedSubmissionTotal = computed(() => forms.value.reduce((sum, form) => sum + safeNumber(form.dataCount), 0))
const topForms = computed(() => [...forms.value].sort((a, b) => safeNumber(b.dataCount) - safeNumber(a.dataCount)).slice(0, 5))
const recentForms = computed(() => forms.value.slice(0, 5))
const maxSubmissionCount = computed(() => Math.max(1, ...topForms.value.map((form) => safeNumber(form.dataCount))))

function safeNumber(value) {
  return Number(value) || 0
}

function percent(value, max) {
  return max > 0 ? Math.round((value / max) * 100) : 0
}

function fieldCount(form) {
  return (form.fields || []).length
}

function statusText(value) {
  return value === 2 ? '已发布' : '草稿'
}

function statusClass(value) {
  return value === 2 ? 'text-bg-success' : 'text-bg-warning'
}

async function loadDashboard() {
  loading.value = true
  error.value = ''
  try {
    const [formResult, publishedResult, draftResult] = await Promise.all([
      agentApi.listForms({ page: 1, pageSize: 100 }),
      agentApi.listForms({ page: 1, pageSize: 1, status: 2 }),
      agentApi.listForms({ page: 1, pageSize: 1, status: 1 })
    ])
    forms.value = formResult.items || []
    total.value = formResult.total || 0
    publishedTotal.value = publishedResult.total || 0
    draftTotal.value = draftResult.total || 0
  } catch (err) {
    error.value = err.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboard)
</script>
