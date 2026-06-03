<template>
  <main class="container py-5">
    <div class="mx-auto" style="max-width: 720px;">
      <div class="card shadow-sm border-0">
        <div class="card-body text-center p-5">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="#10b981" class="mb-3" viewBox="0 0 24 24" stroke-width="0" stroke="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <h1 class="h3 mb-3">{{ isVote ? '投票成功' : '提交成功' }}</h1>
          <p class="text-secondary mb-4">{{ isVote ? '感谢您的参与，以下是当前投票结果' : '感谢您的填写，您的反馈已成功提交。' }}</p>
          
          <!-- 投票结果展示 -->
          <VoteResultBar 
            v-if="isVote && voteForm && voteCounts" 
            :form="voteForm" 
            :counts="voteCounts" 
          />
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { formApi } from '../api'
import VoteResultBar from '../components/VoteResultBar.vue'

const route = useRoute()
const voteForm = ref(null)
const voteCounts = ref(null)
const loading = ref(true)

const isVote = computed(() => {
  return route.query.counts !== undefined
})

async function loadForm() {
  if (!isVote.value) return
  
  try {
    voteCounts.value = JSON.parse(route.query.counts)
    const data = await formApi.getSchema(route.params.id)
    voteForm.value = data
  } catch (err) {
    console.error('[SuccessView] 加载表单失败:', err)
  } finally {
    loading.value = false
  }
}

onMounted(loadForm)
</script>