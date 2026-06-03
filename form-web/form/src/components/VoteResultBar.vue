<template>
  <div class="vote-result">
    <div v-for="(field, fieldIndex) in chartData" :key="field.fieldName" class="mb-4">
      <h4 class="h6 text-secondary mb-2">{{ field.name }}</h4>
      <div v-for="(option, optionIndex) in field.options" :key="option.value" class="mb-2">
        <div class="d-flex justify-content-between mb-1">
          <span>{{ option.label }}</span>
          <span class="text-secondary">{{ option.count }} 票</span>
        </div>
        <div class="progress" style="height: 24px;">
          <div 
            class="progress-bar bg-primary" 
            :class="{ 'progress-bar-animated progress-bar-striped': !animated }"
            role="progressbar" 
            :style="{ width: getBarWidth(fieldIndex, optionIndex, option.percent) }"
            :aria-valuenow="option.percent"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <span v-if="option.percent >= 15" class="text-white text-sm">{{ option.percent }}%</span>
          </div>
        </div>
      </div>
    </div>
    <div class="text-center text-secondary text-sm mt-4">
      共 {{ totalRecords }} 份投票
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, nextTick, watch } from 'vue'

const props = defineProps({
  form: {
    type: Object,
    required: true
  },
  counts: {
    type: Object,
    required: true
  },
  dataCount: {
    type: Number,
    default: 0
  },
  animated: {
    type: Boolean,
    default: true
  }
})

const totalRecords = computed(() => props.dataCount || 0)

const chartData = computed(() => {
  const countableFields = props.form.fields?.filter(f => f.countable) || []
  return countableFields.map(field => {
    const fieldCounts = props.counts[field.name] || {}
    const isMultiSelect = field.inputType === 'check'
    const total = isMultiSelect 
      ? totalRecords.value 
      : Object.values(fieldCounts).reduce((a, b) => a + b, 0)
    
    const enumValues = isMultiSelect ? (field.items?.enum || field.enum || []) : (field.enum || [])
    
    const options = enumValues.map(value => ({
      label: field.labels?.[value] || String(value),
      value,
      count: fieldCounts[value] || 0,
      percent: total > 0 ? Math.round((fieldCounts[value] || 0) / total * 100) : 0
    }))
    
    return {
      name: field.title,
      fieldName: field.name,
      isMultiSelect,
      options
    }
  })
})

const barWidths = ref([])

function initBarWidths() {
  barWidths.value = chartData.value.map(field => 
    field.options.map(opt => opt.percent + '%')
  )
}

function getBarWidth(fieldIndex, optionIndex, percent) {
  if (props.animated) {
    return barWidths.value[fieldIndex]?.[optionIndex] || '0%'
  } else {
    return percent + '%'
  }
}

watch(() => props.counts, () => {
  if (!props.animated) {
    initBarWidths()
  }
}, { deep: true })

onMounted(async () => {
  if (props.animated) {
    await nextTick()
    barWidths.value = chartData.value.map(field => 
      field.options.map(opt => '0%')
    )
    
    await nextTick()
    
    setTimeout(() => {
      barWidths.value = chartData.value.map(field => 
        field.options.map(opt => opt.percent + '%')
      )
    }, 100)
  } else {
    initBarWidths()
  }
})
</script>

<style scoped>
.vote-result {
  padding: 1rem;
}

.progress-bar {
  transition: width 2s ease;
}

.progress-bar-animated {
  animation: progress-bar-stripes 1s linear infinite;
}

@keyframes progress-bar-stripes {
  0% { background-position-x: 1rem; }
  100% { background-position-x: 0; }
}
</style>
