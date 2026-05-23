<template>
  <main class="container py-4">
    <div class="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">用户管理</h1>
        <p class="text-secondary mb-0">查看全站用户，禁用或删除用户账号</p>
      </div>
      <form class="d-flex flex-wrap gap-2 align-self-start" @submit.prevent="searchUsers">
        <input v-model.trim="keyword" class="form-control" style="width: 240px" placeholder="搜索用户名、昵称、邮箱" />
        <select v-model="status" class="form-select" style="width: 140px">
          <option value="">全部状态</option>
          <option value="1">启用</option>
          <option value="0">禁用</option>
        </select>
        <button class="btn btn-outline-primary" type="submit">查询</button>
      </form>
    </div>

    <div v-if="loading" class="card border-0 shadow-sm">
      <div class="card-body text-center text-secondary py-5">加载中...</div>
    </div>
    <div v-else-if="error" class="alert alert-danger" role="alert">{{ error }}</div>
    <div v-else-if="users.length === 0" class="card border-0 shadow-sm">
      <div class="card-body text-center text-secondary py-5">暂无用户</div>
    </div>
    <div v-else class="card border-0 shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>用户名</th>
              <th>昵称</th>
              <th>角色</th>
              <th>邮箱</th>
              <th>手机</th>
              <th>状态</th>
              <th>最后登录</th>
              <th>创建时间</th>
              <th class="text-end">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user._id">
              <td class="fw-medium">{{ user.username || '-' }}</td>
              <td>{{ user.nickname || '-' }}</td>
              <td>{{ user.role || '-' }}</td>
              <td>{{ user.email || '-' }}</td>
              <td>{{ user.phone || '-' }}</td>
              <td>
                <span :class="['badge', user.status === 1 ? 'text-bg-success' : 'text-bg-secondary']">
                  {{ statusText(user.status) }}
                </span>
              </td>
              <td>{{ formatTime(user.lastLoginAt) }}</td>
              <td>{{ formatTime(user.createdAt) }}</td>
              <td class="text-end">
                <div class="btn-group btn-group-sm">
                  <button
                    :class="['btn', user.status === 1 ? 'btn-outline-warning' : 'btn-outline-success']"
                    type="button"
                    @click="toggleUser(user)"
                  >
                    {{ user.status === 1 ? '禁用' : '启用' }}
                  </button>
                  <button class="btn btn-outline-danger" type="button" @click="removeUser(user)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card-footer bg-body d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div class="text-secondary small">共 {{ total }} 个用户，第 {{ page }} / {{ totalPages }} 页</div>
        <div class="d-flex align-items-center gap-2">
          <select v-model.number="pageSize" class="form-select form-select-sm" style="width: 110px" @change="changePageSize">
            <option :value="10">每页 10</option>
            <option :value="20">每页 20</option>
            <option :value="50">每页 50</option>
            <option :value="100">每页 100</option>
          </select>
          <nav aria-label="用户分页">
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
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { adminApi } from '../api'

const loading = ref(true)
const error = ref('')
const users = ref([])
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

function formatTime(value) {
  return value ? new Date(value).toLocaleString() : '-'
}

function statusText(value) {
  return value === 1 ? '启用' : '禁用'
}

async function toggleUser(user) {
  if (user.status === 1) {
    if (!confirm(`确定禁用用户 ${user.username} 吗？`)) return
    await adminApi.disableUser(user._id)
  } else {
    if (!confirm(`确定启用用户 ${user.username} 吗？`)) return
    await adminApi.enableUser(user._id)
  }
  await loadUsers()
}

async function removeUser(user) {
  if (!confirm(`确定删除用户 ${user.username} 吗？`)) return
  await adminApi.deleteUser(user._id)
  if (users.value.length === 1 && page.value > 1) page.value -= 1
  await loadUsers()
}

async function searchUsers() {
  page.value = 1
  await loadUsers()
}

async function changePageSize() {
  page.value = 1
  await loadUsers()
}

async function goPage(nextPage) {
  if (nextPage < 1 || nextPage > totalPages.value || nextPage === page.value) return
  page.value = nextPage
  await loadUsers()
}

async function loadUsers() {
  loading.value = true
  error.value = ''
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value
    }
    if (status.value !== '') params.status = Number(status.value)
    const result = await adminApi.listUsers(params)
    users.value = result.items || []
    total.value = result.total || 0
  } catch (err) {
    error.value = err.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadUsers)
</script>
