<script setup>
import { nextTick, onUnmounted, ref } from 'vue'
import { useSlate } from '../stores/slate'
import { useUi } from '../stores/ui'
import { apiError } from '../lib/util'

defineProps({ open: Boolean })
const emit = defineEmits(['close'])

const slate = useSlate()
const ui = useUi()
const msgs = ref([]) // {role:'user'|'assistant', text, summaries?, error?}
const input = ref('')
const busy = ref(false)
const body = ref(null)

// --- Voice (browser Web Speech API) ---
const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null
const voiceSupported = !!SR
const lang = ref('es-ES')
const listening = ref(false)
const speakOn = ref(true)
const voiceNote = ref('')
const voiceErr = ref(false)
let rec = null
let voiceT = null

// --- Chat attachments ---
const fileInput = ref(null)
const attachments = ref([]) // {name, mime_type, size, key, uploading}

async function scroll() {
  await nextTick()
  if (body.value) body.value.scrollTop = body.value.scrollHeight
}

async function send() {
  const text = input.value.trim()
  const ready = attachments.value.filter((a) => a.key && !a.uploading)
  if ((!text && !ready.length) || busy.value) return
  stopSpeak()
  const shownText = text || `📎 ${ready.map((a) => a.name).join(', ')}`
  input.value = ''
  msgs.value.push({ role: 'user', text: shownText })
  const atts = ready.map((a) => ({ key: a.key, name: a.name, mime_type: a.mime_type }))
  attachments.value = []
  busy.value = true
  await scroll()
  try {
    const convo = msgs.value.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.text }))
    const res = await slate.askSicala(convo, atts)
    msgs.value.push({ role: 'assistant', text: res.reply || 'Done.', summaries: res.summaries || [] })
    speak(res.reply || '')
  } catch (e) {
    msgs.value.push({ role: 'assistant', error: true, text: apiError(e, 'Sicala could not respond.') })
  } finally {
    busy.value = false
    await scroll()
  }
}

function close() {
  stopSpeak()
  if (listening.value && rec) {
    try { rec.stop() } catch (e) { /* ignore */ }
  }
  emit('close')
}

// --- Voice input (speech-to-text) ---
function setVoiceNote(message, err = false) {
  voiceNote.value = message
  voiceErr.value = err
  clearTimeout(voiceT)
  voiceT = setTimeout(() => { voiceNote.value = '' }, 5000)
}
function toggleLang() {
  lang.value = lang.value === 'es-ES' ? 'en-US' : 'es-ES'
}
function startVoice() {
  if (!SR) {
    setVoiceNote('Voice input is not supported in this browser — try Chrome.', true)
    return
  }
  if (listening.value) {
    if (rec) { try { rec.stop() } catch (e) { /* ignore */ } }
    return
  }
  let r
  try { r = new SR() } catch (e) { setVoiceNote('Could not start voice input here.', true); return }
  rec = r
  r.lang = lang.value
  r.interimResults = true
  r.continuous = false
  r.maxAlternatives = 1
  r.onstart = () => { listening.value = true; setVoiceNote('Listening… speak now') }
  r.onresult = (e) => {
    let interim = ''
    let fin = ''
    for (let i = 0; i < e.results.length; i++) {
      const t = e.results[i][0].transcript
      if (e.results[i].isFinal) fin += t
      else interim += t
    }
    input.value = fin || interim
  }
  r.onerror = (e) => {
    listening.value = false
    const er = e && e.error
    if (er === 'not-allowed' || er === 'service-not-allowed') setVoiceNote('Microphone blocked. Allow mic access to use voice.', true)
    else if (er === 'no-speech') setVoiceNote('I did not catch that — tap the mic and try again.', true)
    else setVoiceNote('Voice input stopped.', true)
  }
  r.onend = () => {
    listening.value = false
    if (voiceNote.value === 'Listening… speak now') voiceNote.value = ''
    if ((input.value || '').trim()) send()
  }
  try { r.start() } catch (e) { setVoiceNote('Could not start the microphone.', true) }
}

// --- Voice output (text-to-speech) ---
function stopSpeak() {
  if ('speechSynthesis' in window) { try { window.speechSynthesis.cancel() } catch (e) { /* ignore */ } }
}
function toggleSpeak() {
  speakOn.value = !speakOn.value
  if (!speakOn.value) stopSpeak()
}
function speak(text) {
  if (!speakOn.value || !text || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang.value
    window.speechSynthesis.speak(u)
  } catch (e) { /* ignore */ }
}

