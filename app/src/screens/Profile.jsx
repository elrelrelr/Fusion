import { useEffect, useState } from 'react'
import { I } from '../ui/icons'
import { Avatar, ErrorBox } from '../ui/bits'
import { logout as mastoLogout, authorizeUrl, completeWithCode, APP_SCHEME } from '../lib/mastodon'
import { tgSave, tgLogout, tg } from '../lib/telegram'
import { currentKeyName, usingOwnKeys, setApiCreds, clearApiCreds, getSessions, killSession, mediaCacheSize, clearMediaCache } from '../lib/tgUser'
import { ACCENTS, loadSettings, saveSettings } from '../lib/settings'
import { openInApp, oauthInApp, isNativeApp } from '../lib/inapp'

const fmtBytes = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n > 1024 ? Math.round(n / 1024) + ' kB' : (n || 0) + ' B')

function Sq({ color, icon: Ic }) {
  return <div className="sq" style={{ background: color }}><Ic width="17" height="17" /></div>
}

function SetRow({ color, icon, label, value, onClick, danger }) {
  return (
    <div className="setrow" onClick={onClick}>
      {icon && <Sq color={danger ? '#e05555' : color} icon={icon} />}
      <span className="lbl2" style={danger ? { color: 'var(--danger)' } : undefined}>{label}</span>
      {value && <span className="val">{value}</span>}
      {onClick && <span className="chev">›</span>}
    </div>
  )
}

function Toggle({ on, onChange }) {
  return <div className={'switch ' + (on ? 'on' : '')} onClick={(e) => { e.stopPropagation(); onChange(!on) }}><i /></div>
}

