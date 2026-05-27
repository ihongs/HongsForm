<template>
  <main class="container py-4">
    <div class="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">管理首页</h1>
        <p class="text-secondary mb-0">查看全站表单、提交和用户概况</p>
      </div>
      <div class="d-flex flex-wrap gap-2 align-self-start">
        <router-link class="btn btn-outline-primary" to="/forms">表单管理</router-link>
        <router-link class="btn btn-outline-secondary" to="/users">用户管理</router-link>
      </div>
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
              <div class="display-6 fw-semibold">{{ formTotal }}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <div class="text-secondary small mb-2">已发布表单</div>
              <div class="display-6 fw-semibold text-success">{{ publishedTotal }}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <div class="text-secondary small mb-2">用户总数</div>
              <div class="display-6 fw-semibold text-primary">{{ userTotal }}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <div class="text-secondary small mb-2">已加载表单提交量</div>
              <div class="display-6 fw-semibold text-info">{{ loadedSubmissionTotal }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-12 col-xl-4">
          <section class="card shadow-sm h-100">
            <div class="card-body">
              <h2 class="h5 mb-3">表单状态</h2>
              <div v-for="item in formStatusItems" :key="item.label" class="mb-3">
                <div class="d-flex justify-content-between small mb-1">
                  <span>{{ item.label }}</span>
                  <span>{{ item.value }}</span>
                </div>
                <div class="progress" style="height: 10px">
                  <div :class="['progress-bar', item.className]" :style="{ width: `${percent(item.value, formTotal)}%` }"></div>
                </div>
              </div>
            </div>
          </section>
        </div>
        <div class="col-12 col-xl-4">
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
        <div class="col-12 col-xl-4">
          <section class="card shadow-sm h-100">
            <div class="card-body">
              <h2 class="h5 mb-3">已加载用户状态</h2>
              <div class="d-flex justify-content-between small mb-1">
                <span>启用</span>
                <span>{{ enabledUserCount }}</span>
              </div>
              <div class="progress mb-3" style="height: 10px">
                <div class="progress-bar bg-success" :style="{ width: `${percent(enabledUserCount, users.length)}%` }"></div>
              </div>
              <div class="d-flex justify-content-between small mb-1">
                <span>禁用</span>
                <span>{{ disabledUserCount }}</span>
              </div>
              <div class="progress" style="height: 10px">
                <div class="progress-bar bg-secondary" :style="{ width: `${percent(disabledUserCount, users.length)}%` }"></div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div class="row g-3">
        <div class="col-12 col-xl-7">
          <section class="card shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h2 class="h5 mb-0">最近表单</h2>
                <router-link class="btn btn-outline-secondary btn-sm" to="/forms">全部表单</router-link>
              </div>
              <div v-if="recentForms.length === 0" class="text-secondary text-center py-4">暂无表单</div>
              <div v-else class="d-flex flex-column gap-3">
                <div v-for="form in recentForms" :key="form._id" class="border rounded-3 p-3 d-flex flex-column flex-lg-row justify-content-between gap-3">
                  <div>
                    <h3 class="h6 mb-2">{{ form.title || form.name }}</h3>
                    <div class="d-flex flex-wrap gap-2 align-items-center small text-secondary">
                      <span :class="['badge', formStatusClass(form.status)]">{{ formStatusText(form.status) }}</span>
                      <span>{{ fieldCount(form) }} 个字段</span>
                      <span>{{ safeNumber(form.dataCount) }} 条数据</span>
                      <span>创建者 {{ formatId(form.userId) }}</span>
                    </div>
                  </div>
                  <div class="d-flex flex-wrap gap-2 align-items-start">
                    <router-link class="btn btn-outline-secondary btn-sm" :to="`/forms/${form._id}/data`">数据</router-link>
                    <a v-if="form.status === 2" class="btn btn-outline-secondary btn-sm" :href="`/form/${form._id}/`" target="_blank">打开</a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
        <div class="col-12 col-xl-5">
          <section class="card shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h2 class="h5 mb-0">最近用户</h2>
                <router-link class="btn btn-outline-secondary btn-sm" to="/users">全部用户</router-link>
              </div>
              <div v-if="recentUsers.length === 0" class="text-secondary text-center py-4">暂无用户</div>
              <div v-else class="d-flex flex-column gap-3">
                <div v-for="user in recentUsers" :key="user._id" class="border rounded-3 p-3">
                  <div class="d-flex justify-content-between gap-3 mb-2">
                    <h3 class="h6 mb-0">{{ user.username || '-' }}</h3>
                    <span :class="['badge', user.status === 1 ? 'text-bg-success' : 'text-bg-secondary']">{{ user.status === 1 ? '启用' : '禁用' }}</span>
                  </div>
                  <div class="d-flex flex-wrap gap-2 small text-secondary">
                    <span>{{ user.nickname || '-' }}</span>
                    <span>{{ user.role || '-' }}</span>
                    <span>最后登录 {{ formatTime(user.lastLoginAt) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
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
const users = ref([])
const formTotal = ref(0)
const publishedTotal = ref(0)
const draftTotal = ref(0)
const disabledFormTotal = ref(0)
const userTotal = ref(0)

const loadedSubmissionTotal = computed(() => forms.value.reduce((sum, form) => sum + safeNumber(form.dataCount), 0))
const topForms = computed(() => [...forms.value].sort((a, b) => safeNumber(b.dataCount) - safeNumber(a.dataCount)).slice(0, 5))
const recentForms = computed(() => forms.value.slice(0, 5))
const recentUsers = computed(() => users.value.slice(0, 5))
const maxSubmissionCount = computed(() => Math.max(1, ...topForms.value.map((form) => safeNumber(form.dataCount))))
const enabledUserCount = computed(() => users.value.filter((user) => user.status === 1).length)
const disabledUserCount = computed(() => users.value.filter((user) => user.status !== 1).length)
const formStatusItems = computed(() => [
  { label: '已发布', value: publishedTotal.value, className: 'bg-success' },
  { label: '草稿', value: draftTotal.value, className: 'bg-warning' },
  { label: '禁用', value: disabledFormTotal.value, className: 'bg-secondary' }
])

function safeNumber(value) {
  return Number(value) || 0
}

function percent(value, max) {
  return max > 0 ? Math.round((value / max) * 100) : 0
}

function fieldCount(form) {
  return (form.fields || []).length
}

function formatId(value) {
  if (!value) return '-'
  return typeof value === 'string' ? value : value.toString()
}

function formatTime(value) {
  return value ? new Date(value).toLocaleString() : '-'
}

function formStatusText(value) {
  if (value === 2) return '已发布'
  if (value === 1) return '草稿'
  if (value === 0) return '禁用'
  return '未知'
}

function formStatusClass(value) {
  if (value === 2) return 'text-bg-success'
  if (value === 1) return 'text-bg-warning'
  if (value === 0) return 'text-bg-secondary'
  return 'text-bg-light'
}

async function loadDashboard() {
  loading.value = true
  error.value = ''
  try {
    const [formResult, publishedResult, draftResult, disabledResult, userResult] = await Promise.all([
      adminApi.listForms({ page: 1, pageSize: 100 }),
      adminApi.listForms({ page: 1, pageSize: 1, status: 2 }),
      adminApi.listForms({ page: 1, pageSize: 1, status: 1 }),
      adminApi.listForms({ page: 1, pageSize: 1, status: 0 }),
      adminApi.listUsers({ page: 1, pageSize: 100 })
    ])
    forms.value = formResult.items || []
    users.value = userResult.items || []
    formTotal.value = formResult.total || 0
    publishedTotal.value = publishedResult.total || 0
    draftTotal.value = draftResult.total || 0
    disabledFormTotal.value = disabledResult.total || 0
    userTotal.value = userResult.total || 0
  } catch (err) {
    error.value = err.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboard)
</script>
