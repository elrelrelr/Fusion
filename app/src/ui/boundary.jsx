import { Component } from 'react'

/** Nunca más una pantalla negra: si algo revienta, se ve el error y se puede copiar. */
export default class Boundary extends Component {
  constructor(p) { super(p); this.state = { err: null, info: null } }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err, info) { this.setState({ info }); console.error('Fusion:', err, info) }

  render() {
    if (!this.state.err) return this.props.children
    const txt = `${this.state.err?.message || this.state.err}\n\n${this.state.info?.componentStack || ''}`.slice(0, 4000)
    return (
      <div className="frame">
        <div className="center">
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Algo se rompió</h1>
          <p className="note" style={{ marginTop: 0 }}>La app siguió viva para que puedas contarme qué pasó.</p>
          <pre className="textview txt" style={{ maxHeight: 260, marginTop: 14 }}>{txt}</pre>
          <button className="btn line" style={{ marginTop: 12 }}
            onClick={() => navigator.clipboard?.writeText(txt).catch(() => {})}>Copiar el error</button>
          <button className="btn grad" style={{ marginTop: 10 }} onClick={() => window.location.reload()}>Reiniciar la app</button>
          <button className="btn line" style={{ marginTop: 10, color: 'var(--danger)' }}
            onClick={() => { try { localStorage.clear() } catch { /* noop */ } window.location.reload() }}>
            Borrar datos locales y reiniciar
          </button>
        </div>
      </div>
    )
  }
}