export default function Profile({ tgu, ms, account, bot, stats, onChanged, onLoginTelegram, say }) {
  const [sheet, setSheet] = useState(null)
  const [host, setHost] = useState('mastodon.social')
  const [code, setCode] = useState('')
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [set, setSet] = useState(loadSettings())
  const [sessions, setSessions] = useState(null)
  const [cache, setCache] = useState(0)
  const [pinDraft, setPinDraft] = useState('')

  const upd = (patch) => { const next = saveSettings({ ...set, ...patch }); setSet({ ...next }) }
  const run = async (fn) => { setBusy(true); setErr(null); try { await fn() } catch (e) { setErr(e.errorMessage || e.message) } setBusy(false) }

  useEffect(() => { if (sheet === 'data') setCache(mediaCacheSize()) }, [sheet])
  useEffect(() => {
    if (sheet !== 'devices' || sessions) return
    getSessions().then(setSessions).catch((e) => setErr(e.errorMessage || e.message))
  }, [sheet, sessions])

  // ---- Mastodon dentro de la app ----
  const connectMastodon = () => run(async () => {
    const { url } = await authorizeUrl(host)
    const got = await oauthInApp(url, APP_SCHEME)
    if (got) {
      await completeWithCode(host, got)
      setSheet(null); onChanged(); say('Mastodon conectado')
    } else {
      say('Si la instancia no redirigió sola, pega el código abajo')
    }
  })
  const finishManual = () => run(async () => { await completeWithCode(host, code); setCode(''); setSheet(null); onChanged(); say('Mastodon conectado') })
  const linkBot = () => run(async () => { const t = token.trim(); await tg.me(t); tgSave(t); setToken(''); setSheet(null); onChanged() })

  const me = tgu.me

  return (
    <>
      <div className="body">
        {/* cabecera de cuenta, como en Telegram */}
        <div className="tgprofile">
          <Avatar src={me?.avatar} name={me?.name || account?.display_name || 'Invitado'} id={me?.id || 'guest'} size={74} />
          <div style={{ minWidth: 0 }}>
            <h2>{me?.name || account?.display_name || 'Sin cuentas'}</h2>
            <span>{me?.phone ? '+' + me.phone : (account ? '@' + account.acct : 'toca para conectar')}</span>
            {me?.username && <div style={{ fontSize: 13, opacity: .85 }}>@{me.username}</div>}
          </div>
        </div>

        <div className="setgroup">
          <SetRow color="#4a9cf5" icon={I.user} label="Editar perfil" value={me ? '' : 'sin cuenta'} onClick={() => (me ? setSheet('editme') : onLoginTelegram())} />
          <SetRow color="#3ba55d" icon={I.tg} label="Cuenta de Telegram" value={me ? 'conectada' : 'conectar'} onClick={() => (me ? setSheet('tg') : onLoginTelegram())} />
          <SetRow color="#7b5cff" icon={I.masto} label="Cuenta de Mastodon" value={ms ? '@' + (account?.acct || '') : 'conectar'} onClick={() => setSheet('masto')} />
        </div>

        <div className="setgroup">
          <h4>Ajustes</h4>
          <SetRow color="#e8664d" icon={I.notif} label="Notificaciones y sonidos" onClick={() => setSheet('notif')} />
          <SetRow color="#9b6ef3" icon={I.shield} label="Privacidad y seguridad" onClick={() => setSheet('privacy')} />
          <SetRow color="#3aa76d" icon={I.storage} label="Datos y almacenamiento" onClick={() => setSheet('data')} />
          <SetRow color="#4a9cf5" icon={I.palette} label="Apariencia" onClick={() => setSheet('look')} />
          <SetRow color="#f0a132" icon={I.folder} label="Carpetas de chats" value={tgu.folders?.length ? String(tgu.folders.length) : '0'} onClick={() => setSheet('folders')} />
          <SetRow color="#5d7bf5" icon={I.devices} label="Dispositivos" value={sessions ? String(sessions.length) : ''} onClick={() => setSheet('devices')} />
          <SetRow color="#8e9aa8" icon={I.language} label="Idioma" value="Español" onClick={() => say('Interfaz en español')} />
        </div>

        <div className="setgroup">
          <h4>Fusion</h4>
          <SetRow color="#7b5cff" icon={I.wall} label="Muro y fediverso" value={ms ? 'activo' : 'sin Mastodon'} onClick={() => setSheet('masto')} />
          <SetRow color="#2ea6ff" icon={I.bot} label="Bot propio" value={bot ? '@' + bot.username : 'añadir'} onClick={() => setSheet('bot')} />
          <SetRow color="#e05555" icon={I.trash} label="Papelera anti-eliminación" onClick={() => setSheet('trash')} />
          <SetRow color="#3aa76d" icon={I.lock} label="Bloqueo con código" value={set.pin ? 'activado' : 'no'} onClick={() => setSheet('pin')} />
          <SetRow color="#8e9aa8" icon={I.question} label="Claves de aplicación" value={currentKeyName()} onClick={() => setSheet('keys')} />
        </div>

        <div className="setgroup" style={{ marginBottom: 20 }}>
          {me && <SetRow icon={I.power} danger label="Cerrar sesión de Telegram" onClick={() => tgu.logout().then(onChanged)} />}
          {ms && <SetRow icon={I.power} danger label="Desconectar Mastodon" onClick={() => { mastoLogout(); onChanged() }} />}
          <div style={{ textAlign: 'center', color: 'var(--dim2)', fontSize: 12, padding: '16px 0' }}>
            Fusion 2.0 · {stats.dialogs} chats · {stats.posts} publicaciones
          </div>
        </div>
        <div style={{ height: 80 }} />
      </div>

      {sheet && (
        <>
          <div className="sheet-bg" onClick={() => setSheet(null)} />
          <div className="sheet">
            <div className="grab" />

            {sheet === 'notif' && (<>
              <h3>Notificaciones y sonidos</h3>
              <div className="item" style={{ padding: '12px 0' }}><div className="t">Vibrar al recibir<small>en la app abierta</small></div><Toggle on={set.vibrate !== false} onChange={(v) => upd({ vibrate: v })} /></div>
              <div className="item" style={{ padding: '12px 0' }}><div className="t">Avisos en pantalla<small>mensajes nuevos mientras navegas</small></div><Toggle on={set.inAppToasts !== false} onChange={(v) => upd({ inAppToasts: v })} /></div>
              <p className="note">Las notificaciones del sistema con la app cerrada llegan cuando el fork nativo esté compilado; en esta versión web se avisa dentro de la app.</p>
            </>)}

            {sheet === 'privacy' && (<>
              <h3>Privacidad y seguridad</h3>
              <div className="item" style={{ padding: '12px 0' }}><div className="t">Modo fantasma<small>no marca como leído</small></div><Toggle on={set.ghost} onChange={(v) => upd({ ghost: v })} /></div>
              <div className="item" style={{ padding: '12px 0' }}><div className="t">Anti-eliminación<small>guarda borrados y ediciones</small></div><Toggle on={set.antiDelete} onChange={(v) => upd({ antiDelete: v })} /></div>
              <div className="item" style={{ padding: '12px 0' }}><div className="t">Confirmar al borrar</div><Toggle on={set.confirmDelete} onChange={(v) => upd({ confirmDelete: v })} /></div>
              <button className="btn line" style={{ marginTop: 12 }} onClick={() => setSheet('devices')}>Dispositivos conectados</button>
              <button className="btn line" style={{ marginTop: 10 }} onClick={() => setSheet('pin')}>Bloqueo con código</button>
            </>)}

            {sheet === 'data' && (<>
              <h3>Datos y almacenamiento</h3>
              <div className="item" style={{ padding: '12px 0' }}><div className="t">Caché de medios</div><span className="v">{fmtBytes(cache)}</span></div>
              <div className="item" style={{ padding: '12px 0' }}><div className="t">Descarga automática<small>fotos y notas de voz al abrir</small></div><Toggle on={set.autoDownload} onChange={(v) => upd({ autoDownload: v })} /></div>
              <button className="btn line" style={{ marginTop: 12 }} onClick={() => { clearMediaCache(); setCache(0); say('Caché vaciada') }}>Vaciar caché</button>
              <button className="btn line" style={{ marginTop: 10 }} onClick={() => {
                Object.keys(localStorage).filter((k) => k.startsWith('fx.tg.cache')).forEach((k) => localStorage.removeItem(k))
                say('Datos temporales borrados')
              }}>Borrar datos temporales</button>
            </>)}

            {sheet === 'look' && (<>
              <h3>Apariencia</h3>
              <span className="lbl">Color de acento</span>
              <div className="swatches">
                {Object.entries(ACCENTS).map(([name, [a, b]]) => (
                  <div key={name} className={'swatch ' + (set.accent === name ? 'on' : '')}
                    style={{ background: `linear-gradient(135deg, ${a}, ${b})` }} onClick={() => upd({ accent: name })} />
                ))}
              </div>
              <span className="lbl">Tamaño del texto · {set.fontSize}px</span>
              <input className="slider" type="range" min="13" max="20" value={set.fontSize} onChange={(e) => upd({ fontSize: Number(e.target.value) })} />
              <div className="item" style={{ padding: '12px 0' }}><div className="t">Burbujas de chat</div><Toggle on={set.bubbles} onChange={(v) => upd({ bubbles: v })} /></div>
              <div className="item" style={{ padding: '12px 0' }}><div className="t">Modo compacto</div><Toggle on={set.compact} onChange={(v) => upd({ compact: v })} /></div>
              <div className="item" style={{ padding: '12px 0' }}><div className="t">Enter envía</div><Toggle on={set.sendOnEnter} onChange={(v) => upd({ sendOnEnter: v })} /></div>
            </>)}

            {sheet === 'folders' && (<>
              <h3>Carpetas de chats</h3>
              {tgu.folders?.length
                ? tgu.folders.map((f) => (
                  <div className="item" key={f.id} style={{ padding: '12px 0' }}>
                    <div className="ic" style={{ background: '#f0a132' }}><I.folder width="16" height="16" /></div>
                    <div className="t">{f.title}<small>{f.peerIds.length} chats</small></div>
                  </div>
                ))
                : <p className="note">Aún no tienes carpetas. Se leen automáticamente de tu cuenta de Telegram; créalas en la app oficial y aparecerán como pestañas.</p>}
            </>)}

            {sheet === 'devices' && (<>
              <h3>Dispositivos</h3>
              {!sessions && !err && <div className="loading"><span className="spin" /> Cargando…</div>}
              {err && <ErrorBox error={err} />}
              {sessions?.map((s) => (
                <div className="item" key={String(s.hash)} style={{ padding: '11px 0' }}>
                  <div className="ic" style={{ background: s.current ? 'rgba(52,211,153,.16)' : '#2b3145', color: s.current ? 'var(--ok)' : 'inherit' }}><I.devices width="17" height="17" /></div>
                  <div className="t">{s.device || s.platform}<small>{s.app} · {s.country || s.ip}</small></div>
                  {s.current ? <span className="v">esta</span>
                    : <button className="btn sm line" onClick={() => killSession(s.hash).then(() => { setSessions(null); say('Sesión cerrada') }).catch((e) => setErr(e.message))}>Cerrar</button>}
                </div>
              ))}
            </>)}

            {sheet === 'pin' && (<>
              <h3>Bloqueo con código</h3>
              {set.pin ? (
                <button className="btn line" style={{ marginTop: 14 }} onClick={() => { upd({ pin: '' }); setSheet(null); say('Bloqueo desactivado') }}>Quitar el bloqueo</button>
              ) : (<>
                <p className="note" style={{ marginTop: 0 }}>Código de 4 dígitos al abrir Fusion.</p>
                <input className="inp" style={{ marginTop: 12, textAlign: 'center', letterSpacing: '.4em', fontSize: 22 }} inputMode="numeric" maxLength={4}
                  value={pinDraft} onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" />
                <button className="btn grad" style={{ marginTop: 12 }} disabled={pinDraft.length !== 4}
                  onClick={() => { upd({ pin: pinDraft }); setPinDraft(''); setSheet(null); say('Bloqueo activado') }}>Activar</button>
              </>)}
            </>)}

            {sheet === 'masto' && (ms ? (<>
              <h3>Mastodon</h3>
              <p className="note" style={{ marginTop: 0 }}>Conectado como <b>@{account?.acct}</b> en <b>{ms.host}</b>. El muro y las respuestas funcionan dentro de la app.</p>
              <button className="btn line" style={{ marginTop: 14 }} onClick={() => openInApp('https://' + ms.host + '/@' + (account?.acct || ''))}>Ver mi perfil en la app</button>
              <button className="btn line" style={{ marginTop: 10, color: 'var(--danger)' }} onClick={() => { mastoLogout(); setSheet(null); onChanged() }}>Desconectar</button>
            </>) : (<>
              <h3>Conectar Mastodon</h3>
              <p className="note" style={{ marginTop: 0 }}>Se abre dentro de Fusion: autorizas y vuelves solo, sin pasar por el navegador del teléfono.</p>
              <span className="lbl">Instancia</span>
              <input className="inp" value={host} onChange={(e) => setHost(e.target.value)} placeholder="mastodon.social" autoCapitalize="none" />
              <button className="btn grad" style={{ marginTop: 12 }} onClick={connectMastodon} disabled={busy}>
                {busy ? <span className="spin" /> : 'Entrar con Mastodon'}
              </button>
              <details style={{ marginTop: 14 }}>
                <summary className="note" style={{ cursor: 'pointer' }}>¿Tu instancia no redirigió sola?</summary>
                <input className="inp" style={{ marginTop: 10 }} value={code} onChange={(e) => setCode(e.target.value)} placeholder="pega aquí el código" autoCapitalize="none" />
                <button className="btn line" style={{ marginTop: 10 }} onClick={finishManual} disabled={busy || !code.trim()}>Terminar conexión</button>
              </details>
              {err && <ErrorBox error={err} />}
            </>))}

            {sheet === 'bot' && (bot ? (<>
              <h3>Bot conectado</h3>
              <p className="note" style={{ marginTop: 0 }}>@{bot.username}</p>
              <button className="btn line" style={{ marginTop: 14 }} onClick={() => { tgLogout(); setSheet(null); onChanged() }}>Quitar bot</button>
            </>) : (<>
              <h3>Añadir un bot</h3>
              <p className="note" style={{ marginTop: 0 }}>Opcional, para difundir en canales donde sea administrador.</p>
              <input className="inp" style={{ marginTop: 12 }} value={token} onChange={(e) => setToken(e.target.value)} placeholder="token de @BotFather" autoCapitalize="none" />
              <button className="btn grad" style={{ marginTop: 12 }} onClick={linkBot} disabled={busy || !token.trim()}>Conectar</button>
              {err && <ErrorBox error={err} />}
            </>))}

            {sheet === 'editme' && (<>
              <h3>Editar perfil</h3>
              <span className="lbl">Nombre</span>
              <input className="inp" id="fx-first" defaultValue={(me?.name || '').split(' ')[0] || ''} />
              <span className="lbl">Apellido</span>
              <input className="inp" id="fx-last" defaultValue={(me?.name || '').split(' ').slice(1).join(' ')} />
              <span className="lbl">Biografía</span>
              <input className="inp" id="fx-bio" placeholder="Algo sobre ti" />
              <button className="btn grad" style={{ marginTop: 12 }} disabled={busy} onClick={() => run(async () => {
                await tgu.updateProfile({
                  firstName: document.getElementById('fx-first').value,
                  lastName: document.getElementById('fx-last').value,
                  about: document.getElementById('fx-bio').value,
                })
                await tgu.reload(); setSheet(null); say('Perfil actualizado')
              })}>Guardar</button>
              <span className="lbl">Nombre de usuario</span>
              <input className="inp" id="fx-user" defaultValue={me?.username || ''} autoCapitalize="none" />
              <button className="btn line" style={{ marginTop: 10 }} disabled={busy} onClick={() => run(async () => {
                await tgu.setUsername(document.getElementById('fx-user').value.replace('@', ''))
                await tgu.reload(); setSheet(null); say('Usuario actualizado')
              })}>Cambiar @usuario</button>
              {err && <ErrorBox error={err} />}
            </>)}

            {sheet === 'trash' && (<>
              <h3>Papelera anti-eliminación</h3>
              {(() => {
                const items = Object.values(tgu.chats).flatMap((c) => (c.messages || [])
                  .filter((m) => m.deleted || m.original).map((m) => ({ ...m, chat: c.title || c.id })))
                if (!items.length) return <p className="note">Nada por ahora.</p>
                return items.slice(-40).reverse().map((m, i) => (
                  <div className="item" key={i} style={{ padding: '10px 0' }}>
                    <div className="ic" style={{ background: m.deleted ? 'rgba(255,107,107,.14)' : '#2b3145', color: m.deleted ? 'var(--danger)' : 'inherit' }}>
                      {m.deleted ? <I.trash width="16" height="16" /> : <I.pencil width="16" height="16" />}
                    </div>
                    <div className="t txt">{m.original || m.text}<small>{m.chat} · {m.deleted ? 'eliminado' : 'editado'}</small></div>
                  </div>
                ))
              })()}
            </>)}

            {sheet === 'keys' && (<>
              <h3>Claves de aplicación</h3>
              <p className="note" style={{ marginTop: 0 }}>Incrustadas ({currentKeyName()}). Cámbialas solo si Telegram las satura.</p>
              <button className="btn line" style={{ marginTop: 10 }} onClick={() => openInApp('https://my.telegram.org/apps')}>Abrir my.telegram.org aquí dentro</button>
              <input className="inp" style={{ marginTop: 12 }} placeholder="api_id" inputMode="numeric" id="fx-apiid" />
              <input className="inp" style={{ marginTop: 8 }} placeholder="api_hash" autoCapitalize="none" id="fx-apihash" />
              <button className="btn grad" style={{ marginTop: 12 }} onClick={() => {
                const a = document.getElementById('fx-apiid').value, b = document.getElementById('fx-apihash').value
                if (!a.trim() || !b.trim()) return setErr('Faltan los dos valores')
                setApiCreds(a, b); setSheet(null); say('Guardadas · vuelve a iniciar sesión')
              }}>Guardar</button>
              {usingOwnKeys() && <button className="btn line" style={{ marginTop: 10 }} onClick={() => { clearApiCreds(); setSheet(null); say('Usando las de la app') }}>Volver a las de la app</button>}
              {err && <ErrorBox error={err} />}
            </>)}

            {sheet === 'tg' && (<>
              <h3>Cuenta de Telegram</h3>
              <p className="note" style={{ marginTop: 0 }}>{me?.name}{me?.username ? ` · @${me.username}` : ''} · {stats.dialogs} chats</p>
              <button className="btn line" style={{ marginTop: 14 }} onClick={() => { tgu.reload(); setSheet(null); say('Sincronizando…') }}>Sincronizar</button>
              <button className="btn line" style={{ marginTop: 10 }} onClick={() => setSheet('devices')}>Dispositivos</button>
              <button className="btn line" style={{ marginTop: 10, color: 'var(--danger)' }} onClick={() => { tgu.logout().then(onChanged); setSheet(null) }}>Cerrar sesión</button>
            </>)}
          </div>
        </>
      )}
    </>
  )
}
