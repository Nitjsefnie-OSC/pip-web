'use client'

// A private room's rules: set on the multiplayer page as the room is opened,
// and shown read-only at the room to everybody, host included.
//
// One grouped list, a row per rule and a segmented choice in each, the way
// the table builder reads. The server checks every value when the room is
// created; nothing here is the rule.

import { motion } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  BLIND_CHOICES,
  DEPTH_CHOICES,
  LEAVING_CHOICES,
  SEAT_CHOICES,
  TURN_CHOICES,
} from '@/config/roomRules'
import type { BlindSpeed, LeavingRule, RoomSettings } from '@/lib/multiplayer/room'
import { sound } from '@/lib/sound'
import { useMoney } from '@/lib/useMoney'
import { cn } from '@/lib/utils'

/** The table's rules as a dialog: read-only, for anybody at a room. */
export function RoomRulesDialog({
  open,
  onOpenChange,
  settings,
  buyIn,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: RoomSettings
  buyIn: number
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Table rules</DialogTitle>
        </DialogHeader>
        <SettingsList settings={settings} buyIn={buyIn} />
      </DialogContent>
    </Dialog>
  )
}

/**
 * Every rule, a row each. Editable on the multiplayer page as a room is
 * opened; read-only everywhere after that.
 */
export function SettingsList({
  settings,
  buyIn,
  onChange,
  stakes,
}: {
  settings: RoomSettings
  buyIn: number
  /** Absent: read-only. */
  onChange?: (patch: Partial<RoomSettings>) => void
  /** The stake picker, straight after the chips choice it depends on. */
  stakes?: React.ReactNode
}) {
  const money = useMoney()
  const editable = onChange !== undefined
  const set = (patch: Partial<RoomSettings>) => {
    if (!onChange) return
    sound.play('tap')
    onChange(patch)
  }
  return (
    <div className="divide-y divide-foreground/[0.07] overflow-hidden rounded-2xl bg-foreground/[0.04]">
      <Row label="Chips">
        <Choice
          value={settings.forRoll}
          options={[
            [true, `${money(buyIn)} from the Roll`],
            [false, 'Just for fun'],
          ]}
          onPick={(forRoll) => set({ forRoll })}
          editable={editable}
        />
      </Row>
      {stakes && <Row label="Stakes">{stakes}</Row>}
      <Row label="Seats">
        <Choice
          value={settings.seats}
          options={SEAT_CHOICES}
          onPick={(seats) => set({ seats })}
          editable={editable}
        />
      </Row>
      <Row label="Starting chips">
        <Choice
          value={settings.depth}
          options={DEPTH_CHOICES}
          onPick={(depth) => set({ depth })}
          editable={editable}
        />
      </Row>
      <Row label="Blinds">
        <Choice<BlindSpeed>
          value={settings.blinds}
          options={BLIND_CHOICES}
          onPick={(blinds) => set({ blinds })}
          editable={editable}
        />
      </Row>
      <Row label="Turn time">
        <Choice
          value={settings.turnSeconds}
          options={TURN_CHOICES}
          onPick={(turnSeconds) => set({ turnSeconds })}
          editable={editable}
        />
      </Row>
      <Row label="If someone leaves">
        <Choice<LeavingRule>
          value={settings.leaving}
          options={LEAVING_CHOICES}
          onPick={(leaving) => set({ leaving })}
          editable={editable}
        />
      </Row>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  )
}

/** A row of choices with a highlight that slides to the picked one. */
function Choice<T extends string | number | boolean>({
  value,
  options,
  onPick,
  editable,
}: {
  value: T
  options: readonly (readonly [T, string])[]
  onPick: (value: T) => void
  editable: boolean
}) {
  const id = options.map(([v]) => String(v)).join('-')
  return (
    <div className="flex rounded-xl bg-foreground/[0.05] p-0.5">
      {options.map(([v, label]) => {
        const on = v === value
        return (
          <button
            key={String(v)}
            onClick={() => !on && onPick(v)}
            disabled={!editable}
            aria-pressed={on}
            className={cn(
              'relative flex-1 rounded-[10px] px-2 py-2 text-xs font-semibold transition-colors sm:text-sm',
              on ? 'text-foreground' : 'text-muted-foreground',
              editable && !on && 'hover:text-foreground',
            )}
          >
            {on && (
              <motion.span
                layoutId={`room-setting-${id}`}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-[10px] bg-foreground/[0.1] ring-1 ring-foreground/10"
              />
            )}
            <span className="relative">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
