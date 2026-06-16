<script setup>
import { onMounted, ref, computed } from 'vue'
import api from '../api/client'
import { useUi } from '../stores/ui'
import { apiError } from '../lib/util'
import UsageCharts from '../components/UsageCharts.vue'

const ui = useUi()
const tab = ref('users')

// --- Users ---
const users = ref([])
const invite = ref({ name: '', email: '', role: 'member' })
const inviting = ref(false)

async function loadUsers() {
  try {
    const { data } = await api.get('/settings/users')
    users.value = data.data
  } catch (e) {
    ui.error(apiError(e))
  }
}
async function sendInvite() {
  if (!invite.value.name.trim() || !invite.value.email.trim()) return
  inviting.value = true
  try {
    await api.post('/settings/users', invite.value)
    invite.value = { name: '', email: '', role: 'member' }
    await loadUsers()
    ui.toast('User invited — they can now sign in with a code')
  } catch (e) {
    ui.error(apiError(e, 'Could not invite user.'))
  } finally {
    inviting.value = false
  }
}
async function changeRole(u, role) {
  try {
    await api.put(`/settings/users/${u.id}`, { role })
    await loadUsers()
  } catch (e) {
    ui.error(apiError(e))
    await loadUsers()
  }
}
async function toggleStatus(u) {
  try {
    if (u.status === 'disabled') await api.put(`/settings/users/${u.id}`, { status: 'active' })
    else await api.post(`/settings/users/${u.id}/deactivate`)
    await loadUsers()
  } catch (e) {
    ui.error(apiError(e))
  }
}
async function deleteUser(u) {
  if (!window.confirm(`Permanently delete ${u.name}? This cannot be undone.`)) return
  try {
    await api.delete(`/settings/users/${u.id}`)
    await loadUsers()
    ui.toast('User deleted')
  } catch (e) {
    ui.error(apiError(e, 'Could not delete user.'))
  }
}

// --- API key ---
const keyState = ref({ set: false, last4: null, source: null, model: '' })
const newKey = ref('')
const savingKey = ref(false)
const testing = ref(false)

async function loadKey() {
  try {
    const { data } = await api.get('/settings/api-key')
    keyState.value = data
  } catch (e) {
    ui.error(apiError(e))
  }
}
async function saveKey() {
  if (!newKey.value.trim()) return
  savingKey.value = true
  try {
    await api.put('/settings/api-key', { key: newKey.value.trim() })
    newKey.value = ''
    await loadKey()
    ui.toast('API key saved (encrypted)')
  } catch (e) {
    ui.error(apiError(e, 'Could not save key.'))
  } finally {
    savingKey.value = false
  }
}
async function testKey() {
  testing.value = true
  try {
    const { data } = await api.post('/settings/api-key/test')
    ui.toast(data.message)
  } catch (e) {
    ui.error(apiError(e, 'Connection failed.'))
  } finally {
    testing.value = false
  }
}

// --- Usage ---
const usage = ref(null)
const range = ref('daily')
async function loadUsage() {
  try {
    const { data } = await api.get('/settings/usage', { params: { range: range.value } })
    usage.value = data
  } catch (e) {
    ui.error(apiError(e))
  }
}
function setRange(r) {
  range.value = r
  loadUsage()
}

onMounted(() => {
  loadUsers()
  loadKey()
  loadUsage()
})

const roleClass = (r) => `rp-${r}`
</script>

