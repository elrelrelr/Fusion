import { useMemo, useRef, useState } from 'react'
import { I } from '../ui/icons'
import { Avatar, timeShort, Empty, Spinner } from '../ui/bits'

/* Pestañas como en el Telegram oficial: Todos + carpetas, con subrayado. */
const TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'user', label: 'Personales' },
  { id: 'group', label: 'Grupos' },
  { id: 'channel', label: 'Canales' },
  { id: 'bot', label: 'Bots' },
  { id: 'unread', label: 'No leídos' },
]

export default function Chats({ items, folders = [], loading, onOpen, tgu, say, onNew }) {
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [menu, setMenu] = useState(null)
  const [global, setGlobal] = useState(null)
  const [searching, setSearching] = useState(false)
  const timer = useRef(null)

  const counts = useMemo(() => items.reduce((a, c) => {
    a[c.kind] = (a[c.kind] || 0) + 1
    if (c.unread > 0) a.unread = (a.unread || 0) + 1
    if (c.archived) a.archived = (a.archived || 0) + 1
    return a
  }, {}), [items])

  const list = useMemo(() => items
    .filter((c) => (tab === 'archived' ? c.archived : !c.archived))
    .filter((c) => {
      if (tab === 'all' || tab === 'archived') return true
      if (tab === 'unread') return c.unread > 0
      if (tab.startsWith('fold:')) {
        const f = folders.find((x) => String(x.id) === tab.slice(5))
        return f ? f.peerIds.includes(String(c.dialog?.id)) : true
      }
      return c.kind === tab
    })
    .filter((c) => !q.trim() || c.title.toLowerCase().includes(q.toLowerCase())), [items, tab, q, folders])

  const runGlobal = async () => {
    if (!q.trim()) return
    setSearching(true)
    try { setGlobal(await tgu.searchGlobal(q.trim())) } catch (e) { say?.(e.errorMessage || e.message) }
    setSearching(false)
  }

  const press = {
    start: (c) => { timer.current = setTimeout(() => { setMenu(c); navigator.vibrate?.(12) }, 400) },
    end: () => clearTimeout(timer.current),
  }

  const act = async (fn, msg) => {
    try { await fn(); say?.(msg) } catch (e) { say?.(e.errorMessage || e.message) }
    setMenu(null)
  }

  const allTabs = [
    ...TABS,
    ...(counts.archived ? [{ id: 'archived', label: 'Archivados' }] : []),
    ...folders.map((f) => ({ id: 'fold:' + f.id, label: f.title })),
  ]

  return (
    <>
      <div className="search tg">
        <I.search width="17" height="17" style={{ color: 'var(--dim2)' }} />
        <input value={q} onChange={(e) => { setQ(e.target.value); setGlobal(null) }}
          onKeyDown={(e) => e.key === 'Enter' && runGlobal()} placeholder="Buscar" />
        {searching && <span className="spin" />}
        {q && !searching && <div className="iconbtn" style={{ width: 26, height: 26 }} onClick={() => { setQ(''); setGlobal(null) }}>✕</div>}
      </div>

      <div className="tgtabs">
        {allTabs.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            {t.label}
            {counts[t.id] > 0 && <span className="tnum">{counts[t.id]}</span>}
          </button>
        ))}
      </div>

      <div className="body">
        {loading && !items.length && <Spinner label="Cargando chats…" />}

        {global && (
          <>
            <div className="seclabel">Mensajes · {global.length}</div>
            {global.map((r, i) => (
              <div className="tgrow" key={i} onClick={() => {
                const c = items.find((x) => x.dialog?.id === r.peerId)
                if (c) onOpen(c); else say?.('Ese chat aún no está en tu lista')
              }}>
                <Avatar name={r.title} id={r.peerId} size={54} />
                <div className="tgmid">
                  <div className="tgtop"><span className="tgname">{r.title}</span><span className="tgtime">{timeShort(r.date)}</span></div>
                  <div className="tgprev">{r.out ? 'Tú: ' : ''}{r.text}</div>
                </div>
              </div>
            ))}
            <div className="seclabel">Chats</div>
          </>
        )}

        {!loading && !list.length && !global && (
          <Empty title="Sin chats" text={q ? 'Nada coincide. Pulsa Enter para buscar dentro de los mensajes.' : 'Aquí aparecerán tus conversaciones.'} />
        )}

        {list.map((c) => (
          <div className="tgrow" key={c.key}
            onClick={() => onOpen(c)}
            onContextMenu={(e) => { e.preventDefault(); setMenu(c) }}
            onTouchStart={() => press.start(c)} onTouchEnd={press.end} onTouchMove={press.end}>
            <Avatar src={c.avatar} name={c.title} id={c.key} size={54} saved={c.saved}
              network={c.network === 'mastodon' ? 'mastodon' : null} />
            <div className="tgmid">
              <div className="tgtop">
                <span className="tgname">
                  {c.saved && <I.saved width="14" height="14" style={{ marginRight: 4, color: 'var(--a2)' }} />}
                  {c.title}
                  {c.verified && <I.check width="13" height="13" style={{ color: 'var(--a2)', marginLeft: 4 }} />}
                  {c.kind === 'bot' && <span className="tagmini b">bot</span>}
                  {c.network === 'mastodon' && <span className="tagmini m">fedi</span>}
                </span>
                <span className="tgtime">
                  {c.outLast && <I.checks width="15" height="15" style={{ color: 'var(--a2)', marginRight: 3, verticalAlign: -3 }} />}
                  {timeShort(c.date)}
                </span>
              </div>
              <div className="tgbottom">
                <span className="tgprev">{(c.preview || '').replace(/<[^>]+>/g, '') || 'sin mensajes'}</span>
                <span className="tgmarks">
                  {c.muted && <I.bellOff width="15" height="15" style={{ color: 'var(--dim2)' }} />}
                  {c.pinned2 && !c.unread && <I.pin width="14" height="14" style={{ color: 'var(--dim2)' }} />}
                  {c.unread > 0 && <span className={'badge ' + (c.muted ? 'mute' : '')}>{c.unread > 999 ? '999+' : c.unread}</span>}
                  <button className="rowdots" onClick={(e) => { e.stopPropagation(); setMenu(c) }}><I.dots width="15" height="15" /></button>
                </span>
              </div>
            </div>
          </div>
        ))}
        <div style={{ height: 96 }} />
      </div>

      {menu && (
        <>
          <div className="sheet-bg" onClick={() => setMenu(null)} />
          <div className="sheet">
            <div className="grab" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Avatar src={menu.avatar} name={menu.title} id={menu.key} size={44} saved={menu.saved} />
              <div><h3 style={{ margin: 0 }}>{menu.title}</h3><span className="sub">{menu.subtitle}</span></div>
            </div>
            {menu.source === 'tg' ? (
              <div className="menu">
                <button onClick={() => { onOpen(menu); setMenu(null) }}><I.chat width="18" height="18" /> Abrir</button>
                <button onClick={() => act(() => tgu.readNow(menu.dialog), 'Marcado como leído')}><I.check width="18" height="18" /> Marcar como leído</button>
                <button onClick={() => act(() => tgu.setUnread(menu.dialog, true), 'Marcado como no leído')}><I.bell width="18" height="18" /> Marcar como no leído</button>
                <button onClick={() => act(() => tgu.pinDialog(menu.dialog, !menu.pinned2), menu.pinned2 ? 'Desfijado' : 'Fijado arriba')}><I.pin width="18" height="18" /> {menu.pinned2 ? 'Desfijar' : 'Fijar arriba'}</button>
                <button onClick={() => act(() => tgu.mute(menu.dialog, menu.muted ? 0 : 31536000), menu.muted ? 'Activadas' : 'Silenciado')}><I.bellOff width="18" height="18" /> {menu.muted ? 'Activar notificaciones' : 'Silenciar'}</button>
                <button onClick={() => act(() => tgu.archive(menu.dialog, !menu.archived), menu.archived ? 'Desarchivado' : 'Archivado')}><I.archive width="18" height="18" /> {menu.archived ? 'Quitar del archivo' : 'Archivar'}</button>
                <button className="danger" onClick={() => act(() => tgu.clearChat(menu.dialog, false), 'Historial vaciado')}><I.trash width="18" height="18" /> Vaciar historial</button>
                <button className="danger" onClick={() => act(() => tgu.leave(menu.dialog), 'Has salido')}><I.logout width="18" height="18" /> Salir / eliminar</button>
              </div>
            ) : (
              <div className="menu"><button onClick={() => { onOpen(menu); setMenu(null) }}><I.chat width="18" height="18" /> Abrir conversación</button></div>
            )}
          </div>
        </>
      )}
    </>
  )
}
