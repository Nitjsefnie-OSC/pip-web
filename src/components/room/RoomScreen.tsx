'use client'

// `/game/room?code=…`: a multiplayer table, from the invite to the last hand.
//
// The code is in the query string because the site is a static export: there
// is no server to render `/room/ABC123`, so the page is one file and the code
// is read here. The share link opens straight onto it, in a browser or the app.
//
// **Sitting down is a tap.** Even with a code in the link, nobody is seated by
// opening a page: they see whose room it is and the buy-in, and press Join.
// That tap is also what lets a phone play the table's voices, which no browser
// allows without one.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Users } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { AccountDialog } from '@/components/settings/AccountDialog'
import { venueById } from '@/config/venues'
import { normaliseRoomCode } from '@/lib/multiplayer/code'
import { devSignedIn, peekRoom, roomsConfigured, type RoomPeek } from '@/lib/multiplayer/client'
import type { ServerError } from '@/lib/multiplayer/protocol'
import { appSupports, inApp } from '@/lib/nativeApp'
import { sound } from '@/lib/sound'
import { useMoney } from '@/lib/useMoney'
import { useSpendableRoll } from '@/lib/useSpendableRoll'
import { mediaSupported, useMedia } from '@/store/media'
import { useRoom } from '@/store/room'
import { useSync } from '@/store/sync'
import { RoomLobby } from './RoomLobby'
import { RoomTable } from './RoomTable'

const ERROR_COPY: Partial<Record<ServerError, string>> = {
  auth: 'Sign in again to sit down.',
  'members-only': 'Opening a room comes with the membership.',
  'no-room': 'There’s no room with that code. It may have finished, or the code is mistyped.',
  full: 'That table is full.',
  started: 'That game has already started. Only the players who sat down before the deal can join.',
  'not-invited': 'That table was matched for other players.',
  closed: 'That room has closed.',
  kicked: 'The host removed you from this room.',
}

export function RoomScreen() {
  const params = useSearchParams()
  const code = normaliseRoomCode(params.get('code') ?? '')
  const router = useRouter()
  const roomCode = useRoom((s) => s.code)
  const connection = useRoom((s) => s.connection)
  const view = useRoom((s) => s.view)
  const error = useRoom((s) => s.error)
  const leave = useRoom((s) => s.leave)

  const sitting = code !== null && roomCode === code

  const goBack = () => {
    useMedia.getState().stop()
    leave()
    router.push('/game/multiplayer')
  }

  if (!roomsConfigured()) return <Unavailable />
  if (!code) return <NoRoom message="That link doesn’t have a room code in it." />
  if (!sitting) return <JoinGate code={code} />

  if (connection === 'gone' || (!view && error)) {
    return <NoRoom message={(error && ERROR_COPY[error]) ?? 'The table closed.'} />
  }
  if (!view) return <Waiting label="Pulling up a chair" />

  const live = view.kind === 'private' && mediaSupported() && (!inApp() || appSupports('media'))

  return (
    <>
      {live && <MeshLink />}
      {view.phase === 'lobby' ? (
        <RoomLobby view={view} live={live} onLeave={goBack} />
      ) : view.hand ? (
        <RoomTable view={view} live={live} onLeave={goBack} />
      ) : (
        <Waiting label="Dealing" />
      )}
    </>
  )
}

/**
 * Keeps one camera-and-mic connection open to every other person in the room,
 * and closes them all when you leave. Renders nothing.
 */
function MeshLink() {
  const view = useRoom((s) => s.view)
  const media = useRoom((s) => s.media)
  const me = view?.you ?? null
  // The seats whose sockets are open, which is what `media` is keyed by.
  const peers = Object.keys(media)
    .filter((id) => id !== me)
    .sort()
    .join(',')
  const session = useRoom((s) => s.session)
  useEffect(() => {
    if (me) useMedia.getState().connect(me, peers ? peers.split(',') : [])
  }, [me, peers])
  // A new socket starts with your camera and mic marked off on the server.
  // If they are on here, say so again.
  useEffect(() => {
    const { camera, mic } = useMedia.getState()
    if (session > 0 && (camera || mic)) useRoom.getState().setMedia({ camera, mic })
  }, [session])
  useEffect(() => () => useMedia.getState().stop(), [])
  return null
}

