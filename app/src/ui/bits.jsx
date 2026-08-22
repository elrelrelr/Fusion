import { I } from './icons'

const PALETTE = ['#7b5cff', '#2ea6ff', '#ff6b9d', '#ffa23e', '#34d399', '#f472b6', '#38bdf8', '#a78bfa']

export function colorFor(key = '') {
  let h = 0
  for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) % 9973
  return PALETTE[h % PALETTE.length]
}

export function initials(name = '?') {
  const w = String(name).trim().split(/\s+/).filter(Boolean)
  return ((w[0]?.[0] || '?') + (w[1]?.[0] || '')).toUpperCase()
}

export function Avatar({ src, name, id, size = 54, network, saved, online, style }) {
  const s = { width: size, height: size, fontSize: size * 0.36, ...style }
  return (
    <div className="ava-w" style={{ width: size, height: size }}>
      {saved ? (
        <div className="ava-f" style={{ ...s, background: 'linear-gradient(135deg,#7b5cff,#2ea6ff)' }}>
          <I.saved width={size * 0.46} height={size * 0.46} />
        </div>
      ) : src ? (
        <img className="ava" src={src} alt="" style={s} loading="lazy" />
      ) : (
        <div className="ava-f" style={{ ...s, background: `linear-gradient(140deg, ${colorFor(id || name)}, ${colorFor((id || name) + 'x')})` }}>
          {initials(name)}
        </div>
      )}
      {network && <span className={'src ' + (network === 'mastodon' ? 'm' : 't')}>{network === 'mastodon' ? <I.masto width="9" height="9" /> : <I.tg width="9" height="9" />}</span>}
      {online && <span className="online" />}
    </div>
  )
}

export function timeShort(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })
  const diff = (now - d) / 86400000
  if (diff < 7) return d.toLocaleDateString('es', { weekday: 'short' }).replace('.', '')
  return d.toLocaleDateString('es', { day: '2-digit', month: '2-digit' })
}

export function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'ahora'
  if (s < 3600) return Math.floor(s / 60) + ' min'
  if (s < 86400) return Math.floor(s / 3600) + ' h'
  if (s < 604800) return Math.floor(s / 86400) + ' d'
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

export function dayLabel(iso) {
  const d = new Date(iso), now = new Date()
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (d.toDateString() === now.toDateString()) return 'Hoy'
  if (d.toDateString() === y.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es', { day: 'numeric', month: 'long' })
}

export function fmtCount(n) {
  if (!n) return ''
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M'
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.0', '') + 'k'
  return String(n)
}

export function Spinner({ label }) {
  return <div className="loading"><span className="spin" />{label}</div>
}

export function Empty({ icon: Ic = I.chat, title, text, action }) {
  return (
    <div className="empty">
      <div className="mark"><Ic width="30" height="30" /></div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  )
}


export function ErrorBox({ error, onRetry, onCopy }) {
  if (!error) return null
  const text = typeof error === 'string' ? error : (error.errorMessage || error.message || String(error))
  const copy = async () => {
    try { await navigator.clipboard.writeText(text) } catch { /* noop */ }
    onCopy?.()
  }
  return (
    <div className="err">
      <div className="errtxt txt">{text}</div>
      <div className="erracts">
        <button onClick={copy}>Copiar error</button>
        {onRetry && <button onClick={onRetry}>Reintentar</button>}
      </div>
    </div>
  )
}
