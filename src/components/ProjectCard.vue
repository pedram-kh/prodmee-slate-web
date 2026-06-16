<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../stores/auth'
import { useSlate } from '../stores/slate'
import { useUi } from '../stores/ui'
import { apiError } from '../lib/util'
import Avatar from './Avatar.vue'

const props = defineProps({ project: { type: Object, required: true }, draggable: Boolean })
const emit = defineEmits(['dragstart', 'dragend'])
const router = useRouter()
const route = useRoute()
const auth = useAuth()
const slate = useSlate()
const ui = useUi()

const people = computed(() => [...(props.project.members || []), ...(props.project.collaborators || [])])
const shown = computed(() => people.value.slice(0, 4))
const isCoprod = computed(() => (props.project.collaborators || []).length > 0)
const prog = computed(() => props.project.checklist || { done: 0, pct: 0 })

function open() {
  router.push({ query: { ...route.query, project: props.project.id } })
}

function moveStage(stageId) {
  if (stageId === props.project.stage) return
  slate.setStage(props.project.id, stageId).catch((e) => ui.error(apiError(e, 'Could not move project.')))
}
</script>

<template>
  <div
    class="card"
    :draggable="draggable"
    @click="open"
    @dragstart="emit('dragstart', $event)"
    @dragend="emit('dragend', $event)"
  >
    <div class="fmt">{{ project.format }}</div>
    <div class="ttl">{{ project.title }}</div>
    <div class="log">{{ project.tagline || project.logline || '' }}</div>
    <div class="card-foot">
      <div class="stack">
        <Avatar v-for="m in shown" :key="m.id" :person="m" />
        <div v-if="people.length > 4" class="more">+{{ people.length - 4 }}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span v-if="isCoprod" class="badge b-coprod">Coprod</span>
        <span class="tier">{{ project.tier }}</span>
      </div>
    </div>
    <div v-if="prog.done" class="card-prog-row" :title="`${prog.done}/${prog.total} steps`">
      <div class="card-prog"><i :style="{ width: prog.pct + '%' }"></i></div>
      <span class="card-progpct">{{ prog.pct }}%</span>
    </div>

    <!-- Touch fallback: dragging can't work on phones, so offer a stage picker -->
    <label v-if="draggable" class="card-move" @click.stop>
      <span class="card-move-ic">⇄</span>
      <select :value="project.stage" @click.stop @change.stop="moveStage($event.target.value)">
        <option v-for="s in slate.meta.stages" :key="s.id" :value="s.id">{{ s.label }}</option>
      </select>
    </label>
  </div>
</template>

<style scoped>
/* Only shown on touch / small screens — desktop keeps drag-and-drop */
.card-move{display:none}
@media(max-width:760px){
  .card-move{display:flex;align-items:center;gap:7px;margin-top:11px;padding-top:11px;border-top:1px solid var(--border2)}
  .card-move-ic{color:var(--text3);font-size:14px;flex:none}
  .card-move select{flex:1;background:var(--card2);border:1px solid var(--border2);color:var(--text2);
    font-size:13px;padding:8px 10px;border-radius:var(--r-sm);outline:none}
  .card-move select:focus{border-color:var(--red)}
}
</style>