// --- Attachments ---
function triggerAttach() {
  if (fileInput.value) fileInput.value.click()
}
async function onPickFiles(e) {
  const list = [...(e.target.files || [])]
  e.target.value = ''
  for (const file of list) {
    const item = { name: file.name, mime_type: file.type || null, size: file.size, key: null, uploading: true }
    attachments.value.push(item)
    try {
      const res = await slate.uploadChatAttachment(file)
      item.key = res.key
      item.mime_type = res.mime_type
      item.size = res.size
      item.uploading = false
    } catch (err) {
      ui.error(apiError(err, 'Could not upload attachment.'))
      attachments.value = attachments.value.filter((a) => a !== item)
    }
  }
}
function removeAttachment(i) {
  attachments.value.splice(i, 1)
}

onUnmounted(() => {
  stopSpeak()
  if (rec) { try { rec.stop() } catch (e) { /* ignore */ } }
  clearTimeout(voiceT)
})
</script>

<template>
  <div v-if="open" class="asst-panel">
    <div class="asst-head">
      <div>
        <div class="asst-title">Sicala</div>
        <div class="asst-sub">AI slate assistant</div>
      </div>
      <button class="asst-x" @click="close">✕</button>
    </div>

    <div ref="body" class="asst-body">
      <div v-if="!msgs.length" class="asst-empty">
        <b>Hey, I'm Sicala — what can I do for you?</b>
        Try: "Create a project called Nightfall as an idea, series, thriller", "Move The Invisible Border to packaging", or "Which projects are in financing?" You can also tap the mic to talk, or attach a PDF/image and ask me to read it or set it as a project's cover.
      </div>
      <template v-else>
        <div v-for="(m, i) in msgs" :key="i" class="asst-msg" :class="m.role">
          <div class="bubble" :class="{ err: m.error }">
            {{ m.text }}
            <div v-if="m.summaries && m.summaries.length" class="asst-acts">
              <div v-for="(s, j) in m.summaries" :key="j">{{ s }}</div>
            </div>
          </div>
        </div>
        <div v-if="busy" class="asst-msg assistant"><div class="bubble"><span class="typing">●●●</span></div></div>
      </template>
    </div>

    <div v-if="attachments.length" class="asst-docs">
      <span v-for="(a, i) in attachments" :key="i" class="asst-doc" :class="{ pend: a.uploading }">
        <span class="asst-doc-nm">📎 {{ a.name }}{{ a.uploading ? ' …' : '' }}</span>
        <button aria-label="Remove" @click="removeAttachment(i)">✕</button>
      </span>
    </div>
    <div v-if="voiceNote" class="asst-vstatus" :class="{ err: voiceErr }">{{ voiceNote }}</div>

    <div class="asst-input">
      <input ref="fileInput" type="file" multiple style="display:none" @change="onPickFiles" />
      <textarea v-model="input" placeholder="Ask, talk, or attach a file…" @keydown.enter.exact.prevent="send"></textarea>
      <div class="asst-tools">
        <button class="asst-icon" title="Attach a file" aria-label="Attach" @click="triggerAttach">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11l-8.5 8.5a4 4 0 0 1-6-6L14 5a3 3 0 0 1 4 4l-8 8a1.5 1.5 0 0 1-2-2l7.5-7.5" /></svg>
        </button>
        <button v-if="voiceSupported" class="asst-lang" title="Voice language" @click="toggleLang">{{ lang === 'es-ES' ? 'ES' : 'EN' }}</button>
        <button v-if="voiceSupported" class="asst-icon mic" :class="{ listening }" title="Voice input" aria-label="Voice input" @click="startVoice">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></svg>
        </button>
        <button class="asst-icon" :class="{ on: speakOn }" :title="speakOn ? 'Reading replies aloud — tap to mute' : 'Replies muted — tap to enable voice'" aria-label="Toggle voice output" @click="toggleSpeak">
          <svg v-if="speakOn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H3v6h3l5 4V5z" /><path d="M16 9a5 5 0 0 1 0 6" /><path d="M19 7a9 9 0 0 1 0 10" /></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H3v6h3l5 4V5z" /><path d="M22 9l-6 6" /><path d="M16 9l6 6" /></svg>
        </button>
        <span class="asst-tools-sp"></span>
        <button class="btn btn-red" :disabled="busy" @click="send">Send</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.asst-panel{position:fixed;right:20px;bottom:86px;width:400px;max-width:calc(100vw - 40px);height:560px;max-height:calc(100vh - 120px);background:var(--card);border:1px solid var(--border2);border-radius:12px;z-index:1100;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.5);animation:up .2s ease}
