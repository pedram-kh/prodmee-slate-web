<script setup>
import { computed } from 'vue'
import { Line, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title, Tooltip, Legend,
  LineElement, PointElement, BarElement,
  CategoryScale, LinearScale, Filler,
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, BarElement, CategoryScale, LinearScale, Filler)

const props = defineProps({ usage: { type: Object, required: true } })

const RED = '#c0201a'
const BLUE = '#5599dd'

const gridOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#8a9bb0', font: { size: 11 } } } },
  scales: {
    x: { ticks: { color: '#4a5a6a', font: { size: 10 } }, grid: { color: '#1e2e40' } },
    y: { ticks: { color: '#4a5a6a', font: { size: 10 } }, grid: { color: '#1e2e40' } },
  },
}

const labels = computed(() => props.usage.series.map((s) => s.bucket))

const tokensData = computed(() => ({
  labels: labels.value,
  datasets: [
    { label: 'Input', data: props.usage.series.map((s) => s.inputTokens), borderColor: BLUE, backgroundColor: 'rgba(85,153,221,.15)', fill: true, tension: 0.3 },
    { label: 'Output', data: props.usage.series.map((s) => s.outputTokens), borderColor: RED, backgroundColor: 'rgba(192,32,26,.15)', fill: true, tension: 0.3 },
  ],
}))

const costData = computed(() => ({
  labels: labels.value,
  datasets: [{ label: 'Est. cost (USD)', data: props.usage.series.map((s) => s.cost), backgroundColor: RED, borderRadius: 4 }],
}))

const featureData = computed(() => ({
  labels: props.usage.byFeature.map((f) => f.feature),
  datasets: [{ label: 'Tokens', data: props.usage.byFeature.map((f) => f.tokens), backgroundColor: [RED, BLUE, '#ccbb44', '#4dcc88'], borderRadius: 4 }],
}))

const hasData = computed(() => props.usage.series.length > 0)
</script>

<template>
  <div v-if="hasData" class="charts">
    <div class="chart-card" style="grid-column:1 / -1">
      <div class="ct">Tokens over time · input vs output</div>
      <div class="cbox"><Line :data="tokensData" :options="gridOpts" /></div>
    </div>
    <div class="chart-card">
      <div class="ct">Estimated cost over time</div>
      <div class="cbox"><Bar :data="costData" :options="gridOpts" /></div>
    </div>
    <div class="chart-card">
      <div class="ct">Tokens by feature</div>
      <div class="cbox"><Bar :data="featureData" :options="gridOpts" /></div>
    </div>
  </div>
  <div v-else class="empty-state"><div class="ico">◷</div><div class="t">No usage yet</div><div class="s">Sicala &amp; Auto-fill calls will show up here</div></div>
</template>

<style scoped>
.charts{display:grid;grid-template-columns:1fr 1fr;gap:14px;max-width:1000px}
.chart-card{background:var(--surface);border:1px solid var(--border2);border-radius:var(--r);padding:16px 18px}
.ct{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);font-family:'JetBrains Mono',monospace;margin-bottom:14px}
.cbox{height:240px}
@media(max-width:760px){.charts{grid-template-columns:1fr}}
</style>
