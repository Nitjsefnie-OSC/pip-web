import { serveContentPage } from '../_shared'

// The drills index. Prose, so it has a mirror to serve.

export const onRequestGet = serveContentPage
export const onRequestHead = serveContentPage
