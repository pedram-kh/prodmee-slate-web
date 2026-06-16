<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../stores/auth'
import { useUi } from '../stores/ui'
import { apiError } from '../lib/util'

const auth = useAuth()
const ui = useUi()
const router = useRouter()
const route = useRoute()

const step = ref('email') // email | code
const email = ref('')
const code = ref('')
const busy = ref(false)
const note = ref('')

async function sendCode() {
  if (!email.value.trim()) return
  busy.value = true
  try {
    const res = await auth.requestCode(email.value.trim())
    note.value = res.message
    step.value = 'code'
  } catch (e) {
    ui.error(apiError(e, 'Could not send a code.'))
  } finally {
    busy.value = false
  }
}

async function verify() {
  if (!code.value.trim()) return
  busy.value = true
  try {
    await auth.verifyCode(email.value.trim(), code.value.trim())
    ui.toast('Signed in')
    router.replace(route.query.redirect || '/slate')
  } catch (e) {
    ui.error(apiError(e, 'Invalid code.'))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="login-wrap">
    <video class="login-bg" src="/bg.mp4" autoplay loop muted playsinline></video>
    <div class="login-overlay"></div>
    <div class="login-card">
      <div class="login-bar"></div>
      <div class="login-body">
        <div class="login-brand"><img src="/prodmee.png" alt="Prodmee" class="login-logo" /><span class="login-tag">Slate</span></div>

        <template v-if="step === 'email'">
          <p class="login-lead">Sign in with your work email. We'll send you a one-time code — no password needed.</p>
          <div class="f">
            <label>Email</label>
            <input v-model="email" type="email" placeholder="you@prodmee.app" autofocus @keydown.enter="sendCode" />
          </div>
          <button class="btn btn-red login-go" :disabled="busy" @click="sendCode">
            {{ busy ? 'Sending…' : 'Send code' }}
          </button>
        </template>

        <template v-else>
          <p class="login-lead">{{ note }}</p>
          <div class="f">
            <label>6-digit code</label>
            <input v-model="code" inputmode="numeric" maxlength="6" placeholder="••••••" autofocus
              class="code-input" @keydown.enter="verify" />
          </div>
          <button class="btn btn-red login-go" :disabled="busy" @click="verify">
            {{ busy ? 'Verifying…' : 'Verify & sign in' }}
          </button>
          <button class="login-back" @click="step = 'email'">← Use a different email</button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-wrap{position:relative;min-height:100vh;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--bg);overflow:hidden}
.login-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top;z-index:0}
.login-overlay{position:absolute;inset:0;background:rgba(10,13,19,.45);z-index:1}
.login-card{position:relative;z-index:2;width:100%;max-width:420px;background:var(--card);border:1px solid var(--border2);border-radius:12px;overflow:hidden}
.login-bar{height:3px;background:var(--red)}
.login-body{padding:34px 36px;display:flex;flex-direction:column;gap:18px}
.login-brand{display:flex;align-items:center;gap:10px;margin-bottom:4px}
.login-logo{height:28px;width:auto;display:block}
.login-tag{font-size:9px;font-weight:700;letter-spacing:2px;color:var(--text3);text-transform:uppercase;border:1px solid var(--border2);padding:3px 7px;border-radius:20px}
.login-lead{font-size:13.5px;color:var(--text2);line-height:1.6}
.login-go{justify-content:center;width:100%}
.login-back{font-size:11px;color:var(--text3)}
.login-back:hover{color:var(--red)}
.code-input{letter-spacing:10px;font-size:22px;text-align:center;font-variant-numeric:tabular-nums;font-weight:700}
</style>
