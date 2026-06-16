<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useUi } from '../stores/ui'

defineProps({ wide: Boolean })
const emit = defineEmits(['close'])

// Let the shell know a modal is open so the fixed mobile hamburger can hide.
const ui = useUi()
onMounted(() => ui.openModal())
onUnmounted(() => ui.closeModal())
</script>

<template>
  <div class="modal-bg" @click.self="emit('close')">
    <div class="modal" :class="{ wide }">
      <slot />
    </div>
  </div>
</template>
