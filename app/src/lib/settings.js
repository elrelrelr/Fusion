// Preferencias del fork (todas locales, gratis y sin cuenta).
const KEY = 'fx.settings'

export const DEFAULTS = {
  accent: 'violeta',
  fontSize: 15,
  bubbles: true,
  ghost: false,        // no marcar mensajes como leídos
  antiDelete: true,    // conservar mensajes eliminados/editados
  confirmDelete: true,
  sendOnEnter: false,
  autoDownload: true,  // descargar fotos al abrir el chat
  pin: '',             // bloqueo con código
  compact: false,
}

export const ACCENTS = {
  violeta: ['#7b5cff', '#2ea6ff'],
  esmeralda: ['#10b981', '#22d3ee'],
  atardecer: ['#f97316', '#ec4899'],
  carmesí: ['#ef4444', '#f59e0b'],
  océano: ['#0ea5e9', '#6366f1'],
  grafito: ['#64748b', '#94a3b8'],
}

export function loadSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') } }
  catch { return { ...DEFAULTS } }
}

export function saveSettings(s) {
  localStorage.setItem(KEY, JSON.stringify(s))
  applySettings(s)
  return s
}

export function applySettings(s) {
  const [a1, a2] = ACCENTS[s.accent] || ACCENTS.violeta
  const r = document.documentElement.style
  r.setProperty('--a1', a1)
  r.setProperty('--a2', a2)
  r.setProperty('--grad', `linear-gradient(135deg, ${a1}, ${a2})`)
  r.setProperty('--msg-size', s.fontSize + 'px')
  document.body.classList.toggle('nobubbles', !s.bubbles)
  document.body.classList.toggle('compact', !!s.compact)
}