/** Back from a room's own screens goes to multiplayer, not the lobby. */
function useToMultiplayer(): () => void {
  const router = useRouter()
  return () => router.push('/game/multiplayer')
}

function JoinGate({ code }: { code: string }) {
  const toMultiplayer = useToMultiplayer()
  const money = useMoney()
  const spendable = useSpendableRoll()
  const signedIn = useSync((s) => s.status === 'signed-in') || devSignedIn()
  const ready = useSync((s) => s.ready)
  const enter = useRoom((s) => s.enter)
  const [peek, setPeek] = useState<RoomPeek | null | 'loading'>('loading')
  const [accountOpen, setAccountOpen] = useState(false)

  useEffect(() => {
    let live = true
    void peekRoom(code).then((p) => {
      if (live) setPeek(p)
    })
    return () => {
      live = false
    }
  }, [code])

  if (peek === 'loading' || !ready) return <Waiting label="Finding the room" />
  if (!peek || peek.phase === 'closed' || peek.phase === 'finished') {
    return <NoRoom message={ERROR_COPY['no-room']!} />
  }
  const venue = venueById(peek.venueId)
  // Coming back to a game already dealt is never refused for the Roll: the
  // buy-in went in on the deal.
  const short = peek.phase === 'lobby' && peek.forRoll !== false && spendable < peek.buyIn
  const full = peek.phase === 'lobby' && peek.seated >= peek.maxSeats

  return (
    <PageShell leading="back" backLabel="Multiplayer" onBack={toMultiplayer}>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 py-10 text-center">
        <div className="grid size-14 place-items-center rounded-full bg-foreground/[0.06]">
          <Users className="size-6" />
        </div>
        <div>
          <p className="text-2xs uppercase tracking-[0.25em] text-muted-foreground">Room {code}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {peek.kind === 'quick'
              ? 'Your quick match'
              : peek.host
                ? `${peek.host}’s table`
                : 'A table'}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {venue?.name ?? 'Ladder'} stakes · {money(peek.buyIn)} buy-in · {peek.seated} of{' '}
            {peek.maxSeats} seated
          </p>
        </div>

        {!signedIn ? (
          <>
            <p className="text-sm text-muted-foreground">
              Sign in so the table knows it’s you. An account is free, and joining a friend’s room
              needs nothing else.
            </p>
            <button
              onClick={() => setAccountOpen(true)}
              className="w-full rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98]"
            >
              Sign in to join
            </button>
          </>
        ) : full ? (
          <p className="text-sm text-muted-foreground">{ERROR_COPY.full}</p>
        ) : short ? (
          <p className="text-sm text-muted-foreground">
            The buy-in is {money(peek.buyIn)} and your Roll has {money(spendable)}. Win a few hands
            on the ladder and come back.
          </p>
        ) : (
          <button
            onClick={() => {
              sound.play('call')
              enter(code)
            }}
            className="w-full rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98]"
          >
            {peek.phase === 'playing' ? 'Back to the table' : 'Join'}
          </button>
        )}
      </div>
      <AccountDialog open={accountOpen} mode="signin" onOpenChange={setAccountOpen} />
    </PageShell>
  )
}

function Waiting({ label }: { label: string }) {
  return (
    <div className="flex h-dvh items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> {label}
    </div>
  )
}

function NoRoom({ message }: { message: string }) {
  const toMultiplayer = useToMultiplayer()
  return (
    <PageShell leading="back" backLabel="Multiplayer" onBack={toMultiplayer}>
      <div className="mx-auto flex max-w-sm flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
        <p className="text-muted-foreground">{message}</p>
        <Link
          href="/game/multiplayer"
          className="rounded-2xl bg-foreground/[0.08] px-6 py-3 font-semibold transition hover:bg-foreground/[0.14]"
        >
          Multiplayer
        </Link>
      </div>
    </PageShell>
  )
}

function Unavailable() {
  return <NoRoom message="Multiplayer isn’t switched on in this version of Pip." />
}
