import { useEffect, useRef, useState } from 'react'
import { I } from '../ui/icons'

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** Reproductor de audio/voz con onda, velocidad y barra de progreso arrastrable. */
export function AudioBubble({ url, duration = 0, title, voice, onNeedDownload }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(0)
  const [dur, setDur] = useState(duration)
  const [rate, setRate] = useState(1)

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const upd = () => setT(a.currentTime)
    const meta = () => setDur(a.duration && isFinite(a.duration) ? a.duration : duration)
    const end = () => { setPlaying(false); setT(0) }
    a.addEventListener('timeupdate', upd)
    a.addEventListener('loadedmetadata', meta)
    a.addEventListener('ended', end)
    return () => { a.removeEventListener('timeupdate', upd); a.removeEventListener('loadedmetadata', meta); a.removeEventListener('ended', end) }
  }, [url, duration])

  const toggle = async (e) => {
    e.stopPropagation()
    if (!url) return onNeedDownload?.()
    const a = audioRef.current
    if (!a) return
    if (playing) { a.pause(); setPlaying(false) }
    else { a.playbackRate = rate; await a.play().catch(() => {}); setPlaying(true) }
  }

  const cycleRate = (e) => {
    e.stopPropagation()
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1
    setRate(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }

  const seek = (e) => {
    e.stopPropagation()
    if (!audioRef.current || !dur) return
    const r = e.currentTarget.getBoundingClientRect()
    const p = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    audioRef.current.currentTime = p * dur
    setT(p * dur)
  }

  const pct = dur ? (t / dur) * 100 : 0
  const bars = 28

  return (
    <div className={'audiobub ' + (voice ? 'voice' : '')}>
      {url && <audio ref={audioRef} src={url} preload="metadata" />}
      <button className="playbtn" onClick={toggle}>
        {playing ? <I.pause width="18" height="18" /> : url ? <I.play width="18" height="18" /> : <I.download width="17" height="17" />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && !voice && <div className="atitle">{title}</div>}
        <div className="wave" onClick={seek}>
          {Array.from({ length: bars }).map((_, i) => {
            const h = 5 + ((i * 7919) % 13)
            return <i key={i} className={(i / bars) * 100 <= pct ? 'on' : ''} style={{ height: h }} />
          })}
        </div>
        <div className="ameta">
          <span>{fmt(t)} / {fmt(dur || duration)}</span>
          <button onClick={cycleRate} className="rate">{rate}×</button>
        </div>
      </div>
    </div>
  )
}

/** Grabadora de notas de voz: mantén pulsado el micrófono. */
export function VoiceRecorder({ onSend, say }) {
  const [rec, setRec] = useState(false)
  const [secs, setSecs] = useState(0)
  const mediaRef = useRef(null)
  const chunks = useRef([])
  const timer = useRef(null)
  const startedAt = useRef(0)
  const cancelled = useRef(false)

  const stopTicks = () => { clearInterval(timer.current); timer.current = null }

  const start = async () => {
    if (rec) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/ogg;codecs=opus') ? 'audio/ogg;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : ''
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunks.current = []
      cancelled.current = false
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const seconds = (Date.now() - startedAt.current) / 1000
        if (cancelled.current || seconds < 0.7) return say?.('Nota de voz cancelada')
        const blob = new Blob(chunks.current, { type: mime || 'audio/ogg' })
        try { await onSend(blob, seconds) } catch (e) { say?.(e.errorMessage || e.message) }
      }
      mr.start()
      mediaRef.current = mr
      startedAt.current = Date.now()
      setRec(true); setSecs(0)
      navigator.vibrate?.(15)
      timer.current = setInterval(() => setSecs((s) => s + 0.1), 100)
    } catch {
      say?.('Sin permiso de micrófono')
    }
  }

  const stop = (cancel = false) => {
    if (!rec) return
    cancelled.current = cancel
    stopTicks()
    setRec(false)
    try { mediaRef.current?.stop() } catch { /* noop */ }
  }

  useEffect(() => () => stopTicks(), [])

  return (
    <>
      {rec && (
        <div className="recbar">
          <span className="dot" /> Grabando {fmt(secs)}
          <button onClick={() => stop(true)}>Cancelar</button>
          <button className="ok" onClick={() => stop(false)}>Enviar</button>
        </div>
      )}
      <button
        className={'sendbtn mic ' + (rec ? 'rec' : '')}
        onMouseDown={start} onMouseUp={() => stop(false)} onMouseLeave={() => rec && stop(false)}
        onTouchStart={(e) => { e.preventDefault(); start() }} onTouchEnd={(e) => { e.preventDefault(); stop(false) }}
      >
        <I.mic width="20" height="20" />
      </button>
    </>
  )
}
