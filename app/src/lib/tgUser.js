// Telegram con CUENTA PERSONAL REAL (MTProto vía GramJS sobre WebSocket).
// Igual que hacen Telegram Web / Nicegram: teléfono -> código -> (2FA) -> sesión.
// Todo ocurre en el dispositivo; la sesión se guarda cifrada en almacenamiento local.

// GramJS se carga bajo demanda para que la app arranque ligera y un fallo
// del motor MTProto nunca tumbe toda la interfaz.
let G = null
async function lib() {
  if (!G) {
    // Blindaje: una sola clase Buffer antes de cargar MTProto.
    const { Buffer: B } = await import('buffer')
    if (globalThis.Buffer !== B) globalThis.Buffer = B
    // OJO: telegram/events solo exporta NewMessage; los otros eventos viven en
    // sus propios módulos (por eso antes salía "n is not a constructor").
    const [tlib, sess, pwdm, ev, evEdit, evDel] = await Promise.all([
      import('telegram'), import('telegram/sessions'), import('telegram/Password'),
      import('telegram/events'),
      import('telegram/events/EditedMessage'),
      import('telegram/events/DeletedMessage'),
    ])
    G = {
      TelegramClient: tlib.TelegramClient, Api: tlib.Api, StringSession: sess.StringSession,
      computeCheck: pwdm.computeCheck, NewMessage: ev.NewMessage,
      EditedMessage: evEdit.EditedMessage, DeletedMessage: evDel.DeletedMessage,
    }
  }
  return G
}

const LS = { session: 'fx.tgu.session', api: 'fx.tgu.api', keyi: 'fx.tgu.keyi' }

// Claves de aplicación incrustadas, como hacen todos los forks de Telegram.
// El usuario solo pone su número. Si Telegram rechaza una clave por saturación
// (API_ID_PUBLISHED_FLOOD), se rota automáticamente a la siguiente.
const BUILTIN_KEYS = [
  { apiId: 2496, apiHash: '8da85b0d5bfe62527e5b244c209159c3', name: 'Web K' },
  { apiId: 17349, apiHash: '344583e45741c457fe1862106095a5eb', name: 'Desktop' },
  { apiId: 611335, apiHash: 'd524b414d21f4d37f08684c1df41ac9c', name: 'CLI' },
  { apiId: 6, apiHash: 'eb06d4abfb49dc3eeb1aeb98ae0f581e', name: 'Alt' },
  { apiId: 4, apiHash: '014b35b6184100b085b0d0572f9b5103', name: 'Android' },
]

export function keyIndex() { return Number(localStorage.getItem(LS.keyi) || 0) % BUILTIN_KEYS.length }
export function currentKeyName() { return customCreds() ? 'propias' : BUILTIN_KEYS[keyIndex()].name }
export function rotateKey() {
  const next = (keyIndex() + 1) % BUILTIN_KEYS.length
  localStorage.setItem(LS.keyi, String(next))
  client = null
  return BUILTIN_KEYS[next]
}
export function keyCount() { return BUILTIN_KEYS.length }

function customCreds() {
  try { return JSON.parse(localStorage.getItem(LS.api) || 'null') } catch { return null }
}

// Siempre devuelve credenciales válidas: las propias si el usuario las puso,
// si no las incrustadas.
export function getApiCreds() {
  return customCreds() || BUILTIN_KEYS[keyIndex()]
}
export function usingOwnKeys() { return !!customCreds() }
export function clearApiCreds() { localStorage.removeItem(LS.api); client = null }
export function setApiCreds(apiId, apiHash) {
  localStorage.setItem(LS.api, JSON.stringify({ apiId: Number(apiId), apiHash: String(apiHash).trim() }))
}
export function savedSession() { return localStorage.getItem(LS.session) || '' }
export function clearUserSession() { localStorage.removeItem(LS.session) }

let client = null
let phoneCodeHash = null
let currentPhone = null

export function getClient() { return client }

