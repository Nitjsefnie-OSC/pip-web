// Make a web push (VAPID) key pair for the room server, printed as the two
// secrets it reads. Run once; keep the private key out of the repo:
//
//   pnpm rooms:vapid
//   npx wrangler secret put VAPID_PUBLIC_KEY -c rooms/wrangler.jsonc
//   npx wrangler secret put VAPID_PRIVATE_KEY -c rooms/wrangler.jsonc
//
// Changing the pair later unsubscribes every browser, so do not rotate it
// without a reason.

const b64url = (bytes) => Buffer.from(bytes).toString('base64url')

const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
  'sign',
  'verify',
])
const pub = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))
const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey)

console.log(`VAPID_PUBLIC_KEY=${b64url(pub)}`)
console.log(`VAPID_PRIVATE_KEY=${jwk.d}`)
