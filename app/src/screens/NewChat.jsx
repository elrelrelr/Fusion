import { useEffect, useState } from 'react'
import { I } from '../ui/icons'
import { Avatar, Spinner } from '../ui/bits'

export default function NewChat({ tgu, say, onClose, onPick }) {
  const [tab, setTab] = useState('people')
  const [q, setQ] = useState('')
  const [contacts, setContacts] = useState(null)
  const [found, setFound] = useState(null)
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState('')
  const [sel, setSel] = useState([])

  useEffect(() => { tgu.contacts().then(setContacts).catch(() => setContacts([])) }, [])

  const search = async () => {
    if (!q.trim()) return setFound(null)
    setBusy(true)
    try { setFound(await tgu.people(q.trim())) } catch (e) { say?.(e.errorMessage || e.message) }
    setBusy(false)
  }

  const create = async (broadcast) => {
    if (!title.trim()) return say?.('Ponle un nombre')
    setBusy(true)
    try {
      if (broadcast === null) await tgu.createGroup(title.trim(), sel.map((s) => s.peer))
      else await tgu.createChannel(title.trim(), '', broadcast)
      say?.(broadcast === null ? 'Grupo creado' : broadcast ? 'Canal creado' : 'Supergrupo creado')
      await tgu.reload()
      onClose()
    } catch (e) { say?.(e.errorMessage || e.message) }
    setBusy(false)
  }

  const list = found || contacts

  return (
    <>
      <div className="sheet-bg" onClick={onClose} />
      <div className="sheet">
        <div className="grab" />
        <h3>Nuevo</h3>
        <div className="seg" style={{ margin: '4px 0 12px' }}>
          <button className={tab === 'people' ? 'on' : ''} onClick={() => setTab('people')}>Personas</button>
          <button className={tab === 'group' ? 'on' : ''} onClick={() => setTab('group')}>Grupo</button>
          <button className={tab === 'channel' ? 'on' : ''} onClick={() => setTab('channel')}>Canal</button>
        </div>

        {tab === 'people' && (<>
          <div className="search" style={{ margin: '0 0 10px' }}>
            <I.search width="17" height="17" style={{ color: 'var(--dim2)' }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="Buscar @usuario o nombre…" autoCapitalize="none" />
            {busy && <span className="spin" />}
          </div>
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {!list && <Spinner label="Cargando contactos…" />}
            {list?.map((p) => (
              <div className="selrow" key={p.id} onClick={() => onPick(p)}>
                <Avatar name={p.name} id={p.id} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>{p.name} {p.bot && <span className="tagmini b">bot</span>}</div>
                  <div style={{ fontSize: 12.2, color: 'var(--dim2)' }}>{p.username ? '@' + p.username : p.isChannel ? 'canal' : 'contacto'}</div>
                </div>
              </div>
            ))}
            {list && !list.length && <p className="note">Sin resultados. Prueba con el @usuario exacto.</p>}
          </div>
        </>)}

        {tab === 'group' && (<>
          <input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre del grupo" />
          <span className="lbl">Añadir contactos ({sel.length})</span>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {contacts?.map((p) => {
              const on = sel.some((s) => s.id === p.id)
              return (
                <div className={'selrow ' + (on ? 'on' : '')} key={p.id}
                  onClick={() => setSel(on ? sel.filter((s) => s.id !== p.id) : [...sel, p])}>
                  <Avatar name={p.name} id={p.id} size={40} />
                  <div style={{ flex: 1, fontSize: 14.5 }}>{p.name}</div>
                  {on && <I.check width="18" height="18" style={{ color: 'var(--a1)' }} />}
                </div>
              )
            })}
          </div>
          <button className="btn grad" style={{ marginTop: 12 }} disabled={busy || !title.trim()} onClick={() => create(null)}>
            {busy ? <span className="spin" /> : 'Crear grupo'}
          </button>
        </>)}

        {tab === 'channel' && (<>
          <input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre del canal" />
          <p className="note">Un canal difunde a suscriptores; el supergrupo permite que todos escriban.</p>
          <button className="btn grad" style={{ marginTop: 8 }} disabled={busy || !title.trim()} onClick={() => create(true)}>Crear canal</button>
          <button className="btn line" style={{ marginTop: 10 }} disabled={busy || !title.trim()} onClick={() => create(false)}>Crear supergrupo</button>
        </>)}
      </div>
    </>
  )
}
