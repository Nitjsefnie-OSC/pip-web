import { Buffer } from 'node:buffer'
import test from 'ava'
import type { BackupEnvelope } from '../src/lib/backup'
import { decodeCode, encodeEnvelope } from '../src/lib/transfer'

const envelope: BackupEnvelope = {
  app: 'pip',
  exportedAt: '2026-10-01T12:34:56.000Z',
  profile: {
    version: 1,
    state: {
      created: true,
      name: 'Zoë 🂡',
      roll: 12345,
      peakRoll: 15000,
      avatar: { seed: 'café', options: { glasses: ['round'] } },
      awards: { firstWin: { earnedAt: '2026-09-30', venue: 'kitchen' } },
      history: [
        { roll: 10000, note: 'Début' },
        { roll: 12345, note: '🂡 wins' },
      ],
    },
  },
}

test('a transfer code preserves the full envelope and nested profile', async (t) => {
  const code = await encodeEnvelope(envelope)
  const result = await decodeCode(code)

  t.true(result.ok)
  if (result.ok) t.deepEqual(result.envelope, envelope)
})

test('the encoder uses pip1 gzip when CompressionStream is available', async (t) => {
  t.is(typeof CompressionStream, 'function')
  const code = await encodeEnvelope(envelope)
  t.true(code.startsWith('pip1:'))

  const result = await decodeCode(code)
  t.true(result.ok)
  if (result.ok) t.deepEqual(result.envelope, envelope)
})

test('a hand-built raw pip0 code preserves the full envelope', async (t) => {
  const payload = Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64url')
  const result = await decodeCode(`pip0:${payload}`)

  t.true(result.ok)
  if (result.ok) t.deepEqual(result.envelope, envelope)
})

test('a code without a transfer prefix returns an error without throwing', async (t) => {
  const result = await decodeCode('not-a-transfer-code')

  t.false(result.ok)
  if (!result.ok) t.regex(result.error, /\S/)
})

test('truncated gzip bytes return an error without throwing', async (t) => {
  const code = await encodeEnvelope(envelope)
  t.true(code.startsWith('pip1:'))
  const gzip = Buffer.from(code.slice(5), 'base64url')
  // Remove the gzip trailer so decompression must reject an incomplete stream.
  const damaged = gzip.subarray(0, gzip.length - 8).toString('base64url')
  const result = await decodeCode(`pip1:${damaged}`)

  t.false(result.ok)
  if (!result.ok) t.regex(result.error, /\S/)
})

test('valid JSON with the wrong envelope returns an error without throwing', async (t) => {
  const payload = Buffer.from('{"wrong":"shape"}', 'utf8').toString('base64url')
  const result = await decodeCode(`pip0:${payload}`)

  t.false(result.ok)
  if (!result.ok) t.regex(result.error, /\S/)
})
