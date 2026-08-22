import { useCallback, useEffect, useMemo, useState } from 'react'
import { I } from './ui/icons'
import { Avatar, timeAgo, Empty, Spinner } from './ui/bits'
import Login from './screens/Login'
import Chats from './screens/Chats'
import Chat from './screens/Chat'
import Wall from './screens/Wall'
import Compose from './screens/Compose'
import Profile from './screens/Profile'
import ChatInfo from './screens/ChatInfo'
import NewChat from './screens/NewChat'
import { useTgUser } from './lib/useTgUser'
import { useTelegram } from './lib/useTelegram'
import { session, completeLoginFromUrl, masto, toUnified } from './lib/mastodon'
import { tgSession } from './lib/telegram'
import { loadSettings, applySettings } from './lib/settings'
import { openInApp } from './lib/inapp'

const TABS = [
  { id: 'wall', label: 'Muro', icon: I.wall },
  { id: 'chats', label: 'Chats', icon: I.chat },
  { id: 'explore', label: 'Explorar', icon: I.globe },
  { id: 'profile', label: 'Perfil', icon: I.user },
]

// Dentro del APK del Telegram oficial la app se abre como "Fusion · Muro":
// ahí sobra la mensajería (ya la da Telegram nativo) y solo mostramos fediverso.
export const WALL_ONLY = typeof window !== 'undefined' && (
  /[?&]mode=wall/.test(window.location.search) || window.location.protocol === 'file:'
)

