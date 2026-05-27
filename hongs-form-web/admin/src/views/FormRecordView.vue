<template>
  <main class="container-fluid py-4">
    <div class="d-flex flex-column flex-md-row justify-content-between gap-3 mb-4">
      <div>
        <h1 class="h3 mb-0">
          {{ formTitle || '提交数据' }}
          <small class="text-secondary fs-6 fw-normal ms-2">（总提交 {{ stats.total ?? '-' }}, 今日提交 {{ stats.today ?? '-' }}）</small>
        </h1>
      </div>
      <div class="d-flex gap-2 align-self-start position-relative">
        <button v-if="items.length > 0" class="btn btn-outline-secondary d-inline-flex align-items-center gap-1" type="button" @click="showFilters = !showFilters">
          <i class="bi bi-funnel" aria-hidden="true"></i>
          <span>筛选</span>
        </button>
        <router-link class="btn btn-outline-secondary" to="/forms">返回列表</router-link>
        <div v-if="showFilters" class="filter-popover card shadow-sm">
          <div class="card-body p-3">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <strong class="small">筛选</strong>
              <button class="btn-close" type="button" aria-label="关闭" @click="showFilters = false"></button>
            </div>
            <div class="row g-3">
              <div v-for="filter in filterFields" :key="filter.key" class="col-12">
                <label class="form-label small mb-1">{{ filter.title }}</label>
                <template v-if="filter.kind === 'text'">
                  <input v-model.trim="filters[filter.key].text" class="form-control form-control-sm" placeholder="包含关键词" @keyup.enter="applyFilters" />
                </template>
                <template v-else-if="filter.kind === 'number'">
                  <div class="input-group input-group-sm">
                    <input v-model.number="filters[filter.key].min" class="form-control" type="number" placeholder="最小" />
                    <input v-model.number="filters[filter.key].max" class="form-control" type="number" placeholder="最大" />
                  </div>
                </template>
                <template v-else-if="filter.kind === 'choice'">
                  <div class="filter-options border rounded p-2">
                    <label v-for="option in filter.options" :key="option.value" class="form-check form-check-sm mb-1">
                      <input v-model="filters[filter.key].values" class="form-check-input" type="checkbox" :value="option.value" />
                      <span class="form-check-label small">{{ option.label }}</span>
                    </label>
                    <div v-if="filter.options.length === 0" class="text-secondary small">暂无可选值</div>
                  </div>
                </template>
              </div>
            </div>
            <div class="d-flex justify-content-end gap-2 mt-3">
              <button class="btn btn-outline-secondary btn-sm" type="button" @click="clearFilters">清除</button>
              <button class="btn btn-primary btn-sm" type="button" @click="applyFilters">应用</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="card shadow-sm">
      <div class="card-body text-center text-secondary py-5">加载中...</div>
    </div>
    <div v-else-if="error" class="alert alert-danger" role="alert">{{ error }}</div>
    <div v-else-if="items.length === 0" class="card shadow-sm">
      <div class="card-body text-center text-secondary py-5">暂无数据</div>
    </div>
    <div v-else class="card shadow-sm">
      <div class="card-body">
        <div ref="tableEl" class="submission-table"></div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { TabulatorFull as Tabulator } from 'tabulator-tables'
import 'tabulator-tables/dist/css/tabulator_bootstrap5.min.css'
import { adminApi } from '../api'

const route = useRoute()
const loading = ref(true)
const error = ref('')
const items = ref([])
const stats = ref({})
const formTitle = ref('')
const formSchema = ref({})
const tableEl = ref(null)
const showFilters = ref(false)
const filters = reactive({})
let table = null

const filterFields = computed(() => [
  {
    key: 'channel',
    title: '渠道',
    kind: 'choice',
    options: filterOptions('channel', {})
  },
  ...(formSchema.value.fields || [])
    .filter((field) => field.type !== 'null')
    .map((field) => ({
      key: field.name,
      title: field.title || field.name,
      kind: filterKind(field),
      options: filterOptions(field.name, field)
    }))
    .filter((filter) => filter.kind !== 'none')
])

function formatTime(value) {
  return value ? new Date(value).toLocaleString() : '-'
}

