<script setup>
import { useSlate } from '../stores/slate'

const slate = useSlate()
const model = defineModel({ type: Object, required: true })
defineProps({ count: { type: Number, default: 0 } })

const FORMAT_FILTERS = [
  { v: 'series', label: 'Series' },
  { v: 'film', label: 'Films' },
  { v: 'vertical', label: 'Verticals' },
  { v: 'reality', label: 'Realities' },
  { v: 'docuseries', label: 'Docuseries' },
  { v: 'docufollow', label: 'Docufollows' },
  { v: 'documentary', label: 'Documentary' },
]

function active() {
  const f = model.value
  return f.q || f.format !== 'all' || f.genre !== 'all' || f.origin !== 'all' || f.tier !== 'all' || f.coprod !== 'all'
}
function clear() {
  model.value = { q: '', format: 'all', genre: 'all', origin: 'all', tier: 'all', coprod: 'all' }
}
</script>

<template>
  <div class="filterbar">
    <div class="search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
      <input v-model="model.q" placeholder="Search by name…" />
    </div>
    <select class="fsel" v-model="model.format">
      <option value="all">All formats</option>
      <option v-for="x in FORMAT_FILTERS" :key="x.v" :value="x.v">{{ x.label }}</option>
    </select>
    <select class="fsel" v-model="model.genre">
      <option value="all">All genres</option>
      <option v-for="g in slate.meta.genres" :key="g" :value="g">{{ g }}</option>
    </select>
    <select class="fsel" v-model="model.origin">
      <option value="all">Any origin</option>
      <option value="interno">Internal</option>
      <option value="externo">External</option>
    </select>
    <select class="fsel" v-model="model.tier">
      <option value="all">Any budget</option>
      <option v-for="t in slate.meta.budgets" :key="t" :value="t">{{ t }}</option>
    </select>
    <select class="fsel" v-model="model.coprod">
      <option value="all">Co-prod: all</option>
      <option value="yes">Co-production</option>
      <option value="no">In-house only</option>
    </select>
    <button v-if="active()" class="fclear" @click="clear">Clear</button>
    <span class="fcount">{{ count }} shown</span>
  </div>
</template>
