<template>
  <div class="form-file">
    <input
      type="file"
      :id="name"
      :accept="acceptTypes"
      :class="['form-control', { 'is-invalid': error }]"
      :disabled="uploading"
      @change="handleFileChange"
    />
    <div v-if="uploading" class="mt-2">
      <div class="progress">
        <div
          class="progress-bar"
          role="progressbar"
          :style="{ width: progress + '%' }"
          :aria-valuenow="progress"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          {{ progress }}%
        </div>
      </div>
      <small class="text-muted">上传中...</small>
    </div>
    <div v-if="uploadedUrl" class="mt-2">
      <a :href="uploadedUrl" target="_blank" class="me-2">查看文件</a>
      <button type="button" class="btn btn-sm btn-outline-danger" @click="removeFile">移除</button>
    </div>
    <div v-if="error" class="invalid-feedback">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: String,
  field: Object,
  name: String,
  error: [String, Object]
})

const emit = defineEmits(['update:modelValue'])

const uploading = ref(false)
const progress = ref(0)
const uploadedUrl = ref(props.modelValue || '')
const error = ref('')

const acceptTypes = computed(() => {
  if (props.field.inputType === 'image') {
    return 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml'
  }
  return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar'
})

async function computeFileHash(file) {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return 'sha256:' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function handleFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return

  uploading.value = true
  progress.value = 0
  error.value = ''

  try {
    const fileHash = await computeFileHash(file)

    const configResponse = await fetch('/api/rpc/common', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'upload.getConfig',
        params: {
          fileHash,
          fileSize: file.size,
          fileName: file.name,
          type: props.field.inputType === 'image' ? 'image' : 'file',
          scene: 'form'
        },
        id: 1
      })
    })

    const configResult = await configResponse.json()

    if (configResult.error) {
      throw new Error(configResult.error.message)
    }

    const { token, url, exists, uploadUrl } = configResult.result

    if (exists && url) {
      uploadedUrl.value = url
      emit('update:modelValue', url)
      uploading.value = false
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'X-Upload-Token': token
      },
      body: formData
    })

    if (!uploadResponse.ok) {
      const errorResult = await uploadResponse.json()
      throw new Error(errorResult.error || '上传失败')
    }

    const uploadResult = await uploadResponse.json()
    uploadedUrl.value = uploadResult.url
    emit('update:modelValue', uploadResult.url)
  } catch (err) {
    error.value = err.message
  } finally {
    uploading.value = false
  }
}

function removeFile() {
  uploadedUrl.value = ''
  emit('update:modelValue', '')
}
</script>

<style scoped>
.progress {
  height: 0.5rem;
  background-color: #e9ecef;
  border-radius: 0.25rem;
}

.progress-bar {
  background-color: #0d6efd;
  transition: width 0.3s ease;
}
</style>