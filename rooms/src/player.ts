// One player's slow games: a Durable Object per account.
//
// A room knows who is at it; nothing knows which rooms one person is at. This
// object is that index. Each slow room sends every player at it their own
// mini table (`SlowCard`, already redacted for them) whenever it changes, and
// this keeps them for Home, counts them against the limit, and decides what to
// tell the player, and when, from the rules in `lib/multiplayer/notices.ts`.
//
// It also holds what those notices need: the player's quiet hours and
// switches (Settings → Notifications) and the devices they allowed pushes on.
// All of it is keyed by the account, so it works the same on every device.

import { DurableObject } from 'cloudflare:workers'
import {
  DEFAULT_PREFS,
  emailSlot,
  nextDue,
  deviceId,
  planNotice,
  type Notice,
  type PlayPrefs,
  type PushDevice,
} from '@/lib/multiplayer/notices'
import { noticeCopy, type SlowCard } from '@/lib/multiplayer/slowCard'
import { MAX_SLOW_GAMES } from '@/lib/multiplayer/slow'
import { json, type Env } from './env'
import { emailOf, gameUrl, offLink, pushAll, sendEmail, turnEmail } from './notify'

/** Devices one account may register. The oldest is dropped past this. */
const MAX_DEVICES = 10

export class Player extends DurableObject<Env> {
  private async get<T>(key: string, fallback: T): Promise<T> {
    return ((await this.ctx.storage.get<T>(key)) ?? fallback) as T
  }

  private async games(): Promise<Record<string, SlowCard>> {
    return this.get<Record<string, SlowCard>>('games', {})
  }

  private async prefs(): Promise<PlayPrefs> {
    return { ...DEFAULT_PREFS, ...(await this.get<Partial<PlayPrefs>>('prefs', {})) }
  }

  private async devices(): Promise<PushDevice[]> {
    return this.get<PushDevice[]>('devices', [])
  }

  private async notices(): Promise<Record<string, Notice>> {
    return this.get<Record<string, Notice>>('notices', {})
  }

  private async arm(notices: Record<string, Notice>): Promise<void> {
    const at = nextDue(Object.values(notices))
    if (at === null) await this.ctx.storage.deleteAlarm()
    else await this.ctx.storage.setAlarm(at)
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const userId = url.searchParams.get('user') ?? ''
    if (userId) await this.ctx.storage.put('user', userId)
    switch (`${request.method} ${url.pathname}`) {
      case 'GET /games': {
        const games = Object.values(await this.games()).filter((g) => g.phase !== 'closed')
        return json({ games }, 200)
      }
      case 'GET /open': {
        const open = Object.values(await this.games()).filter(
          (g) => g.phase === 'lobby' || g.phase === 'playing',
        )
        return json({ open: open.length, max: MAX_SLOW_GAMES }, 200)
      }
      case 'POST /card':
        return this.card((await request.json()) as SlowCard)
      case 'POST /dismiss': {
        const { code } = (await request.json()) as { code?: string }
        const games = await this.games()
        // Only a finished game can be swiped away; one still running is not yours to drop.
        if (code && games[code]?.phase === 'finished') {
          delete games[code]
          await this.ctx.storage.put('games', games)
        }
        return json({ ok: true }, 200)
      }
      case 'GET /prefs':
        return json(
          {
            prefs: await this.prefs(),
            // Whether they have ever saved any: until then the timezone is a guess.
            set: (await this.ctx.storage.get('prefs')) !== undefined,
            devices: (await this.devices()).map((d) => ({ kind: d.kind, id: deviceId(d) })),
          },
          200,
        )
      case 'POST /prefs': {
        const next = (await request.json()) as PlayPrefs
        await this.ctx.storage.put('prefs', next)
        return json({ prefs: next, rooms: await this.liveCodes() }, 200)
      }
      case 'POST /devices': {
        const device = (await request.json()) as PushDevice
        const others = (await this.devices()).filter((d) => deviceId(d) !== deviceId(device))
        await this.ctx.storage.put('devices', [...others, device].slice(-MAX_DEVICES))
        return json({ ok: true }, 200)
      }
      case 'POST /devices/remove': {
        const { id } = (await request.json()) as { id?: string }
        await this.ctx.storage.put(
          'devices',
          (await this.devices()).filter((d) => deviceId(d) !== id),
        )
        return json({ ok: true }, 200)
      }
      case 'POST /email-off': {
        await this.ctx.storage.put('prefs', { ...(await this.prefs()), email: false })
        const notices = await this.notices()
        for (const n of Object.values(notices)) n.emailAt = null
        await this.ctx.storage.put('notices', notices)
        await this.arm(notices)
        return json({ ok: true }, 200)
      }
    }
    return new Response(null, { status: 404 })
  }

