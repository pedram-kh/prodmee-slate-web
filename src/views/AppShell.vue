<script setup>
import { onMounted, ref } from 'vue'
import AppSidebar from '../components/AppSidebar.vue'
import SicalaPanel from '../components/SicalaPanel.vue'
import ProjectModal from '../components/ProjectModal.vue'
import { useSlate } from '../stores/slate'
import { useUi } from '../stores/ui'
import { useAuth } from '../stores/auth'
import { apiError } from '../lib/util'

const slate = useSlate()
const ui = useUi()
const auth = useAuth()
const sicalaOpen = ref(false)

onMounted(async () => {
  if (!slate.loaded) {
    try {
      await slate.loadAll()
      if (auth.isWriter) await slate.loadPeople()
    } catch (e) {
      ui.error(apiError(e, 'Could not load your slate.'))
    }
  }
})
</script>

<template>
  <div class="shell">
    <AppSidebar />
    <main class="main">
      <router-view />
    </main>

    <!-- Sicala assistant (writers only) -->
    <button v-if="auth.isWriter" class="asst-fab" title="Sicala" @click="sicalaOpen = true" aria-label="Sicala">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    </button>
    <SicalaPanel v-if="auth.isWriter" :open="sicalaOpen" @close="sicalaOpen = false" />

    <!-- Global project detail modal, driven by ?project= query -->
    <ProjectModal />
  </div>
</template>

<style scoped>
.asst-fab{position:fixed;right:20px;bottom:20px;z-index:1100;width:54px;height:54px;border-radius:50%;background:var(--red);color:#fff;display:grid;place-items:center;box-shadow:0 6px 22px rgba(192,32,26,.45);transition:.2s}
.asst-fab:hover{transform:translateY(-2px)}
.asst-fab svg{width:24px;height:24px}
</style>
