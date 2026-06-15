<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../stores/auth'
import { useSlate } from '../stores/slate'

const auth = useAuth()
const slate = useSlate()
const router = useRouter()
const route = useRoute()

const roleLabel = computed(() => ({ admin: 'Admin', member: 'Team', external: 'External' }[auth.user?.role] || ''))

function openProject(id) {
  router.push({ query: { ...route.query, project: id } })
}
async function signOut() {
  await auth.logout()
  router.replace('/login')
}
function newProject() {
  router.push({ query: { ...route.query, project: 'new' } })
}
</script>

<template>
  <aside class="sidebar">
    <div class="sb-head">
      <span class="sb-mark">P</span><span class="sb-word">Prodmee</span>
      <span class="sb-tag">Slate</span>
    </div>

    <div class="sb-user-row" v-if="auth.user">
      <div class="avatar av-int">{{ (auth.user.name || '?').slice(0, 2).toUpperCase() }}</div>
      <div style="flex:1;min-width:0">
        <div class="sb-user-name">{{ auth.user.name }}</div>
        <div class="sb-user-role">{{ roleLabel }}</div>
      </div>
    </div>

    <template v-if="!auth.isExternal">
      <div class="sb-section-label">View</div>
      <div class="nav-list">
        <div class="nav-item" :class="{ active: route.name === 'slate' }" @click="router.push('/slate')">
          <span class="ic">▦</span><span class="lb">Slate</span>
        </div>
        <div class="nav-item" :class="{ active: route.name === 'sales' }" @click="router.push('/sales')">
          <span class="ic">◇</span><span class="lb">Sales</span>
        </div>
        <div v-if="auth.isAdmin" class="nav-item" :class="{ active: route.name === 'team' }" @click="router.push('/team')">
          <span class="ic">◐</span><span class="lb">Team</span>
        </div>
        <div v-if="auth.isAdmin" class="nav-item" :class="{ active: route.name === 'settings' }" @click="router.push('/settings')">
          <span class="ic">⚙</span><span class="lb">Settings</span>
        </div>
      </div>
    </template>

    <div class="sb-section-label">{{ auth.isExternal ? 'Your projects' : 'Projects' }} · {{ slate.projects.length }}</div>
    <div class="sb-projects">
      <div v-for="p in slate.projects" :key="p.id" class="proj-item" @click="openProject(p.id)">
        <div class="proj-icon"><span class="sdot" :style="{ background: slate.stageById(p.stage).color }"></span></div>
        <div style="min-width:0">
          <div class="proj-name">{{ p.title }}</div>
          <div class="proj-meta">{{ slate.stageById(p.stage).label.toUpperCase() }}</div>
        </div>
      </div>
      <div v-if="!slate.projects.length" style="padding:14px;font-size:11px;color:var(--text3)" class="mono">NO PROJECTS</div>
    </div>

    <button v-if="auth.isWriter" class="sb-new-btn" @click="newProject">＋ New project</button>
    <div class="sb-bottom">
      <span style="cursor:pointer" @click="signOut">SIGN OUT</span>
    </div>
  </aside>
</template>
