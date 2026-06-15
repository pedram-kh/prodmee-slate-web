<script setup>
import { computed, ref } from 'vue'
import { useSlate } from '../stores/slate'
import { useUi } from '../stores/ui'
import { apiError } from '../lib/util'

const props = defineProps({ project: { type: Object, required: true }, editable: Boolean })
const slate = useSlate()
const ui = useUi()
const busy = ref(null) // slot currently uploading

const files = computed(() => props.project.files || [])
const ICON = { pdf: '▤', image: '▣', video: '▶', ppt: '◧', file: '▦' }

const SLOTS = [
  { slot: 'cover', label: 'Cover image', accept: 'image/*' },
  { slot: 'script', label: 'Script / pilot', accept: '.pdf,.doc,.docx' },
  { slot: 'bible', label: 'Bible', accept: '.pdf,.doc,.docx,.ppt,.pptx' },
  { slot: 'budget', label: 'Budget', accept: '.pdf,.xls,.xlsx,.csv' },
  { slot: 'file', label: 'Other document', accept: '' },
]

async function pick(slot, e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  busy.value = slot
  try {
    await slate.uploadFile(props.project.id, file, slot)
    ui.toast('Uploaded')
  } catch (err) {
    ui.error(apiError(err, 'Upload failed.'))
  } finally {
    busy.value = null
  }
}
async function remove(f) {
  if (!confirm('Remove this file?')) return
  try {
    await slate.deleteFile(props.project.id, f.id)
    ui.toast('Removed')
  } catch (err) {
    ui.error(apiError(err))
  }
}
</script>

<template>
  <div class="access" v-if="files.length || editable">
    <div class="heading" style="margin-top:0">Documents · {{ files.length }}</div>

    <div v-if="!files.length && !editable" class="fl-empty">No documents.</div>

    <div class="fl-grid" v-if="files.length">
      <div v-for="f in files" :key="f.id" class="filerow">
        <span class="fl-ic">{{ ICON[f.kind] || '▦' }}</span>
        <a class="fl-meta" :href="f.url" target="_blank" rel="noopener">
          <div class="fl-name">{{ f.label || f.name }}</div>
          <div class="fl-sub">{{ f.slot }}{{ f.size ? ' · ' + Math.round(f.size / 1024) + ' KB' : '' }}</div>
        </a>
        <button v-if="editable" class="fl-rm" @click="remove(f)">✕</button>
      </div>
    </div>

    <div v-if="editable" class="fl-uploads">
      <label v-for="s in SLOTS" :key="s.slot" class="upbtn" :class="{ busy: busy === s.slot }">
        <input type="file" :accept="s.accept" hidden @change="pick(s.slot, $event)" :disabled="busy" />
        <span>{{ busy === s.slot ? 'Uploading…' : '＋ ' + s.label }}</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.fl-grid{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}
.filerow{display:flex;align-items:center;gap:11px;background:var(--card2);border:1px solid var(--border2);border-radius:var(--r);padding:9px 11px}
.fl-ic{width:30px;height:30px;border-radius:5px;background:var(--card);border:1px solid var(--border2);display:grid;place-items:center;color:var(--text2);flex:none}
.fl-meta{flex:1;min-width:0;text-decoration:none}
.fl-name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text)}
.fl-sub{font-size:11px;color:var(--text3);margin-top:2px}
.fl-rm{color:var(--text3);font-size:13px}
.fl-rm:hover{color:var(--red)}
.fl-empty{font-size:11.5px;color:var(--text3);text-align:center;padding:14px;border:1px dashed var(--border2);border-radius:var(--r)}
.fl-uploads{display:flex;flex-wrap:wrap;gap:8px}
.upbtn{display:inline-flex;align-items:center;gap:6px;background:none;border:1px dashed var(--border2);color:var(--text3);border-radius:20px;padding:7px 13px;font-size:11.5px;font-weight:600;cursor:pointer;transition:.15s}
.upbtn:hover{border-color:var(--red);color:var(--red);background:var(--red-glow)}
.upbtn.busy{opacity:.6}
</style>
