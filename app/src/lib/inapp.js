// Todo se abre DENTRO de la app: navegador integrado a pantalla completa.
// Nada de saltar a Chrome y perder el hilo.

let IAB = null
async function plugin() {
  if (IAB) return IAB
  try {
    const mod = await import('@capacitor/inappbrowser')
    IAB = mod.InAppBrowser
  } catch { IAB = null }
  return IAB
}

export function isNativeApp() {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())
}

/** Abre una URL en el navegador interno (WebView dentro de Fusion). */
export async function openInApp(url, { title } = {}) {
  const b = await plugin()
  if (!b || !isNativeApp()) { window.open(url, '_blank', 'noopener'); return }
  try {
    await b.openInWebView({
      url,
      options: {
        showURL: true,
        showToolbar: true,
        clearCache: false,
        clearSessionCache: false,
        mediaPlaybackRequiresUserAction: false,
        closeButtonText: 'Cerrar',
        toolbarPosition: 'TOP',
        showNavigationButtons: true,
        leftToRight: false,
        customWebViewUserAgent: null,
        android: { showTitle: !!title, hideToolbarOnScroll: false, viewStyle: 'FULL_SCREEN' },
      },
    })
  } catch {
    window.open(url, '_blank', 'noopener')
  }
}

/**
 * Login OAuth sin salir de la app: abre el navegador interno, espera a que la
 * instancia redirija a fusion://oauth?code=… y devuelve el código.
 */
export async function oauthInApp(authorizeUrl, redirectScheme = 'fusion://oauth') {
  const b = await plugin()
  if (!b || !isNativeApp()) {
    window.open(authorizeUrl, '_blank', 'noopener')
    return null
  }

  return new Promise((resolve) => {
    let done = false
    const finish = async (code) => {
      if (done) return
      done = true
      try { await b.close() } catch { /* noop */ }
      try { urlSub?.remove?.(); closeSub?.remove?.() } catch { /* noop */ }
      resolve(code)
    }

    let urlSub = null
    let closeSub = null

    b.addListener('urlChangeEvent', (ev) => {
      const u = ev?.url || ''
      if (!u.startsWith(redirectScheme.split('://')[0] + '://')) return
      try {
        const parsed = new URL(u.replace('#', '?'))
        finish(parsed.searchParams.get('code'))
      } catch { finish(null) }
    }).then((s) => { urlSub = s })

    b.addListener('browserClosed', () => finish(null)).then((s) => { closeSub = s })

    b.openInWebView({
      url: authorizeUrl,
      options: {
        showURL: true, showToolbar: true, clearCache: false, clearSessionCache: false,
        closeButtonText: 'Cancelar', toolbarPosition: 'TOP', showNavigationButtons: false,
        android: { showTitle: true, hideToolbarOnScroll: false, viewStyle: 'FULL_SCREEN' },
      },
    }).catch(() => finish(null))
  })
}