.asst-head{display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid var(--border)}
.asst-title{font-weight:800;font-size:15px}
.asst-sub{font-size:11px;color:var(--text3);letter-spacing:.2px;margin-top:2px}
.asst-x{margin-left:auto;color:var(--text3);font-size:15px}
.asst-x:hover{color:var(--text)}
.asst-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px}
.asst-empty{color:var(--text2);font-size:13px;line-height:1.6;display:flex;flex-direction:column;gap:10px;text-align:center;margin:auto;padding:10px}
.asst-empty b{color:var(--text);font-size:15px}
.asst-msg{display:flex}
.asst-msg.user{justify-content:flex-end}
.bubble{max-width:84%;padding:10px 13px;border-radius:12px;font-size:13px;line-height:1.5;white-space:pre-wrap}
.asst-msg.user .bubble{background:var(--red);color:#fff;border-bottom-right-radius:3px}
.asst-msg.assistant .bubble{background:var(--card2);border:1px solid var(--border2);border-bottom-left-radius:3px}
.bubble.err{border-color:#e0524f;color:#e0524f}
.asst-acts{margin-top:8px;display:flex;flex-direction:column;gap:4px;font-size:11.5px;color:var(--text2)}
.typing{letter-spacing:2px;color:var(--text3);animation:blink 1s infinite}
@keyframes blink{50%{opacity:.4}}
.asst-input{display:flex;flex-direction:column;gap:8px;padding:12px;border-top:1px solid var(--border)}
.asst-input textarea{width:100%;background:var(--card2);border:1px solid var(--border2);color:var(--text);padding:10px 12px;border-radius:var(--r);outline:none;resize:none;min-height:42px;max-height:120px;font-size:13px}
.asst-input textarea:focus{border-color:var(--red)}
.asst-tools{display:flex;align-items:center;gap:7px}
.asst-tools-sp{flex:1}
.asst-icon{width:38px;height:38px;border-radius:var(--r-sm);border:1px solid var(--border2);background:var(--card2);color:var(--text2);display:grid;place-items:center;flex:none;transition:.15s}
.asst-icon:hover{border-color:var(--red);color:var(--red)}
.asst-icon svg{width:18px;height:18px}
.asst-icon.on{color:var(--red);border-color:var(--red)}
.asst-icon.mic.listening{background:var(--red);border-color:var(--red);color:#fff;animation:micpulse 1.1s infinite}
@keyframes micpulse{0%,100%{box-shadow:0 0 0 0 rgba(229,37,42,.55)}50%{box-shadow:0 0 0 7px rgba(229,37,42,0)}}
.asst-lang{width:38px;height:38px;border-radius:var(--r-sm);border:1px solid var(--border2);background:var(--card2);color:var(--text2);font-size:11px;font-weight:700;letter-spacing:.5px;flex:none;transition:.15s}
.asst-lang:hover{border-color:var(--red);color:var(--red)}
.asst-docs{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 4px}
.asst-doc{display:inline-flex;align-items:center;gap:6px;max-width:100%;background:var(--card2);border:1px solid var(--border2);border-radius:20px;padding:4px 6px 4px 10px;font-size:11.5px;color:var(--text2)}
.asst-doc.pend{opacity:.6}
.asst-doc-nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px}
.asst-doc button{width:18px;height:18px;border-radius:50%;background:var(--card);color:var(--text3);display:grid;place-items:center;font-size:11px;line-height:1;flex:none}
.asst-doc button:hover{background:var(--red);color:#fff}
.asst-vstatus{padding:0 12px 6px;font-size:11.5px;color:var(--text2)}
.asst-vstatus.err{color:#e0524f}
@media(max-width:760px){
  .asst-panel{right:10px;left:10px;width:auto;max-width:none;bottom:calc(80px + env(safe-area-inset-bottom));
    height:auto;top:64px;max-height:none}
  .asst-input textarea{font-size:16px}
}
</style>
