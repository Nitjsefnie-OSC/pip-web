'use client'

// The account section in Settings. Deliberately the quietest thing in the
// dialog: one line of explanation, a link, and nothing that nags.
//
// Signed out is a first-class state, permanently. There is no banner, no
// interstitial and no "sync your progress!" anywhere in the app. If the build
// has no Supabase project configured, this renders nothing at all.

import { useState } from 'react'
import { useSync } from '@/store/sync'
import { sound } from '@/lib/sound'
import { cn } from '@/lib/utils'

type Panel = 'none' | 'signin' | 'signup' | 'reset'

const field =
  'w-full rounded-xl bg-foreground/[0.04] px-3 py-2.5 text-sm outline-none ring-primary/40 focus:ring-2'
const primaryButton =
  'rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40'
const secondaryButton =
  'flex-1 rounded-xl bg-foreground/[0.06] py-2.5 text-sm font-medium transition hover:bg-foreground/[0.12]'

export function SyncSection() {
  const status = useSync((s) => s.status)
  if (status === 'off') return null
  return (
    <div>
      <p className="mb-2.5 text-xs uppercase tracking-[0.15em] text-muted-foreground">Account</p>
      {status === 'signed-in' ? <SignedIn /> : <SignedOut />}
    </div>
  )
}

function SignedOut() {
  const [panel, setPanel] = useState<Panel>('none')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const { busy, error, signIn, signUp, sendReset, clearError } = useSync()

  const open = (next: Panel) => {
    sound.play('tap')
    clearError()
    setSent(false)
    setPanel(panel === next ? 'none' : next)
  }

  const submit = async () => {
    sound.play('tap')
    if (panel === 'signin') await signIn(email.trim(), password)
    else if (panel === 'signup') await signUp(email.trim(), password)
    else if (panel === 'reset') setSent(await sendReset(email.trim()))
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="mb-1 text-xs leading-relaxed text-muted-foreground">
        Optional. Add an account and your progress follows you to another device. Without one
        nothing leaves this device, which is how Pip works by default.
      </p>

      <div className="flex gap-2">
        <button onClick={() => open('signin')} className={secondaryButton}>
          Sign in
        </button>
        <button onClick={() => open('signup')} className={secondaryButton}>
          Create account
        </button>
      </div>

      {panel !== 'none' && (
        <div className="flex flex-col gap-2 pt-1">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            aria-label="Email"
            className={field}
          />
          {panel !== 'reset' && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete={panel === 'signup' ? 'new-password' : 'current-password'}
              aria-label="Password"
              className={field}
            />
          )}
          <button
            onClick={submit}
            disabled={busy || !email.trim() || (panel !== 'reset' && password.length < 8)}
            className={primaryButton}
          >
            {panel === 'signin'
              ? 'Sign in'
              : panel === 'signup'
                ? 'Create account'
                : 'Send reset link'}
          </button>

          {panel === 'signup' && (
            <p className="text-[11px] leading-relaxed text-muted-foreground/70">
              We store your email and your profile. Nothing else, no tracking, and you can delete
              both from here whenever you like.
            </p>
          )}
          {panel === 'signin' && (
            <button
              onClick={() => open('reset')}
              className="text-center text-[11px] text-muted-foreground/70 underline-offset-2 hover:underline"
            >
              Forgotten your password?
            </button>
          )}
          {sent && (
            <p className="text-xs text-muted-foreground">
              Sent. Check your email for the reset link.
            </p>
          )}
          {error && <p className="text-xs text-suit-red">{error}</p>}
        </div>
      )}
    </div>
  )
}

function SignedIn() {
  const [confirming, setConfirming] = useState(false)
  const { email, busy, dirty, lastSyncedAt, error, signOut, syncNow, deleteSyncedData } = useSync()

  return (
    <div className="flex flex-col gap-2">
      <p className="mb-1 text-xs leading-relaxed text-muted-foreground">
        Signed in as <span className="text-foreground">{email}</span>. Your progress syncs on its
        own. {dirty ? 'Saving…' : lastSyncedAt ? `Last synced ${when(lastSyncedAt)}.` : ''}
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
            void signOut()
          }}
          disabled={busy}
          className={secondaryButton}
        >
          Sign out
        </button>
      </div>

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
                void deleteSyncedData()
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
          className="mt-1 text-center text-[11px] text-muted-foreground/70 underline-offset-2 hover:underline"
        >
          Delete my account and synced data
        </button>
      )}

      {error && <p className="text-xs text-suit-red">{error}</p>}
    </div>
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
