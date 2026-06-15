<script setup>
import { computed } from 'vue'
import { useSlate } from '../stores/slate'

const props = defineProps({
  project: { type: Object, required: true },
  internal: { type: Boolean, default: true },
  share: { type: Boolean, default: false },
})
const slate = useSlate()

const st = computed(() => slate.stageById(props.project.stage))
const hook = computed(() => (props.project.tagline || '').trim() || (props.project.logline || '').trim())
const refs = computed(() =>
  (props.project.references || '')
    .split(/[,\n]+/)
    .map((x) => x.trim())
    .filter(Boolean)
)
const fmt = computed(() =>
  [props.project.genre, props.project.language, props.project.episodes, props.project.territory]
    .map((x) => (x || '').trim())
    .filter(Boolean)
)
const eyebrow = computed(() => `${props.project.format || 'Project'}${props.project.origin === 'externo' ? ' · CO-PRODUCTION' : ''}`)
</script>

<template>
  <div class="op-hero">
    <img v-if="project.coverUrl" :src="project.coverUrl" alt="" />
    <div class="ov" :style="project.coverUrl
      ? 'background:linear-gradient(180deg,rgba(10,13,19,.15),rgba(10,13,19,.55) 55%,rgba(10,13,19,.95))'
      : 'background:linear-gradient(135deg,#1b2435,#0a0d13)'"></div>
    <div class="hero-in">
      <div class="op-eyebrow">
        {{ eyebrow }}
        <span v-if="share" class="badge b-coprod">READ-ONLY</span>
        <span v-else class="badge" :style="{ background: st.color + '22', color: st.color, border: '1px solid ' + st.color + '55' }">{{ st.label }}</span>
      </div>
      <div class="op-title">{{ project.title }}</div>
    </div>
  </div>

  <div class="op-body">
    <div v-if="hook" class="op-tagline">{{ hook }}</div>
    <div v-if="(project.concept || '').trim()">
      <div class="op-sec-label">The concept</div>
      <div class="op-text">{{ project.concept }}</div>
    </div>

    <div class="op-grid" v-if="(project.whyNow || '').trim() || refs.length">
      <div v-if="(project.whyNow || '').trim()">
        <div class="op-sec-label">Why now</div>
        <div class="op-text">{{ project.whyNow }}</div>
      </div>
      <div v-if="refs.length">
        <div class="op-sec-label">References</div>
        <ul class="op-list"><li v-for="r in refs" :key="r">{{ r }}</li></ul>
      </div>
    </div>

    <div class="op-grid" v-if="(project.participants || '').trim() || fmt.length">
      <div v-if="(project.participants || '').trim()">
        <div class="op-sec-label">Cast &amp; talent</div>
        <div class="op-text">{{ project.participants }}</div>
      </div>
      <div v-if="fmt.length">
        <div class="op-sec-label">Format</div>
        <ul class="op-list"><li v-for="x in fmt" :key="x">{{ x }}</li></ul>
      </div>
    </div>

    <div v-if="(project.packaging || '').trim()" class="op-pack">
      <div class="op-sec-label">Packaging &amp; production</div>
      <div class="op-text">{{ project.packaging }}</div>
    </div>

    <div v-if="internal" class="op-pack" style="display:flex;gap:26px;flex-wrap:wrap">
      <div>
        <div class="op-sec-label" style="color:var(--text3)">Stage</div>
        <div class="op-text"><span class="col-dot" :style="{ display: 'inline-block', background: st.color, marginRight: '7px', verticalAlign: 'middle' }"></span>{{ st.label }}</div>
      </div>
      <div>
        <div class="op-sec-label" style="color:var(--text3)">Budget</div>
        <div class="op-text" style="color:var(--red);font-weight:700">{{ project.tier || '—' }}</div>
      </div>
      <div v-if="(project.notes || '').trim()" style="flex:1;min-width:200px">
        <div class="op-sec-label" style="color:var(--text3)">Internal notes</div>
        <div class="op-text" style="color:var(--text2)">{{ project.notes }}</div>
      </div>
    </div>

    <slot />

    <div class="op-foot">{{ share ? 'SHARED WITH YOU BY PRODMEE · PRIVATE READ-ONLY VIEW' : 'PRODMEE · CONFIDENTIAL' }}</div>
  </div>
</template>

<style scoped>
.op-hero{position:relative;min-height:230px;display:flex;align-items:flex-end;overflow:hidden;background:#0a0d13}
.op-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.op-hero .ov{position:absolute;inset:0}
.op-hero .hero-in{position:relative;padding:26px 30px;width:100%}
.op-eyebrow{font-size:11px;font-weight:600;letter-spacing:.3px;text-transform:uppercase;color:var(--text2);margin-bottom:9px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.op-title{font-size:34px;font-weight:800;color:#fff;line-height:1.04;letter-spacing:-.01em}
.op-body{padding:24px 30px 26px;display:flex;flex-direction:column;gap:22px}
.op-tagline{font-size:18px;line-height:1.42;color:var(--white);font-style:italic;font-weight:500;border-left:3px solid var(--red);padding-left:16px}
.op-sec-label{font-size:13px;font-weight:700;letter-spacing:.1px;color:var(--text);margin-bottom:9px}
.op-text{font-size:14px;line-height:1.62;color:var(--text);white-space:pre-wrap}
.op-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.op-list{list-style:none;display:flex;flex-direction:column;gap:7px;margin:0;padding:0}
.op-list li{font-size:13.5px;color:var(--text);display:flex;gap:9px;align-items:flex-start}
.op-list li::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--red);margin-top:6px;flex:none}
.op-pack{background:var(--surface);border:1px solid var(--border2);border-radius:var(--r);padding:16px 18px}
.op-foot{font-size:11px;color:var(--text3);letter-spacing:.2px;border-top:1px solid var(--border);padding-top:16px}
@media(max-width:640px){.op-grid{grid-template-columns:1fr}.op-title{font-size:26px}}
</style>
