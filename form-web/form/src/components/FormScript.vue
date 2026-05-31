<template>
  <slot />
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { FormScriptEngine, type FieldChanges } from '../utils/form-script'

const props = defineProps<{
  script: string
  fields: Array<{
    name: string
    inputType?: string
    type?: string
    options?: Array<{ label: string; value: unknown }>
    value?: unknown
    hidden?: boolean
  }>
  modelValue?: Record<string, unknown>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
  'fieldChange': [fieldName: string, value: unknown]
  'update:fieldChanges': [changes: FieldChanges]
}>()

const fieldChanges = ref<FieldChanges>({})

let engine: FormScriptEngine | null = null

function initEngine() {
  if (engine) {
    engine.destroy()
    engine = null
  }

  if (!props.script) {
    return
  }

  engine = new FormScriptEngine({
    script: props.script,
    fields: props.fields,
    onBatchUpdate: (changes: FieldChanges) => {
      fieldChanges.value = { ...fieldChanges.value, ...changes }
      emit('update:fieldChanges', fieldChanges.value)

      for (const [fieldName, state] of Object.entries(changes)) {
        if (state.value !== undefined) {
          emit('update:modelValue', {
            ...props.modelValue,
            [fieldName]: state.value
          })
        }
      }
    }
  })

  for (const field of props.fields) {
    if (props.modelValue?.[field.name] !== undefined) {
      engine.notifyChange(field.name, props.modelValue[field.name])
    }
  }
}

watch(() => [props.script, props.fields], () => {
  initEngine()
}, { immediate: true })

watch(() => JSON.stringify(props.modelValue || {}), () => {
  if (!engine) return

  const newVal = props.modelValue || {}
  for (const field of props.fields) {
    const newV = newVal[field.name]
    if (newV !== undefined) {
      engine.notifyChange(field.name, newV)
    }
  }
})

onUnmounted(() => {
  engine?.destroy()
})

defineExpose({
  notifyChange: (fieldName: string, value: unknown) => {
    engine?.notifyChange(fieldName, value)
  }
})
</script>