export async function ensureClient() {
  if (client && client.connected) return client
  const creds = getApiCreds()
  if (!creds) throw new Error('Falta api_id / api_hash (Ajustes → Telegram)')
  const { TelegramClient, StringSession } = await lib()
  const session = new StringSession(savedSession())
  client = new TelegramClient(session, creds.apiId, creds.apiHash, {
    connectionRetries: 5,
    useWSS: true,
    autoReconnect: true,
    deviceModel: 'Fusion Android',
    systemVersion: 'Android',
    appVersion: '1.0',
    langCode: 'es',
  })
  client.setLogLevel('error')
  await client.connect()
  return client
}

const KEY_ERRORS = ['API_ID_PUBLISHED_FLOOD', 'API_ID_INVALID', 'API_ID_RESTRICTED', 'AUTH_KEY_UNREGISTERED']

export async function sendCode(phone) {
  currentPhone = phone.trim()
  let lastErr = null
  const tries = usingOwnKeys() ? 1 : keyCount()
  for (let i = 0; i < tries; i++) {
    try {
      const c = await ensureClient()
      const creds = getApiCreds()
      const res = await c.sendCode({ apiId: creds.apiId, apiHash: creds.apiHash }, currentPhone)
      phoneCodeHash = res.phoneCodeHash
      return res
    } catch (e) {
      lastErr = e
      const msg = String(e.errorMessage || e.message || '')
      if (!usingOwnKeys() && KEY_ERRORS.some((k) => msg.includes(k))) {
        try { await client?.disconnect() } catch { /* noop */ }
        client = null
        rotateKey()
        continue
      }
      throw e
    }
  }
  throw lastErr
}

export async function signIn(code) {
  const c = await ensureClient()
  const { Api } = await lib()
  try {
    await c.invoke(new Api.auth.SignIn({
      phoneNumber: currentPhone, phoneCodeHash, phoneCode: String(code).trim(),
    }))
  } catch (e) {
    if (String(e.errorMessage || e.message).includes('SESSION_PASSWORD_NEEDED')) {
      const err = new Error('2FA')
      err.needPassword = true
      throw err
    }
    throw e
  }
  persist(c)
  return c.getMe()
}

export async function signInWith2FA(password) {
  const c = await ensureClient()
  const { Api, computeCheck } = await lib()
  const pwd = await c.invoke(new Api.account.GetPassword())

  // Bug de GramJS: computeCheck lee `srp_B` (snake_case) pero el objeto que
  // devuelve el servidor expone `srpB`. Sin este puente, el login con
  // verificación en dos pasos falla siempre con "Undefined srp_b".
  if (!pwd.srp_B && pwd.srpB) pwd.srp_B = pwd.srpB
  if (!pwd.srpB && pwd.srp_B) pwd.srpB = pwd.srp_B
  if (!pwd.srp_B) throw new Error('Telegram no envió el desafío SRP. Reintenta el inicio de sesión desde el número.')

  const srp = await computeCheck(pwd, password)
  await c.invoke(new Api.auth.CheckPassword({ password: srp }))
  persist(c)
  return c.getMe()
}

function persist(c) {
  localStorage.setItem(LS.session, c.session.save())
}

export async function isAuthorized() {
  if (!savedSession() || !getApiCreds()) return false
  try {
    const c = await ensureClient()
    return await c.isUserAuthorized()
  } catch { return false }
}

export async function logoutUser() {
  const { Api } = await lib()
  try { if (client) { await client.invoke(new Api.auth.LogOut()); await client.disconnect() } } catch { /* noop */ }
  clearUserSession(); client = null
}

// ---------- datos ----------
const photoCache = new Map()

export async function avatarUrl(entity) {
  const key = String(entity.id)
  if (photoCache.has(key)) return photoCache.get(key)
  photoCache.set(key, null)
  try {
    const buf = await client.downloadProfilePhoto(entity, { isBig: false })
    if (buf && buf.length) {
      const url = URL.createObjectURL(new Blob([buf], { type: 'image/jpeg' }))
      photoCache.set(key, url)
      return url
    }
  } catch { /* noop */ }
  return null
}

export function entityName(e) {
  if (!e) return 'Desconocido'
  return e.title || [e.firstName, e.lastName].filter(Boolean).join(' ') || e.username || String(e.id)
}

