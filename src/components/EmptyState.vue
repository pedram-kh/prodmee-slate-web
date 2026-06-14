<script setup>
defineProps({ ico: { type: String, default: '○' }, title: String, sub: String })
</script>

<template>
  <div class="empty-state">
    <div class="ico">{{ ico }}</div>
    <div class="t">{{ title }}</div>
    <div class="s">{{ sub }}</div>
  </div>
</template>
