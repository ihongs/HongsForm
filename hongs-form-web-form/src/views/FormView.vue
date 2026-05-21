<template>
  <div class="form-container">
    <div v-if="loading" class="loading">
      加载中...
    </div>

    <div v-else-if="error" class="not-found">
      <h2>出错了</h2>
      <p>{{ error }}</p>
    </div>

    <template v-else>
      <div class="form-header">
        <h1>{{ form.title }}</h1>
        <p v-if="form.description">{{ form.description }}</p>
      </div>

      <FormRenderer
        ref="formRef"
        :schema="form.schema"
        @submit="handleSubmit"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formApi } from '../api'
import FormRenderer from '../components/FormRenderer.vue'

const route = useRoute()
const router = useRouter()

const formRef = ref(null)
const form = ref({})
const loading = ref(true)
const error = ref(null)

// 加载表单
async function loadForm() {
  loading.value = true
  error.value = null

  try {
    const data = await formApi.getSchema(route.params.id)
    form.value = data
  } catch (err) {
    error.value = err.message || '加载表单失败'
  } finally {
    loading.value = false
  }
}

// 提交表单
async function handleSubmit(data) {
  try {
    await formApi.submitData(route.params.id, data)
    router.push({ name: 'success', params: { id: route.params.id } })
  } catch (err) {
    // 显示字段级错误
    if (err.data?.errors) {
      formRef.value?.setErrors(err.data.errors)
    }
    // 全局错误可以通过 toast 显示，这里简单处理
  }
}

onMounted(() => {
  loadForm()
})
</script>
