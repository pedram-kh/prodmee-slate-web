<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import OnePager from '../components/OnePager.vue'

const route = useRoute()
const project = ref(null)
const error = ref(false)
const loading = ref(true)

onMounted(async () => {
  const base = import.meta.env.VITE_API_BASE || ''
  try {
    const res = await fetch(`${base}/api/share/${route.params.token}`, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error('not found')
    const data = await res.json()
    project.value = data.data
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="share-page">
    <div v-if="loading" class="share-msg">Loading…</div>
    <div v-else-if="error" class="share-msg">
      <div class="ico">○</div>
      <div class="t">Link not found</div>
      <div class="s">This share link is invalid or has been disabled.</div>
    </div>
    <div v-else class="share-card">
      <OnePager :project="project" :internal="false" :share="true" />
    </div>
  </div>
</template>

<style scoped>
.share-page{min-height:100vh;background:var(--bg);padding:32px 18px;display:flex;justify-content:center}
.share-card{width:100%;max-width:720px;background:var(--card);border:1px solid var(--border2);border-radius:12px;overflow:hidden;align-self:flex-start}
.share-msg{margin:auto;text-align:center;color:var(--text2);display:flex;flex-direction:column;gap:10px;align-items:center}
.share-msg .ico{font-size:46px;opacity:.2}
.share-msg .t{font-size:20px;font-weight:700}
.share-msg .s{font-size:12px;color:var(--text3);font-family:'JetBrains Mono',monospace}
</style>
