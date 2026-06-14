<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSlate } from '../stores/slate'
import { useAuth } from '../stores/auth'
import { useUi } from '../stores/ui'
import { apiError, cmtTime } from '../lib/util'
import Modal from './Modal.vue'
import OnePager from './OnePager.vue'
import Avatar from './Avatar.vue'
import ShareModal from './ShareModal.vue'
import ProjectFiles from './ProjectFiles.vue'

const route = useRoute()
const router = useRouter()
const slate = useSlate()
const auth = useAuth()
const ui = useUi()

const mode = ref('view') // view | edit | new
const busy = ref(false)
const shareOpen = ref(false)
const newComment = ref('')
const linkLabel = ref('')
const linkUrl = ref('')
const autofilling = ref(false)
const autofillNote = ref('')
const form = reactive({})

const queryId = computed(() => route.query.project)
const open = computed(() => !!queryId.value)
const project = computed(() => (queryId.value && queryId.value !== 'new' ? slate.projectById(Number(queryId.value)) : null))
const canEdit = computed(() => auth.isWriter && !auth.isExternal)

watch(
  queryId,
  async (id) => {
    if (!id) return
    if (id === 'new') {
      mode.value = 'new'
      resetForm()
      return
    }
    mode.value = 'view'
    try {
      await slate.refreshProject(Number(id))
    } catch (e) {
      ui.error(apiError(e, 'Could not open project.'))
      close()
    }
  },
  { immediate: true }
)

function resetForm() {
  Object.assign(form, {
    title: '', logline: '', tagline: '', format: 'Series', genre: '', stage: 'idea',
    origin: 'interno', tier: '$0–1M', language: '', episodes: '', territory: '',
    concept: '', whyNow: '', references: '', participants: '', packaging: '', notes: '',
  })
}
function loadForm(p) {
  Object.assign(form, {
    title: p.title, logline: p.logline, tagline: p.tagline, format: p.format, genre: p.genre || '',
    stage: p.stage, origin: p.origin, tier: p.tier, language: p.language, episodes: p.episodes,
    territory: p.territory, concept: p.concept, whyNow: p.whyNow, references: p.references,
    participants: p.participants, packaging: p.packaging, notes: p.notes,
  })
}

function close() {
  const q = { ...route.query }
  delete q.project
  router.push({ query: q })
}
function startEdit() {
  loadForm(project.value)
  mode.value = 'edit'
}

async function createProject() {
  if (!form.title.trim()) return
  busy.value = true
  try {
    const p = await slate.createProject({
      title: form.title, logline: form.logline, format: form.format, genre: form.genre,
      origin: form.origin, tier: form.tier,
    })
    router.replace({ query: { ...route.query, project: p.id } })
    loadForm(p)
    mode.value = 'edit'
    ui.toast('Project created')
  } catch (e) {
    ui.error(apiError(e, 'Could not create project.'))
  } finally {
    busy.value = false
  }
}

async function save() {
  busy.value = true
  try {
    await slate.updateProject(project.value.id, { ...form })
    mode.value = 'view'
    ui.toast('Saved')
  } catch (e) {
    ui.error(apiError(e, 'Could not save.'))
  } finally {
    busy.value = false
  }
}

async function setStage(id) {
  form.stage = id
  if (mode.value === 'edit' && project.value) {
    try { await slate.setStage(project.value.id, id) } catch (e) { ui.error(apiError(e)) }
  }
}

async function remove() {
  if (!confirm('Delete this project from the slate?')) return
  try {
    await slate.deleteProject(project.value.id)
    ui.toast('Project deleted')
    close()
  } catch (e) {
    ui.error(apiError(e, 'Could not delete.'))
  }
}

const AF_MAP = ['title', 'tagline', 'logline', 'concept', 'whyNow', 'references', 'participants', 'genre', 'language', 'episodes', 'territory', 'packaging']
async function autofill() {
  autofilling.value = true
  autofillNote.value = 'Reading documents…'
  try {
    const fields = await slate.autofill(project.value.id)
    let n = 0
    for (const k of AF_MAP) {
      const v = (fields[k] || '').trim()
      if (v && !String(form[k] || '').trim()) {
        form[k] = v
        n++
      }
    }
    autofillNote.value = n ? `${n} field(s) filled from your documents. Review and Save.` : 'No new fields found (or all were already filled).'
  } catch (e) {
    autofillNote.value = apiError(e, 'Auto-fill failed.')
  } finally {
    autofilling.value = false
  }
}

