'use client'

// Everything account-shaped lives here, in its own dialog over Settings. The
// forms used to sit inline in the Settings sheet, which made it long and made a
// four-field flow share a scroll with the dark-mode toggle. Same reasoning as
// the QR: a real task gets its own surface rather than a cramped inline panel.
//
// Four modes, one dialog. Signed out it's sign in / create / reset; signed in
// it's the management view. Nothing here nags: it only opens when the player
// presses a button in Settings asking for it.

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSync } from '@/store/sync'
import { sound } from '@/lib/sound'
import { cn } from '@/lib/utils'

export type AccountMode = 'signin' | 'signup' | 'reset' | 'manage'

const field =
  'w-full rounded-xl bg-foreground/[0.04] px-3 py-2.5 text-sm outline-none ring-primary/40 focus:ring-2'
const primaryButton =
  'rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40'
const secondaryButton =
  'flex-1 rounded-xl bg-foreground/[0.06] py-2.5 text-sm font-medium transition hover:bg-foreground/[0.12]'

const COPY: Record<AccountMode, { title: string; description: string }> = {
  signin: {
    title: 'Sign in',
    description: 'Your progress follows you to any device you sign in on.',
  },
  signup: {
    title: 'Create an account',
    description:
      'Free, optional, and only for carrying your progress between devices. You can play everything without one.',
  },
  reset: {
    title: 'Reset your password',
    description: 'We’ll email you a link. Your progress on this device is untouched either way.',
  },
  manage: { title: 'Your account', description: 'Sync, sign out, or delete it entirely.' },
}

export function AccountDialog({
  open,
  mode,
  onOpenChange,
}: {
  open: boolean
  mode: AccountMode
  onOpenChange: (open: boolean) => void
}) {
  const [current, setCurrent] = useState<AccountMode>(mode)
  const status = useSync((s) => s.status)
  const clearError = useSync((s) => s.clearError)

  // Reopening should show what the button asked for, not the last thing shown.
  useEffect(() => {
    if (open) {
      setCurrent(mode)
      clearError()
    }
  }, [open, mode, clearError])

  // Signing in or out from inside the dialog flips it to the other side rather
  // than leaving a stale form behind.
  useEffect(() => {
    if (!open) return
    if (status === 'signed-in') setCurrent('manage')
    else if (current === 'manage') setCurrent('signin')
  }, [status, open, current])

  const copy = COPY[current]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-1">
          {current === 'manage' ? (
            <Manage onDone={() => onOpenChange(false)} />
          ) : (
            <AuthForm mode={current} setMode={setCurrent} onDone={() => onOpenChange(false)} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function AuthForm({
  mode,
  setMode,
  onDone,
}: {
  mode: AccountMode
  setMode: (m: AccountMode) => void
  onDone: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const { busy, error, signIn, signUp, sendReset, clearError } = useSync()

  const go = (next: AccountMode) => {
    sound.play('tap')
    clearError()
    setSent(false)
    setMode(next)
  }

  const submit = async () => {
    sound.play('tap')
    if (mode === 'reset') {
      setSent(await sendReset(email.trim()))
      return
    }
    const ok =
      mode === 'signin'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password)
    // Closing on success is the whole confirmation: the Settings row behind
    // this now says "signed in as …", so a success screen would be a click for
    // nothing.
    if (ok) onDone()
  }

  return (
    <>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void submit()}
        placeholder="Email"
        autoComplete="email"
        aria-label="Email"
        className={field}
      />
      {mode !== 'reset' && (
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
          placeholder="Password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          aria-label="Password"
          className={field}
        />
      )}

      <button
        onClick={submit}
        disabled={busy || !email.trim() || (mode !== 'reset' && password.length < 8)}
        className={primaryButton}
      >
        {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
      </button>

      {mode === 'signup' && (
        <p className="text-[11px] leading-relaxed text-muted-foreground/70">
          At least 8 characters. We store your email and your profile, nothing else, no tracking,
          and you can delete both from here whenever you like.
        </p>
      )}

      {sent && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Sent. Check your email for the link. It expires after an hour.
        </p>
      )}
      {error && <p className="text-xs leading-relaxed text-suit-red">{error}</p>}

      <div className="flex flex-col items-center gap-1 pt-1 text-[11px] text-muted-foreground/70">
        {mode === 'signin' && (
          <>
            <button onClick={() => go('reset')} className="underline-offset-2 hover:underline">
              Forgotten your password?
            </button>
            <button onClick={() => go('signup')} className="underline-offset-2 hover:underline">
              No account yet? Create one
            </button>
          </>
        )}
        {mode === 'signup' && (
          <button onClick={() => go('signin')} className="underline-offset-2 hover:underline">
            Already have one? Sign in
          </button>
        )}
        {mode === 'reset' && (
          <button onClick={() => go('signin')} className="underline-offset-2 hover:underline">
            Back to sign in
          </button>
        )}
      </div>
    </>
  )
}

function Manage({ onDone }: { onDone: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const { email, busy, dirty, lastSyncedAt, error, signOut, syncNow, deleteSyncedData } = useSync()

  return (
    <>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Signed in as <span className="text-foreground">{email}</span>. Your progress syncs on its
        own.{' '}
        {dirty
          ? 'Saving…'
          : lastSyncedAt
            ? `Last synced ${when(lastSyncedAt)}.`
            : 'Not synced yet.'}
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => {
            sound.play('tap')
            void syncNow()
          }}
          disabled={busy}
          className={cn(secondaryButton, busy && 'opacity-50')}
        >
          Sync now
        </button>
        <button
          onClick={() => {
            sound.play('tap')
            void signOut().then(onDone)
          }}
          disabled={busy}
          className={secondaryButton}
        >
          Sign out
        </button>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground/70">
        Signing out leaves your profile on this device exactly as it is.
      </p>

      {confirming ? (
        <div className="flex flex-col gap-2 rounded-xl bg-foreground/[0.04] p-3">
          <p className="text-xs leading-relaxed">
            This deletes your account and the synced copy of your profile. The profile on this
            device stays exactly as it is. It cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                sound.play('tap')
                setConfirming(false)
              }}
              className={secondaryButton}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                sound.play('call')
                void deleteSyncedData().then((ok) => ok && onDone())
              }}
              className={cn(secondaryButton, 'text-suit-red')}
            >
              Delete it
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => {
            sound.play('tap')
            setConfirming(true)
          }}
          className="pt-1 text-center text-[11px] text-muted-foreground/70 underline-offset-2 hover:underline"
        >
          Delete my account and synced data
        </button>
      )}

      {error && <p className="text-xs leading-relaxed text-suit-red">{error}</p>}
    </>
  )
}

/** Rough and human. Nobody needs a timestamp for this. */
function when(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
