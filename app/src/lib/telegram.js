// Cliente Telegram 100% del lado del navegador usando la Bot API oficial.
// api.telegram.org responde con CORS abierto => no hace falta backend propio.
// El usuario pega el token de su bot (@BotFather). Los canales donde el bot es
// administrador alimentan el MURO; los chats privados/grupos alimentan CHATS.

const LS = { token: 'fx.tg.token', offset: 'fx.tg.offset', cache: 'fx.tg.cache' }

export function tgSession() {
  const token = localStorage.getItem(LS.token)
  return token ? { token } : null
}
export function tgSave(token) { localStorage.setItem(LS.token, token.trim()) }
export function tgLogout() {
  localStorage.removeItem(LS.token); localStorage.removeItem(LS.offset); localStorage.removeItem(LS.cache)
}

export async function tgCall(token, method, params = {}, signal) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal,
  })
  const data = await res.json().catch(() => ({ ok: false, description: 'respuesta inválida' }))
  if (!data.ok) throw new Error(`Telegram: ${data.description || res.status}`)
  return data.result
}

export const tg = {
  me: (t) => tgCall(t, 'getMe'),
  updates: (t, offset, signal) =>
    tgCall(t, 'getUpdates', { offset, timeout: 25, limit: 100, allowed_updates: ['message', 'channel_post', 'edited_channel_post', 'callback_query'] }, signal),
  send: (t, chat_id, text, reply_to_message_id) =>
    tgCall(t, 'sendMessage', { chat_id, text, ...(reply_to_message_id ? { reply_to_message_id } : {}) }),
  chat: (t, chat_id) => tgCall(t, 'getChat', { chat_id }),
  fileUrl: async (t, file_id) => {
    const f = await tgCall(t, 'getFile', { file_id })
    return `https://api.telegram.org/file/bot${t}/${f.file_path}`
  },
}

export function loadCache() {
  try { return JSON.parse(localStorage.getItem(LS.cache) || '{"posts":[],"chats":{}}') }
  catch { return { posts: [], chats: {} } }
}
export function saveCache(c) {
  const trimmed = {
    posts: c.posts.slice(0, 200),
    chats: Object.fromEntries(Object.entries(c.chats).map(([k, v]) => [k, { ...v, messages: v.messages.slice(-80) }])),
  }
  localStorage.setItem(LS.cache, JSON.stringify(trimmed))
}
export function getOffset() { return Number(localStorage.getItem(LS.offset) || 0) || undefined }
export function setOffset(o) { localStorage.setItem(LS.offset, String(o)) }

function initials(name = '?') {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase()
}
export function avatarFor(name, color = '#29A9EB') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="28" fill="${color}"/><text x="50%" y="56%" font-family="Inter,Arial" font-size="38" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="middle">${initials(name)}</text></svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

export function chanTitle(chat) {
  return chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.username || String(chat.id)
}

// Convierte un post de canal en item unificado del muro
export function postToUnified(msg) {
  const chat = msg.chat
  const text = msg.text || msg.caption || (msg.photo ? '📷 Foto' : msg.video ? '🎬 Video' : msg.document ? '📎 Archivo' : '')
  return {
    id: 'tg_' + chat.id + '_' + msg.message_id,
    network: 'telegram',
    author: {
      name: chanTitle(chat),
      handle: chat.username ? '@' + chat.username : 'canal privado',
      avatar: avatarFor(chanTitle(chat)),
      url: chat.username ? `https://t.me/${chat.username}` : null,
    },
    html: escapeHtml(text).replace(/\n/g, '<br/>'),
    createdAt: new Date(msg.date * 1000).toISOString(),
    media: [],
    _photo: msg.photo ? msg.photo[msg.photo.length - 1].file_id : null,
    stats: { replies: 0, boosts: msg.forward_signature ? 1 : 0, favs: msg.views || 0 },
    url: chat.username ? `https://t.me/${chat.username}/${msg.message_id}` : null,
    chatId: chat.id,
    messageId: msg.message_id,
  }
}

export function escapeHtml(s = '') {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