export async function getDialogs(limit = 60) {
  const c = await ensureClient()
  const me = await c.getMe()
  const dialogs = await c.getDialogs({ limit })
  const out = dialogs.map((d) => {
    const e = d.entity || {}
    const isSelf = String(e.id) === String(me.id)
    return {
      id: String(d.id),
      peer: d.entity,
      title: isSelf ? 'Mensajes guardados' : entityName(e),
      isChannel: !!e.broadcast,
      isGroup: !!(e.megagroup || (d.isGroup && !e.broadcast)),
      isUser: !!d.isUser && !e.bot,
      isBot: !!e.bot,
      isSelf,
      verified: !!e.verified,
      pinned: !!d.pinned,
      muted: !!d.dialog?.notifySettings?.muteUntil,
      unread: d.unreadCount || 0,
      last: d.message
        ? { text: d.message.message || (d.message.media ? '📎 Adjunto' : ''), date: new Date(d.message.date * 1000).toISOString(), out: !!d.message.out }
        : null,
      username: e.username || null,
    }
  })
  // Mensajes guardados siempre presente y arriba
  if (!out.some((d) => d.isSelf)) {
    out.unshift({ id: String(me.id), peer: 'me', title: 'Mensajes guardados', isSelf: true, isUser: false, unread: 0, last: null, pinned: true })
  }
  return out.sort((a, b) => (b.isSelf ? 1 : 0) - (a.isSelf ? 1 : 0) || (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.last?.date || 0) - new Date(a.last?.date || 0))
}

export async function channelFeed(dialogs, perChannel = 8) {
  const c = await ensureClient()
  const chans = dialogs.filter((d) => d.isChannel).slice(0, 12)
  const out = []
  for (const ch of chans) {
    try {
      const msgs = await c.getMessages(ch.peer, { limit: perChannel })
      for (const m of msgs) {
        if (!m.message && !m.media) continue
        out.push(msgToUnified(m, ch))
      }
    } catch { /* noop */ }
  }
  return out
}

export function msgToUnified(m, ch) {
  const text = m.message || (m.media ? '[contenido multimedia]' : '')
  return {
    id: 'tgu_' + ch.id + '_' + m.id,
    network: 'telegram',
    author: {
      name: ch.title,
      handle: ch.username ? '@' + ch.username : 'canal privado',
      avatar: ch.avatar || null,
      url: ch.username ? `https://t.me/${ch.username}` : null,
    },
    html: escapeHtml(text).replace(/\n/g, '<br/>'),
    createdAt: new Date(m.date * 1000).toISOString(),
    media: [],
    stats: { replies: m.replies?.replies || 0, boosts: m.forwards || 0, favs: m.views || 0 },
    url: ch.username ? `https://t.me/${ch.username}/${m.id}` : null,
    peerRef: ch.id,
    msgId: m.id,
  }
}

export async function getHistory(peer, limit = 60) {
  const c = await ensureClient()
  const msgs = await c.getMessages(peer, { limit })
  return msgs.reverse().map(mapMessage)
}

export function mapMessage(m) {
  const media = mediaInfo(m.media)
  return {
    id: m.id,
    out: !!m.out,
    from: m.out ? 'tú' : (entityName(m.sender) || ''),
    senderId: String(m.senderId || ''),
    text: m.message || (media ? '' : ''),
    date: new Date(m.date * 1000).toISOString(),
    edited: !!m.editDate,
    pinned: !!m.pinned,
    replyTo: m.replyTo?.replyToMsgId || null,
    fwdFrom: m.fwdFrom ? (m.fwdFrom.fromName || entityName(m.fwdFrom.fromId) || 'reenviado') : null,
    views: m.views || 0,
    media,
  }
}

export async function sendTo(peer, text, opts = {}) {
  const c = await ensureClient()
  return c.sendMessage(peer, { message: text, ...(opts.replyTo ? { replyTo: opts.replyTo } : {}), ...(opts.silent ? { silent: true } : {}) })
}

