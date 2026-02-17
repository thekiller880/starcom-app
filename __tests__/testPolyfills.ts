import { TextEncoder, TextDecoder } from 'util';

// Polyfill globals used by nostr-tools in test/node environments
if (typeof (globalThis as any).TextEncoder === 'undefined') {
  (globalThis as any).TextEncoder = TextEncoder;
}
if (typeof (globalThis as any).TextDecoder === 'undefined') {
  (globalThis as any).TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
}
if (typeof (globalThis as any).crypto === 'undefined') {
  // Provide webcrypto for libs expecting SubtleCrypto
  const { webcrypto } = require('crypto');
  (globalThis as any).crypto = webcrypto;
}
