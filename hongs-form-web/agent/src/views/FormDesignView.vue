<template>
  <main class="container py-4">
    <div class="d-flex flex-column flex-md-row justify-content-between gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">{{ isEdit ? '编辑表单' : '新建表单' }}</h1>
        <p class="text-secondary mb-0">点击添加字段，拖动调整顺序，保存时生成 FormSchema</p>
      </div>
      <router-link class="btn btn-outline-secondary align-self-start" to="/forms">返回列表</router-link>
    </div>

    <div v-if="loading" class="card shadow-sm">
      <div class="card-body text-center text-secondary py-5">加载中...</div>
    </div>
    <div v-else class="row g-4 align-items-start">
      <aside class="col-12 col-lg-3 designer-sidebar">
        <div class="card shadow-sm">
          <div class="card-body">
            <h2 class="h5 mb-3">添加字段</h2>
            <div class="d-grid gap-2">
              <button v-for="fieldType in fieldTypes" :key="fieldType.type" class="btn btn-outline-primary text-start d-flex align-items-center gap-2" type="button" @click="addField(fieldType.type)">
                <i :class="['bi', fieldType.icon]" aria-hidden="true"></i>
                <span>{{ fieldType.label }}</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <section class="col-12 col-lg-9">
        <div class="card shadow-sm">
          <div class="card-body p-4">
            <h2 class="h5 mb-3">表单配置</h2>
            <div class="row g-3 mb-4">
              <div class="col-md-6">
                <label class="form-label">表单名称</label>
                <input v-model.trim="form.name" class="form-control" placeholder="如 contact_form" />
              </div>
              <div class="col-md-6">
                <label class="form-label">表单标题</label>
                <input v-model.trim="form.title" class="form-control" placeholder="显示给用户看的标题" />
              </div>
              <div class="col-12">
                <label class="form-label">描述</label>
                <textarea v-model.trim="form.description" class="form-control" rows="3" placeholder="表单说明"></textarea>
              </div>
              <div class="col-12">
                <div class="d-flex flex-wrap items-center gap-3">
                  <div class="form-check form-switch">
                    <input v-model="form.oncePerGuest" type="checkbox" class="form-check-input" id="oncePerGuestSwitch" />
                    <label class="form-check-label" for="oncePerGuestSwitch">每个访客限填一次</label>
                  </div>
                  <span class="text-secondary text-sm">通过浏览器内访客标识进行限制</span>
                </div>
              </div>
              <div class="col-md-6">
                <div class="d-flex flex-wrap items-center gap-3">
                  <div class="form-check form-switch">
                    <input v-model="form.oncePerPhone" type="checkbox" class="form-check-input" id="oncePerPhoneSwitch" />
                    <label class="form-check-label" for="oncePerPhoneSwitch">手机号限填一次</label>
                  </div>
                </div>
                <p class="text-secondary text-sm mt-1">需有名为 phone、类型为 phone 的字段，将强制必填</p>
              </div>
              <div class="col-md-6">
                <div class="d-flex flex-wrap items-center gap-3">
                  <div class="form-check form-switch">
                    <input v-model="form.oncePerEmail" type="checkbox" class="form-check-input" id="oncePerEmailSwitch" />
                    <label class="form-check-label" for="oncePerEmailSwitch">邮箱限填一次</label>
                  </div>
                </div>
                <p class="text-secondary text-sm mt-1">需有名为 email、类型为 email 的字段，将强制必填</p>
              </div>

            </div>

            <div class="d-grid gap-3 mb-4">
              <article
                v-for="(field, index) in fields"
                :key="field.name"
                class="card bg-light border"
                draggable="true"
                @dragstart="dragIndex = index"
                @dragover.prevent
                @drop="dropField(index)"
              >
                <div class="card-body">
                  <div class="d-flex flex-column flex-xl-row justify-content-between gap-3 mb-3">
                    <div class="d-flex flex-wrap gap-2 align-items-center">
                      <strong>{{ field.name }}</strong>
                      <span class="badge text-bg-secondary">{{ field.inputType }}</span>
                    </div>
                    <div class="btn-group btn-group-sm align-self-start">
                      <button class="btn btn-outline-secondary" type="button" :disabled="index === 0" @click="moveField(index, -1)">上移</button>
                      <button class="btn btn-outline-secondary" type="button" :disabled="index === fields.length - 1" @click="moveField(index, 1)">下移</button>
                      <button class="btn btn-outline-danger" type="button" @click="removeField(index)">删除</button>
                    </div>
                  </div>

                  <div class="row g-3">
                    <div v-if="field.inputType !== 'figure'" :class="field.inputType === 'legend' ? 'col-12' : 'col-md-6'">
                      <label class="form-label">字段标题</label>
                      <input v-model.trim="field.title" class="form-control" placeholder="用于数据列表和管理后台展示" />
                    </div>
                    <div v-if="!isDisplayField(field)" class="col-md-6">
                      <label class="form-label">表单标签</label>
                      <input v-model.trim="field.label" class="form-control" placeholder="默认同字段标题，显示在表单内" />
                    </div>
                    <div v-if="field.inputType !== 'legend'" class="col-12">
                      <label class="form-label">字段说明</label>
                      <textarea v-model.trim="field.description" class="form-control" rows="2" :placeholder="field.inputType === 'figure' ? '支持 Markdown，显示为一段说明内容' : '显示在字段下方的帮助信息'"></textarea>
                    </div>
                    <div v-if="supportsPlaceholder(field)" class="col-md-6">
                      <label class="form-label">占位提示</label>
                      <input v-model.trim="field.placeholder" class="form-control" />
                    </div>
                    <div v-if="!isDisplayField(field)" class="col-md-6">
                      <label class="form-label">是否必填/必选</label>
                      <select v-model="field.required" class="form-select">
                        <option :value="false">选填</option>
                        <option :value="true">必填</option>
                      </select>
                    </div>
                    <div v-if="usesOptions(field)" class="col-md-6">
                      <label class="form-label">选项，每行一个</label>
                      <textarea v-model="field.optionText" class="form-control" rows="3" placeholder="value=标签 或 标签"></textarea>
                    </div>
                    <div v-if="field.inputType === 'range'" class="col-md-6">
                      <label class="form-label">最小值</label>
                      <input v-model.number="field.minimum" class="form-control" type="number" />
                    </div>
                    <div v-if="field.inputType === 'range'" class="col-md-6">
                      <label class="form-label">最大值</label>
                      <input v-model.number="field.maximum" class="form-control" type="number" />
                    </div>
                  </div>
                </div>
              </article>
            </div>

            <div v-if="error" class="alert alert-danger" role="alert">{{ error }}</div>
            <div class="d-flex flex-wrap gap-2">
              <button class="btn btn-primary" :disabled="saving" @click="save">
                <span v-if="saving" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                {{ saving ? '保存中...' : '保存' }}
              </button>
              <button v-if="isEdit" class="btn btn-outline-primary" type="button" @click="saveAndPublish">保存并发布</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { agentApi } from '../api'