export async function onEdited(cb) {
  const c = await ensureClient()
  const { EditedMessage } = await lib()
  if (typeof EditedMessage !== 'function') return () => {}
  const handler = async (event) => {
    try {
      const m = event.message
      const chat = await m.getChat().catch(() => null)
      cb(String(chat?.id ?? m.chatId), { id: m.id, text: m.message || '' })
    } catch { /* noop */ }
  }
  c.addEventHandler(handler, new EditedMessage({}))
  return () => c.removeEventHandler(handler, new EditedMessage({}))
}

export async function onDeleted(cb) {
  const c = await ensureClient()
  const { DeletedMessage } = await lib()
  if (typeof DeletedMessage !== 'function') return () => {}
  const handler = async (event) => {
    try {
      const chat = await event.getChat?.().catch(() => null)
      cb(chat ? String(chat.id) : null, event.deletedIds || [])
    } catch { cb(null, event.deletedIds || []) }
  }
  c.addEventHandler(handler, new DeletedMessage({}))
  return () => c.removeEventHandler(handler, new DeletedMessage({}))
}

export async function onNewMessage(cb) {
  const c = await ensureClient()
  const { NewMessage } = await lib()
  const handler = async (event) => {
    try {
      const m = event.message
      const chat = await m.getChat()
      cb({
        chatId: String(chat?.id ?? m.chatId),
        title: entityName(chat),
        isChannel: !!chat?.broadcast,
        peer: chat,
        message: {
          id: m.id, out: !!m.out,
          from: m.out ? 'tú' : entityName(await m.getSender().catch(() => null)),
          text: m.message || '[media]',
          date: new Date(m.date * 1000).toISOString(),
        },
      })
    } catch { /* noop */ }
  }
  c.addEventHandler(handler, new NewMessage({}))
  return () => c.removeEventHandler(handler, new NewMessage({}))
}

export function escapeHtml(s = '') {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
}

// ==========================================================================
//  Acciones avanzadas de cliente (estilo iMe / Turrit) — todas gratis
// ==========================================================================

export async function deleteMessages(peer, ids, revoke = true) {
  const c = await ensureClient()
  return c.deleteMessages(peer, ids, { revoke })
}

export async function forwardMessages(fromPeer, ids, toPeer, opts = {}) {
  const c = await ensureClient()
  const { Api } = await lib()
  return c.invoke(new Api.messages.ForwardMessages({
    fromPeer, toPeer, id: ids,
    randomId: ids.map(() => BigInt(Math.floor(Math.random() * 1e18))),
    dropAuthor: !!opts.dropAuthor,
    dropMediaCaptions: !!opts.dropCaptions,
    silent: !!opts.silent,
  }))
}

export async function editMessage(peer, id, text) {
  const c = await ensureClient()
  return c.editMessage(peer, { message: id, text })
}

export async function pinMessage(peer, id, unpin = false) {
  const c = await ensureClient()
  const { Api } = await lib()
  return c.invoke(new Api.messages.UpdatePinnedMessage({ peer, id, unpin, pmOneside: false }))
}

export async function markRead(peer) {
  const c = await ensureClient()
  try { return await c.markAsRead(peer) } catch { return null }
}

export async function muteChat(peer, seconds) {
  const c = await ensureClient()
  const { Api } = await lib()
  const muteUntil = seconds === 0 ? 0 : Math.floor(Date.now() / 1000) + seconds
  return c.invoke(new Api.account.UpdateNotifySettings({
    peer: new Api.InputNotifyPeer({ peer }),
    settings: new Api.InputPeerNotifySettings({ muteUntil }),
  }))
}

export async function togglePinDialog(peer, pinned) {
  const c = await ensureClient()
  const { Api } = await lib()
  const inputPeer = await c.getInputEntity(peer)
  return c.invoke(new Api.messages.ToggleDialogPin({ peer: new Api.InputDialogPeer({ peer: inputPeer }), pinned }))
}

export async function archiveChat(peer, archived = true) {
  const c = await ensureClient()
  const { Api } = await lib()
  const inputPeer = await c.getInputEntity(peer)
  return c.invoke(new Api.folders.EditPeerFolders({
    folderPeers: [new Api.InputFolderPeer({ peer: inputPeer, folderId: archived ? 1 : 0 })],
  }))
}