function formatCellValue(value) {
  if (value === undefined || value === null || value === '') return '-'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function filterKind(field) {
  if (['text', 'textarea', 'email', 'phone'].includes(field.inputType)) return 'text'
  if (['number', 'range'].includes(field.inputType) || field.type === 'number' || field.type === 'integer') return 'number'
  if (['select', 'radio', 'check', 'switch'].includes(field.inputType) || field.enum || field.options || field.type === 'boolean') return 'choice'
  return 'none'
}

function filterOptions(key, field) {
  const options = new Map()
  if (field.options) {
    for (const [value, label] of Object.entries(field.options)) {
      options.set(String(value), String(label))
    }
  }
  if (Array.isArray(field.enum)) {
    for (const value of field.enum) {
      if (!options.has(String(value))) options.set(String(value), String(value))
    }
  }
  if (field.type === 'boolean' || field.inputType === 'switch') {
    options.set('true', '是')
    options.set('false', '否')
  }
  for (const item of items.value) {
    const value = key === 'channel' ? item.channel || '-' : item.data?.[key]
    const values = Array.isArray(value) ? value : [value]
    for (const entry of values) {
      if (entry !== undefined && entry !== null && entry !== '' && !options.has(String(entry))) {
        options.set(String(entry), String(entry))
      }
    }
  }
  return Array.from(options, ([value, label]) => ({ value, label }))
}

function initFilters() {
  for (const filter of filterFields.value) {
    if (!filters[filter.key]) {
      filters[filter.key] = filter.kind === 'choice' ? { values: [] } : filter.kind === 'number' ? { min: null, max: null } : { text: '' }
    }
  }
}

function buildRows() {
  const fieldNames = (formFields.value || []).map((field) => field.name)
  return items.value.map((item) => ({
    id: item._id,
    createdAt: formatTime(item.createdAt),
    channel: item.channel || '-',
    ...Object.fromEntries(fieldNames.map((key) => [key, item.data?.[key]]))
  }))
}

function buildColumns() {
  const fieldColumns = (formFields.value || [])
    .filter((field) => field.type !== 'null')
    .map((field) => ({
      title: field.title || field.name,
      field: field.name,
      minWidth: 140,
      formatter: (cell) => {
        const span = document.createElement('span')
        span.textContent = formatCellValue(cell.getValue())
        return span
      }
    }))

  return [
    { title: '提交时间', field: 'createdAt', width: 180, frozen: true, sorter: 'string' },
    { title: '渠道', field: 'channel', width: 100 },
    ...fieldColumns,
    {
      title: '操作',
      field: 'id',
      width: 72,
      minWidth: 72,
      maxWidth: 72,
      frozen: true,
      hozAlign: 'center',
      headerSort: false,
      formatter: () => '<button class="btn btn-outline-danger btn-sm" type="button">删除</button>',
      cellClick: (_event, cell) => removeById(cell.getValue())
    }
  ]
}

async function renderTable() {
  await nextTick()
  if (!tableEl.value) return
  table?.destroy()
  table = new Tabulator(tableEl.value, {
    data: buildRows(),
    columns: buildColumns(),
    layout: 'fitDataStretch',
    height: '600px',
    pagination: true,
    paginationSize: 20,
    paginationSizeSelector: [10, 20, 50, 100],
    langs: {
      'zh-cn': {
        pagination: {
          page_size: '每页',
          first: '首页',
          first_title: '第一页',
          last: '末页',
          last_title: '最后一页',
          prev: '‹',
          prev_title: '上一页',
          next: '›',
          next_title: '下一页'
        }
      }
    },
    locale: 'zh-cn',
    movableColumns: true,
    placeholder: '暂无数据'
  })
  initFilters()
}

function applyFilters() {
  if (!table) return
  const activeFilters = []
  for (const filter of filterFields.value) {
    const value = filters[filter.key]
    if (filter.kind === 'text' && value?.text) {
      activeFilters.push((row) => formatCellValue(row[filter.key]).toLowerCase().includes(value.text.toLowerCase()))
    } else if (filter.kind === 'number' && (value?.min !== null || value?.max !== null)) {
      activeFilters.push((row) => {
        const number = Number(row[filter.key])
        if (Number.isNaN(number)) return false
        if (value.min !== null && number < value.min) return false
        if (value.max !== null && number > value.max) return false
        return true
      })
    } else if (filter.kind === 'choice' && value?.values?.length > 0) {
      activeFilters.push((row) => {
        const selected = new Set(value.values.map(String))
        const cellValue = row[filter.key]
        const values = Array.isArray(cellValue) ? cellValue : [cellValue]
        return values.some((entry) => selected.has(String(entry)))
      })
    }
  }
  if (activeFilters.length > 0) {
    table.setFilter((row) => activeFilters.every((fn) => fn(row)))
  } else {
    table.clearFilter()
  }
  showFilters.value = false
}

function clearFilters() {
  for (const filter of filterFields.value) {
    if (filter.kind === 'text') filters[filter.key].text = ''
    if (filter.kind === 'number') {
      filters[filter.key].min = null
      filters[filter.key].max = null
    }
    if (filter.kind === 'choice') filters[filter.key].values = []
  }
  table?.clearFilter()
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [form, dataResult, statsResult] = await Promise.all([
      adminApi.getForm(route.params.id),
      adminApi.listFormRecords({ formId: route.params.id, pageSize: 1000 }),
      adminApi.getFormRecordStats(route.params.id)
    ])
    formTitle.value = form.title || form.name
    formFields.value = form.fields || []
    items.value = dataResult.items || []
    stats.value = statsResult
    loading.value = false
    await renderTable()
  } catch (err) {
    error.value = err.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function removeById(id) {
  const item = items.value.find((entry) => entry._id === id)
  if (!item || !confirm('确定删除这条数据吗？')) return
  await adminApi.deleteFormRecord(item._id)
  await load()
}

onMounted(load)
onBeforeUnmount(() => {
  table?.destroy()
})
</script>
