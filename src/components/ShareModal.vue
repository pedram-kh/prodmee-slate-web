<script setup>
import { computed, ref } from 'vue'
import Modal from './Modal.vue'
import { useSlate } from '../stores/slate'
import { useUi } from '../stores/ui'
import { apiError } from '../lib/util'

const props = defineProps({ project: { type: Object, required: true } })
defineEmits(['close'])

const slate = useSlate()
const ui = useUi()
const busy = ref(false)

const token = computed(() => props.project.shareToken)
const url = computed(() => (token.value ? `${window.location.origin}/share/${token.value}` : ''))

async function enable() {
  busy.value = true
  try { await slate.enableShare(props.project.id); ui.toast('Share link enabled') } catch (e) { ui.error(apiError(e)) } finally { busy.value = false }
}
async function regenerate() {
  if (!confirm('Generate a new link? The old one will stop working.')) return
  busy.value = true
  try { await slate.regenerateShare(props.project.id); ui.toast('New link generated') } catch (e) { ui.error(apiError(e)) } finally { busy.value = false }
}
async function revoke() {
  if (!confirm('Disable sharing for this project?')) return
  busy.value = true
  try { await slate.revokeShare(props.project.id); ui.toast('Sharing disabled') } catch (e) { ui.error(apiError(e)) } finally { busy.value = false }
}
async function copy() {
  try { await navigator.clipboard.writeText(url.value); ui.toast('Link copied') } catch (e) { ui.error('Could not copy.') }
}
</script>

<template>
  <Modal @close="$emit('close')">
    <button class="modal-close" @click="$emit('close')">✕</button>
    <div class="modal-head"><div class="modal-sub">Share · read-only</div><h2>{{ project.title }}</h2></div>
    <div class="modal-body">
      <div class="banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></svg>
        Anyone with the link sees a clean one-pager — no budget, internal notes, comments or team. Nothing else is exposed.
      </div>

      <template v-if="token">
        <div class="f">
          <label>Public link</label>
          <div class="share-url"><input :value="url" readonly /><button class="btn btn-red" @click="copy">Copy</button></div>
        </div>
        <div style="display:flex;gap:9px">
          <button class="btn btn-outline" :disabled="busy" @click="regenerate">Regenerate</button>
          <button class="del-link" :disabled="busy" @click="revoke">DISABLE SHARING</button>
        </div>
      </template>
      <template v-else>
        <p style="font-size:13px;color:var(--text2);line-height:1.6">Sharing is off. Generate a private link to send this one-pager to a buyer or partner.</p>
        <button class="btn btn-red" :disabled="busy" @click="enable">Enable share link</button>
      </template>
    </div>
  </Modal>
</template>

<style scoped>
.share-url{display:flex;gap:8px}
.share-url input{flex:1;background:var(--card2);border:1px solid var(--border2);color:var(--text);padding:11px 13px;border-radius:var(--r);font-family:'JetBrains Mono',monospace;font-size:12px;outline:none}
</style>
