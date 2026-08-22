import { useState } from 'react'
import { I } from '../ui/icons'
import { Avatar, ErrorBox } from '../ui/bits'

export default function Compose({ targets, mastoOn, defaultTarget, onClose, onPublish }) {
  const [text, setText] = useState('')
  const [toM, setToM] = useState(mastoOn)
  const [target, setTarget] = useState(defaultTarget || '')
  const [vis, setVis] = useState('public')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const can = text.trim() && ((toM && mastoOn) || target) && !busy

  const go = async () => {
    setBusy(true); setErr(null)
    try { await onPublish({ text: text.trim(), toM: toM && mastoOn, target, vis }); onClose() }
    catch (e) { setErr(e.errorMessage || e.message) }
    setBusy(false)
  }

  return (
    <>
      <div className="sheet-bg" onClick={onClose} />
      <div className="sheet">
        <div className="grab" />
        <h3>Nueva publicación</h3>
        <textarea className="inp" rows={4} value={text} onChange={(e) => setText(e.target.value)} autoFocus
          placeholder="Escribe algo y elige dónde va…" style={{ resize: 'none', lineHeight: 1.5 }} />

        <span className="lbl">Publicar en</span>
        <div
          className={'selrow ' + (toM ? 'on' : '')}
          onClick={() => mastoOn && setToM(!toM)}
          style={{ opacity: mastoOn ? 1 : .45 }}
        >
          <Avatar name="Mastodon" id="masto" size={40} network="mastodon" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>Mastodon</div>
            <div style={{ fontSize: 12.2, color: 'var(--dim2)' }}>{mastoOn ? 'tu timeline del fediverso' : 'no conectado'}</div>
          </div>
          {toM && mastoOn && <I.check width="18" height="18" style={{ color: 'var(--a1)' }} />}
        </div>

        {toM && mastoOn && (
          <select className="inp" value={vis} onChange={(e) => setVis(e.target.value)} style={{ marginTop: 8, fontSize: 14 }}>
            <option value="public">Público</option>
            <option value="unlisted">No listado</option>
            <option value="private">Solo seguidores</option>
            <option value="direct">Directo</option>
          </select>
        )}

        <span className="lbl">Enviar también a Telegram</span>
        <div style={{ maxHeight: 210, overflowY: 'auto' }}>
          <div className={'selrow ' + (!target ? 'on' : '')} onClick={() => setTarget('')}>
            <div className="ava-f" style={{ width: 40, height: 40, background: 'var(--bg-soft)', color: 'var(--dim2)' }}>—</div>
            <div style={{ flex: 1, fontSize: 14.5 }}>Ninguno</div>
            {!target && <I.check width="18" height="18" style={{ color: 'var(--a1)' }} />}
          </div>
          {targets.map((t) => (
            <div key={t.id} className={'selrow ' + (target === t.id ? 'on' : '')} onClick={() => setTarget(t.id)}>
              <Avatar src={t.avatar} name={t.title} id={t.id} size={40} saved={t.saved} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                <div style={{ fontSize: 12.2, color: 'var(--dim2)' }}>{t.sub}</div>
              </div>
              {target === t.id && <I.check width="18" height="18" style={{ color: 'var(--a1)' }} />}
            </div>
          ))}
        </div>

        {err && <ErrorBox error={err} />}
        <button className="btn grad" style={{ marginTop: 14 }} disabled={!can} onClick={go}>
          {busy ? <span className="spin" /> : <><I.send width="18" height="18" /> Publicar</>}
        </button>
      </div>
    </>
  )
}
