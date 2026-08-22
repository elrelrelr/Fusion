import { useEffect, useRef, useState } from 'react'
import { I } from '../ui/icons'
import { openInApp } from '../lib/inapp'

const TEXTY = /\.(txt|md|json|csv|log|js|ts|jsx|tsx|py|java|kt|c|h|cpp|css|html|xml|yml|yaml|ini|sh|sql)$/i

export function fileKindOf(name = '', mime = '') {
  const n = name.toLowerCase()
  if (mime.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp|heic)$/.test(n)) return 'image'
  if (mime.startsWith('video/') || /\.(mp4|mov|mkv|webm|avi)$/.test(n)) return 'video'
  if (mime.startsWith('audio/') || /\.(mp3|ogg|oga|wav|m4a|opus|flac)$/.test(n)) return 'audio'
  if (mime === 'application/pdf' || /\.pdf$/.test(n)) return 'pdf'
  if (TEXTY.test(n) || mime.startsWith('text/') || mime === 'application/json') return 'text'
  if (/\.(zip|rar|7z|tar|gz)$/.test(n)) return 'zip'
  if (/\.(docx?|odt|rtf)$/.test(n)) return 'doc'
  if (/\.(xlsx?|ods)$/.test(n)) return 'sheet'
  if (/\.(pptx?|odp)$/.test(n)) return 'slides'
  return 'file'
}

export const KIND_ICON = {
  image: '🖼', video: '🎬', audio: '🎧', pdf: '📕', text: '📄',
  zip: '🗜', doc: '📘', sheet: '📗', slides: '📙', file: '📎',
}

export function prettySize(n) {
  if (!n && n !== 0) return ''
  if (n > 1048576) return (n / 1048576).toFixed(1) + ' MB'
  if (n > 1024) return Math.round(n / 1024) + ' kB'
  return n + ' B'
}

/**
 * Visor a pantalla completa: fotos con zoom, vídeo, audio, PDF paginado
 * (renderizado con pdf.js dentro de la app) y texto/código con resaltado suave.
 * Nada se guarda en el teléfono salvo que pulses «Guardar».
 */
export default function MediaViewer({ item, onClose, say }) {
  const { url, name = 'archivo', mime = '', size } = item || {}
  const kind = fileKindOf(name, mime)
  const [text, setText] = useState(null)
  const [pdf, setPdf] = useState({ pages: 0, page: 1, busy: kind === 'pdf', err: null })
  const [zoom, setZoom] = useState(1)
  const canvasRef = useRef(null)
  const docRef = useRef(null)

  useEffect(() => {
    if (kind !== 'text') return
    fetch(url).then((r) => r.text()).then((t) => setText(t.slice(0, 200000))).catch(() => setText('No se pudo leer el archivo.'))
  }, [url, kind])

  useEffect(() => {
    if (kind !== 'pdf') return
    let dead = false
    ;(async () => {
      try {
        const pdfjs = await import('pdfjs-dist')
        const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default
        const buf = await (await fetch(url)).arrayBuffer()
        const doc = await pdfjs.getDocument({ data: buf }).promise
        if (dead) return
        docRef.current = doc
        setPdf((p) => ({ ...p, pages: doc.numPages, busy: false }))
      } catch (e) {
        if (!dead) setPdf((p) => ({ ...p, busy: false, err: e.message }))
      }
    })()
    return () => { dead = true }
  }, [url, kind])

  useEffect(() => {
    if (kind !== 'pdf' || !docRef.current || !canvasRef.current) return
    let dead = false
    ;(async () => {
      const page = await docRef.current.getPage(pdf.page)
      if (dead) return
      const canvas = canvasRef.current
      const wrapW = canvas.parentElement.clientWidth - 20
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: Math.max(0.4, (wrapW / base.width) * zoom) })
      canvas.width = viewport.width
      canvas.height = viewport.height
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    })()
    return () => { dead = true }
  }, [pdf.page, pdf.pages, zoom, kind])

  const save = () => {
    const a = document.createElement('a')
    a.href = url; a.download = name; a.click()
    say?.('Guardado en Descargas')
  }

  return (
    <div className="viewer">
      <div className="vhdr">
        <div className="iconbtn" onClick={onClose}><I.back /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="vname">{name}</div>
          <span className="sub">{KIND_ICON[kind]} {kind.toUpperCase()}{size ? ' · ' + prettySize(size) : ''}{kind === 'pdf' && pdf.pages ? ` · ${pdf.pages} págs.` : ''}</span>
        </div>
        {(kind === 'image' || kind === 'pdf') && (
          <>
            <div className="iconbtn" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}>−</div>
            <div className="iconbtn" onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}>+</div>
          </>
        )}
        <div className="iconbtn" onClick={save}><I.download /></div>
      </div>

      <div className="vbody">
        {kind === 'image' && (
          <img src={url} alt={name} style={{ transform: `scale(${zoom})` }} onClick={() => setZoom((z) => (z === 1 ? 2 : 1))} />
        )}

        {kind === 'video' && <video src={url} controls autoPlay playsInline style={{ width: '100%', maxHeight: '78vh' }} />}

        {kind === 'audio' && (
          <div className="audiocard">
            <div className="acover">🎧</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>{name}</div>
            <audio src={url} controls autoPlay style={{ width: '100%' }} />
          </div>
        )}

        {kind === 'pdf' && (
          <div className="pdfwrap">
            {pdf.busy && <div className="loading"><span className="spin" /> Abriendo documento…</div>}
            {pdf.err && <div className="err"><div className="errtxt">No se pudo previsualizar: {pdf.err}</div></div>}
            <canvas ref={canvasRef} className="pdfcanvas" />
            {pdf.pages > 1 && (
              <div className="pdfnav">
                <button disabled={pdf.page <= 1} onClick={() => setPdf((p) => ({ ...p, page: p.page - 1 }))}>‹</button>
                <span>{pdf.page} / {pdf.pages}</span>
                <button disabled={pdf.page >= pdf.pages} onClick={() => setPdf((p) => ({ ...p, page: p.page + 1 }))}>›</button>
              </div>
            )}
          </div>
        )}

        {kind === 'text' && (
          text === null ? <div className="loading"><span className="spin" /> Leyendo…</div>
            : <pre className="textview txt">{text}</pre>
        )}

        {['zip', 'doc', 'sheet', 'slides', 'file'].includes(kind) && (
          <div className="nopreview">
            <div className="bigicon">{KIND_ICON[kind]}</div>
            <h3>{name}</h3>
            <p>{prettySize(size)} · este formato no se puede previsualizar dentro de la app.</p>
            <button className="btn grad" style={{ maxWidth: 240, margin: '16px auto 0' }} onClick={save}>
              <I.download width="18" height="18" /> Guardar en el teléfono
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
