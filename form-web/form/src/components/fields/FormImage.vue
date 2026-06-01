<template>
  <div class="form-image">
    <div v-if="uploadedUrl" class="image-preview mb-2">
      <img :src="uploadedUrl" alt="Preview" class="img-thumbnail" />
    </div>
    <div v-else class="mb-2">
      <img v-if="previewUrl" :src="previewUrl" alt="Preview" class="img-thumbnail" />
    </div>
    <input
      type="file"
      :id="name"
      accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
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
      <button type="button" class="btn btn-sm btn-outline-danger" @click="removeFile">移除图片</button>
    </div>
    <div v-if="error" class="invalid-feedback">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { sha256Sync } from '../../utils/crypto'

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
const previewUrl = ref('')
const error = ref('')

async function computeFileHash(file) {
  const buffer = await file.arrayBuffer()
  const hash = sha256Sync(new Uint8Array(buffer))
  return 'sha256:' + hash
}

async function handleFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return

  uploading.value = true
  progress.value = 0
  error.value = ''

  previewUrl.value = URL.createObjectURL(file)

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
          type: 'image',
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
      previewUrl.value = ''
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
    previewUrl.value = ''
    emit('update:modelValue', uploadResult.url)
  } catch (err) {
    error.value = err.message
  } finally {
    uploading.value = false
  }
}

function removeFile() {
  uploadedUrl.value = ''
  previewUrl.value = ''
  emit('update:modelValue', '')
}

watch(() => props.modelValue, (newVal) => {
  uploadedUrl.value = newVal || ''
})
</script>

<style scoped>
.image-preview {
  max-width: 200px;
}

.img-thumbnail {
  max-width: 100%;
  height: auto;
}

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