  /** Codes of the games still being played, so a change of quiet hours can reach them. */
  private async liveCodes(): Promise<string[]> {
    return Object.values(await this.games())
      .filter((g) => g.phase === 'lobby' || g.phase === 'playing')
      .map((g) => g.code)
  }

  /** A room's latest for this player: kept, and whatever it calls for planned. */
  private async card(card: SlowCard): Promise<Response> {
    const games = await this.games()
    const notices = await this.notices()
    if (card.phase === 'closed') {
      delete games[card.code]
      delete notices[card.code]
    } else {
      // Older news arriving late never overwrites newer.
      const prev = games[card.code]
      if (prev && prev.updatedAt > card.updatedAt) return json({ ok: true }, 200)
      games[card.code] = card
      const planned = planNotice(
        notices[card.code],
        card,
        await this.prefs(),
        (await this.devices()).length > 0,
        Date.now(),
      )
      if (planned) notices[card.code] = planned
      else delete notices[card.code]
    }
    await this.ctx.storage.put('games', games)
    await this.ctx.storage.put('notices', notices)
    await this.arm(notices)
    return json({ ok: true }, 200)
  }

  async alarm(): Promise<void> {
    try {
      await this.deliver()
    } catch (e) {
      console.error('notices failed', { error: String(e) })
    }
  }

  private async deliver(): Promise<void> {
    const now = Date.now()
    const userId = await this.get<string>('user', '')
    const games = await this.games()
    const notices = await this.notices()
    const prefs = await this.prefs()
    let devices = await this.devices()

    for (const n of Object.values(notices)) {
      if (n.pushAt === null || n.pushAt > now) continue
      n.pushAt = null
      const card = games[n.code]
      const copy = card && noticeCopy(card, now)
      // Nothing to say, or they are looking at the table already.
      if (!card || !copy || card.watching || !prefs.push) continue
      const gone = await pushAll(this.env, devices, {
        ...copy,
        url: gameUrl(card.code),
        tag: `pip-${card.code}`,
      })
      if (gone.length) devices = devices.filter((d) => !gone.includes(deviceId(d)))
    }
    await this.ctx.storage.put('devices', devices)

    const emailDue = Object.values(notices).some((n) => n.emailAt !== null && n.emailAt <= now)
    if (emailDue) {
      // Every game still waiting on them, the one that came due or not.
      const waiting = Object.values(games)
        .filter((g) => g.yourTurn && !g.watching && notices[g.code]?.key === g.turnKey)
        .sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0))
      const last = await this.get<number | null>('lastEmailAt', null)
      const slot = emailSlot(now, last, prefs)
      if (!prefs.email || waiting.length === 0) {
        for (const n of Object.values(notices))
          if (n.emailAt !== null && n.emailAt <= now) n.emailAt = null
      } else if (slot > now) {
        for (const n of Object.values(notices))
          if (n.emailAt !== null && n.emailAt <= now) n.emailAt = slot
      } else {
        const to = userId ? await emailOf(this.env, userId) : null
        if (to) {
          const off = await offLink(this.env, userId)
          await sendEmail(this.env, to, turnEmail(waiting, now, off), off)
        }
        await this.ctx.storage.put('lastEmailAt', now)
        // One email covers every game in it.
        for (const n of Object.values(notices)) n.emailAt = null
      }
    }

    // Spent notices are kept (their key stops the same turn being told twice)
    // until the game moves on; the alarm only needs the ones still due.
    await this.ctx.storage.put('notices', notices)
    await this.arm(notices)
  }
}