const fieldTypes = [
  { type: 'text', label: '单行文本', icon: 'bi-input-cursor-text' },
  { type: 'email', label: '邮箱', icon: 'bi-envelope' },
  { type: 'phone', label: '手机号', icon: 'bi-phone' },
  { type: 'textarea', label: '多行文本', icon: 'bi-textarea-t' },
  { type: 'select', label: '下拉选择', icon: 'bi-menu-button-wide' },
  { type: 'check', label: '多选', icon: 'bi-check2-square' },
  { type: 'radio', label: '单选', icon: 'bi-record-circle' },
  { type: 'range', label: '范围滑块', icon: 'bi-sliders' },
  { type: 'switch', label: '开关', icon: 'bi-toggle-on' },
  { type: 'datetime', label: '日期时间', icon: 'bi-calendar2-week' },
  { type: 'date', label: '日期', icon: 'bi-calendar-date' },
  { type: 'time', label: '时间', icon: 'bi-clock' },
  { type: 'file', label: '文件上传', icon: 'bi-paperclip' },
  { type: 'legend', label: '分隔标题', icon: 'bi-type-h2' },
  { type: 'figure', label: '内容说明', icon: 'bi-markdown' }
]
const route = useRoute()
const router = useRouter()
const isEdit = computed(() => Boolean(route.params.id))
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const dragIndex = ref(null)
const fields = ref([])
const form = reactive({
  name: '',
  title: '',
  description: '',
  oncePerGuest: false,
  oncePerPhone: false,
  oncePerEmail: false
})

