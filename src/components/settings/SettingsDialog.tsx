'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { SyncSection } from '@/components/settings/SyncSection'
import { TransferDialog } from '@/components/settings/TransferDialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useTheme } from '@/components/theme-provider'
import { useProfile } from '@/store/profile'
import { useSync } from '@/store/sync'
import { sound } from '@/lib/sound'
import { useHydrated } from '@/lib/useHydrated'
import { cn } from '@/lib/utils'

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID

/** App settings — the quiet stuff. Looks live in the Style dialog. */
export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Preferences and backups.</DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-6 pt-1">
          <AppearanceSection />
          <SoundSection />
          <TableTalkSection />
          <TransferSection />
          <ResetSection />
          <div className="flex flex-col items-center gap-1 text-[11px] tracking-wide text-muted-foreground/70">
            <a
              href="/credits"
              className="underline-offset-2 transition hover:text-foreground hover:underline"
            >
              Credits
            </a>
            {APP_VERSION && (
              <p className="text-center">
                Pip v{APP_VERSION}
                {BUILD_ID ? ` · ${BUILD_ID}` : ''}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** A labelled on/off switch — the shared shape for every toggle in Settings. */
function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={cn(
          'relative h-6 w-10 shrink-0 rounded-full transition',
          checked ? 'bg-primary' : 'bg-foreground/15',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-5 rounded-full bg-background shadow transition-all',
            checked ? 'left-[18px]' : 'left-0.5',
          )}
        />
      </button>
    </div>
  )
}

/** Light or dark — the toggle that used to live in the top bars. */
function AppearanceSection() {
  const { resolvedTheme, setTheme } = useTheme()
  const hydrated = useHydrated()
  const isDark = hydrated && resolvedTheme === 'dark'
  return (
    <ToggleRow
      label="Dark mode"
      hint="Switch the whole app between light and dark."
      checked={isDark}
      onChange={() => {
        sound.play('tap')
        setTheme(isDark ? 'light' : 'dark')
      }}
    />
  )
}

/** The card snaps, chip clinks and taps — global mute, was a top-bar button. */
function SoundSection() {
  const [muted, setMuted] = useState(sound.isMuted())
  return (
    <ToggleRow
      label="Sound"
      hint="Card snaps, chip clinks and the little taps."
      checked={!muted}
      onChange={() => {
        const next = !muted
        sound.setMuted(next)
        setMuted(next)
        if (!next) sound.play('tap')
      }}
    />
  )
}

/** The cast's rare one-liners at the table — on by default, easy to silence. */
function TableTalkSection() {
  const tableTalk = useProfile((s) => s.tableTalk)
  const setTableTalk = useProfile((s) => s.setTableTalk)
  return (
    <ToggleRow
      label="Table talk"
      hint="The occasional quiet line from the regulars."
      checked={tableTalk}
      onChange={() => {
        sound.play('tap')
        setTableTalk(!tableTalk)
      }}
    />
  )
}

/** Wipe the profile and Roll back to a clean start — guarded by a confirm. */
function ResetSection() {
  const reset = useProfile((s) => s.reset)
  return (
    <button
      onClick={() => {
        if (confirm('Reset your profile and Roll?')) reset()
      }}
      className="flex items-center justify-center gap-2 rounded-xl bg-foreground/[0.06] py-2.5 text-sm font-medium text-suit-red transition hover:bg-foreground/[0.12]"
    >
      <RotateCcw className="size-4" /> Reset profile
    </button>
  )
}

/**
 * Getting your progress onto another device: one section, two buttons.
 *
 * This had grown into two headings, five buttons and a stray text link, all
 * answering the same question, with a four-field sign-in flow sharing a scroll
 * with the dark-mode toggle. Both real tasks now open their own dialog and
 * Settings keeps only the doors.
 */
function TransferSection() {
  const [transferOpen, setTransferOpen] = useState(false)
  const syncOff = useSync((s) => s.status === 'off')

  return (
    <div>
      <p className="mb-2.5 text-xs uppercase tracking-[0.15em] text-muted-foreground">
        Move to another device
      </p>

      {syncOff ? (
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          Your progress lives on this device. Carry it across as a code, a QR or a file, with no
          account needed.
        </p>
      ) : (
        <SyncSection />
      )}

      <button
        onClick={() => {
          sound.play('tap')
          setTransferOpen(true)
        }}
        className={cn(
          'flex w-full items-center justify-center transition',
          syncOff
            ? 'min-h-11 rounded-xl bg-foreground/[0.06] py-3 text-sm font-medium hover:bg-foreground/[0.12]'
            : 'mt-1 min-h-11 text-xs text-muted-foreground/70 underline-offset-2 hover:text-foreground hover:underline',
        )}
      >
        {syncOff ? 'Move it by hand' : 'Carry it across by hand instead'}
      </button>

      <TransferDialog open={transferOpen} onOpenChange={setTransferOpen} />
    </div>
  )
}