// Checklist / comments / links / access
async function toggleCheck(itemId) {
  const done = !(project.value.checkDone || {})[itemId]
  try { await slate.toggleChecklist(project.value.id, itemId, done) } catch (e) { ui.error(apiError(e)) }
}
async function postComment() {
  if (!newComment.value.trim()) return
  try { await slate.addComment(project.value.id, newComment.value.trim()); newComment.value = '' } catch (e) { ui.error(apiError(e)) }
}
async function delComment(id) {
  try { await slate.removeComment(project.value.id, id) } catch (e) { ui.error(apiError(e)) }
}
async function addLink() {
  if (!linkUrl.value.trim()) return
  try { await slate.addLink(project.value.id, linkLabel.value.trim(), linkUrl.value.trim()); linkLabel.value = ''; linkUrl.value = '' } catch (e) { ui.error(apiError(e)) }
}
async function delLink(id) {
  try { await slate.removeLink(project.value.id, id) } catch (e) { ui.error(apiError(e)) }
}

const availableMembers = computed(() => {
  const ids = new Set((project.value?.members || []).map((m) => m.id))
  return slate.people.members.filter((m) => !ids.has(m.id))
})
const availableCollabs = computed(() => {
  const ids = new Set((project.value?.collaborators || []).map((m) => m.id))
  return slate.people.collaborators.filter((m) => !ids.has(m.id))
})
async function attach(userId, relation) {
  if (!userId) return
  try { await slate.attachUser(project.value.id, userId, relation) } catch (e) { ui.error(apiError(e)) }
}
async function detach(userId) {
  try { await slate.detachUser(project.value.id, userId) } catch (e) { ui.error(apiError(e)) }
}

const checklist = computed(() => slate.meta.checklist)
function isDone(itemId) {
  return !!(project.value?.checkDone || {})[itemId]
}
</script>

