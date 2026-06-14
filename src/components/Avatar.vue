<script setup>
import { computed } from 'vue'
import { initials } from '../lib/util'

const props = defineProps({ person: { type: Object, required: true } })
const cls = computed(() => (props.person?.type === 'external' || props.person?.role === 'external' ? 'av-ext' : 'av-int'))
</script>

<template>
  <div class="avatar" :class="cls">{{ initials(person.name) }}</div>
</template>
