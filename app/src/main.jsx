// Una sola clase Buffer en toda la app (GramJS valida con `instanceof Buffer`).
import { Buffer } from 'buffer'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Boundary from './ui/boundary'
import './index.css'

if (globalThis.Buffer !== Buffer) globalThis.Buffer = Buffer
if (typeof window !== 'undefined' && window.Buffer !== Buffer) window.Buffer = Buffer

// Si algo falla antes de React, que se vea en pantalla en vez de quedar en negro.
window.addEventListener('error', (e) => {
  const root = document.getElementById('root')
  if (root && !root.childElementCount) {
    root.innerHTML = `<div style="padding:28px;font:14px system-ui;color:#f2f4fa">
      <h2 style="margin:0 0 8px">Fusion no pudo arrancar</h2>
      <pre style="white-space:pre-wrap;background:#12141d;padding:14px;border-radius:12px;font-size:12px">${String(e.message || e.error)}</pre>
    </div>`
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <Boundary><App /></Boundary>
)
