import { useEffect, useMemo, useRef, useState } from 'react'
import { I } from '../ui/icons'
import { Avatar, dayLabel, Spinner } from '../ui/bits'
import { loadSettings } from '../lib/settings'
import MediaViewer, { fileKindOf, KIND_ICON, prettySize } from './MediaViewer'
import { AudioBubble, VoiceRecorder } from '../ui/audio'

const REACTIONS = ['👍', '❤️', '🔥', '😂', '😮', '😢', '🎉', '👏']

const LONG_MS = 420

export default function Chat({ conv, tgu, onBack, onSend, onForwardRequest, say, onOpenInfo }) {
  const set = loadSettings()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [menu, setMenu] = useState(null)        // mensaje con menú abierto
  const [chatMenu, setChatMenu] = useState(false)
  const [sel, setSel] = useState([])            // ids seleccionados
  const [replyTo, setReplyTo] = useState(null)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState(null)    // {q, results}
  const [media, setMedia] = useState({})        // id -> url
  const [confirm, setConfirm] = useState(null)
  const end = useRef(null)
  const timer = useRef(null)
  const fileRef = useRef(null)
  const [upload, setUpload] = useState(null)
  const [viewing, setViewing] = useState(null)
  const isTg = conv.source === 'tg'
  const msgs = conv.messages || []

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [msgs.length, conv.key])

  const [hint, setHint] = useState(() => !localStorage.getItem('fx.hint.msg'))
  useEffect(() => { if (hint && msgs.length) { const t = setTimeout(() => { setHint(false); localStorage.setItem('fx.hint.msg', '1') }, 7000); return () => clearTimeout(t) } }, [hint, msgs.length])

  // descarga automática de fotos
  useEffect(() => {
    if (!isTg || !set.autoDownload) return
    let dead = false
    ;(async () => {
      for (const m of msgs.slice(-15)) {
        if (dead) break
        if (!m.media || media[m.id]) continue
        if (!['photo', 'sticker', 'voice'].includes(m.media.kind)) continue
        try {
          const url = await tgu.download(conv.dialog.peer, m.id, conv.key + ':' + m.id)
          if (url && !dead) setMedia((x) => ({ ...x, [m.id]: url }))
        } catch { /* noop */ }  // precarga silenciosa
      }
    })()
    return () => { dead = true }
  }, [msgs, conv.key, isTg, set.autoDownload])

  const grab = async (m, open = true) => {
    if (media[m.id]) { if (open) setViewing({ url: media[m.id], name: m.media?.label || 'archivo', mime: '' }); return }
    say?.('Abriendo…')
    try {
      const url = await tgu.download(conv.dialog.peer, m.id, conv.key + ':' + m.id)
      if (!url) return say?.('No se pudo abrir el archivo')
      setMedia((x) => ({ ...x, [m.id]: url }))
      if (open && m.media?.kind !== 'sticker') setViewing({ url, name: m.media?.label || 'archivo', mime: '' })
    } catch (e) { say?.(e.errorMessage || e.message) }
  }

  const send = async () => {
    const t = text.trim()
    if (!t) return
    setBusy(true)
    try {
      if (editing) { await tgu.edit(conv.dialog, editing.id, t); setEditing(null) }
      else { await onSend(conv, t, { replyTo: replyTo?.id }); setReplyTo(null) }
      setText('')
    } catch (e) { say?.(e.errorMessage || e.message) }
    setBusy(false)
  }

  const attach = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !isTg) return
    setUpload(file.name)
    try {
      await tgu.sendFile(conv.dialog, file, text.trim(), /^image\//.test(file.type))
      setText('')
      say?.('Enviado: ' + file.name)
    } catch (err) { say?.(err.errorMessage || err.message) }
    setUpload(null)
  }

  const exportChat = () => {
    const txt = tgu.exportChat(conv.title, msgs)
    const url = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url; a.download = `${conv.title.replace(/[^\w]+/g, '_')}.txt`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
    say?.('Chat exportado')
  }

  const press = {
    onTouchStart: (m) => { timer.current = setTimeout(() => { setMenu(m); navigator.vibrate?.(12) }, LONG_MS) },
    onTouchEnd: () => clearTimeout(timer.current),
  }

  const toggleSel = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const doDelete = async (ids, revoke) => {
    try { await tgu.remove(conv.dialog, ids, revoke); setSel([]); setConfirm(null); say?.('Eliminado') }
    catch (e) { say?.(e.errorMessage || e.message) }
  }

  const copyText = (t) => { navigator.clipboard?.writeText(t).catch(() => {}); say?.('Copiado') }

  const runSearch = async (q) => {
    if (!q.trim()) return setSearch({ q, results: null })
    try { setSearch({ q, results: await tgu.searchIn(conv.dialog.peer, q) }) }
    catch (e) { say?.(e.errorMessage || e.message) }
  }

  const grouped = useMemo(() => {
    let last = null
    return msgs.map((m) => {
      const d = dayLabel(m.date)
      const sep = d !== last ? (last = d) : null
      return { m, sep }
    })
  }, [msgs])

  return (
    <div className="frame overlay">
      {/* ---------- cabecera ---------- */}
      {sel.length ? (
        <div className="hdr">
          <div className="iconbtn" onClick={() => setSel([])}><I.back /></div>
          <h1 style={{ fontSize: 16 }}>{sel.length} seleccionado{sel.length > 1 ? 's' : ''}</h1>
          <div className="iconbtn" onClick={() => copyText(msgs.filter((m) => sel.includes(m.id)).map((m) => m.text).join('\n'))}><I.copy /></div>
          <div className="iconbtn" onClick={() => onForwardRequest(conv, sel)}><I.forward /></div>
          {isTg && <div className="iconbtn" style={{ color: 'var(--danger)' }} onClick={() => setConfirm({ ids: sel })}><I.trash /></div>}
        </div>
      ) : search ? (
        <div className="hdr">
          <div className="iconbtn" onClick={() => setSearch(null)}><I.back /></div>
          <input className="hdrinput" autoFocus placeholder="Buscar en este chat…" value={search.q}
            onChange={(e) => setSearch({ ...search, q: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && runSearch(search.q)} />
          <div className="iconbtn" onClick={() => runSearch(search.q)}><I.search /></div>
        </div>
      ) : (
        <div className="hdr">
          <div className="iconbtn" onClick={onBack}><I.back /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }} onClick={() => onOpenInfo?.(conv)}>
            <Avatar src={conv.avatar} name={conv.title} id={conv.key} size={36} saved={conv.saved} network={conv.network === 'mastodon' ? 'mastodon' : null} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.title}</div>
              <span className="sub">{conv.subtitle}</span>
            </div>
          </div>
          {isTg && <div className="iconbtn" onClick={() => setSel(msgs.length ? [msgs[msgs.length - 1].id] : [])} title="Seleccionar"><I.check /></div>}
          {isTg && <div className="iconbtn" onClick={() => setSearch({ q: '', results: null })}><I.search /></div>}
          {isTg && <div className="iconbtn" onClick={() => setChatMenu(true)}><I.dots /></div>}
        </div>
      )}

      {/* ---------- mensaje fijado ---------- */}
      {conv.pinned && !search && (
        <div className="pinbar">
          <I.pin width="15" height="15" />
          <div className="txt" style={{ flex: 1, minWidth: 0 }}>
            <b>Mensaje fijado</b>
            <div className="one">{conv.pinned.text}</div>
          </div>
          <div className="iconbtn" style={{ width: 30, height: 30 }} onClick={() => tgu.pin(conv.dialog, conv.pinned.id, true)}>✕</div>
        </div>
      )}

      {/* ---------- cuerpo ---------- */}
      {search?.results ? (
        <div className="body">
          {!search.results.length && <div className="empty"><h3>Sin resultados</h3><p>Nada coincide con “{search.q}”.</p></div>}
          {search.results.map((r) => (
            <div className="row" key={r.id}>
              <div className="ava-f" style={{ width: 40, height: 40, background: 'var(--bg-soft)' }}><I.chat width="18" height="18" /></div>
              <div style={{ minWidth: 0 }}>
                <div className="name" style={{ fontSize: 14 }}>{r.out ? 'Tú' : conv.title}</div>
                <div className="prev">{r.text}</div>
              </div>
              <span className="time">{new Date(r.date).toLocaleDateString('es', { day: '2-digit', month: '2-digit' })}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="msgs">
          {!msgs.length && <Spinner label="Cargando mensajes…" />}
          {grouped.map(({ m, sep }, i) => (
            <div key={m.id || i} style={{ display: 'contents' }}>
              {sep && <div className="daysep">{sep}</div>}
              <div
                className={'bubwrap ' + (m.out ? 'out' : 'in') + (sel.includes(m.id) ? ' selected' : '')}
                onClick={() => { if (sel.length) toggleSel(m.id) }}
                onContextMenu={(e) => { e.preventDefault(); setMenu(m) }}
                onTouchStart={() => press.onTouchStart(m)}
                onTouchEnd={press.onTouchEnd}
                onTouchMove={press.onTouchEnd}
              >
                <div className={'bub txt ' + (m.out ? 'out' : 'in') + (m.deleted ? ' del' : '')}>
                  {!m.out && conv.showAuthors && m.from && <span className="who">{m.from}</span>}
                  {m.fwdFrom && <span className="fwd">↪ Reenviado de {m.fwdFrom}</span>}
                  {m.replyTo && (
                    <div className="quote">{(msgs.find((x) => x.id === m.replyTo)?.text || 'mensaje').slice(0, 80)}</div>
                  )}
                  {m.media && (() => {
                    const url = media[m.id]
                    const kind = fileKindOf(m.media.label || '', '')
                    if (m.media.kind === 'voice' || m.media.kind === 'audio') {
                      return (
                        <AudioBubble url={url} duration={m.media.duration || 0}
                          voice={m.media.kind === 'voice'} title={m.media.label}
                          onNeedDownload={() => grab(m, false)} />
                      )
                    }
                    if (!url) {
                      return (
                        <button className="filecard" onClick={(e) => { e.stopPropagation(); grab(m) }}>
                          <span className="fic">{KIND_ICON[kind] || '📎'}</span>
                          <span style={{ minWidth: 0 }}>
                            <b>{m.media.label}</b>
                            <span>Toca para abrir sin descargar</span>
                          </span>
                        </button>
                      )
                    }
                    if (m.media.kind === 'sticker') return <img className="msticker" src={url} alt="" />
                    if (m.media.kind === 'photo' || kind === 'image') {
                      return (
                        <span className="photoframe" onClick={(e) => { e.stopPropagation(); setViewing({ url, name: m.media.label || 'foto.jpg', mime: 'image/jpeg' }) }}>
                          <img src={url} alt="" />
                          <span className="zoomhint">Ver</span>
                        </span>
                      )
                    }
                    return (
                      <button className="filecard" onClick={(e) => { e.stopPropagation(); setViewing({ url, name: m.media.label || 'archivo', mime: '' }) }}>
                        <span className="fic">{KIND_ICON[kind] || '📎'}</span>
                        <span style={{ minWidth: 0 }}>
                          <b>{m.media.label}</b>
                          <span>Abrir en el visor</span>
                        </span>
                      </button>
                    )
                  })()}
                  {m.html ? <span dangerouslySetInnerHTML={{ __html: m.html }} /> : m.text}
                  {m.myReaction && <span className="reacted">{m.myReaction}</span>}
                  <button className="msgdots" onClick={(e) => { e.stopPropagation(); setMenu(m) }} title="Opciones"><I.dots width="15" height="15" /></button>
                  <span className="tm">
                    {m.deleted && <b style={{ color: '#ff9d9d' }}>eliminado · </b>}
                    {m.edited && 'editado · '}
                    {new Date(m.date).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                </div>
              </div>
            </div>
          ))}
          <div ref={end} />
        </div>
      )}

      {/* ---------- barra de escritura ---------- */}
      {!search && (
        <div className="composerwrap">
          {(replyTo || editing) && (
            <div className="ctxbar">
              {editing ? <I.pencil width="15" height="15" /> : <I.reply width="15" height="15" />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{editing ? 'Editando' : 'Respondiendo a ' + (replyTo.out ? 'ti' : replyTo.from || conv.title)}</b>
                <div className="one">{(editing || replyTo).text}</div>
              </div>
              <div className="iconbtn" style={{ width: 30, height: 30 }} onClick={() => { setReplyTo(null); setEditing(null); setText('') }}>✕</div>
            </div>
          )}
          <div className="inputbar">
            {isTg && (
              <>
                <input ref={fileRef} type="file" hidden onChange={attach} />
                <div className="iconbtn accent" style={{ width: 40, height: 40 }} onClick={() => fileRef.current?.click()}>
                  {upload ? <span className="spin" /> : <I.clip width="20" height="20" />}
                </div>
              </>
            )}
            <textarea rows={1} value={text} placeholder={conv.saved ? 'Guardar una nota…' : 'Mensaje'}
              onChange={(e) => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px' }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && set.sendOnEnter) { e.preventDefault(); send() } }} />
            {isTg && !text.trim() && !editing ? (
              <VoiceRecorder say={say} onSend={async (blob, seconds) => { await tgu.sendVoice(conv.dialog, blob, seconds); say?.('Nota de voz enviada') }} />
            ) : (
              <button className="sendbtn" disabled={busy || !text.trim()} onClick={send}>
                {busy ? <span className="spin" /> : editing ? <I.check width="20" height="20" /> : <I.send width="20" height="20" />}
              </button>
            )}
          </div>
        </div>
      )}

      {hint && !!msgs.length && (
        <div className="hintbar" onClick={() => { setHint(false); localStorage.setItem('fx.hint.msg', '1') }}>
          Toca <b>⋮</b> en cualquier mensaje (o mantenlo pulsado) para responder, reenviar, editar, reaccionar o eliminar.
        </div>
      )}

      {viewing && <MediaViewer item={viewing} say={say} onClose={() => setViewing(null)} />}

      {/* ---------- menú del mensaje ---------- */}
      {menu && (
        <>
          <div className="sheet-bg" onClick={() => setMenu(null)} />
          <div className="sheet">
            <div className="grab" />
            {isTg && (
              <div className="reactrow">
                {REACTIONS.map((emo) => (
                  <button key={emo} className={menu.myReaction === emo ? 'on' : ''}
                    onClick={() => { tgu.react(conv.dialog, menu.id, menu.myReaction === emo ? null : emo).catch((e) => say?.(e.errorMessage || e.message)); setMenu(null) }}>
                    {emo}
                  </button>
                ))}
              </div>
            )}
            <div className="menupreview txt">{menu.text || menu.media?.label}</div>
            <div className="menu">
              <button onClick={() => { setReplyTo(menu); setMenu(null) }}><I.reply width="18" height="18" /> Responder</button>
              <button onClick={() => { copyText(menu.text); setMenu(null) }}><I.copy width="18" height="18" /> Copiar texto</button>
              <button onClick={() => { onForwardRequest(conv, [menu.id]); setMenu(null) }}><I.forward width="18" height="18" /> Reenviar</button>
              {isTg && <button onClick={() => { tgu.forward(conv.dialog, [menu.id], { peer: 'me', id: 'saved' }).then(() => say?.('Guardado en Mensajes guardados')).catch((e) => say?.(e.message)); setMenu(null) }}><I.saved width="18" height="18" /> Guardar en Guardados</button>}
              {isTg && menu.out && <button onClick={() => { setEditing(menu); setText(menu.text); setMenu(null) }}><I.pencil width="18" height="18" /> Editar</button>}
              {isTg && <button onClick={() => { tgu.pin(conv.dialog, menu.id, !!menu.pinned).catch((e) => say?.(e.message)); setMenu(null) }}><I.pin width="18" height="18" /> {menu.pinned ? 'Desfijar' : 'Fijar'}</button>}
              <button onClick={() => { setSel([menu.id]); setMenu(null) }}><I.check width="18" height="18" /> Seleccionar</button>
              {menu.media && <button onClick={() => { grab(menu); setMenu(null) }}><I.download width="18" height="18" /> Descargar adjunto</button>}
              {isTg && <button className="danger" onClick={() => { setConfirm({ ids: [menu.id], out: menu.out }); setMenu(null) }}><I.trash width="18" height="18" /> Eliminar</button>}
            </div>
          </div>
        </>
      )}

      {/* ---------- menú del chat ---------- */}
      {chatMenu && (
        <>
          <div className="sheet-bg" onClick={() => setChatMenu(false)} />
          <div className="sheet">
            <div className="grab" />
            <h3>{conv.title}</h3>
            <div className="menu">
              <button onClick={() => { tgu.readNow(conv.dialog); setChatMenu(false); say?.('Marcado como leído') }}><I.check width="18" height="18" /> Marcar como leído</button>
              <button onClick={() => { tgu.pinDialog(conv.dialog, !conv.pinned2).catch((e) => say?.(e.message)); setChatMenu(false) }}><I.pin width="18" height="18" /> {conv.pinned2 ? 'Desfijar chat' : 'Fijar chat'}</button>
              <button onClick={() => { tgu.mute(conv.dialog, conv.muted ? 0 : 31536000).catch((e) => say?.(e.message)); setChatMenu(false) }}><I.bell width="18" height="18" /> {conv.muted ? 'Activar notificaciones' : 'Silenciar'}</button>
              <button onClick={() => { tgu.archive(conv.dialog, !conv.archived).catch((e) => say?.(e.message)); setChatMenu(false); say?.(conv.archived ? 'Desarchivado' : 'Archivado') }}><I.archive width="18" height="18" /> {conv.archived ? 'Quitar del archivo' : 'Archivar'}</button>
              <button onClick={() => { tgu.openChat(conv.dialog, true); setChatMenu(false); say?.('Recargando…') }}><I.refresh width="18" height="18" /> Recargar historial</button>
              <button onClick={() => { onOpenInfo?.(conv); setChatMenu(false) }}><I.user width="18" height="18" /> Información del chat</button>
              <button onClick={() => { exportChat(); setChatMenu(false) }}><I.download width="18" height="18" /> Exportar chat (.txt)</button>
              <button onClick={() => { tgu.setUnread(conv.dialog, true).catch((e) => say?.(e.message)); setChatMenu(false); say?.('Marcado como no leído') }}><I.bell width="18" height="18" /> Marcar como no leído</button>
              <button className="danger" onClick={() => { setConfirm({ clear: true }); setChatMenu(false) }}><I.trash width="18" height="18" /> Vaciar historial</button>
              <button className="danger" onClick={() => { setConfirm({ leave: true }); setChatMenu(false) }}><I.logout width="18" height="18" /> Salir / eliminar chat</button>
            </div>
          </div>
        </>
      )}

      {/* ---------- confirmaciones ---------- */}
      {confirm && (
        <>
          <div className="sheet-bg" onClick={() => setConfirm(null)} />
          <div className="sheet">
            <div className="grab" />
            <h3>{confirm.clear ? 'Vaciar historial' : confirm.leave ? 'Salir del chat' : `Eliminar ${confirm.ids.length} mensaje${confirm.ids.length > 1 ? 's' : ''}`}</h3>
            <p className="note" style={{ marginTop: 0 }}>
              {confirm.clear ? 'Se borrarán los mensajes de este chat en tu cuenta.'
                : confirm.leave ? 'Saldrás del grupo o canal y desaparecerá de tu lista.'
                  : 'Elige si lo quitas solo para ti o para todos los participantes.'}
            </p>
            {confirm.ids && <>
              <button className="btn line" style={{ marginTop: 12 }} onClick={() => doDelete(confirm.ids, false)}>Eliminar solo para mí</button>
              <button className="btn grad" style={{ marginTop: 10, background: 'linear-gradient(135deg,#ff6b6b,#f59e0b)' }} onClick={() => doDelete(confirm.ids, true)}>Eliminar para todos</button>
            </>}
            {confirm.clear && <>
              <button className="btn line" style={{ marginTop: 12 }} onClick={() => tgu.clearChat(conv.dialog, false).then(() => { setConfirm(null); say?.('Historial vaciado') }).catch((e) => say?.(e.message))}>Vaciar para mí</button>
              <button className="btn grad" style={{ marginTop: 10, background: 'linear-gradient(135deg,#ff6b6b,#f59e0b)' }} onClick={() => tgu.clearChat(conv.dialog, true).then(() => { setConfirm(null); say?.('Historial vaciado') }).catch((e) => say?.(e.message))}>Vaciar para todos</button>
            </>}
            {confirm.leave && (
              <button className="btn grad" style={{ marginTop: 12, background: 'linear-gradient(135deg,#ff6b6b,#f59e0b)' }}
                onClick={() => tgu.leave(conv.dialog).then(() => { setConfirm(null); onBack(); say?.('Has salido del chat') }).catch((e) => say?.(e.message))}>Salir del chat</button>
            )}
            <button className="btn line" style={{ marginTop: 10 }} onClick={() => setConfirm(null)}>Cancelar</button>
          </div>
        </>
      )}
    </div>
  )
}
