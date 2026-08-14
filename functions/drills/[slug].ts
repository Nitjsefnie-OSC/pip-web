import { serveContentPage } from '../_shared'

// One per drill kind, matched by slug. The runner itself is app and opts out
// of the mirror; the prose around it is what an agent reads here.

export const onRequestGet = serveContentPage
export const onRequestHead = serveContentPage