export async function clearHistory(peer, revoke = false) {
  const c = await ensureClient()
  const { Api } = await lib()
  const inputPeer = await c.getInputEntity(peer)
  return c.invoke(new Api.messages.DeleteHistory({ peer: inputPeer, maxId: 0, revoke, justClear: true }))
}

export async function leaveChat(peer, deleteAlso = false) {
  const c = await ensureClient()
  const { Api } = await lib()
  const input = await c.getInputEntity(peer)
  try {
    return await c.invoke(new Api.channels.LeaveChannel({ channel: input }))
  } catch {
    return c.invoke(new Api.messages.DeleteHistory({ peer: input, maxId: 0, revoke: deleteAlso, justClear: false }))
  }
}

export async function searchInChat(peer, query, limit = 50) {
  const c = await ensureClient()
  const res = await c.getMessages(peer, { search: query, limit })
  return res.map((m) => ({ id: m.id, out: !!m.out, text: m.message || '[adjunto]', date: new Date(m.date * 1000).toISOString() }))
}

export async function searchGlobal(query, limit = 30) {
  const c = await ensureClient()
  const { Api } = await lib()
  const res = await c.invoke(new Api.messages.SearchGlobal({
    q: query, filter: new Api.InputMessagesFilterEmpty(), minDate: 0, maxDate: 0,
    offsetRate: 0, offsetPeer: new Api.InputPeerEmpty(), offsetId: 0, limit,
  }))
  const chats = new Map([...(res.chats || []), ...(res.users || [])].map((e) => [String(e.id), e]))
  return (res.messages || []).map((m) => {
    const pid = String(m.peerId?.channelId || m.peerId?.chatId || m.peerId?.userId || '')
    const e = chats.get(pid)
    return {
      id: m.id, peerId: pid, peer: e, title: e ? entityName(e) : 'Chat',
      text: m.message || '[adjunto]', date: new Date(m.date * 1000).toISOString(), out: !!m.out,
    }
  })
}

export async function getFolders() {
  const c = await ensureClient()
  const { Api } = await lib()
  try {
    const res = await c.invoke(new Api.messages.GetDialogFilters())
    const arr = Array.isArray(res) ? res : (res.filters || [])
    return arr.filter((f) => f.className !== 'DialogFilterDefault').map((f) => ({
      id: f.id, title: typeof f.title === 'string' ? f.title : (f.title?.text || 'Carpeta'),
      peerIds: [...(f.includePeers || [])].map((p) => String(p.channelId || p.chatId || p.userId || '')),
      flags: { contacts: !!f.contacts, groups: !!f.groups, broadcasts: !!f.broadcasts, bots: !!f.bots },
    }))
  } catch { return [] }
}

export async function getSessions() {
  const c = await ensureClient()
  const { Api } = await lib()
  const res = await c.invoke(new Api.account.GetAuthorizations())
  return (res.authorizations || []).map((a) => ({
    hash: a.hash, current: !!a.current, device: a.deviceModel, platform: a.platform,
    app: `${a.appName} ${a.appVersion}`, country: a.country, ip: a.ip,
    active: new Date(a.dateActive * 1000).toISOString(),
  }))
}

export async function killSession(hash) {
  const c = await ensureClient()
  const { Api } = await lib()
  return c.invoke(new Api.account.ResetAuthorization({ hash }))
}

export async function getPinnedMessage(peer) {
  const c = await ensureClient()
  const { Api } = await lib()
  try {
    const res = await c.getMessages(peer, { limit: 1, filter: new Api.InputMessagesFilterPinned() })
    const m = res[0]
    return m ? { id: m.id, text: m.message || '[adjunto]' } : null
  } catch { return null }
}

// ---- multimedia ----
const mediaCache = new Map()
export function cachedMedia(key) { return mediaCache.get(key) || null }
export function mediaCacheSize() {
  let n = 0
  for (const v of mediaCache.values()) n += v?.size || 0
  return n
}
export function clearMediaCache() {
  for (const v of mediaCache.values()) { try { URL.revokeObjectURL(v.url) } catch { /* noop */ } }
  mediaCache.clear()
}