<template>
  <Modal v-if="open" wide @close="close">
    <!-- CREATE -->
    <template v-if="mode === 'new'">
      <button class="modal-close" @click="close">✕</button>
      <div class="modal-head"><div class="modal-sub">New project</div><h2>Add to slate</h2></div>
      <div class="modal-body">
        <div class="f"><label>Title</label><input v-model="form.title" placeholder="Project title" autofocus /></div>
        <div class="f"><label>Logline</label><textarea v-model="form.logline" placeholder="A one-line summary"></textarea></div>
        <div class="row2">
          <div class="f"><label>Format</label><select v-model="form.format"><option v-for="f in slate.meta.formats" :key="f">{{ f }}</option></select></div>
          <div class="f"><label>Genre</label><select v-model="form.genre"><option value="">—</option><option v-for="g in slate.meta.genres" :key="g">{{ g }}</option></select></div>
        </div>
        <div class="row2">
          <div class="f"><label>Origin</label><select v-model="form.origin"><option value="interno">Internal (own idea)</option><option value="externo">External (brought by collaborator)</option></select></div>
          <div class="f"><label>Budget</label><select v-model="form.tier"><option v-for="b in slate.meta.budgets" :key="b">{{ b }}</option></select></div>
        </div>
      </div>
      <div class="modal-foot"><span></span><div style="display:flex;gap:9px">
        <button class="btn btn-outline" @click="close">Cancel</button>
        <button class="btn btn-red" :disabled="busy" @click="createProject">Create project</button>
      </div></div>
    </template>

    <!-- VIEW -->
    <template v-else-if="mode === 'view' && project">
      <div class="op-tools">
        <button v-if="canEdit" class="op-edit" @click="startEdit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h4l10-10-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg> Edit
        </button>
        <button v-if="canEdit" class="op-edit" @click="shareOpen = true">Share</button>
        <button class="op-x" @click="close">✕</button>
      </div>
      <OnePager :project="project" :internal="true">
        <!-- Checklist -->
        <div class="access">
          <div class="heading" style="margin-top:0">Production checklist · {{ project.checklist.done }}/{{ project.checklist.total }} · {{ project.checklist.pct }}%</div>
          <div class="chk-prog"><i :style="{ width: project.checklist.pct + '%' }"></i></div>
          <template v-for="ph in checklist" :key="ph.phase">
            <div class="chk-phase">{{ ph.phase }}</div>
            <div v-for="it in ph.items" :key="it.id" class="chk-item" :class="{ done: isDone(it.id), tap: canEdit }" @click="canEdit && toggleCheck(it.id)">
              <span class="chk-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5L20 6" /></svg></span>
              <span class="chk-label">{{ it.label }}</span>
            </div>
          </template>
        </div>

        <ProjectFiles :project="project" :editable="false" />

        <!-- Links -->
        <div class="access" v-if="(project.links || []).length">
          <div class="heading" style="margin-top:0">Links · {{ project.links.length }}</div>
          <div class="fl-grid">
            <a v-for="l in project.links" :key="l.id" class="linkrow" :href="l.url" target="_blank" rel="noopener">
              <div class="fl-meta"><div class="fl-name">{{ l.label || l.url }}</div><div class="fl-sub">{{ l.url }}</div></div>
            </a>
          </div>
        </div>

        <!-- Comments -->
        <div class="access">
          <div class="heading" style="margin-top:0">Internal comments · {{ (project.comments || []).length }}</div>
          <div class="acc-hint">Only visible to your team — never shown on the shared client link.</div>
          <div v-if="!(project.comments || []).length" class="fl-empty">No comments yet.</div>
          <div v-for="c in project.comments" :key="c.id" class="cmt">
            <div class="cmt-av">{{ (c.author || '?').slice(0, 2).toUpperCase() }}</div>
            <div class="cmt-body">
              <div class="cmt-head"><b>{{ c.author }}</b><span>{{ cmtTime(c.ts) }}</span>
                <button v-if="auth.isAdmin || c.authorId === auth.user.id" class="cmt-rm" @click="delComment(c.id)">✕</button>
              </div>
              <div class="cmt-text">{{ c.text }}</div>
            </div>
          </div>
          <div class="cmt-add">
            <textarea v-model="newComment" placeholder="Add a comment for the team…"></textarea>
            <button class="btn btn-red" @click="postComment">Post</button>
          </div>
        </div>
      </OnePager>
    </template>

    <!-- EDIT -->
    <template v-else-if="mode === 'edit' && project">
      <button class="modal-close" @click="mode = 'view'">✕</button>
      <div class="modal-head"><div class="modal-sub">Edit project</div><h2><input v-model="form.title" /></h2></div>
      <div class="modal-body">
        <div class="af-row">
          <button class="btn btn-outline" :disabled="autofilling" @click="autofill">✨ {{ autofilling ? 'Reading…' : 'Auto-fill from documents' }}</button>
          <span v-if="autofillNote" class="af-note">{{ autofillNote }}</span>
        </div>
        <div class="f"><label>Tagline / hook</label><textarea v-model="form.tagline"></textarea></div>
        <div class="f"><label>Logline</label><textarea v-model="form.logline"></textarea></div>
        <div class="row2">
          <div class="f"><label>Format</label><select v-model="form.format"><option v-for="f in slate.meta.formats" :key="f">{{ f }}</option></select></div>
          <div class="f"><label>Genre</label><select v-model="form.genre"><option value="">—</option><option v-for="g in slate.meta.genres" :key="g">{{ g }}</option></select></div>
        </div>
        <div class="row2">
          <div class="f"><label>Language</label><input v-model="form.language" /></div>
          <div class="f"><label>Episodes / runtime</label><input v-model="form.episodes" /></div>
        </div>
        <div class="f"><label>Territory</label><input v-model="form.territory" /></div>
        <div class="row2">
          <div class="f"><label>Origin</label><select v-model="form.origin"><option value="interno">Internal</option><option value="externo">External</option></select></div>
          <div class="f"><label>Budget tier</label><select v-model="form.tier"><option v-for="b in slate.meta.budgets" :key="b">{{ b }}</option></select></div>
        </div>
        <div class="f"><label>Development stage</label>
          <div class="pill-row">
            <button v-for="x in slate.meta.stages" :key="x.id" class="pill" :class="{ on: form.stage === x.id }" @click="setStage(x.id)">
              <span class="pdot" :style="{ background: form.stage === x.id ? '#fff' : x.color }"></span>{{ x.label }}
            </button>
          </div>
        </div>
        <div class="f"><label>The concept</label><textarea v-model="form.concept" style="min-height:92px"></textarea></div>
        <div class="f"><label>Why now</label><textarea v-model="form.whyNow"></textarea></div>
        <div class="f"><label>References (comma-separated)</label><input v-model="form.references" /></div>
        <div class="f"><label>Cast &amp; talent</label><textarea v-model="form.participants"></textarea></div>
        <div class="f"><label>Packaging &amp; production</label><textarea v-model="form.packaging"></textarea></div>
        <div class="f"><label>Internal notes</label><textarea v-model="form.notes"></textarea></div>

        <ProjectFiles :project="project" :editable="true" />

        <!-- Access -->
        <div class="access">
          <div class="heading" style="margin-top:0">Project access</div>
          <div class="acc-hint">Only the people listed can see this project.</div>
          <div class="acc-sub">
            <div class="lbl">Internal team</div>
            <div class="chips">
              <span v-for="m in project.members" :key="m.id" class="chip"><Avatar :person="m" /><span>{{ m.name }}</span><button class="rm" @click="detach(m.id)">×</button></span>
              <select class="addbtn" style="padding:6px 13px" @change="attach(Number($event.target.value), 'member'); $event.target.value = ''">
                <option value="">＋ Team</option>
                <option v-for="m in availableMembers" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select>
            </div>
          </div>
          <div class="acc-sub">
            <div class="lbl">Co-producers / external</div>
            <div class="chips">
              <span v-for="m in project.collaborators" :key="m.id" class="chip"><Avatar :person="m" /><span>{{ m.name }}</span><button class="rm" @click="detach(m.id)">×</button></span>
              <select class="addbtn" style="padding:6px 13px" @change="attach(Number($event.target.value), 'external'); $event.target.value = ''">
                <option value="">＋ Collaborator</option>
                <option v-for="m in availableCollabs" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="del-link" @click="remove">DELETE</button>
        <div style="display:flex;gap:9px">
          <button class="btn btn-outline" @click="mode = 'view'">View one-pager</button>
          <button class="btn btn-red" :disabled="busy" @click="save">Save changes</button>
        </div>
      </div>
    </template>

    <ShareModal v-if="shareOpen && project" :project="project" @close="shareOpen = false" />
  </Modal>
