import { useState, useRef } from 'react'
import { I } from '../ui/icons'
import { ErrorBox } from '../ui/bits'
import { sendCode, signIn, signInWith2FA, setApiCreds, clearApiCreds, usingOwnKeys } from '../lib/tgUser'

import { openInApp } from '../lib/inapp'
const openExternal = (url) => openInApp(url)

const ORDER = ['intro', 'phone', 'code', 'pass']

export default function Login({ onDone, onSkip }) {
  const [step, setStep] = useState('intro')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [raw, setRaw] = useState(null)
  const [phone, setPhone] = useState('+57 ')
  const [digits, setDigits] = useState(['', '', '', '', ''])
  const [pass, setPass] = useState('')
  const [adv, setAdv] = useState(false)
  const [entering, setEntering] = useState(false)
  const [apiId, setApiId] = useState('')
  const [apiHash, setApiHash] = useState('')
  const boxes = useRef([])

  const run = async (fn) => {
    setBusy(true); setErr(null)
    try { await fn(); setRaw(null) } catch (e) {
      setEntering(false)
      const m = String(e.errorMessage || e.message || e)
      const f = friendly(m)
      setErr(f)
      setRaw(f === m ? null : m)
      if (/API_ID/i.test(m)) setAdv(true)
    }
    setBusy(false)
  }

  const goPhone = () => run(async () => {
    const p = phone.replace(/[^\d+]/g, '')
    if (p.length < 8) throw new Error('Número incompleto. Escríbelo con el prefijo del país, ej. +573001112233')
    await sendCode(p)
    setStep('code')
    setTimeout(() => boxes.current[0]?.focus(), 300)
  })

  const goCode = (value) => run(async () => {
    try { await signIn(value); setEntering(true); await onDone() }
    catch (e) {
      if (e.needPassword) { setStep('pass'); return }
      setDigits(['', '', '', '', ''])
      setTimeout(() => boxes.current[0]?.focus(), 100)
      throw e
    }
  })

  const goPass = () => run(async () => {
    await signInWith2FA(pass)
    setEntering(true)
    await onDone()
  })

  const saveKeys = () => run(async () => {
    if (!String(apiId).trim() || !apiHash.trim()) throw new Error('Faltan los dos valores')
    setApiCreds(apiId, apiHash); setAdv(false); setErr(null)
  })

  const setDigit = (i, v) => {
    const val = v.replace(/\D/g, '')
    if (val.length > 1) { // pegado
      const arr = val.slice(0, 5).split('')
      const next = ['', '', '', '', ''].map((_, k) => arr[k] || '')
      setDigits(next)
      if (next.join('').length === 5) goCode(next.join(''))
      return
    }
    const next = [...digits]; next[i] = val; setDigits(next)
    if (val && i < 4) boxes.current[i + 1]?.focus()
    if (next.join('').length === 5) goCode(next.join(''))
  }

  return (
    <div className="frame">
      <div className="hdr">
        {step !== 'intro' && <div className="iconbtn" onClick={() => setStep(ORDER[Math.max(0, ORDER.indexOf(step) - 1)])}><I.back /></div>}
        <h1 style={{ fontSize: 16 }}>{{ intro: '', phone: 'Tu número', code: 'Código de acceso', pass: 'Contraseña' }[step]}</h1>
        {step === 'intro' && onSkip && <button className="btn sm line" onClick={onSkip}>Omitir</button>}
      </div>

      <div className="center">
        {step === 'intro' && (
          <>
            <div className="hero">
              <div className="mark"><I.fusion /></div>
              <h1>Fusion</h1>
              <p>Tu Telegram completo — chats, grupos, canales, bots y mensajes guardados — con el muro de Mastodon dentro de la misma app.</p>
            </div>
            <button className="btn grad" onClick={() => setStep('phone')}><I.tg width="18" height="18" /> Continuar con mi número</button>
            <button className="btn line" style={{ marginTop: 10 }} onClick={onSkip}><I.masto width="16" height="16" /> Solo usar Mastodon</button>
            <p className="note" style={{ textAlign: 'center' }}>Conexión directa con los servidores de Telegram. Sin intermediarios.</p>
          </>
        )}

        {step === 'phone' && (
          <>
            <div className="hero" style={{ marginBottom: 18 }}>
              <div className="mark" style={{ width: 78, height: 78, borderRadius: 24 }}><I.tg width="34" height="34" /></div>
              <p>Confirma el prefijo de tu país y escribe tu número de teléfono.</p>
            </div>
            <input className="inp" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+57 300 111 2233" inputMode="tel" autoFocus
              onKeyDown={(e) => e.key === 'Enter' && goPhone()} style={{ fontSize: 20, textAlign: 'center', letterSpacing: '.04em' }} />
            {err && <ErrorBox error={err + (raw ? '\n\nDetalle técnico: ' + raw : '')} />}
            <button className="btn grad" style={{ marginTop: 18 }} onClick={goPhone} disabled={busy}>{busy ? <span className="spin" /> : 'Siguiente'}</button>
            <p className="note" style={{ textAlign: 'center' }}>Telegram te enviará un código a tus otros dispositivos o por SMS.</p>

            {adv && (
              <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
                <span className="lbl">Opciones avanzadas</span>
                <p className="note" style={{ marginTop: 0 }}>
                  Telegram está limitando las claves públicas de la app. Saca las tuyas en un minuto y no vuelve a pasar.
                </p>
                <button className="btn line" style={{ margin: '10px 0' }} onClick={() => openExternal('https://my.telegram.org/apps')}>
                  <I.ext width="16" height="16" /> Abrir my.telegram.org/apps
                </button>
                <input className="inp" style={{ marginBottom: 8 }} value={apiId} onChange={(e) => setApiId(e.target.value)} placeholder="api_id" inputMode="numeric" />
                <input className="inp" value={apiHash} onChange={(e) => setApiHash(e.target.value)} placeholder="api_hash" autoCapitalize="none" />
                <button className="btn line" style={{ marginTop: 10 }} onClick={saveKeys}>Guardar y reintentar</button>
                {usingOwnKeys() && <button className="btn line" style={{ marginTop: 8 }} onClick={() => { clearApiCreds(); setAdv(false) }}>Volver a las claves de la app</button>}
              </div>
            )}
            {!adv && <p className="note" style={{ textAlign: 'center' }}><a onClick={() => setAdv(true)}>Opciones avanzadas</a></p>}
          </>
        )}

        {step === 'code' && (
          <>
            <div className="hero" style={{ marginBottom: 14 }}>
              <div className="mark" style={{ width: 78, height: 78, borderRadius: 24 }}><I.chat width="32" height="32" /></div>
              <p>Enviamos un código a <b>{phone}</b>. Míralo en tu Telegram y escríbelo aquí.</p>
            </div>
            <div className="codebox">
              {digits.map((d, i) => (
                <input key={i} ref={(el) => (boxes.current[i] = el)} value={d} inputMode="numeric"
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Backspace' && !digits[i] && i > 0) boxes.current[i - 1]?.focus() }} />
              ))}
            </div>
            {busy && <div className="loading"><span className="spin" /> {entering ? 'Cargando tus chats…' : 'Verificando código…'}</div>}
            {err && <ErrorBox error={err + (raw ? '\n\nDetalle técnico: ' + raw : '')} />}
            <button className="btn line" style={{ marginTop: 16 }} onClick={() => { setDigits(['', '', '', '', '']); setStep('phone') }}>Cambiar número o reenviar</button>
          </>
        )}

        {step === 'pass' && (
          <>
            <div className="hero" style={{ marginBottom: 14 }}>
              <div className="mark" style={{ width: 78, height: 78, borderRadius: 24 }}><I.shield width="32" height="32" /></div>
              <p>Tu cuenta tiene verificación en dos pasos. Escribe tu contraseña de Telegram.</p>
            </div>
            <input className="inp" type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoFocus
              placeholder="Contraseña" onKeyDown={(e) => e.key === 'Enter' && goPass()} />
            {busy && <div className="loading"><span className="spin" /> {entering ? 'Cargando tus chats…' : 'Comprobando contraseña… tarda unos segundos'}</div>}
            {err && <ErrorBox error={err + (raw ? '\n\nDetalle técnico: ' + raw : '')} />}
            <button className="btn grad" style={{ marginTop: 18 }} onClick={goPass} disabled={busy || !pass}>{busy ? <span className="spin" /> : 'Entrar'}</button>
            <p className="note" style={{ textAlign: 'center' }}>Se comprueba con SRP en tu teléfono: la contraseña nunca viaja tal cual.</p>
          </>
        )}
      </div>
    </div>
  )
}