export default function App() {
  const [tab, setTab] = useState(WALL_ONLY ? 'wall' : 'chats')
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])
  const [toast, setToast] = useState(null)
  const [dismissErr, setDismissErr] = useState(false)
  const say = useCallback((t) => { setToast(t); setTimeout(() => setToast(null), 2600) }, [])

  const [settings] = useState(() => loadSettings())
  useEffect(() => { applySettings(loadSettings()) }, [tick])

  // ---------- bloqueo con código ----------
  const [locked, setLocked] = useState(() => !!loadSettings().pin)

  // ---------- Telegram ----------
  const tgu = useTgUser()
  const [tgTok, setTgTok] = useState(() => tgSession()?.token || null)
  useEffect(() => { setTgTok(tgSession()?.token || null) }, [tick])
  const T = useTelegram(tgTok)

  // ---------- Mastodon ----------
  const [ms, setMs] = useState(() => session())
  const [account, setAccount] = useState(null)
  const [mPosts, setMPosts] = useState([])
  const [mPublic, setMPublic] = useState([])
  const [convos, setConvos] = useState([])
  const [mLoading, setMLoading] = useState(false)
  const [mError, setMError] = useState(null)

  useEffect(() => { completeLoginFromUrl().then((r) => { if (r) { setMs(r); refresh() } }).catch(() => {}) }, [refresh])
  useEffect(() => { setMs(session()) }, [tick])

  const loadMasto = useCallback(async () => {
    const s = session()
    if (!s) { setAccount(null); setMPosts([]); setConvos([]); return }
    setMLoading(true); setMError(null)
    try {
      const [acc, home] = await Promise.all([masto.verify(s), masto.home(s)])
      setAccount(acc); setMPosts(home.map(toUnified))
      masto.conversations(s).then(setConvos).catch(() => {})
      masto.publicTl(s).then((p) => setMPublic(p.map(toUnified))).catch(() => {})
    } catch (e) { setMError(e.message) }
    setMLoading(false)
  }, [])
  useEffect(() => { loadMasto() }, [loadMasto, ms?.token])

  // ---------- acceso ----------
  const firstRun = !WALL_ONLY && !tgu.me && !ms && tgu.ready
  const [showLogin, setShowLogin] = useState(false)
  const [skipped, setSkipped] = useState(false)
  useEffect(() => { if (tgu.me) { setShowLogin(false); setSkipped(false) } }, [tgu.me])

  // Enlaces del contenido: siempre dentro de la app, nunca al navegador externo.
  // (Este hook debe vivir antes de cualquier return condicional.)
  useEffect(() => {
    const handler = (e) => {
      const a = e.target.closest?.('a[href]')
      if (!a) return
      const href = a.getAttribute('href') || ''
      if (/^https?:/i.test(href)) { e.preventDefault(); openInApp(href) }
    }
    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [])

  // ---------- conversaciones ----------
  const conversations = useMemo(() => {
    const kindOf = (d) => (d.isChannel ? 'channel' : d.isGroup ? 'group' : d.isBot ? 'bot' : 'user')
    const tgList = tgu.dialogs.map((d) => {
      const local = tgu.chats[d.id]
      return {
        key: 'u_' + d.id, source: 'tg', dialog: d, kind: d.isSelf ? 'user' : kindOf(d),
        saved: d.isSelf, title: d.title, avatar: d.avatar, network: 'telegram',
        subtitle: d.isSelf ? 'tus notas privadas' : d.isChannel ? 'canal' : d.isGroup ? 'grupo' : d.isBot ? 'bot' : (d.username ? '@' + d.username : 'chat'),
        showAuthors: d.isGroup || d.isChannel,
        preview: local?.messages?.slice(-1)[0]?.text ?? d.last?.text,
        outLast: local?.messages?.slice(-1)[0]?.out ?? d.last?.out,
        date: local?.messages?.slice(-1)[0]?.date ?? d.last?.date,
        unread: d.unread, muted: d.muted, pinned2: d.pinned, archived: d.archived,
        verified: d.verified, pinned: local?.pinned || null,
        messages: local?.messages || [],
      }
    })
    const botList = Object.values(T.chats).map((c) => ({
      key: 'b_' + c.id, source: 'bot', id: c.id, kind: 'bot', title: c.title, avatar: c.avatar,
      network: 'telegram', subtitle: 'vía tu bot', preview: c.messages.slice(-1)[0]?.text,
      date: c.messages.slice(-1)[0]?.date, messages: c.messages, unread: 0,
    }))
    const mastoList = convos.map((c) => ({
      key: 'm_' + c.id, source: 'masto', statusId: c.last_status?.id, kind: 'masto',
      title: c.accounts.map((a) => a.display_name || a.username).join(', ') || 'Conversación',
      avatar: c.accounts[0]?.avatar, network: 'mastodon', subtitle: 'mensaje directo · ' + (ms?.host || 'fediverso'),
      preview: (c.last_status?.content || '').replace(/<[^>]+>/g, ''), date: c.last_status?.created_at,
      unread: c.unread ? 1 : 0,
      messages: c.last_status ? [{ id: c.last_status.id, out: false, from: '@' + (c.accounts[0]?.acct || ''), html: c.last_status.content, date: c.last_status.created_at }] : [],
    }))
    return [...tgList, ...botList, ...mastoList].sort((a, b) =>
      (b.saved ? 1 : 0) - (a.saved ? 1 : 0) || (b.pinned2 ? 1 : 0) - (a.pinned2 ? 1 : 0) || new Date(b.date || 0) - new Date(a.date || 0))
  }, [tgu.dialogs, tgu.chats, T.chats, convos, ms?.host])

  const posts = useMemo(
    () => [...mPosts, ...tgu.posts, ...T.posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [mPosts, tgu.posts, T.posts]
  )
  const [wallFilter, setWallFilter] = useState('all')

  // ---------- navegación ----------
  const [openConv, setOpenConv] = useState(null)
  const [composing, setComposing] = useState(false)
  const [fwd, setFwd] = useState(null)   // { from, ids }
  const [info, setInfo] = useState(null) // conv con info abierta
  const [newChat, setNewChat] = useState(false)
  const cur = openConv ? conversations.find((c) => c.key === openConv) : null

  const open = (c) => { setOpenConv(c.key); if (c.source === 'tg') tgu.openChat(c.dialog).catch((e) => say(e.message)) }

  const sendMsg = async (c, text, opts = {}) => {
    if (c.source === 'tg') return tgu.send(c.dialog, text, opts)
    if (c.source === 'bot') return T.send(c.id, text)
    await masto.post(session(), { status: text, in_reply_to_id: c.statusId, visibility: 'direct' })
    masto.conversations(session()).then(setConvos)
  }

  const composeTargets = useMemo(() => ([
    ...tgu.dialogs.filter((d) => d.isSelf || d.isChannel || d.isGroup || d.isUser).slice(0, 60).map((d) => ({
      id: 'u:' + d.id, title: d.title, avatar: d.avatar, saved: d.isSelf,
      sub: d.isSelf ? 'guardar nota' : d.isChannel ? 'canal' : d.isGroup ? 'grupo' : 'chat',
    })),
    ...Object.values(T.chats).map((c) => ({ id: 'b:' + c.id, title: c.title, sub: 'vía bot' })),
  ]), [tgu.dialogs, T.chats])

  const publish = async ({ text, toM, target, vis }) => {
    const jobs = []
    if (toM) jobs.push(masto.post(session(), { status: text, visibility: vis }))
    if (target?.startsWith('u:')) {
      const d = tgu.dialogs.find((x) => x.id === target.slice(2))
      if (d) jobs.push(tgu.send(d, text))
    } else if (target?.startsWith('b:')) jobs.push(T.send(target.slice(2), text))
    await Promise.all(jobs)
    say('Publicado ✓')
    setTimeout(loadMasto, 900)
  }

  const onFav = async (p) => {
    if (p.network !== 'mastodon') return
    setMPosts((l) => l.map((x) => x.id === p.id ? { ...x, favourited: !x.favourited, stats: { ...x.stats, favs: x.stats.favs + (x.favourited ? -1 : 1) } } : x))
    try { await masto.favourite(session(), p.raw.id, !p.favourited) } catch (e) { say(e.message) }
  }
  const onBoost = async (p) => {
    if (p.network !== 'mastodon') return
    setMPosts((l) => l.map((x) => x.id === p.id ? { ...x, reblogged: !x.reblogged, stats: { ...x.stats, boosts: x.stats.boosts + (x.reblogged ? -1 : 1) } } : x))
    try { await masto.boost(session(), p.raw.id, !p.reblogged) } catch (e) { say(e.message) }
  }
  const openSource = (p) => {
    if (p.network === 'telegram' && p.peerRef) {
      const c = conversations.find((x) => x.dialog?.id === String(p.peerRef))
      if (c) return open(c)
    }
    if (p.url) openInApp(p.url)
  }

  const stats = {
    dialogs: tgu.dialogs.length,
    channels: tgu.dialogs.filter((d) => d.isChannel).length,
    bots: tgu.dialogs.filter((d) => d.isBot).length,
    posts: posts.length,
    mastoConvos: convos.length,
  }

  // ---------- pantallas de entrada ----------
  if (locked) return <LockScreen onOk={() => setLocked(false)} />

  if (!tgu.ready) {
    return <div className="frame"><div className="center" style={{ alignItems: 'center' }}>
      <div className="mark" style={{ width: 92, height: 92, borderRadius: 28, background: 'var(--grad)', display: 'grid', placeItems: 'center' }}><I.fusion width="42" height="42" /></div>
      <p className="note" style={{ marginTop: 20 }}>Abriendo Fusion…</p>
    </div></div>
  }

  if (showLogin || (firstRun && !skipped)) {
    return <Login
      onDone={async () => { await tgu.reload(); setShowLogin(false); setSkipped(false); setTab('chats'); refresh() }}
      onSkip={() => { setShowLogin(false); setSkipped(true); setTab(session() ? 'wall' : 'profile') }} />
  }

  const title = { wall: 'Muro', chats: 'Chats', explore: 'Explorar', profile: 'Perfil' }[tab]
  const sub = {
    wall: `${posts.length} publicaciones · canales + fediverso`,
    chats: tgu.me ? `${conversations.length} conversaciones` : 'conecta Telegram para ver tus chats',
    explore: ms ? 'línea federada' : 'conecta Mastodon',
    profile: 'cuentas, apariencia y privacidad',
  }[tab]

  return (
    <div className="frame">
      <div className="hdr">
        <div style={{ width: 6 }} />
        <div style={{ flex: 1 }}><h1 style={{ margin: 0 }}>{title}<span className="sub">{sub}</span></h1></div>
        {tab !== 'profile' && <div className="iconbtn" onClick={() => { tgu.reload(); loadMasto(); say('Sincronizando…') }}><I.refresh width="19" height="19" /></div>}
        {tgu.me && <Avatar src={tgu.me.avatar} name={tgu.me.name} id={tgu.me.id} size={32} style={{ marginRight: 6 }} />}
      </div>

      {tab === 'wall' && (
        <Wall posts={posts} loading={tgu.loading || mLoading} filter={wallFilter} setFilter={setWallFilter}
          onFav={onFav} onBoost={onBoost} onOpenSource={openSource} tgOn={!!tgu.me} mastoOn={!!ms} />
      )}

      {tab === 'chats' && (
        tgu.me || conversations.length ? (
          <Chats items={conversations} folders={tgu.folders} loading={tgu.loading} onOpen={open} tgu={tgu} say={say}
            onNew={() => setNewChat(true)} />
        ) : (
          <div className="body"><Empty icon={I.chat} title="Aún sin chats"
            text="Entra con tu cuenta de Telegram y verás aquí mensajes guardados, chats, grupos, canales y bots."
            action={<button className="btn grad" style={{ marginTop: 18, maxWidth: 260 }} onClick={() => setShowLogin(true)}>Entrar en Telegram</button>} />
          </div>
        )
      )}

      {tab === 'explore' && <Explore ms={ms} posts={mPublic} onFav={onFav} onBoost={onBoost} say={say} />}

      {tab === 'profile' && (
        <Profile tgu={tgu} ms={ms} account={account} bot={T.bot} stats={stats} say={say}
          onChanged={() => { refresh(); loadMasto() }} onLoginTelegram={() => setShowLogin(true)} />
      )}

      {tab === 'wall' && (tgu.me || ms) && (
        <div className="fab" onClick={() => setComposing(true)}><I.pencil width="22" height="22" /></div>
      )}
      {tab === 'chats' && tgu.me && (
        <div className="fab" onClick={() => setNewChat(true)}><I.pencil width="22" height="22" /></div>
      )}

      <div className="tabbar" style={WALL_ONLY ? { gridTemplateColumns: 'repeat(3, 1fr)' } : undefined}>
        {TABS.filter((t) => !WALL_ONLY || t.id !== 'chats').map((t) => {
          const unread = conversations.reduce((a, c) => a + (c.unread || 0), 0)
          return (
            <div key={t.id} className={'tab ' + (tab === t.id ? 'on' : '')} onClick={() => setTab(t.id)}>
              <t.icon width="22" height="22" />
              <span>{t.label}</span>
              {t.id === 'chats' && unread > 0 && <span className="cnt">{Math.min(99, unread)}</span>}
            </div>
          )
        })}
      </div>

      {cur && (
        <Chat conv={cur} tgu={tgu} say={say} onBack={() => setOpenConv(null)} onSend={sendMsg}
          onForwardRequest={(from, ids) => setFwd({ from, ids })}
          onOpenInfo={(c) => c.source === 'tg' && setInfo(c.key)} />
      )}

      {fwd && (
        <ForwardSheet fwd={fwd} dialogs={tgu.dialogs} tgu={tgu} say={say} onClose={() => setFwd(null)} />
      )}

      {info && (() => {
        const c = conversations.find((x) => x.key === info)
        return c ? <ChatInfo conv={c} tgu={tgu} say={say} onBack={() => setInfo(null)} onOpenChat={() => { setInfo(null); open(c) }} /> : null
      })()}

      {newChat && (
        <NewChat tgu={tgu} say={say} onClose={() => setNewChat(false)}
          onPick={async (p) => {
            setNewChat(false)
            const existing = conversations.find((c) => c.dialog?.id === p.id)
            if (existing) return open(existing)
            const d = { id: p.id, peer: p.peer, title: p.name, isUser: !p.isChannel && !p.bot, isBot: !!p.bot, isChannel: !!p.isChannel, unread: 0, last: null }
            tgu.addDialog(d)
            setOpenConv('u_' + p.id)
            tgu.openChat(d).catch((e) => say(e.errorMessage || e.message))
          }} />
      )}

      {composing && <Compose targets={composeTargets} mastoOn={!!ms} onClose={() => setComposing(false)} onPublish={publish} />}

      {(tgu.error || mError) && tab !== 'profile' && !dismissErr && (
        <div className="toast" style={{ background: 'rgba(190,60,60,.96)' }}
          onClick={() => { navigator.clipboard?.writeText(String(tgu.error || mError)).catch(() => {}); setDismissErr(true); say('Error copiado') }}>
          {tgu.error || mError}
          <div style={{ fontSize: 11, opacity: .8, marginTop: 6 }}>toca para copiar y ocultar</div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

/* ---------------- reenviar a otro chat ---------------- */
function ForwardSheet({ fwd, dialogs, tgu, say, onClose }) {
  const [q, setQ] = useState('')
  const [dropAuthor, setDropAuthor] = useState(false)
  const [busy, setBusy] = useState(false)
  const list = dialogs.filter((d) => !q.trim() || d.title.toLowerCase().includes(q.toLowerCase())).slice(0, 40)

  const go = async (d) => {
    setBusy(true)
    try {
      await tgu.forward(fwd.from.dialog, fwd.ids, d, { dropAuthor })
      say(`Reenviado a ${d.title}`)
      onClose()
    } catch (e) { say(e.errorMessage || e.message) }
    setBusy(false)
  }

  return (
    <>
      <div className="sheet-bg" onClick={onClose} />
      <div className="sheet">
        <div className="grab" />
        <h3>Reenviar {fwd.ids.length} mensaje{fwd.ids.length > 1 ? 's' : ''}</h3>
        <div className="item" style={{ padding: '10px 0' }}>
          <div className="t">Ocultar el remitente<small>se envía sin “reenviado de”</small></div>
          <div className={'switch ' + (dropAuthor ? 'on' : '')} onClick={() => setDropAuthor(!dropAuthor)}><i /></div>
        </div>
        <input className="inp" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar destino…" />
        <div style={{ maxHeight: 320, overflowY: 'auto', marginTop: 8 }}>
          {list.map((d) => (
            <div className="selrow" key={d.id} onClick={() => !busy && go(d)}>
              <Avatar src={d.avatar} name={d.title} id={d.id} size={42} saved={d.isSelf} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</div>
                <div style={{ fontSize: 12.2, color: 'var(--dim2)' }}>{d.isSelf ? 'mensajes guardados' : d.isChannel ? 'canal' : d.isGroup ? 'grupo' : 'chat'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

/* ---------------- bloqueo con código ---------------- */
function LockScreen({ onOk }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState(false)
  const real = loadSettings().pin

  const push = (d) => {
    const next = (pin + d).slice(0, 4)
    setPin(next); setErr(false)
    if (next.length === 4) {
      setTimeout(() => {
        if (next === real) onOk()
        else { setErr(true); setPin(''); navigator.vibrate?.(60) }
      }, 120)
    }
  }

  return (
    <div className="frame">
      <div className="center" style={{ alignItems: 'center' }}>
        <div className="mark" style={{ width: 76, height: 76, borderRadius: 24, background: 'var(--grad)', display: 'grid', placeItems: 'center' }}>
          <I.lock width="32" height="32" />
        </div>
        <h1 style={{ fontSize: 20, margin: '18px 0 4px' }}>Fusion está bloqueada</h1>
        <p className="note" style={{ marginTop: 0 }}>{err ? 'Código incorrecto' : 'Introduce tu código'}</p>
        <div className="pindots">{[0, 1, 2, 3].map((i) => <i key={i} className={pin.length > i ? 'on' : ''} />)}</div>
        <div className="pinpad" style={{ width: '100%', maxWidth: 300 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <button key={n} onClick={() => push(String(n))}>{n}</button>)}
          <button style={{ visibility: 'hidden' }} />
          <button onClick={() => push('0')}>0</button>
          <button onClick={() => setPin(pin.slice(0, -1))}>⌫</button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- explorar ---------------- */
function Explore({ ms, posts, onFav, onBoost, say }) {
  const [q, setQ] = useState('')
  const [res, setRes] = useState(null)
  const [busy, setBusy] = useState(false)

  const go = async () => {
    if (!ms) return say('Conecta Mastodon primero')
    if (!q.trim()) return setRes(null)
    setBusy(true)
    try { setRes(await masto.search(ms, q.trim())) } catch (e) { say(e.message) }
    setBusy(false)
  }

  return (
    <>
      <div className="search">
        <I.search width="17" height="17" style={{ color: 'var(--dim2)' }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} placeholder="Buscar en el fediverso…" />
        {busy && <span className="spin" />}
      </div>
      <div className="body">
        {!ms && <Empty icon={I.globe} title="Explora el fediverso" text="Añade tu cuenta de Mastodon desde Perfil para buscar personas, etiquetas y publicaciones." />}
        {res?.accounts?.map((a) => (
          <div className="row" key={a.id} onClick={() => openInApp(a.url)}>
            <Avatar src={a.avatar} name={a.display_name || a.username} id={a.id} size={50} network="mastodon" />
            <div style={{ minWidth: 0 }}>
              <div className="name">{a.display_name || a.username}</div>
              <div className="prev">@{a.acct} · {a.followers_count} seguidores</div>
            </div>
            <div />
          </div>
        ))}
        {(res?.statuses || (!res ? posts : [])).map((s) => {
          const p = res ? toUnified(s) : s
          return (
            <article className="post" key={p.id}>
              <div className="phead">
                <Avatar src={p.author.avatar} name={p.author.name} id={p.author.handle} size={44} network="mastodon" />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="nm">{p.author.name}</div>
                  <div className="mt"><span>{p.author.handle}</span>·<span>{timeAgo(p.createdAt)}</span></div>
                </div>
              </div>
              <div className="ptxt txt" dangerouslySetInnerHTML={{ __html: p.html }} />
              {!!p.media?.length && <div className="pmedia">{p.media.map((m, i) => <img key={i} src={m.url} alt="" loading="lazy" />)}</div>}
              <div className="pacts">
                <button className={'pact bo ' + (p.reblogged ? 'on' : '')} onClick={() => onBoost(p)}><I.boost /> {p.stats.boosts || ''}</button>
                <button className={'pact ' + (p.favourited ? 'on' : '')} onClick={() => onFav(p)}><I.heart /> {p.stats.favs || ''}</button>
              </div>
            </article>
          )
        })}
        {ms && !res && !posts.length && <Spinner label="Cargando la línea federada…" />}
        <div style={{ height: 80 }} />
      </div>
    </>
  )
}
