<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../stores/auth'
import Avatar from './Avatar.vue'

const props = defineProps({ project: { type: Object, required: true }, draggable: Boolean })
const emit = defineEmits(['dragstart', 'dragend'])
const router = useRouter()
const route = useRoute()
const auth = useAuth()

const people = computed(() => [...(props.project.members || []), ...(props.project.collaborators || [])])
const shown = computed(() => people.value.slice(0, 4))
const isCoprod = computed(() => (props.project.collaborators || []).length > 0)
const prog = computed(() => props.project.checklist || { done: 0, pct: 0 })

function open() {
  router.push({ query: { ...route.query, project: props.project.id } })
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
  </div>
</template>