function addField(inputType) {
  error.value = ''
  if (fields.value.length >= 100) {
    error.value = '字段总数最多 100 个'
    return
  }

  const name = nextName(inputType)
  fields.value.push({
    name,
    inputType,
    title: defaultTitle(inputType, name),
    label: '',
    description: '',
    placeholder: '',
    required: false,
    optionText: usesOptions({ inputType }) ? 'option1=选项1\noption2=选项2' : '',
    minimum: inputType === 'range' ? 0 : undefined,
    maximum: inputType === 'range' ? 100 : undefined
  })
}

function nextName(inputType) {
  const used = new Set(fields.value.map((field) => field.name))
  if (!used.has(inputType)) return inputType
  for (let index = 1; ; index += 1) {
    const name = `${inputType}${index}`
    if (!used.has(name)) return name
  }
}

function defaultTitle(inputType, name) {
  const titles = {
    text: '单行文本',
    email: '邮箱',
    phone: '手机号',
    textarea: '多行文本',
    select: '下拉选择',
    check: '多选',
    radio: '单选',
    range: '范围',
    switch: '开关',
    datetime: '日期时间',
    date: '日期',
    time: '时间',
    file: '文件',
    legend: '分隔标题',
    figure: '内容说明'
  }
  return titles[inputType] || name
}

function usesOptions(field) {
  return ['select', 'check', 'radio'].includes(field.inputType)
}

function supportsPlaceholder(field) {
  return ['text', 'email', 'phone', 'textarea'].includes(field.inputType)
}

function isDisplayField(field) {
  return field.inputType === 'legend' || field.inputType === 'figure'
}

function removeField(index) {
  fields.value.splice(index, 1)
}

function moveField(index, offset) {
  const target = index + offset
  if (target < 0 || target >= fields.value.length) return
  const list = fields.value
  const [field] = list.splice(index, 1)
  list.splice(target, 0, field)
}

function dropField(index) {
  if (dragIndex.value === null || dragIndex.value === index) return
  const [field] = fields.value.splice(dragIndex.value, 1)
  fields.value.splice(index, 0, field)
  dragIndex.value = null
}

function parseOptions(text) {
  const options = {}
  const values = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const equalIndex = trimmed.indexOf('=')
    const value = equalIndex >= 0 ? trimmed.slice(0, equalIndex).trim() : trimmed
    const label = equalIndex >= 0 ? trimmed.slice(equalIndex + 1).trim() : value
    // 只有 label 不等于 value 时才写入 options
    if (label !== value) {
      options[value] = label
    }
    values.push(value)
  }
  return { options, values }
}

function fieldToSchema(field) {
  const schema = {
    title: field.inputType === 'figure' ? 'figure' : field.title || field.name,
    inputType: field.inputType
  }
  if (!isDisplayField(field) && field.label) schema.label = field.label
  if (field.description) schema.description = field.description
  if (supportsPlaceholder(field) && field.placeholder) schema.placeholder = field.placeholder
  if (!isDisplayField(field) && field.required) schema.required = true

  if (field.inputType === 'email') {
    schema.type = 'string'
    schema.format = 'email'
  } else if (field.inputType === 'phone') {
    schema.type = 'string'
    schema.pattern = '^1[3-9]\\d{9}$'
  } else if (field.inputType === 'textarea' || field.inputType === 'text' || field.inputType === 'file') {
    schema.type = 'string'
  } else if (field.inputType === 'radio' || field.inputType === 'select') {
    const { options, values } = parseOptions(field.optionText)
    schema.type = 'string'
    schema.enum = values
    if (Object.keys(options).length > 0) {
      schema.options = options
    }
  } else if (field.inputType === 'check') {
    const { options, values } = parseOptions(field.optionText)
    schema.type = 'array'
    schema.items = { type: 'string', enum: values }
    if (Object.keys(options).length > 0) {
      schema.options = options
    }
    if (field.required) schema.minItems = 1
  } else if (field.inputType === 'range') {
    schema.type = 'number'
    schema.minimum = field.minimum
    schema.maximum = field.maximum
  } else if (field.inputType === 'switch') {
    schema.type = 'boolean'
  } else if (field.inputType === 'datetime') {
    schema.type = 'number'
    schema.inputType = 'datetime'
  } else if (field.inputType === 'date') {
    schema.type = 'number'
    schema.inputType = 'date'
  } else if (field.inputType === 'time') {
    schema.type = 'number'
    schema.inputType = 'time'
  } else if (field.inputType === 'legend' || field.inputType === 'figure') {
    schema.type = 'null'
  }

  return schema
}

