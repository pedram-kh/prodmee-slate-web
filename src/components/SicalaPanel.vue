<script setup>
import { nextTick, ref } from 'vue'
import { useSlate } from '../stores/slate'
import { apiError } from '../lib/util'

defineProps({ open: Boolean })
defineEmits(['close'])

const slate = useSlate()
const msgs = ref([]) // {role:'user'|'assistant', text, summaries?, error?}
const input = ref('')
const busy = ref(false)
const body = ref(null)

async function scroll() {
  await nextTick()
  if (body.value) body.value.scrollTop = body.value.scrollHeight
}

async function send() {
  const text = input.value.trim()
  if (!text || busy.value) return
  input.value = ''
  msgs.value.push({ role: 'user', text })
  busy.value = true
  await scroll()
  try {
    const convo = msgs.value.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.text }))
    const res = await slate.askSicala(convo)
    msgs.value.push({ role: 'assistant', text: res.reply || 'Done.', summaries: res.summaries || [] })
  } catch (e) {
    msgs.value.push({ role: 'assistant', error: true, text: apiError(e, 'Sicala could not respond.') })
  } finally {
    busy.value = false
    await scroll()
  }
}
</script>

<template>
  <div v-if="open" class="asst-panel">
    <div class="asst-head">
      <div>
        <div class="asst-title">Sicala</div>
        <div class="asst-sub">AI slate assistant</div>
      </div>
      <button class="asst-x" @click="$emit('close')">✕</button>
    </div>

    <div ref="body" class="asst-body">
      <div v-if="!msgs.length" class="asst-empty">
        <b>Hey, I'm Sicala — what can I do for you?</b>
        Try: "Create a project called Nightfall as an idea, series, thriller", "Move The Invisible Border to packaging", or "Which projects are in financing?"
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

    <div class="asst-input">
      <textarea v-model="input" placeholder="Ask Sicala…" @keydown.enter.exact.prevent="send"></textarea>
      <button class="btn btn-red" :disabled="busy" @click="send">Send</button>
    </div>
  </div>
</template>

<style scoped>
.asst-panel{position:fixed;right:20px;bottom:86px;width:400px;max-width:calc(100vw - 40px);height:560px;max-height:calc(100vh - 120px);background:var(--card);border:1px solid var(--border2);border-radius:12px;z-index:1100;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.5);animation:up .2s ease}
.asst-head{display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid var(--border)}
.asst-title{font-weight:800;font-size:15px}
.asst-sub{font-size:10px;color:var(--text3);font-family:'JetBrains Mono',monospace;letter-spacing:1px;text-transform:uppercase;margin-top:2px}
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
.asst-acts{margin-top:8px;display:flex;flex-direction:column;gap:4px;font-size:11.5px;color:var(--text2);font-family:'JetBrains Mono',monospace}
.typing{letter-spacing:2px;color:var(--text3);animation:blink 1s infinite}
@keyframes blink{50%{opacity:.4}}
.asst-input{display:flex;gap:8px;padding:12px;border-top:1px solid var(--border);align-items:flex-end}
.asst-input textarea{flex:1;background:var(--card2);border:1px solid var(--border2);color:var(--text);padding:10px 12px;border-radius:var(--r);outline:none;resize:none;min-height:42px;max-height:120px;font-size:13px}
.asst-input textarea:focus{border-color:var(--red)}
</style>
