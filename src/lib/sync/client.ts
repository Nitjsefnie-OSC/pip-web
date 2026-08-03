// The Supabase seam. Everything that knows Supabase exists lives behind this
// module, so the rest of the app only ever sees "sync is available or it isn't".
//
// Two properties worth keeping:
//
//   1. **Nothing happens without an account.** The client is created lazily, on
//      the first call that needs it, so an ordinary visit makes no network call,
//      creates no identity and sets no storage. That is the brand claim, not an
//      optimisation, and it is why this is a getter rather than a module-level
//      `createClient()`.
//   2. **Missing config is a supported state**, not a crash. Local builds and
//      forks have no project, so `getSupabase()` returns null and every sync
//      surface hides itself. A contributor should never have to set up a
//      backend to run the app.
//
// The publishable key is public and always will be: it ships in the bundle and
// the repo is open source. RLS on the `profiles` table is the only thing
// protecting user data. See supabase/migrations/.

'use client'

// Type-only: erased at build time, so importing it costs nothing.
import type { SupabaseClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** Is sync configured in this build? Safe to call during render. */
export function syncConfigured(): boolean {
  return Boolean(URL && KEY)
}

let client: SupabaseClient | null = null
let loading: Promise<SupabaseClient | null> | null = null

/**
 * The client, created on first use. Null when the build has no project.
 *
 * **The import is dynamic on purpose.** Statically importing supabase-js put
 * ~54 KB (brotli) into the shared chunk that every page loads, including the
 * marketing landing page, where it can never be used — about 15% on top of the
 * whole landing payload for a feature most visitors never touch. This way the
 * library is a lazy chunk fetched only when somebody actually has a session or
 * reaches for the sign-in form.
 *
 * The cost of that is this returning a promise. Every caller is already async.
 */
export async function getSupabase(): Promise<SupabaseClient | null> {
  if (!URL || !KEY) return null
  if (client) return client
  if (!loading) {
    loading = import('@supabase/supabase-js').then(({ createClient }) => {
      client = createClient(URL, KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // The reset link comes back as a URL fragment; let the client consume it.
          detectSessionInUrl: true,
        },
      })
      return client
    })
  }
  return loading
}

/** The row shape in `profiles`. Mirrors supabase/migrations/. */
export interface ProfileRow {
  user_id: string
  version: number
  state: Record<string, unknown>
  updated_at: string
  device_id: string | null
}

const DEVICE_KEY = 'pip.device'

/**
 * A stable id for this browser, so a row can say who wrote it last. Not an
 * identity and never sent anywhere except the user's own row: it exists so the
 * conflict prompt can tell "another device wrote this" from "I wrote this".
 */
export function deviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY)
    if (existing) return existing
    const fresh = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, fresh)
    return fresh
  } catch {
    // Storage blocked (Safari private mode). A per-tab id still tells two
    // devices apart, it just won't survive a reload.
    return 'ephemeral'
  }
}