</template>

<style scoped>
.op-tools{position:absolute;top:14px;right:14px;z-index:8;display:flex;gap:8px}
.op-edit{background:rgba(13,27,42,.55);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.25);color:#fff;font-size:12px;font-weight:600;padding:8px 14px;border-radius:8px;display:flex;align-items:center;gap:7px;transition:.15s}
.op-edit:hover{background:var(--red);border-color:var(--red)}
.op-edit svg{width:14px;height:14px}
.op-x{width:32px;height:32px;border-radius:8px;background:rgba(13,27,42,.55);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.25);color:#fff;display:grid;place-items:center;font-size:15px}
.op-x:hover{background:var(--card2)}
.chk-prog{height:6px;background:var(--card2);border-radius:4px;overflow:hidden;margin:10px 0 14px}
.chk-prog>i{display:block;height:100%;background:var(--red);border-radius:4px;transition:width .3s}
.chk-phase{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);font-family:'JetBrains Mono',monospace;margin:13px 0 6px}
.chk-item{display:flex;align-items:center;gap:10px;padding:6px 0}
.chk-item.tap{cursor:pointer}
.chk-box{width:18px;height:18px;border-radius:5px;border:1.5px solid var(--border2);flex:none;display:grid;place-items:center;color:#fff;transition:.15s}
.chk-item.done .chk-box{background:var(--red);border-color:var(--red)}
.chk-box svg{width:12px;height:12px;opacity:0}
.chk-item.done .chk-box svg{opacity:1}
.chk-label{font-size:13px;color:var(--text2)}
.chk-item.done .chk-label{color:var(--text3);text-decoration:line-through}
.cmt{display:flex;gap:10px;padding:11px 0;border-bottom:1px solid var(--border)}
.cmt-av{width:28px;height:28px;border-radius:50%;background:var(--red);color:#fff;display:grid;place-items:center;font-size:10px;font-weight:700;flex:none}
.cmt-body{flex:1;min-width:0}
.cmt-head{display:flex;align-items:center;gap:8px}
.cmt-head b{font-size:12.5px;color:var(--text)}
.cmt-head span{font-size:10px;color:var(--text3);font-family:'JetBrains Mono',monospace}
.cmt-rm{margin-left:auto;color:var(--text3);font-size:12px}
.cmt-rm:hover{color:var(--red)}
.cmt-text{font-size:13px;color:var(--text2);line-height:1.5;margin-top:4px;white-space:pre-wrap}
.cmt-add{display:flex;gap:8px;margin-top:12px;align-items:flex-end}
.cmt-add textarea{flex:1;background:var(--card2);border:1px solid var(--border2);color:var(--text);padding:10px 12px;border-radius:var(--r);outline:none;min-height:42px;resize:vertical;font-size:13px}
.fl-grid{display:flex;flex-direction:column;gap:8px}
.linkrow{display:flex;align-items:center;gap:11px;background:var(--card2);border:1px solid var(--border2);border-radius:var(--r);padding:9px 11px;text-decoration:none}
.linkrow:hover{border-color:var(--red)}
.fl-meta{flex:1;min-width:0}
.fl-name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text)}
.fl-sub{font-size:10.5px;color:var(--text3);font-family:'JetBrains Mono',monospace;margin-top:2px}
.fl-empty{font-size:11.5px;color:var(--text3);text-align:center;padding:14px;border:1px dashed var(--border2);border-radius:var(--r)}
.af-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:var(--red-glow);border:1px solid rgba(192,32,26,.25);border-radius:var(--r);padding:12px 14px}
.af-note{font-size:11.5px;color:var(--text2);line-height:1.5}
</style>
