import { useMemo, useState } from 'react'
import { I } from '../ui/icons'
import { Avatar, timeAgo, fmtCount, Empty, Spinner } from '../ui/bits'

export default function Wall({ posts, loading, filter, setFilter, onFav, onBoost, onOpenSource, tgOn, mastoOn }) {
  const list = useMemo(() => posts.filter((p) => filter === 'all' || p.network === filter), [posts, filter])

  return (
    <>
      <div className="seg">
        <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>Todo</button>
        <button className={filter === 'telegram' ? 'on' : ''} onClick={() => setFilter('telegram')}><I.tg /> Canales</button>
        <button className={filter === 'mastodon' ? 'on' : ''} onClick={() => setFilter('mastodon')}><I.masto /> Fediverso</button>
      </div>

      <div className="body">
        {loading && !list.length && <Spinner label="Trayendo publicaciones…" />}
        {!loading && !list.length && (
          <Empty icon={I.wall} title="Muro vacío"
            text={!tgOn && !mastoOn
              ? 'Conecta tu cuenta para ver aquí los posts de tus canales de Telegram y el timeline de Mastodon.'
              : filter === 'mastodon' && !mastoOn ? 'Añade tu cuenta de Mastodon desde Perfil para ver el fediverso.'
                : 'Tus canales aún no tienen publicaciones recientes.'} />
        )}

        {list.map((p) => (
          <article className="post" key={p.id}>
            {p.boostedBy && <div className="boostline"><I.boost width="13" height="13" /> impulsado por {p.boostedBy}</div>}
            <div className="phead" onClick={() => onOpenSource?.(p)}>
              <Avatar src={p.author.avatar} name={p.author.name} id={p.author.handle} size={44} network={p.network} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="nm">{p.author.name}</div>
                <div className="mt">
                  <span>{p.author.handle}</span>·<span>{timeAgo(p.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="ptxt txt" dangerouslySetInnerHTML={{ __html: p.html }} />

            {!!p.media?.length && (
              <div className="pmedia">
                {p.media.map((m, i) => m.type === 'video' || m.type === 'gifv'
                  ? <video key={i} src={m.full} controls muted loop playsInline />
                  : <img key={i} src={m.url} alt="" loading="lazy" />)}
              </div>
            )}

            <div className="pacts">
              {p.network === 'mastodon' ? (
                <>
                  <button className="pact" onClick={() => onOpenSource?.(p)}><I.reply /> {fmtCount(p.stats.replies)}</button>
                  <button className={'pact bo ' + (p.reblogged ? 'on' : '')} onClick={() => onBoost(p)}><I.boost /> {fmtCount(p.stats.boosts)}</button>
                  <button className={'pact ' + (p.favourited ? 'on' : '')} onClick={() => onFav(p)}><I.heart /> {fmtCount(p.stats.favs)}</button>
                </>
              ) : (
                <>
                  <button className="pact" onClick={() => onOpenSource?.(p)}><I.chat width="18" height="18" /> Abrir canal</button>
                  {p.stats.favs > 0 && <span className="pact"><I.eye /> {fmtCount(p.stats.favs)}</span>}
                  {p.stats.boosts > 0 && <span className="pact"><I.boost /> {fmtCount(p.stats.boosts)}</span>}
                </>
              )}
              {p.url && <a className="pact" style={{ marginLeft: 'auto' }} href={p.url} target="_blank" rel="noreferrer"><I.link /></a>}
            </div>
          </article>
        ))}
        <div style={{ height: 80 }} />
      </div>
    </>
  )
}
