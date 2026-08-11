export function money(value) {
  const num = Number.isFinite(value) ? value : 0
  const hasDecimals = num % 1 !== 0
  const formatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })
  return formatter.format(num)
}

export function moneyShort(value) {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}k`
  return `$${value.toFixed(0)}`
}

function parseSafeDate(iso) {
  if (!iso) return null
  if (iso instanceof Date) return isNaN(iso.getTime()) ? null : iso
  const str = String(iso).trim()
  if (!str) return null
  const normalized = str.includes(' ') && !str.includes('T') ? str.replace(' ', 'T') : str
  const d = new Date(normalized)
  return isNaN(d.getTime()) ? null : d
}

export function formatDate(iso) {
  const d = parseSafeDate(iso)
  if (!d) return ''
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatTime(iso) {
  const d = parseSafeDate(iso)
  if (!d) return ''
  return d.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateTime(iso) {
  const d = formatDate(iso)
  const t = formatTime(iso)
  if (!d && !t) return ''
  return `${d} ${t}`.trim()
}

export function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
