<script setup>
import { useUi } from './stores/ui'
const ui = useUi()
</script>

<template>
  <router-view />
  <div class="toast-wrap">
    <div v-for="t in ui.toasts" :key="t.id" class="toast" :class="t.kind" @click="ui.dismiss(t.id)">
      {{ t.message }}
    </div>
  </div>
</template>
