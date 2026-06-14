<script setup>
import { computed, ref } from 'vue'
import { useSlate } from '../stores/slate'
import { useAuth } from '../stores/auth'
import { useUi } from '../stores/ui'
import { apiError } from '../lib/util'
import FilterBar from '../components/FilterBar.vue'
import ProjectCard from '../components/ProjectCard.vue'
import EmptyState from '../components/EmptyState.vue'

const slate = useSlate()
const auth = useAuth()
const ui = useUi()

const filters = ref({ q: '', format: 'all', genre: 'all', origin: 'all', tier: 'all', coprod: 'all' })
const dragId = ref(null)
const dropCol = ref(null)

const FORMAT_RE = {
  series: /\bseries?\b/i,
  film: /\bfilms?\b|\bfeature\b|pel[ií]cula|largometraje/i,
  vertical: /vertical/i,
  reality: /realit/i,
  docuseries: /docu\s*-?\s*series|docuserie/i,
  docufollow: /docu\s*-?\s*follow/i,
  documentary: /document(al|ary)/i,
}

function match(p) {
  const f = filters.value
  if (f.format !== 'all' && FORMAT_RE[f.format] && !FORMAT_RE[f.format].test(p.format || '')) return false
  if (f.genre !== 'all' && p.genre !== f.genre) return false
  if (f.origin !== 'all' && (p.origin || 'interno') !== f.origin) return false
  if (f.tier !== 'all' && p.tier !== f.tier) return false
  const co = (p.collaborators || []).length > 0
  if (f.coprod === 'yes' && !co) return false
  if (f.coprod === 'no' && co) return false
  const q = (f.q || '').toLowerCase().trim()
  if (q && !(p.title.toLowerCase().includes(q) || (p.genre || '').toLowerCase().includes(q))) return false
  return true
}

const filtered = computed(() => slate.projects.filter(match))

function colProjects(stageId) {
  return filtered.value.filter((p) => p.stage === stageId)
}

function onDragStart(p, e) {
  if (auth.isExternal) return
  dragId.value = p.id
  e.dataTransfer.effectAllowed = 'move'
}
function onDrop(stageId) {
  dropCol.value = null
  const id = dragId.value
  dragId.value = null
  if (!id) return
  const p = slate.projectById(id)
  if (!p || p.stage === stageId) return
  slate.setStage(id, stageId).catch((e) => ui.error(apiError(e, 'Could not move project.')))
}
</script>

<template>
  <div class="topbar">
    <h1>Development slate</h1>
    <span class="role-pill" :class="`rp-${auth.user?.role}`">{{ auth.user?.role }}</span>
    <div class="spacer"></div>
    <span class="count-chip">{{ slate.projects.length }} projects</span>
  </div>

  <div class="content view-anim">
    <!-- External collaborators get a simple read-only list -->
    <template v-if="auth.isExternal">
      <div v-if="slate.projects.length" class="banner green" style="margin-bottom:20px;max-width:760px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" /></svg>
        This is your collaborator view. You only see the projects you are part of.
      </div>
      <div class="board" style="max-width:760px;flex-direction:column">
        <ProjectCard v-for="p in slate.projects" :key="p.id" :project="p" :draggable="false" />
      </div>
      <EmptyState v-if="!slate.projects.length" title="No projects yet" sub="The team will give you access when you collaborate" />
    </template>

    <template v-else>
      <FilterBar v-model="filters" :count="filtered.length" />
      <div v-if="filtered.length" class="board">
        <div
          v-for="st in slate.meta.stages"
          :key="st.id"
          class="col"
          :class="{ dropping: dropCol === st.id }"
          @dragover.prevent="dropCol = st.id"
          @drop.prevent="onDrop(st.id)"
        >
          <div class="col-head">
            <span class="col-dot" :style="{ background: st.color }"></span>
            <span class="nm">{{ st.label }}</span>
            <span class="ct">{{ colProjects(st.id).length }}</span>
          </div>
          <div class="col-body">
            <ProjectCard
              v-for="p in colProjects(st.id)"
              :key="p.id"
              :project="p"
              :draggable="!auth.isExternal"
              @dragstart="onDragStart(p, $event)"
            />
            <div v-if="!colProjects(st.id).length" class="empty-col">— Empty —</div>
          </div>
        </div>
      </div>
      <EmptyState v-else title="No matches" sub="Try adjusting filters or search" />
    </template>
  </div>
</template>
