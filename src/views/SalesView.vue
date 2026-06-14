<script setup>
import { computed, reactive, ref } from 'vue'
import { useSlate } from '../stores/slate'
import { useUi } from '../stores/ui'
import { apiError, fmtDate } from '../lib/util'
import Modal from '../components/Modal.vue'
import EmptyState from '../components/EmptyState.vue'

const slate = useSlate()
const ui = useUi()

const tab = ref('pipeline')
const dragId = ref(null)
const dropCol = ref(null)

// --- Pipeline ---
function pitchesByStatus(statusId) {
  return slate.pitches.filter((p) => p.status === statusId)
}
function onDrop(statusId) {
  dropCol.value = null
  const id = dragId.value
  dragId.value = null
  if (!id) return
  const p = slate.pitches.find((x) => x.id === id)
  if (!p || p.status === statusId) return
  slate.setPitchStatus(id, statusId).catch((e) => ui.error(apiError(e)))
}

// --- Pitch editor ---
const pitchModal = ref(null)
const pitchForm = reactive({ id: null, project_id: '', buyer_id: '', status: 'preparando', next: '', last_contact: '' })
function newPitch() {
  Object.assign(pitchForm, { id: null, project_id: slate.projects[0]?.id || '', buyer_id: slate.buyers[0]?.id || '', status: 'preparando', next: '', last_contact: '' })
  pitchModal.value = 'edit'
}
function editPitch(p) {
  Object.assign(pitchForm, { id: p.id, project_id: p.project_id, buyer_id: p.buyer_id, status: p.status, next: p.next || '', last_contact: p.last_contact || '' })
  pitchModal.value = 'edit'
}
async function savePitch() {
  try {
    const payload = {
      project_id: pitchForm.project_id, buyer_id: pitchForm.buyer_id, status: pitchForm.status,
      next: pitchForm.next, last_contact: pitchForm.last_contact || null,
    }
    if (pitchForm.id) await slate.updatePitch(pitchForm.id, payload)
    else await slate.createPitch(payload)
    pitchModal.value = null
    ui.toast('Pitch saved')
  } catch (e) {
    ui.error(apiError(e, 'Could not save pitch.'))
  }
}
async function delPitch() {
  if (!pitchForm.id || !confirm('Delete this pitch?')) return
  try { await slate.deletePitch(pitchForm.id); pitchModal.value = null; ui.toast('Pitch deleted') } catch (e) { ui.error(apiError(e)) }
}

// --- Buyers ---
const buyerModal = ref(null)
const buyerForm = reactive({ id: null, platform: '', contact: '', role: '', territory: '', notes: '' })
function buyerPitchCount(id) {
  return slate.pitches.filter((p) => p.buyer_id === id).length
}
function newBuyer() {
  Object.assign(buyerForm, { id: null, platform: '', contact: '', role: '', territory: '', notes: '' })
  buyerModal.value = 'edit'
}
function editBuyer(b) {
  Object.assign(buyerForm, { id: b.id, platform: b.platform, contact: b.contact || '', role: b.role || '', territory: b.territory || '', notes: b.notes || '' })
  buyerModal.value = 'edit'
}
async function saveBuyer() {
  if (!buyerForm.platform.trim()) return
  try {
    const payload = { platform: buyerForm.platform, contact: buyerForm.contact, role: buyerForm.role, territory: buyerForm.territory, notes: buyerForm.notes }
    if (buyerForm.id) await slate.updateBuyer(buyerForm.id, payload)
    else await slate.createBuyer(payload)
    buyerModal.value = null
    ui.toast('Buyer saved')
  } catch (e) {
    ui.error(apiError(e, 'Could not save buyer.'))
  }
}
async function delBuyer() {
  if (!buyerForm.id || !confirm('Delete this buyer and its pitches?')) return
  try { await slate.deleteBuyer(buyerForm.id); buyerModal.value = null; ui.toast('Buyer deleted') } catch (e) { ui.error(apiError(e)) }
}

const projName = (id) => slate.projectById(id)?.title || '—'
const buyerName = (id) => slate.buyerById(id)?.platform || '—'
</script>