export async function downloadMedia(peer, messageId, key) {
  const c = await ensureClient()
  if (mediaCache.has(key)) return mediaCache.get(key).url
  const [msg] = await c.getMessages(peer, { ids: [messageId] })
  if (!msg?.media) return null
  const buf = await c.downloadMedia(msg, {})
  if (!buf) return null
  const mime = msg.document?.mimeType || 'image/jpeg'
  const blob = new Blob([buf], { type: mime })
  const url = URL.createObjectURL(blob)
  mediaCache.set(key, { url, size: blob.size, mime })
  return url
}

export function mediaInfo(m) {
  if (!m) return null
  if (m.voice || (m.document?.attributes || []).some((a) => a.className === 'DocumentAttributeAudio' && a.voice)) {
    const a = (m.document?.attributes || []).find((x) => x.className === 'DocumentAttributeAudio')
    return { kind: 'voice', label: 'Mensaje de voz', duration: a?.duration || 0 }
  }
  if (m.photo) return { kind: 'photo', label: 'Foto' }
  if (m.video || m.document?.mimeType?.startsWith('video')) return { kind: 'video', label: 'Video' }
  if (m.document?.mimeType?.startsWith('audio')) {
    const a = (m.document.attributes || []).find((x) => x.className === 'DocumentAttributeAudio')
    const name = (m.document.attributes || []).find((x) => x.fileName)?.fileName
    return { kind: 'audio', label: name || (a?.title ? `${a.performer || ''} ${a.title}`.trim() : 'Audio'), duration: a?.duration || 0 }
  }
  if (m.sticker) return { kind: 'sticker', label: 'Sticker' }
  if (m.document) return { kind: 'file', label: m.document.attributes?.find((a) => a.fileName)?.fileName || 'Archivo' }
  if (m.webpage) return { kind: 'link', label: 'Enlace' }
  return { kind: 'other', label: 'Adjunto' }
}

// ==========================================================================
//  Nivel 2: adjuntos, reacciones, info, contactos, grupos, exportación
// ==========================================================================

export async function sendFile(peer, file, caption = '', asPhoto = true) {
  const c = await ensureClient()
  const buf = Buffer.from(await file.arrayBuffer())
  buf.name = file.name || (asPhoto ? 'foto.jpg' : 'archivo')
  return c.sendFile(peer, {
    file: buf,
    caption,
    forceDocument: !asPhoto || !/^image\//.test(file.type),
    workers: 1,
  })
}

export async function sendReaction(peer, msgId, emoji) {
  const c = await ensureClient()
  const { Api } = await lib()
  return c.invoke(new Api.messages.SendReaction({
    peer, msgId, big: false, addToRecent: true,
    reaction: emoji ? [new Api.ReactionEmoji({ emoticon: emoji })] : [],
  }))
}

export async function markUnread(peer, unread = true) {
  const c = await ensureClient()
  const { Api } = await lib()
  const input = await c.getInputEntity(peer)
  return c.invoke(new Api.messages.MarkDialogUnread({ peer: new Api.InputDialogPeer({ peer: input }), unread }))
}

export async function blockUser(peer, block = true) {
  const c = await ensureClient()
  const { Api } = await lib()
  const id = await c.getInputEntity(peer)
  return c.invoke(block ? new Api.contacts.Block({ id }) : new Api.contacts.Unblock({ id }))
}

export async function chatInfo(peer) {
  const c = await ensureClient()
  const { Api } = await lib()
  const entity = await c.getEntity(peer)
  const out = {
    id: String(entity.id), title: entityName(entity), username: entity.username || null,
    phone: entity.phone || null, verified: !!entity.verified, scam: !!entity.scam,
    isChannel: !!entity.broadcast, isGroup: !!(entity.megagroup || entity.className === 'Chat'),
    isUser: entity.className === 'User', isBot: !!entity.bot, about: null, members: null, online: null,
  }
  try {
    if (out.isUser) {
      const full = await c.invoke(new Api.users.GetFullUser({ id: await c.getInputEntity(peer) }))
      out.about = full.fullUser?.about || null
      out.commonChats = full.fullUser?.commonChatsCount || 0
      out.blocked = !!full.fullUser?.blocked
    } else {
      const full = await c.invoke(new Api.channels.GetFullChannel({ channel: await c.getInputEntity(peer) }))
      out.about = full.fullChat?.about || null
      out.members = full.fullChat?.participantsCount || null
      out.online = full.fullChat?.onlineCount || null
    }
  } catch { /* algunos chats no exponen info completa */ }
  return out
}

