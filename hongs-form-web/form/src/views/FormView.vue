<template>
  <main class="container py-5">
    <div class="mx-auto" style="max-width: 720px;">
      <div v-if="loading" class="text-center text-secondary py-5">
        <div class="spinner-border mb-3" role="status" aria-hidden="true"></div>
        <div>加载中...</div>
      </div>

      <div v-else-if="error" class="alert alert-danger" role="alert">
        <h2 class="h5 alert-heading">出错了</h2>
        <p class="mb-0">{{ error }}</p>
      </div>

      <template v-else>
        <header class="text-center mb-4">
          <h1 class="h3 mb-2">{{ form.title }}</h1>
          <p v-if="form.description" class="text-secondary mb-0">{{ form.description }}</p>
        </header>

        <FormRenderer
          ref="formRef"
          :schema="form.schema"
          @submit="handleSubmit"
        />
      </template>
    </div>
  </main>
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

async function handleSubmit(data) {
  try {
    await formApi.submitData(route.params.id, data)
    router.push({ name: 'success', params: { id: route.params.id } })
  } catch (err) {
    if (err.data?.errors) {
      formRef.value?.setErrors(err.data.errors)
    }
  }
}

onMounted(loadForm)
</script>