function friendly(m) {
  if (m.includes('PHONE_NUMBER_INVALID')) return 'Ese número no es válido. Revisa el prefijo del país.'
  if (m.includes('PHONE_CODE_INVALID')) return 'Código incorrecto. Inténtalo de nuevo.'
  if (m.includes('PHONE_CODE_EXPIRED')) return 'El código caducó. Pide uno nuevo.'
  if (m.includes('PASSWORD_HASH_INVALID')) return 'Contraseña incorrecta.'
  if (m.includes('FLOOD_WAIT')) {
    const s = Number((m.match(/FLOOD_WAIT_(\d+)/) || [])[1] || 0)
    return `Telegram pide esperar ${s > 60 ? Math.ceil(s / 60) + ' minutos' : s + ' segundos'} antes de reintentar.`
  }
  if (m.includes('API_ID_PUBLISHED_FLOOD')) return 'Las claves públicas están saturadas ahora mismo. Usa las opciones avanzadas para poner las tuyas (1 minuto).'
  if (m.includes('PHONE_NUMBER_BANNED')) return 'Telegram tiene ese número restringido.'
  if (m.includes('TIMEOUT') || m.includes('Not connected') || m.includes('Disconnect')) return 'Sin conexión con Telegram. Revisa tu red (datos o Wi-Fi) y reintenta.'
  if (m.includes('Bytes or str expected')) return 'Error interno de cifrado al hablar con Telegram. Cierra la app por completo y vuelve a abrirla; si sigue, avísame con el detalle técnico.'
  if (m.includes('AUTH_RESTART')) return 'Telegram pidió reiniciar el proceso. Vuelve a enviar el código.'
  if (m.includes('SESSION_PASSWORD_NEEDED')) return 'Tu cuenta pide la contraseña de dos pasos.'
  return m
}
