<script setup>
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSlate } from '../stores/slate'
import { useUi } from '../stores/ui'
import { apiError } from '../lib/util'
import Modal from '../components/Modal.vue'
import Avatar from '../components/Avatar.vue'

const slate = useSlate()
const ui = useUi()
const router = useRouter()
const route = useRoute()
const selected = ref(null)
const busy = ref(false)

function projectsFor(personId) {
  return slate.projects.filter((p) =>
    [...(p.members || []), ...(p.collaborators || [])].some((m) => m.id === personId)
  )
}
const members = computed(() => slate.people.members)
const collaborators = computed(() => slate.people.collaborators)

// Projects the selected person is not yet attached to.
const availableProjects = computed(() => {
  if (!selected.value) return []
  const onIds = new Set(projectsFor(selected.value.id).map((p) => p.id))
  return slate.projects.filter((p) => !onIds.has(p.id))
})

// External people join as collaborators; everyone else as internal members.
function relationFor(person) {
  return person.role === 'external' ? 'external' : 'member'
}

async function addToProject(projectId) {
  if (!projectId || !selected.value) return
  busy.value = true
  try {
    await slate.attachUser(projectId, selected.value.id, relationFor(selected.value))
    ui.toast('Added to project.')
  } catch (e) {
    ui.error(apiError(e))
  } finally {
    busy.value = false
  }
}

async function removeFromProject(projectId) {
  if (!selected.value) return
  if (!window.confirm(`Remove ${selected.value.name} from this project?`)) return
  busy.value = true
  try {
    await slate.detachUser(projectId, selected.value.id)
    ui.toast('Removed from project.')
  } catch (e) {
    ui.error(apiError(e))
  } finally {
    busy.value = false
  }
}

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
        <div style="flex:1;min-width:0"><div class="proj-name">{{ p.title }}</div><div class="proj-meta">{{ slate.stageById(p.stage).label.toUpperCase() }}</div></div>
        <button class="proj-rm" title="Remove from project" :disabled="busy" @click.stop="removeFromProject(p.id)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>
        </button>
      </div>

      <div class="acc-sub" style="margin-top:14px">
        <div class="lbl">Add to a project</div>
        <div class="chips">
          <select class="addbtn" :disabled="busy || !availableProjects.length" @change="addToProject(Number($event.target.value)); $event.target.value = ''">
            <option value="">{{ availableProjects.length ? '＋ Project' : 'On all projects' }}</option>
            <option v-for="p in availableProjects" :key="p.id" :value="p.id">{{ p.title }}</option>
          </select>
        </div>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.fl-empty{font-size:11.5px;color:var(--text3);text-align:center;padding:14px;border:1px dashed var(--border2);border-radius:var(--r)}
.proj-rm{flex:none;display:grid;place-items:center;width:26px;height:26px;border-radius:6px;background:var(--card2);border:1px solid var(--border2);color:var(--text3);cursor:pointer;transition:.15s}
.proj-rm svg{width:14px;height:14px}
.proj-rm:hover{background:var(--red);border-color:var(--red);color:#fff}
.proj-rm:disabled{opacity:.5;cursor:not-allowed}
</style>
