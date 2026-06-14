<script setup>
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSlate } from '../stores/slate'
import Modal from '../components/Modal.vue'
import Avatar from '../components/Avatar.vue'

const slate = useSlate()
const router = useRouter()
const route = useRoute()
const selected = ref(null)

function projectsFor(personId) {
  return slate.projects.filter((p) =>
    [...(p.members || []), ...(p.collaborators || [])].some((m) => m.id === personId)
  )
}
const members = computed(() => slate.people.members)
const collaborators = computed(() => slate.people.collaborators)

function openProject(id) {
  selected.value = null
  router.push({ query: { ...route.query, project: id } })
}
</script>

<template>
  <div class="topbar"><h1>Team &amp; collaborators</h1><div class="spacer"></div>
    <span class="count-chip">{{ members.length }} internal · {{ collaborators.length }} external</span>
  </div>

  <div class="content view-anim">
    <div class="heading">Internal team</div>
    <div class="grid-people">
      <div v-for="m in members" :key="m.id" class="person" style="cursor:pointer" @click="selected = m">
        <Avatar :person="m" />
        <div class="meta">
          <div class="nm">{{ m.name }}</div>
          <div class="rl">{{ m.role === 'admin' ? 'Admin' : 'Team' }}</div>
          <div class="cnt">{{ projectsFor(m.id).length }} PROJECTS</div>
        </div>
        <span class="role-pill" :class="`rp-${m.role}`">{{ m.role }}</span>
      </div>
    </div>

    <div class="heading">External collaborators</div>
    <div class="grid-people">
      <div v-for="m in collaborators" :key="m.id" class="person" style="cursor:pointer" @click="selected = m">
        <Avatar :person="m" />
        <div class="meta">
          <div class="nm">{{ m.name }}</div>
          <div class="rl">External</div>
          <div class="cnt">{{ projectsFor(m.id).length }} PROJECTS</div>
        </div>
        <span class="role-pill rp-external">external</span>
      </div>
    </div>
  </div>

  <Modal v-if="selected" @close="selected = null">
    <button class="modal-close" @click="selected = null">✕</button>
    <div class="modal-head"><div class="modal-sub">{{ selected.role }}</div><h2>{{ selected.name }}</h2></div>
    <div class="modal-body">
      <div class="heading" style="margin-top:0">Projects</div>
      <div v-if="!projectsFor(selected.id).length" class="fl-empty">Not on any projects yet.</div>
      <div v-for="p in projectsFor(selected.id)" :key="p.id" class="proj-item" style="border:1px solid var(--border2)" @click="openProject(p.id)">
        <div class="proj-icon"><span class="sdot" :style="{ background: slate.stageById(p.stage).color }"></span></div>
        <div><div class="proj-name">{{ p.title }}</div><div class="proj-meta">{{ slate.stageById(p.stage).label.toUpperCase() }}</div></div>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.fl-empty{font-size:11.5px;color:var(--text3);text-align:center;padding:14px;border:1px dashed var(--border2);border-radius:var(--r)}
</style>
