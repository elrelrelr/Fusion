// Cliente Mastodon 100% del lado del navegador.
// Registra la app dinámicamente en la instancia del usuario (POST /api/v1/apps),
// hace OAuth authorization_code y guarda el token en localStorage.
// No requiere backend propio: los servidores de Mastodon envían CORS abierto.

const LS = {
  app: (host) => `fx.mastoapp.${host}`,
  token: 'fx.masto.token',
  host: 'fx.masto.host',
  pending: 'fx.masto.pending',
}

export const SCOPES = 'read write follow push'

export function normalizeHost(input) {
  let h = (input || '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  return h.toLowerCase()
}

export function isNative() {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())
}

export const APP_SCHEME = 'fusion://oauth'

export function redirectUri() {
  if (isNative()) return APP_SCHEME
  return window.location.origin + window.location.pathname
}

async function api(host, path, { method = 'GET', token, body, form } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  let payload
  if (form) {
    payload = new URLSearchParams(form)
  } else if (body) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const res = await fetch(`https://${host}${path}`, { method, headers, body: payload })
  if (!res.ok) {
    let detail = ''
    try { detail = (await res.json()).error || '' } catch { /* ignore */ }
    throw new Error(`Mastodon ${res.status} ${path} ${detail}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export async function registerApp(host) {
  const cached = JSON.parse(localStorage.getItem(LS.app(host)) || 'null')
  if (cached && cached.redirect_uri === redirectUri()) return cached
  const app = await api(host, '/api/v1/apps', {
    method: 'POST',
    form: {
      client_name: 'Fusion — Mastodon × Telegram',
      redirect_uris: redirectUri(),
      scopes: SCOPES,
      website: window.location.origin,
    },
  })
  const record = { ...app, redirect_uri: redirectUri() }
  localStorage.setItem(LS.app(host), JSON.stringify(record))
  return record
}

export async function startLogin(hostRaw) {
  const host = normalizeHost(hostRaw)
  if (!host) throw new Error('Escribe una instancia, ej: mastodon.social')
  // valida que exista
  await api(host, '/api/v1/instance')
  const app = await registerApp(host)
  localStorage.setItem(LS.pending, host)
  const url = new URL(`https://${host}/oauth/authorize`)
  url.searchParams.set('client_id', app.client_id)
  url.searchParams.set('scope', SCOPES)
  url.searchParams.set('redirect_uri', redirectUri())
  url.searchParams.set('response_type', 'code')
  window.location.href = url.toString()
}

export async function completeLoginFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const host = localStorage.getItem(LS.pending)
  if (!code || !host) return null
  const app = JSON.parse(localStorage.getItem(LS.app(host)) || 'null')
  if (!app) return null
  const tok = await api(host, '/oauth/token', {
    method: 'POST',
    form: {
      grant_type: 'authorization_code',
      client_id: app.client_id,
      client_secret: app.client_secret,
      redirect_uri: redirectUri(),
      code,
      scope: SCOPES,
    },
  })
  localStorage.setItem(LS.token, tok.access_token)
  localStorage.setItem(LS.host, host)
  localStorage.removeItem(LS.pending)
  window.history.replaceState({}, '', redirectUri())
  return { host, token: tok.access_token }
}

export function session() {
  const token = localStorage.getItem(LS.token)
  const host = localStorage.getItem(LS.host)
  return token && host ? { token, host } : null
}

export function logout() {
  localStorage.removeItem(LS.token)
  localStorage.removeItem(LS.host)
}

export const masto = {
  verify: (s) => api(s.host, '/api/v1/accounts/verify_credentials', { token: s.token }),
  home: (s, params = {}) =>
    api(s.host, '/api/v1/timelines/home?' + new URLSearchParams({ limit: 30, ...params }), { token: s.token }),
  publicTl: (s, params = {}) =>
    api(s.host, '/api/v1/timelines/public?' + new URLSearchParams({ limit: 30, ...params }), { token: s.token }),
  notifications: (s) => api(s.host, '/api/v1/notifications?limit=30', { token: s.token }),
  conversations: (s) => api(s.host, '/api/v1/conversations?limit=40', { token: s.token }),
  context: (s, id) => api(s.host, `/api/v1/statuses/${id}/context`, { token: s.token }),
  post: (s, { status, in_reply_to_id, visibility = 'public' }) =>
    api(s.host, '/api/v1/statuses', { method: 'POST', token: s.token, form: { status, visibility, ...(in_reply_to_id ? { in_reply_to_id } : {}) } }),
  favourite: (s, id, on) => api(s.host, `/api/v1/statuses/${id}/${on ? 'favourite' : 'unfavourite'}`, { method: 'POST', token: s.token }),
  boost: (s, id, on) => api(s.host, `/api/v1/statuses/${id}/${on ? 'reblog' : 'unreblog'}`, { method: 'POST', token: s.token }),
  search: (s, q) => api(s.host, '/api/v2/search?' + new URLSearchParams({ q, limit: 10, resolve: 'true' }), { token: s.token }),
}

// Normaliza un status de Mastodon al formato unificado del muro
export function toUnified(st) {
  const boost = st.reblog
  const s = boost || st
  return {
    id: 'm_' + st.id,
    raw: s,
    network: 'mastodon',
    boostedBy: boost ? st.account.display_name || st.account.username : null,
    author: {
      name: s.account.display_name || s.account.username,
      handle: '@' + s.account.acct,
      avatar: s.account.avatar,
      url: s.account.url,
    },
    html: s.content,
    createdAt: s.created_at,
    media: (s.media_attachments || []).map((m) => ({ type: m.type, url: m.preview_url || m.url, full: m.url })),
    stats: { replies: s.replies_count, boosts: s.reblogs_count, favs: s.favourites_count },
    favourited: s.favourited,
    reblogged: s.reblogged,
    url: s.url,
  }
}


// ---- Flujo para la APK: autorizar en el navegador del sistema y pegar el código ----
export async function authorizeUrl(hostRaw) {
  const host = normalizeHost(hostRaw)
  if (!host) throw new Error('Escribe una instancia, ej: mastodon.social')
  await api(host, '/api/v1/instance')
  const app = await registerApp(host)
  localStorage.setItem(LS.pending, host)
  const url = new URL(`https://${host}/oauth/authorize`)
  url.searchParams.set('client_id', app.client_id)
  url.searchParams.set('scope', SCOPES)
  url.searchParams.set('redirect_uri', redirectUri())
  url.searchParams.set('response_type', 'code')
  return { host, url: url.toString() }
}

export async function completeWithCode(hostRaw, code) {
  const host = normalizeHost(hostRaw)
  const app = JSON.parse(localStorage.getItem(LS.app(host)) || 'null')
  if (!app) throw new Error('Primero pulsa Autorizar para registrar la app')
  const tok = await api(host, '/oauth/token', {
    method: 'POST',
    form: {
      grant_type: 'authorization_code',
      client_id: app.client_id,
      client_secret: app.client_secret,
      redirect_uri: redirectUri(),
      code: code.trim(),
      scope: SCOPES,
    },
  })
  localStorage.setItem(LS.token, tok.access_token)
  localStorage.setItem(LS.host, host)
  localStorage.removeItem(LS.pending)
  return { host, token: tok.access_token }
}
