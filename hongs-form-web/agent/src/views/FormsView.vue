<template>
  <main class="container py-4">
    <div class="d-flex flex-column flex-md-row justify-content-between gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">我的表单</h1>
        <p class="text-secondary mb-0">设计表单、发布表单并查看提交数据</p>
      </div>
      <router-link class="btn btn-primary align-self-start" to="/forms/new">新建表单</router-link>
    </div>

    <div v-if="loading" class="card border-0 shadow-sm">
      <div class="card-body text-center text-secondary py-5">加载中...</div>
    </div>
    <div v-else-if="error" class="alert alert-danger" role="alert">{{ error }}</div>
    <div v-else-if="forms.length === 0" class="card border-0 shadow-sm">
      <div class="card-body text-center text-secondary py-5">暂无表单</div>
    </div>
    <div v-else class="row g-3">
      <div v-for="form in forms" :key="form._id" class="col-12">
        <section class="card border-0 shadow-sm">
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
              </div>
            </div>
            <div class="d-flex flex-wrap gap-2 align-items-start">
              <router-link class="btn btn-outline-primary btn-sm" :to="`/forms/${form._id}/design`">编辑</router-link>
              <router-link class="btn btn-outline-secondary btn-sm" :to="`/forms/${form._id}/data`">数据</router-link>
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
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { agentApi } from '../api'

const loading = ref(true)
const error = ref('')
const forms = ref([])

function fieldCount(form) {
  return Object.keys(form.schema?.properties || {}).length
}

async function loadForms() {
  loading.value = true
  error.value = ''
  try {
    const result = await agentApi.listForms()
    forms.value = result.items || []
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
  await loadForms()
}

onMounted(loadForms)
</script>