<template>
  <div class="topbar">
    <h1>Settings</h1>
    <div class="pill-row" style="margin-left:8px">
      <button class="pill" :class="{ on: tab === 'users' }" @click="tab = 'users'">Users</button>
      <button class="pill" :class="{ on: tab === 'apikey' }" @click="tab = 'apikey'">API Key</button>
      <button class="pill" :class="{ on: tab === 'usage' }" @click="tab = 'usage'">Usage</button>
    </div>
  </div>

  <div class="content view-anim">
    <!-- USERS -->
    <template v-if="tab === 'users'">
      <div class="set-card">
        <div class="heading" style="margin-top:0">Invite a user</div>
        <div class="invite-row">
          <input class="fin" v-model="invite.name" placeholder="Full name" />
          <input class="fin" v-model="invite.email" placeholder="email@prodmee.app" />
          <select class="fsel" v-model="invite.role"><option value="admin">Admin</option><option value="member">Member</option><option value="external">External</option></select>
          <button class="btn btn-red" :disabled="inviting" @click="sendInvite">Invite</button>
        </div>
        <div class="acc-hint">Invited users sign in by requesting a one-time code on the login screen. No password, no email sent automatically.</div>
      </div>

      <div class="set-card">
        <div class="heading" style="margin-top:0">All users · {{ users.length }}</div>
        <table class="utable">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th><th></th></tr></thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td data-label="Name">{{ u.name }}</td>
              <td data-label="Email" class="mono" style="color:var(--text2)">{{ u.email }}</td>
              <td data-label="Role">
                <select class="fsel sm" :value="u.role" @change="changeRole(u, $event.target.value)">
                  <option value="admin">Admin</option><option value="member">Member</option><option value="external">External</option>
                </select>
              </td>
              <td data-label="Status"><span class="role-pill" :class="u.status === 'active' ? 'rp-member' : u.status === 'disabled' ? 'rp-admin' : 'rp-external'">{{ u.status }}</span></td>
              <td class="ta-r" style="text-align:right"><button class="del-link" @click="toggleStatus(u)">{{ u.status === 'disabled' ? 'REACTIVATE' : 'DEACTIVATE' }}</button></td>
              <td class="ta-r td-del" style="text-align:right;width:44px">
                <button class="user-del" title="Delete user permanently" @click="deleteUser(u)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- API KEY -->
    <template v-else-if="tab === 'apikey'">
      <div class="set-card" style="max-width:560px">
        <div class="heading" style="margin-top:0">Company Anthropic key</div>
        <div class="banner" :class="{ green: keyState.set }" style="margin-bottom:16px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" /></svg>
          <template v-if="keyState.set">Key is set (••••{{ keyState.last4 }}) · source: {{ keyState.source }} · model {{ keyState.model }}</template>
          <template v-else>No key configured. Sicala and Auto-fill will not work until you add one.</template>
        </div>
        <div class="f"><label>New key (write-only)</label><input v-model="newKey" type="password" placeholder="sk-ant-…" /></div>
        <div class="acc-hint">Stored encrypted at rest. It is never returned to the browser — only its last 4 digits.</div>
        <div style="display:flex;gap:9px;margin-top:14px">
          <button class="btn btn-red" :disabled="savingKey || !newKey" @click="saveKey">Save key</button>
          <button class="btn btn-outline" :disabled="testing" @click="testKey">{{ testing ? 'Testing…' : 'Test connection' }}</button>
        </div>
      </div>
    </template>

    <!-- USAGE -->
    <template v-else>
      <div class="filterbar">
        <div class="pill-row">
          <button class="pill" :class="{ on: range === 'daily' }" @click="setRange('daily')">Daily</button>
          <button class="pill" :class="{ on: range === 'weekly' }" @click="setRange('weekly')">Weekly</button>
          <button class="pill" :class="{ on: range === 'monthly' }" @click="setRange('monthly')">Monthly</button>
        </div>
      </div>
      <div v-if="usage" class="usage-cards">
        <div class="ucard"><div class="ul">Total tokens</div><div class="uv">{{ (usage.totals.inputTokens + usage.totals.outputTokens).toLocaleString() }}</div></div>
        <div class="ucard"><div class="ul">Input</div><div class="uv">{{ usage.totals.inputTokens.toLocaleString() }}</div></div>
        <div class="ucard"><div class="ul">Output</div><div class="uv">{{ usage.totals.outputTokens.toLocaleString() }}</div></div>
        <div class="ucard"><div class="ul">Est. cost</div><div class="uv">${{ usage.totals.cost.toFixed(2) }}</div></div>
        <div class="ucard"><div class="ul">Calls</div><div class="uv">{{ usage.totals.calls }}</div></div>
      </div>
      <UsageCharts v-if="usage" :usage="usage" />
    </template>
  </div>
</template>

<style scoped>
.set-card{background:var(--surface);border:1px solid var(--border2);border-radius:var(--r);padding:20px;margin-bottom:16px;max-width:920px}
.invite-row{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:10px}
.fin{flex:1;min-width:150px;background:var(--card2);border:1px solid var(--border2);color:var(--text);padding:10px 12px;border-radius:var(--r);outline:none;font-size:13.5px}
.fin:focus{border-color:var(--red)}
.fsel.sm{padding:6px 9px;font-size:12px}
.utable{width:100%;border-collapse:collapse;font-size:13px}
.utable th{text-align:left;font-size:11px;font-weight:600;letter-spacing:.2px;color:var(--text3);padding:10px 10px;border-bottom:1px solid var(--border2)}
.utable td{padding:9px 10px;border-bottom:1px solid var(--border)}
.user-del{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:6px;background:none;border:1px solid var(--border2);color:var(--text3);cursor:pointer;transition:.15s}
.user-del svg{width:14px;height:14px}
.user-del:hover{background:var(--red);border-color:var(--red);color:#fff}
.usage-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:18px}
.ucard{background:var(--surface);border:1px solid var(--border2);border-radius:var(--r);padding:16px}
.ul{font-size:11px;font-weight:600;letter-spacing:.2px;text-transform:uppercase;color:var(--text3)}
.uv{font-size:24px;font-weight:800;color:var(--white);margin-top:8px}

@media(max-width:760px){
  .set-card{padding:16px}
  .fin{font-size:16px}
  /* Turn the users table into stacked cards — no horizontal overflow */
  .utable thead{display:none}
  .utable,.utable tbody{display:block;width:100%}
  .utable tr{display:block;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:8px 14px;margin-bottom:10px}
  .utable td{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%!important;padding:7px 0;border-bottom:1px solid var(--border);text-align:right!important}
  .utable tr td:last-child{border-bottom:none}
  .utable td::before{content:attr(data-label);color:var(--text3);font-size:11px;font-weight:600;letter-spacing:.3px;text-transform:uppercase;text-align:left;flex:none}
  .utable td:first-child{font-size:16px;font-weight:700;color:var(--white)}
  .utable .ta-r{justify-content:flex-end}
  .utable .fsel.sm{font-size:15px;padding:8px 10px}
}
</style>
