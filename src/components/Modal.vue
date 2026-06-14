<script setup>
defineProps({ wide: Boolean })
const emit = defineEmits(['close'])
</script>

<template>
  <div class="modal-bg" @click.self="emit('close')">
    <div class="modal" :class="{ wide }">
      <slot />
    </div>
  </div>
</template>
