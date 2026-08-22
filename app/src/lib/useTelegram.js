import { useEffect, useRef, useState, useCallback } from 'react'
import { tg, tgSession, loadCache, saveCache, getOffset, setOffset, postToUnified, chanTitle, avatarFor } from './telegram'

export function useTelegram(token) {
  const [bot, setBot] = useState(null)
  const [posts, setPosts] = useState(() => loadCache().posts)
  const [chats, setChats] = useState(() => loadCache().chats)
  const [error, setError] = useState(null)
  const [live, setLive] = useState(false)
  const abort = useRef(null)
  const stateRef = useRef({ posts, chats })
  stateRef.current = { posts, chats }

  const persist = useCallback(() => saveCache(stateRef.current), [])

  useEffect(() => {
    if (!token) { setBot(null); setLive(false); return }
    let dead = false
    setError(null)

    const run = async () => {
      try {
        const me = await tg.me(token)
        if (dead) return
        setBot(me)
      } catch (e) {
        if (!dead) { setError(e.message); setLive(false) }
        return
      }
      while (!dead) {
        try {
          abort.current = new AbortController()
          const ups = await tg.updates(token, getOffset(), abort.current.signal)
          if (dead) return
          setLive(true); setError(null)
          if (ups.length) {
            setOffset(ups[ups.length - 1].update_id + 1)
            applyUpdates(ups)
          }
        } catch (e) {
          if (dead) return
          if (e.name === 'AbortError') return
          setLive(false)
          setError(e.message)
          await new Promise((r) => setTimeout(r, 5000))
        }
      }
    }

    const applyUpdates = (ups) => {
      const newPosts = []
      const chatPatch = {}
      for (const u of ups) {
        const cp = u.channel_post || u.edited_channel_post
        if (cp) { newPosts.push(postToUnified(cp)); continue }
        const m = u.message
        if (!m) continue
        const id = String(m.chat.id)
        const entry = chatPatch[id] || { messages: [] }
        entry.meta = {
          id, title: chanTitle(m.chat), type: m.chat.type, network: 'telegram',
          avatar: avatarFor(chanTitle(m.chat)), username: m.chat.username,
        }
        entry.messages.push({
          id: m.message_id, out: false,
          from: m.from ? [m.from.first_name, m.from.last_name].filter(Boolean).join(' ') || m.from.username : chanTitle(m.chat),
          text: m.text || m.caption || '[adjunto]',
          date: new Date(m.date * 1000).toISOString(),
        })
        chatPatch[id] = entry
      }
      if (newPosts.length) setPosts((p) => [...newPosts.reverse(), ...p].slice(0, 200))
      if (Object.keys(chatPatch).length) {
        setChats((c) => {
          const next = { ...c }
          for (const [id, patch] of Object.entries(chatPatch)) {
            const prev = next[id] || { ...patch.meta, messages: [] }
            next[id] = { ...prev, ...patch.meta, messages: [...prev.messages, ...patch.messages] }
          }
          return next
        })
      }
      setTimeout(persist, 200)
    }

    run()
    return () => { dead = true; abort.current?.abort() }
  }, [token, persist])

  const send = useCallback(async (chatId, text) => {
    const m = await tg.send(token, chatId, text)
    setChats((c) => {
      const prev = c[String(chatId)] || { id: String(chatId), title: String(chatId), network: 'telegram', avatar: avatarFor('TG'), messages: [] }
      return { ...c, [String(chatId)]: { ...prev, messages: [...prev.messages, { id: m.message_id, out: true, from: 'bot', text, date: new Date().toISOString() }] } }
    })
    setTimeout(persist, 100)
    return m
  }, [token, persist])

  const broadcast = useCallback(async (chatIdOrUser, text) => {
    const m = await tg.send(token, chatIdOrUser, text)
    setPosts((p) => [postToUnified({ ...m, chat: m.chat }), ...p])
    return m
  }, [token])

  const addChannel = useCallback(async (idOrUsername) => {
    const chat = await tg.chat(token, idOrUsername)
    setChats((c) => ({
      ...c,
      [String(chat.id)]: c[String(chat.id)] || {
        id: String(chat.id), title: chanTitle(chat), type: chat.type, network: 'telegram',
        avatar: avatarFor(chanTitle(chat)), username: chat.username, messages: [],
      },
    }))
    setTimeout(persist, 100)
    return chat
  }, [token, persist])

  return { bot, posts, chats, error, live, send, broadcast, addChannel, setChats, session: tgSession() }
}
