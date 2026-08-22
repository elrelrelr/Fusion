import { useEffect, useState } from 'react'
import { I } from '../ui/icons'
import { Avatar, Spinner } from '../ui/bits'
import MediaViewer from './MediaViewer'

export default function ChatInfo({ conv, tgu, say, onBack, onOpenChat }) {
  const [info, setInfo] = useState(null)
  const [members, setMembers] = useState(null)
  const [media, setMedia] = useState([])
  const [thumbs, setThumbs] = useState({})
  const [tab, setTab] = useState('media')
  const [viewing, setViewing] = useState(null)
  const d = conv.dialog

  useEffect(() => {
    let dead = false
    tgu.info(d.peer).then((i) => !dead && setInfo(i)).catch((e) => say?.(e.errorMessage || e.message))
    tgu.shared(d.peer, 24).then(async (list) => {
      if (dead) return
      setMedia(list)
      for (const m of list.slice(0, 12)) {
        try {
          const url = await tgu.download(d.peer, m.id, conv.key + ':' + m.id)
          if (url && !dead) setThumbs((t) => ({ ...t, [m.id]: url }))
        } catch { /* noop */ }
      }
    }).catch(() => {})
    if (!d.isUser) tgu.members(d.peer, 60).then((m) => !dead && setMembers(m)).catch(() => {})
    return () => { dead = true }
  }, [d?.id])

  const act = async (fn, msg) => { try { await fn(); say?.(msg) } catch (e) { say?.(e.errorMessage || e.message) } }

  return (
    <div className="frame overlay">
      <div className="hdr">
        <div className="iconbtn" onClick={onBack}><I.back /></div>
        <h1 style={{ fontSize: 16 }}>Información</h1>
      </div>

      <div className="body pad">
        <div className="infohead">
          <Avatar src={conv.avatar} name={conv.title} id={conv.key} size={104} saved={conv.saved} />
          <h2>{conv.title}</h2>
          <span>
            {info?.isUser ? (info.phone ? '+' + info.phone : 'usuario')
              : info?.members ? `${info.members} miembros${info.online ? ` · ${info.online} en línea` : ''}`
                : conv.subtitle}
          </span>

          <div className="quickacts">
            <button onClick={() => { onOpenChat(); }}><I.chat width="19" height="19" /> Mensaje</button>
            <button className={conv.muted ? 'on' : ''} onClick={() => act(() => tgu.mute(d, conv.muted ? 0 : 31536000), conv.muted ? 'Notificaciones activadas' : 'Silenciado')}>
              <I.bell width="19" height="19" /> {conv.muted ? 'Activar' : 'Silenciar'}
            </button>
            <button className={conv.pinned2 ? 'on' : ''} onClick={() => act(() => tgu.pinDialog(d, !conv.pinned2), conv.pinned2 ? 'Desfijado' : 'Fijado')}>
              <I.pin width="19" height="19" /> Fijar
            </button>
            <button className={conv.archived ? 'on' : ''} onClick={() => act(() => tgu.archive(d, !conv.archived), conv.archived ? 'Desarchivado' : 'Archivado')}>
              <I.archive width="19" height="19" /> Archivar
            </button>
          </div>
        </div>

        <div className="group">
          {info?.username && <div className="item"><div className="ic"><I.globe width="17" height="17" /></div><div className="t">@{info.username}<small>nombre de usuario</small></div></div>}
          {info?.phone && <div className="item"><div className="ic"><I.chat width="17" height="17" /></div><div className="t">+{info.phone}<small>teléfono</small></div></div>}
          {info?.about && <div className="item"><div className="ic"><I.user width="17" height="17" /></div><div className="t txt" style={{ whiteSpace: 'pre-wrap' }}>{info.about}<small>{info.isUser ? 'biografía' : 'descripción'}</small></div></div>}
          {!info && <Spinner label="Cargando información…" />}
        </div>

        <div className="seg" style={{ marginTop: 4 }}>
          <button className={tab === 'media' ? 'on' : ''} onClick={() => setTab('media')}>Multimedia {media.length ? `· ${media.length}` : ''}</button>
          {!d.isUser && <button className={tab === 'members' ? 'on' : ''} onClick={() => setTab('members')}>Miembros {members?.length ? `· ${members.length}` : ''}</button>}
        </div>

        {tab === 'media' && (
          media.length ? (
            <div className="mediagrid">
              {media.map((m) => (
                <div key={m.id} onClick={async () => {
                  let url = thumbs[m.id]
                  if (!url) { say?.('Abriendo…'); url = await tgu.download(d.peer, m.id, conv.key + ':' + m.id).catch(() => null) }
                  if (url) { setThumbs((t) => ({ ...t, [m.id]: url })); setViewing({ url, name: (m.kind === 'video' ? 'video.mp4' : 'foto.jpg'), mime: m.kind === 'video' ? 'video/mp4' : 'image/jpeg' }) }
                }}>
                  {thumbs[m.id] ? <img src={thumbs[m.id]} alt="" /> : (m.kind === 'video' ? '🎬' : '🖼')}
                </div>
              ))}
            </div>
          ) : <p className="note" style={{ padding: '0 16px' }}>Sin fotos ni vídeos recientes en este chat.</p>
        )}

        {tab === 'members' && (
          members ? members.map((m) => (
            <div className="row" key={m.id}>
              <Avatar name={m.name} id={m.id} size={46} />
              <div style={{ minWidth: 0 }}>
                <div className="name">{m.name} {m.bot && <span className="tagmini b">bot</span>}</div>
                <div className="prev">{m.username ? '@' + m.username : 'sin usuario'}</div>
              </div>
              <div />
            </div>
          )) : <Spinner label="Cargando miembros…" />
        )}

        <div className="group" style={{ marginTop: 10, borderBottom: 0 }}>
          {info?.isUser && (
            <div className="item danger" onClick={() => act(() => tgu.block(d.peer, !info.blocked), info.blocked ? 'Desbloqueado' : 'Usuario bloqueado')}>
              <div className="ic" style={{ background: 'rgba(255,107,107,.14)' }}><I.shield width="17" height="17" /></div>
              <div className="t">{info.blocked ? 'Desbloquear usuario' : 'Bloquear usuario'}</div>
            </div>
          )}
          <div className="item danger" onClick={() => act(() => tgu.leave(d).then(onBack), 'Has salido del chat')}>
            <div className="ic" style={{ background: 'rgba(255,107,107,.14)' }}><I.logout width="17" height="17" /></div>
            <div className="t">{d.isUser ? 'Eliminar chat' : 'Salir del chat'}</div>
          </div>
        </div>
      </div>
      {viewing && <MediaViewer item={viewing} say={say} onClose={() => setViewing(null)} />}
    </div>
  )
}
