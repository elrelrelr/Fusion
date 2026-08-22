import { useCallback, useEffect, useRef, useState } from 'react'
import * as U from './tgUser'
import { loadSettings } from './settings'

export function useTgUser() {
  const [ready, setReady] = useState(false)
  const [me, setMe] = useState(null)
  const [dialogs, setDialogs] = useState([])
  const [folders, setFolders] = useState([])
  const [posts, setPosts] = useState([])
  const [chats, setChats] = useState({})
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const off = useRef([])

  const patchChat = useCallback((id, fn) => {
    setChats((c) => {
      const prev = c[id] || { id, messages: [] }
      return { ...c, [id]: fn(prev) }
    })
  }, [])

  const bootstrap = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const ok = await U.isAuthorized()
      if (!ok) { setMe(null); setReady(true); setLoading(false); return }
      const c = U.getClient()
      const meUser = await c.getMe()
      setMe({ id: String(meUser.id), name: U.entityName(meUser), username: meUser.username, phone: meUser.phone })
      U.avatarUrl(meUser).then((url) => url && setMe((m) => ({ ...m, avatar: url })))

      const ds = await U.getDialogs(80)
      setDialogs(ds)
      U.getFolders().then(setFolders).catch(() => {})

      ;(async () => {
        for (const d of ds.slice(0, 40)) {
          if (!d.peer || d.peer === 'me') continue
          const url = await U.avatarUrl(d.peer)
          if (!url) continue
          setDialogs((prev) => prev.map((x) => (x.id === d.id ? { ...x, avatar: url } : x)))
          setPosts((prev) => prev.map((p) => (String(p.peerRef) === String(d.id) ? { ...p, author: { ...p.author, avatar: url } } : p)))
        }
      })()

      U.channelFeed(ds).then(setPosts).catch(() => {})

      // ---- eventos en vivo: nuevos, editados y eliminados ----
      off.current.forEach((f) => { try { f() } catch { /* noop */ } })
      off.current = []

      off.current.push(await U.onNewMessage((ev) => {
        if (ev.isChannel) {
          setPosts((p) => [U.msgToUnified(
            { id: ev.message.id, message: ev.message.text, date: Math.floor(new Date(ev.message.date) / 1000), views: 0 },
            { id: ev.chatId, title: ev.title, username: null }
          ), ...p])
        }
        patchChat(ev.chatId, (prev) => ({
          ...prev, id: ev.chatId, title: prev.title || ev.title,
          messages: prev.messages.some((m) => m.id === ev.message.id) ? prev.messages : [...prev.messages, ev.message],
        }))
        setDialogs((ds2) => ds2.map((d) => d.id === ev.chatId
          ? { ...d, last: { text: ev.message.text, date: ev.message.date, out: ev.message.out }, unread: ev.message.out ? d.unread : (d.unread || 0) + 1 }
          : d))
      }))

      try {
      off.current.push(await U.onEdited((chatId, msg) => {
        const keep = loadSettings().antiDelete
        patchChat(chatId, (prev) => ({
          ...prev,
          messages: prev.messages.map((m) => m.id === msg.id
            ? { ...m, text: msg.text, edited: true, original: keep ? (m.original || m.text) : undefined }
            : m),
        }))
      }))

      } catch (e) { console.warn('sin eventos de edición', e) }

      try {
      off.current.push(await U.onDeleted((chatId, ids) => {
        const keep = loadSettings().antiDelete
        setChats((c2) => {
          const next = { ...c2 }
          for (const [k, v] of Object.entries(next)) {
            if (chatId && k !== chatId) continue
            const has = v.messages.some((m) => ids.includes(m.id))
            if (!has) continue
            next[k] = {
              ...v,
              messages: keep
                ? v.messages.map((m) => (ids.includes(m.id) ? { ...m, deleted: true } : m))
                : v.messages.filter((m) => !ids.includes(m.id)),
            }
          }
          return next
        })
      }))
      } catch (e) { console.warn('sin eventos de borrado', e) }
    } catch (e) { setError(e.errorMessage || e.message || String(e)) }
    setReady(true); setLoading(false)
  }, [patchChat])

  useEffect(() => {
    bootstrap()
    return () => { off.current.forEach((f) => { try { f() } catch { /* noop */ } }) }
  }, [bootstrap])

  // -------- acciones --------
  const openChat = useCallback(async (dialog, force = false) => {
    if (!force && chats[dialog.id]?.loaded) return
    const msgs = await U.getHistory(dialog.peer, 60)
    const pinned = await U.getPinnedMessage(dialog.peer).catch(() => null)
    setChats((c) => ({
      ...c,
      [dialog.id]: {
        id: dialog.id, title: dialog.title, avatar: dialog.avatar, peer: dialog.peer,
        network: 'telegram', loaded: true, pinned, messages: msgs,
      },
    }))
    if (!loadSettings().ghost) {
      U.markRead(dialog.peer).catch(() => {})
      setDialogs((ds) => ds.map((d) => (d.id === dialog.id ? { ...d, unread: 0 } : d)))
    }
  }, [chats])

  const send = useCallback(async (dialog, text, opts = {}) => {
    const m = await U.sendTo(dialog.peer, text, opts)
    patchChat(dialog.id, (prev) => ({
      ...prev, id: dialog.id, peer: dialog.peer, title: prev.title || dialog.title,
      messages: [...prev.messages, { id: m.id, out: true, from: 'tú', text, date: new Date().toISOString(), replyTo: opts.replyTo || null }],
    }))
    setDialogs((ds) => ds.map((d) => (d.id === dialog.id ? { ...d, last: { text, date: new Date().toISOString(), out: true } } : d)))
    return m
  }, [patchChat])

  const edit = useCallback(async (dialog, id, text) => {
    await U.editMessage(dialog.peer, id, text)
    patchChat(dialog.id, (prev) => ({ ...prev, messages: prev.messages.map((m) => (m.id === id ? { ...m, text, edited: true } : m)) }))
  }, [patchChat])

  const remove = useCallback(async (dialog, ids, revoke) => {
    await U.deleteMessages(dialog.peer, ids, revoke)
    patchChat(dialog.id, (prev) => ({ ...prev, messages: prev.messages.filter((m) => !ids.includes(m.id)) }))
  }, [patchChat])

  const forward = useCallback(async (fromDialog, ids, toDialog, opts) => {
    await U.forwardMessages(fromDialog.peer, ids, toDialog.peer, opts)
  }, [])

  const pin = useCallback(async (dialog, id, unpin) => {
    await U.pinMessage(dialog.peer, id, unpin)
    const pinned = await U.getPinnedMessage(dialog.peer).catch(() => null)
    patchChat(dialog.id, (prev) => ({ ...prev, pinned }))
  }, [patchChat])

  const mute = useCallback(async (dialog, seconds) => {
    await U.muteChat(dialog.peer, seconds)
    setDialogs((ds) => ds.map((d) => (d.id === dialog.id ? { ...d, muted: seconds !== 0 } : d)))
  }, [])

  const pinDialog = useCallback(async (dialog, pinned) => {
    await U.togglePinDialog(dialog.peer, pinned)
    setDialogs((ds) => ds.map((d) => (d.id === dialog.id ? { ...d, pinned } : d)))
  }, [])

  const archive = useCallback(async (dialog, archived) => {
    await U.archiveChat(dialog.peer, archived)
    setDialogs((ds) => ds.map((d) => (d.id === dialog.id ? { ...d, archived } : d)))
  }, [])

  const readNow = useCallback(async (dialog) => {
    await U.markRead(dialog.peer)
    setDialogs((ds) => ds.map((d) => (d.id === dialog.id ? { ...d, unread: 0 } : d)))
  }, [])

  const clearChat = useCallback(async (dialog, revoke) => {
    await U.clearHistory(dialog.peer, revoke)
    patchChat(dialog.id, (prev) => ({ ...prev, messages: [] }))
  }, [patchChat])

  const leave = useCallback(async (dialog) => {
    await U.leaveChat(dialog.peer)
    setDialogs((ds) => ds.filter((d) => d.id !== dialog.id))
  }, [])

  const logout = useCallback(async () => {
    await U.logoutUser()
    setMe(null); setDialogs([]); setPosts([]); setChats({}); setFolders([])
  }, [])

  const sendFile = useCallback(async (dialog, file, caption, asPhoto) => {
    const m = await U.sendFile(dialog.peer, file, caption, asPhoto)
    patchChat(dialog.id, (prev) => ({
      ...prev, id: dialog.id, peer: dialog.peer,
      messages: [...prev.messages, {
        id: m.id, out: true, from: 'tú', text: caption || '',
        date: new Date().toISOString(),
        media: { kind: /^image\//.test(file.type) && asPhoto ? 'photo' : 'file', label: file.name || 'Adjunto' },
      }],
    }))
    return m
  }, [patchChat])

  const sendVoice = useCallback(async (dialog, blob, seconds) => {
    const m = await U.sendVoice(dialog.peer, blob, seconds)
    patchChat(dialog.id, (prev) => ({
      ...prev, id: dialog.id, peer: dialog.peer,
      messages: [...prev.messages, {
        id: m.id, out: true, from: 'tú', text: '', date: new Date().toISOString(),
        media: { kind: 'voice', label: 'Mensaje de voz', duration: Math.round(seconds) },
      }],
    }))
    return m
  }, [patchChat])

  const react = useCallback(async (dialog, msgId, emoji) => {
    await U.sendReaction(dialog.peer, msgId, emoji)
    patchChat(dialog.id, (prev) => ({
      ...prev,
      messages: prev.messages.map((m) => (m.id === msgId ? { ...m, myReaction: emoji || null } : m)),
    }))
  }, [patchChat])

  const addDialog = useCallback((d) => {
    setDialogs((ds) => (ds.some((x) => x.id === d.id) ? ds : [d, ...ds]))
  }, [])

  const setUnread = useCallback(async (dialog, unread) => {
    await U.markUnread(dialog.peer, unread)
    setDialogs((ds) => ds.map((d) => (d.id === dialog.id ? { ...d, unread: unread ? Math.max(1, d.unread) : 0 } : d)))
  }, [])

  return {
    ready, me, dialogs, folders, posts, chats, error, loading,
    reload: bootstrap, openChat, send, edit, remove, forward, pin, mute,
    pinDialog, archive, readNow, clearChat, leave, logout,
    searchIn: U.searchInChat, searchGlobal: U.searchGlobal,
    download: U.downloadMedia, cached: U.cachedMedia,
    sendFile, sendVoice, react, setUnread, addDialog,
    info: U.chatInfo, members: U.chatMembers, shared: U.sharedMedia,
    people: U.searchPeople, contacts: U.myContacts,
    createGroup: U.createGroup, createChannel: U.createChannel,
    block: U.blockUser, updateProfile: U.updateMyProfile, setUsername: U.setUsername,
    exportChat: U.exportChatText,
  }
}