function buildSchema() {
  return {
    title: form.title,
    description: form.description,
    fields: fields.value.map((field) => ({
      ...fieldToSchema(field),
      name: field.name
    }))
  }
}

function validateForm() {
  if (!form.name) return '请输入表单名称'
  if (!form.title) return '请输入表单标题'
  if (fields.value.length === 0) return '请至少添加一个字段'
  if (!fields.value.some((field) => !isDisplayField(field) && field.required)) return '请至少设置一个必填/必选字段'
  
  // 检查手机限填配置
  if (form.oncePerPhone) {
    const phoneField = fields.value.find(f => f.name === 'phone' && f.inputType === 'phone')
    if (!phoneField) return '开启手机号限填一次，需要添加名为 phone、类型为 phone 的字段'
    // 强制 phone 字段为必填
    phoneField.required = true
  }
  
  // 检查邮箱限填配置
  if (form.oncePerEmail) {
    const emailField = fields.value.find(f => f.name === 'email' && f.inputType === 'email')
    if (!emailField) return '开启邮箱限填一次，需要添加名为 email、类型为 email 的字段'
    // 强制 email 字段为必填
    emailField.required = true
  }
  
  for (const field of fields.value) {
    if (field.inputType !== 'figure' && !field.title) return `请填写 ${field.name} 的字段标题`
    if (usesOptions(field) && parseOptions(field.optionText).values.length === 0) return `请填写 ${field.name} 的选项`
  }
  return ''
}

async function save() {
  error.value = validateForm()
  if (error.value) return null

  saving.value = true
  try {
    const payload = {
      name: form.name,
      title: form.title,
      description: form.description,
      fields: buildSchema().fields,
      config: { 
        anonymous: true,
        oncePerGuest: form.oncePerGuest,
        oncePerPhone: form.oncePerPhone,
        oncePerEmail: form.oncePerEmail
      }
    }
    if (isEdit.value) {
      await agentApi.updateForm(route.params.id, payload)
      return route.params.id
    }
    const result = await agentApi.createForm(payload)
    router.replace(`/forms/${result.id}/design`)
    return result.id
  } catch (err) {
    error.value = err.message || '保存失败'
    return null
  } finally {
    saving.value = false
  }
}

async function saveAndPublish() {
  const id = await save()
  if (!id) return
  await agentApi.publishForm(id)
  router.push('/forms')
}

function loadFieldsFromSchema(formDef = {}) {
  const formFields = formDef.fields || []
  fields.value = formFields.map((field) => ({
    name: field.name,
    inputType: field.inputType || inferInputType(field),
    title: field.title || field.name,
    label: field.label || '',
    description: field.description || '',
    placeholder: supportsPlaceholder({ inputType: field.inputType || inferInputType(field) }) ? field.placeholder || '' : '',
    required: field.required === true,
    optionText: optionsToText(field),
    minimum: field.minimum,
    maximum: field.maximum
  }))
}

function inferInputType(schema) {
  if (schema.inputType) return schema.inputType
  if (schema.type === 'array') return 'check'
  if (schema.type === 'boolean') return 'switch'
  if (schema.format === 'email') return 'email'
  if (schema.format === 'date-time') return 'datetime'
  if (schema.format === 'date') return 'date'
  return 'text'
}

function optionsToText(schema) {
  const values = schema.items?.enum || schema.enum || []
  if (values.length === 0) return ''
  return values.map(value => {
    const label = schema.options?.[value] ?? value
    return value === label ? value : `${value}=${label}`
  }).join('\n')
}

async function loadForm() {
  if (!isEdit.value) return
  loading.value = true
  try {
    const data = await agentApi.getForm(route.params.id)
    form.name = data.name || ''
    form.title = data.title || ''
    form.description = data.description || ''
    form.oncePerGuest = data.config?.oncePerGuest || false
    form.oncePerPhone = data.config?.oncePerPhone || false
    form.oncePerEmail = data.config?.oncePerEmail || false
    loadFieldsFromSchema(data)
  } catch (err) {
    error.value = err.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadForm)
</script>
