'use client'

// The account's footprint inside Settings: one line of copy and one row of
// buttons. Every form lives in AccountDialog, over the top.
//
// Signed out is a first-class state, permanently. There is no banner, no
// interstitial and no "sync your progress!" anywhere in the app, and if the
// build has no Supabase project configured this renders nothing at all.

import { useState } from 'react'
import { AccountDialog, type AccountMode } from '@/components/settings/AccountDialog'
import { useSync } from '@/store/sync'
import { sound } from '@/lib/sound'

const secondaryButton =
  'flex-1 rounded-xl bg-foreground/[0.06] py-2.5 text-sm font-medium transition hover:bg-foreground/[0.12]'

/**
 * Renders inside Settings' "Move to another device" section rather than owning
 * one of its own. An account and a transfer code answer the same question, and
 * giving each its own heading made the dialog twice as tall as it needed to be.
 */
export function SyncSection() {
  const status = useSync((s) => s.status)
  const email = useSync((s) => s.email)
  const dirty = useSync((s) => s.dirty)
  const [dialog, setDialog] = useState<AccountMode | null>(null)

  if (status === 'off') return null
  const signedIn = status === 'signed-in'

  const open = (mode: AccountMode) => {
    sound.play('tap')
    setDialog(mode)
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="mb-1 text-xs leading-relaxed text-muted-foreground">
        {signedIn ? (
          <>
            Signed in as <span className="text-foreground">{email}</span>. Your progress syncs on
            its own{dirty ? ', saving now' : ''}.
          </>
        ) : (
          <>
            Sign in and your progress follows you. Or carry it across by hand, below. Neither is
            needed to play, and nothing leaves this device until you pick one.
          </>
        )}
      </p>

      {signedIn ? (
        <button onClick={() => open('manage')} className={secondaryButton}>
          Manage account
        </button>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => open('signin')} className={secondaryButton}>
            Sign in
          </button>
          <button onClick={() => open('signup')} className={secondaryButton}>
            Create account
          </button>
        </div>
      )}

      <AccountDialog
        open={dialog !== null}
        mode={dialog ?? 'signin'}
        onOpenChange={(o) => !o && setDialog(null)}
      />
    </div>
  )
}
