import type { Event as NostrEvent } from 'nostr-tools';
import { GEOINT_DEFAULT_CONFIG } from '../src/services/geoint/config';
import { parseEvent } from '../src/services/geoint/parser';

const sample = `Swift Rescue Mission targeting Mon, 01 Jun 2026 00:00:00 GMT · Vehicle: Pegasus XL · Site: Air launch to orbit · Contracted by NASA under the Small Business Innovation Research Phase 3 contract, Katalyst Space Technologies' LINK servicing spacecraft will rendezvous and attach to NASA’s Neil Gehrels Swift Observatory to re-boost its orbit. #starcom_intel ---GEOJSON---{"type":"Feature","geometry":{"type":"Point","coordinates":[-80.576859,28.492377]},"properties":{"timestamp":"2026-02-12T04:12:34.766Z","type":"report","description":"Swift Rescue Mission...","confidence":null,"version":1}}`;

const event: NostrEvent = {
  id: 'evt-test',
  pubkey: 'pub',
  sig: 'sig',
  kind: 1,
  content: sample,
  created_at: Math.floor(Date.now() / 1000),
  tags: [['t', 'starcom_intel']]
} as unknown as NostrEvent;

const result = parseEvent(event, GEOINT_DEFAULT_CONFIG);
console.log(JSON.stringify(result, null, 2));