export async function chatMembers(peer, limit = 40) {
  const c = await ensureClient()
  try {
    const parts = await c.getParticipants(peer, { limit })
    return parts.map((p) => ({ id: String(p.id), name: entityName(p), username: p.username || null, bot: !!p.bot, peer: p }))
  } catch { return [] }
}

export async function sharedMedia(peer, limit = 24) {
  const c = await ensureClient()
  const { Api } = await lib()
  try {
    const msgs = await c.getMessages(peer, { limit, filter: new Api.InputMessagesFilterPhotoVideo() })
    return msgs.map((m) => ({ id: m.id, date: new Date(m.date * 1000).toISOString(), kind: m.video ? 'video' : 'photo' }))
  } catch { return [] }
}

export async function searchPeople(query) {
  const c = await ensureClient()
  const { Api } = await lib()
  const out = []
  try {
    const res = await c.invoke(new Api.contacts.Search({ q: query, limit: 20 }))
    for (const u of [...(res.users || []), ...(res.chats || [])]) {
      out.push({ id: String(u.id), name: entityName(u), username: u.username || null, bot: !!u.bot, isChannel: !!u.broadcast, peer: u })
    }
  } catch { /* noop */ }
  return out
}

export async function myContacts() {
  const c = await ensureClient()
  const { Api } = await lib()
  try {
    const res = await c.invoke(new Api.contacts.GetContacts({ hash: BigInt(0) }))
    return (res.users || []).map((u) => ({ id: String(u.id), name: entityName(u), username: u.username || null, peer: u }))
  } catch { return [] }
}

export async function createGroup(title, users) {
  const c = await ensureClient()
  const { Api } = await lib()
  return c.invoke(new Api.messages.CreateChat({ title, users }))
}

export async function createChannel(title, about = '', broadcast = true) {
  const c = await ensureClient()
  const { Api } = await lib()
  return c.invoke(new Api.channels.CreateChannel({ title, about, broadcast, megagroup: !broadcast }))
}

export async function updateMyProfile({ firstName, lastName, about }) {
  const c = await ensureClient()
  const { Api } = await lib()
  return c.invoke(new Api.account.UpdateProfile({ firstName, lastName, about }))
}

export async function setUsername(username) {
  const c = await ensureClient()
  const { Api } = await lib()
  return c.invoke(new Api.account.UpdateUsername({ username }))
}

export function exportChatText(title, messages) {
  const lines = [`# ${title}`, `Exportado ${new Date().toLocaleString('es')}`, '']
  for (const m of messages) {
    const t = new Date(m.date).toLocaleString('es')
    lines.push(`[${t}] ${m.out ? 'Tú' : (m.from || 'Otro')}: ${m.text || (m.media ? '[' + m.media.label + ']' : '')}${m.deleted ? '  (eliminado)' : ''}`)
  }
  return lines.join('\n')
}

// ---- mensajes de voz ----
export async function sendVoice(peer, blob, seconds) {
  const c = await ensureClient()
  const { Api } = await lib()
  const buf = Buffer.from(await blob.arrayBuffer())
  buf.name = 'voz.ogg'
  return c.sendFile(peer, {
    file: buf,
    voiceNote: true,
    attributes: [new Api.DocumentAttributeAudio({
      voice: true, duration: Math.max(1, Math.round(seconds)), title: '', performer: '',
    })],
  })
}

export function mediaDuration(m) {
  const attrs = m?.document?.attributes || []
  const a = attrs.find((x) => x.className === 'DocumentAttributeAudio')
  return a?.duration || 0
}
