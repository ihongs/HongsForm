<template>
  <main class="container py-4">
    <div class="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">用户管理</h1>
        <p class="text-secondary mb-0">查看全站用户，禁用或删除用户账号</p>
      </div>
      <div class="d-flex flex-wrap gap-2 align-self-start">
        <button class="btn btn-primary" type="button" @click="openCreateModal">新增用户</button>
        <form class="d-flex flex-wrap gap-2" @submit.prevent="searchUsers">
          <input v-model.trim="keyword" class="form-control" style="width: 240px" placeholder="搜索用户名、昵称、邮箱、手机" />
          <select v-model="status" class="form-select" style="width: 140px">
            <option value="">全部状态</option>
            <option value="1">启用</option>
            <option value="0">禁用</option>
          </select>
          <button class="btn btn-outline-primary" type="submit">查询</button>
        </form>
      </div>
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
                  <button class="btn btn-outline-primary" type="button" @click="openEditModal(user)">编辑</button>
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

    <div v-if="showUserModal" class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="userModalTitle">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <form class="modal-content" @submit.prevent="saveUser">
          <div class="modal-header">
            <h2 id="userModalTitle" class="modal-title h5">{{ modalTitle }}</h2>
            <button class="btn-close" type="button" aria-label="关闭" @click="closeUserModal"></button>
          </div>
          <div class="modal-body">
            <div v-if="modalError" class="alert alert-danger py-2" role="alert">{{ modalError }}</div>
            <div class="row g-3">
              <div class="col-12 col-md-6">
                <label class="form-label">用户名</label>
                <input v-model.trim="userForm.username" class="form-control" autocomplete="off" />
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label">角色</label>
                <select v-model="userForm.role" class="form-select">
                  <option value="agent">agent</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label">{{ isEditing ? '重置密码' : '密码' }}</label>
                <div class="input-group">
                  <input v-model="userForm.password" class="form-control" type="text" readonly autocomplete="new-password" placeholder="" />
                  <button class="btn btn-outline-secondary" type="button" @click="generateRandomPassword">
                    {{ isEditing ? '重置密码' : '随机生成' }}
                  </button>
                </div>
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label">昵称</label>
                <input v-model.trim="userForm.nickname" class="form-control" />
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label">邮箱</label>
                <input v-model.trim="userForm.email" class="form-control" type="email" />
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label">手机</label>
                <input v-model.trim="userForm.phone" class="form-control" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary" type="button" :disabled="saving" @click="closeUserModal">取消</button>
            <button class="btn btn-primary" type="submit" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
          </div>
        </form>
      </div>
    </div>
    <div v-if="showUserModal" class="modal-backdrop fade show" @click="closeUserModal"></div>
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
const showUserModal = ref(false)
const modalMode = ref('create')
const modalError = ref('')
const saving = ref(false)
const editingUserId = ref('')
const userForm = ref(createUserForm())

const isEditing = computed(() => modalMode.value === 'edit')
const modalTitle = computed(() => (isEditing.value ? '编辑用户' : '新增用户'))
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

function createUserForm() {
  return {
    username: '',
    password: '',
    role: 'agent',
    nickname: '',
    email: '',
    phone: '',
    status: 1
  }
}

function openCreateModal() {
  modalMode.value = 'create'
  editingUserId.value = ''
  userForm.value = createUserForm()
  modalError.value = ''
  showUserModal.value = true
}

function openEditModal(user) {
  modalMode.value = 'edit'
  editingUserId.value = user._id
  userForm.value = {
    username: user.username || '',
    role: user.role || 'agent',
    nickname: user.nickname || '',
    email: user.email || '',
    phone: user.phone || '',
    status: user.status !== undefined ? user.status : 1,
    password: ''
  }
  modalError.value = ''
  showUserModal.value = true
}

function closeUserModal() {
  showUserModal.value = false
}

function generateRandomPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  userForm.value.password = password
}

async function saveUser() {
  if (!userForm.value.username.trim()) {
    modalError.value = '请填写用户名'
    return
  }
  if (modalMode.value === 'create' && !userForm.value.password) {
    modalError.value = '请点击随机生成密码'
    return
  }

  saving.value = true
  modalError.value = ''
  try {
    if (modalMode.value === 'create') {
      await adminApi.createUser(userForm.value)
      page.value = 1
    } else {
      const payload = {
        username: userForm.value.username,
        role: userForm.value.role,
        nickname: userForm.value.nickname,
        email: userForm.value.email,
        phone: userForm.value.phone
      }
      if (userForm.value.password) {
        payload.password = userForm.value.password
      }
      await adminApi.updateUser(editingUserId.value, payload)
    }
    showUserModal.value = false
    await loadUsers()
  } catch (err) {
    modalError.value = err.message || '保存失败'
  } finally {
    saving.value = false
  }
}

onMounted(loadUsers)
</script>