<template>
  <div class="topbar">
    <h1>Sales &amp; financing</h1>
    <div class="pill-row" style="margin-left:8px">
      <button class="pill" :class="{ on: tab === 'pipeline' }" @click="tab = 'pipeline'">Pipeline</button>
      <button class="pill" :class="{ on: tab === 'buyers' }" @click="tab = 'buyers'">Buyers</button>
    </div>
    <div class="spacer"></div>
    <button v-if="tab === 'pipeline'" class="btn btn-red" @click="newPitch">＋ New pitch</button>
    <button v-else class="btn btn-red" @click="newBuyer">＋ New buyer</button>
  </div>

  <div class="content view-anim">
    <!-- PIPELINE -->
    <template v-if="tab === 'pipeline'">
      <div v-if="slate.pitches.length" class="board">
        <div v-for="st in slate.meta.pitchStatuses" :key="st.id" class="col" :class="{ dropping: dropCol === st.id }"
          @dragover.prevent="dropCol = st.id" @drop.prevent="onDrop(st.id)">
          <div class="col-head"><span class="col-dot" :style="{ background: st.color }"></span><span class="nm">{{ st.label }}</span><span class="ct">{{ pitchesByStatus(st.id).length }}</span></div>
          <div class="col-body">
            <div v-for="p in pitchesByStatus(st.id)" :key="p.id" class="card" draggable="true"
              @dragstart="dragId = p.id" @dragend="dragId = null" @click="editPitch(p)">
              <div class="fmt">{{ buyerName(p.buyer_id) }}</div>
              <div class="ttl" style="font-size:14px">{{ projName(p.project_id) }}</div>
              <div class="log" v-if="p.next">{{ p.next }}</div>
              <div class="card-foot"><span class="card-progpct">{{ p.last_contact ? fmtDate(p.last_contact) : 'No contact yet' }}</span></div>
            </div>
            <div v-if="!pitchesByStatus(st.id).length" class="empty-col">— Empty —</div>
          </div>
        </div>
      </div>
      <EmptyState v-else ico="◇" title="No pitches yet" sub="Start tracking buyer conversations" />
    </template>

    <!-- BUYERS -->
    <template v-else>
      <div v-if="slate.buyers.length" class="grid-people">
        <div v-for="b in slate.buyers" :key="b.id" class="person" style="cursor:pointer" @click="editBuyer(b)">
          <div class="avatar av-int">{{ b.platform.slice(0, 2).toUpperCase() }}</div>
          <div class="meta">
            <div class="nm">{{ b.platform }}</div>
            <div class="rl">{{ b.contact }}<template v-if="b.role"> · {{ b.role }}</template></div>
            <div class="cnt">{{ b.territory }} · {{ buyerPitchCount(b.id) }} PITCHES</div>
          </div>
        </div>
      </div>
      <EmptyState v-else ico="◯" title="No buyers yet" sub="Add platforms and contacts" />
    </template>
  </div>

  <!-- Pitch modal -->
  <Modal v-if="pitchModal" @close="pitchModal = null">
    <button class="modal-close" @click="pitchModal = null">✕</button>
    <div class="modal-head"><div class="modal-sub">{{ pitchForm.id ? 'Edit pitch' : 'New pitch' }}</div><h2>Pitch tracking</h2></div>
    <div class="modal-body">
      <div class="row2">
        <div class="f"><label>Project</label><select v-model="pitchForm.project_id"><option v-for="p in slate.projects" :key="p.id" :value="p.id">{{ p.title }}</option></select></div>
        <div class="f"><label>Buyer</label><select v-model="pitchForm.buyer_id"><option v-for="b in slate.buyers" :key="b.id" :value="b.id">{{ b.platform }}</option></select></div>
      </div>
      <div class="f"><label>Status</label>
        <div class="pill-row">
          <button v-for="s in slate.meta.pitchStatuses" :key="s.id" class="pill" :class="{ on: pitchForm.status === s.id }" @click="pitchForm.status = s.id">
            <span class="pdot" :style="{ background: pitchForm.status === s.id ? '#fff' : s.color }"></span>{{ s.label }}
          </button>
        </div>
      </div>
      <div class="f"><label>Last contact</label><input type="date" v-model="pitchForm.last_contact" /></div>
      <div class="f"><label>Next step</label><textarea v-model="pitchForm.next"></textarea></div>
    </div>
    <div class="modal-foot">
      <button v-if="pitchForm.id" class="del-link" @click="delPitch">DELETE</button><span v-else></span>
      <div style="display:flex;gap:9px"><button class="btn btn-outline" @click="pitchModal = null">Cancel</button><button class="btn btn-red" @click="savePitch">Save</button></div>
    </div>
  </Modal>

  <!-- Buyer modal -->
  <Modal v-if="buyerModal" @close="buyerModal = null">
    <button class="modal-close" @click="buyerModal = null">✕</button>
    <div class="modal-head"><div class="modal-sub">{{ buyerForm.id ? 'Edit buyer' : 'New buyer' }}</div><h2>Buyer</h2></div>
    <div class="modal-body">
      <div class="f"><label>Platform / network</label><input v-model="buyerForm.platform" autofocus /></div>
      <div class="row2">
        <div class="f"><label>Contact</label><input v-model="buyerForm.contact" /></div>
        <div class="f"><label>Role</label><input v-model="buyerForm.role" /></div>
      </div>
      <div class="f"><label>Territory</label><input v-model="buyerForm.territory" /></div>
      <div class="f"><label>Notes</label><textarea v-model="buyerForm.notes"></textarea></div>
    </div>
    <div class="modal-foot">
      <button v-if="buyerForm.id" class="del-link" @click="delBuyer">DELETE</button><span v-else></span>
      <div style="display:flex;gap:9px"><button class="btn btn-outline" @click="buyerModal = null">Cancel</button><button class="btn btn-red" @click="saveBuyer">Save</button></div>
    </div>
  </Modal>
</template>
