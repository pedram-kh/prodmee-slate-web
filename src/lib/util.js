export function initials(name) {
  return String(name || '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase()
}

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export function fmtDate(d) {
  if (!d) return ''
  const p = String(d).split('T')[0].split('-')
  return p[2] + ' ' + (MES[parseInt(p[1], 10) - 1] || '')
}

const CMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export function cmtTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return (
    d.getDate() +
    ' ' +
    CMES[d.getMonth()] +
    ', ' +
    ('0' + d.getHours()).slice(-2) +
    ':' +
    ('0' + d.getMinutes()).slice(-2)
  )
}

export function apiError(e, fallback = 'Something went wrong.') {
  return e?.response?.data?.message || fallback
}
