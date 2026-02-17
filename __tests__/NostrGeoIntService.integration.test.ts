import './testPolyfills';
import type { Event as NostrEvent } from 'nostr-tools';
import { NostrGeoIntService } from '../src/services/geoint';
import type { GeoIntConfig } from '../src/services/geoint/types';
import { importIntelReport as importIntelReportMock } from '../src/services/geoint/conversion';

const mockPoolClose = jest.fn();
const mockPoolSub = jest.fn();
const mockSubUnsub = jest.fn();

jest.mock('../src/services/geoint/conversion', () => {
  const actual = jest.requireActual('../src/services/geoint/conversion');
  return {
    __esModule: true,
    ...actual,
    mapFeatureToIntel: jest.fn((feature: any, ctx: any) => ({
      report: {
        id: `nostr-${feature.id}`,
        title: `GEOINT ${feature.id}`,
        content: 'imported',
        author: ctx?.sourceEvent?.pubkey ?? 'p',
        category: 'GEOINT',
        tags: ['nostr-geoint'],
        status: 'SUBMITTED',
        createdAt: new Date(feature.createdAtMs),
        updatedAt: new Date(feature.createdAtMs),
        latitude: (feature.geometry as any).lat ?? 0,
        longitude: (feature.geometry as any).lon ?? 0,
        confidence: 0.5,
        priority: 'PRIORITY',
        version: 1,
        manualSummary: false,
        history: []
      },
      validationOk: true
    })),
    importIntelReport: jest.fn(async (mapped: any) => {
      if (!mapped || !mapped.report) return null;
      return { ...mapped.report, id: mapped.report.id };
    })
  };
});

jest.mock('nostr-tools', () => {
  const mod = jest.requireActual('nostr-tools');
  return {
    __esModule: true,
    ...mod,
    SimplePool: jest.fn(() => ({
      sub: mockPoolSub,
      close: mockPoolClose
    })),
    validateEvent: jest.fn(),
    verifySignature: jest.fn()
  };
});

const mockValidateEvent = (jest.requireMock('nostr-tools') as any).validateEvent as jest.Mock;
const mockVerifySignature = (jest.requireMock('nostr-tools') as any).verifySignature as jest.Mock;

type Handler = (event: NostrEvent) => void;
type HandlerMap = Record<string, Handler>;
interface SubRecord { relay: string; handlers: HandlerMap; }

const subs: SubRecord[] = [];

function makeEvent(overrides: Partial<NostrEvent> = {}): NostrEvent {
  return {
    id: 'evt1',
    kind: 1,
    pubkey: 'pub',
    sig: 'sig',
    content: overrides.content ?? JSON.stringify({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [20, 10] }
    }),
    tags: overrides.tags ?? [['app', 'starcom']],
    created_at: overrides.created_at ?? Math.floor(Date.now() / 1000),
    ...overrides
  } as NostrEvent;
}

function createService(overrides: Partial<GeoIntConfig> = {}): NostrGeoIntService {
  return new NostrGeoIntService({
    relays: overrides.relays ?? ['wss://relay.test'],
    debounceMs: overrides.debounceMs ?? 5,
    freshnessWindowMs: overrides.freshnessWindowMs ?? 10_000,
    backoff: {
      initialMs: overrides.backoff?.initialMs ?? 50,
      maxMs: overrides.backoff?.maxMs ?? 50,
      factor: overrides.backoff?.factor ?? 2,
      jitterMs: overrides.backoff?.jitterMs ?? 0
    },
    ...overrides
  });
}

function getHandler(relay: string, event: string): Handler | undefined {
  const record = [...subs].reverse().find(s => s.relay === relay);
  return record?.handlers[event];
}

beforeEach(() => {
  jest.useFakeTimers({ now: 1_700_000_000_000 });
  subs.splice(0, subs.length);
  mockPoolClose.mockClear();
  mockPoolSub.mockClear();
  mockSubUnsub.mockClear();
  mockValidateEvent.mockReset();
  mockVerifySignature.mockReset();
  (importIntelReportMock as jest.Mock).mockClear();
  mockValidateEvent.mockReturnValue(true);
  mockVerifySignature.mockReturnValue(true);
  mockPoolSub.mockImplementation((relays: string[]) => {
    const handlers: HandlerMap = {};
    const sub = {
      on: jest.fn((evt: string, cb: Function) => {
        handlers[evt] = cb;
      }),
      unsub: mockSubUnsub,
      handlers
    } as any;
    const relay = relays[0];
    subs.push({ relay, handlers });
    return sub;
  });
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('NostrGeoIntService integration flows', () => {
  it('imports parsed events from a healthy relay', async () => {
    const service = createService({ debounceMs: 1, relays: ['wss://relayA'] });
    await service.start();

    const handler = getHandler('wss://relayA', 'event') as ((ev: NostrEvent) => void) | undefined;
    expect(handler).toBeDefined();

    handler?.(makeEvent());

    await (service as any).flushPending();
    jest.runOnlyPendingTimers();

    expect((importIntelReportMock as jest.Mock)).toHaveBeenCalledTimes(1);
    expect(service.getMetrics().imported).toBe(1);

    service.stop();
  });

  it('reconnects relays on health check with backoff', async () => {
    const service = createService({
      relays: ['wss://relayA', 'wss://relayB'],
      backoff: { initialMs: 50, maxMs: 50, factor: 2, jitterMs: 0 },
      debounceMs: 1
    });
    await service.start();

    const eoseB = getHandler('wss://relayB', 'eose') as (() => void) | undefined;
    eoseB?.();

    expect(mockPoolSub).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(50);
    jest.runOnlyPendingTimers();

    jest.advanceTimersByTime(50);
    jest.runOnlyPendingTimers();

    const relayACalls = mockPoolSub.mock.calls.filter(([relays]) =>
      Array.isArray(relays) && relays.includes('wss://relayA')
    ).length;
    expect(relayACalls).toBeGreaterThanOrEqual(2);

    const r1 = service.getRelayStatus().find(r => r.url === 'wss://relayA');
    expect(r1?.attempts).toBeGreaterThanOrEqual(1);

    service.stop();
  });

  it('enforces freshness window before importing', async () => {
    const service = createService({ freshnessWindowMs: 1_000, debounceMs: 1 });
    await service.start();

    const handler = getHandler('wss://relay.test', 'event') as ((ev: NostrEvent) => void) | undefined;
    expect(handler).toBeDefined();

    const staleCreatedAt = Math.floor((Date.now() - 10_000) / 1000);
    handler?.(makeEvent({ created_at: staleCreatedAt }));

    jest.runOnlyPendingTimers();
    await Promise.resolve();

    const metrics = service.getMetrics();
    expect(metrics.dropped.stale).toBe(1);
    expect(metrics.imported).toBe(0);
    expect((importIntelReportMock as jest.Mock)).not.toHaveBeenCalled();

    service.stop();
  });

  it('caps backoff with jitter', async () => {
    const service = createService({
      relays: ['wss://relayA'],
      backoff: { initialMs: 50, maxMs: 120, factor: 2, jitterMs: 10 },
      debounceMs: 1
    });

    const originalRandom = Math.random;
    (Math as any).random = () => 1; // force max jitter

    const timeoutSpy = jest.spyOn(global, 'setTimeout');

    await service.start();

    (service as any).scheduleReconnect('wss://relayA', 2);

    const timeoutDelay = timeoutSpy.mock.calls.at(-1)?.[1] as number;
    expect(timeoutDelay).toBe(130);

    (Math as any).random = originalRandom;
    timeoutSpy.mockRestore();
    service.stop();
  });

  it('clears timers and backoff state on stop', async () => {
    const service = createService({
      relays: ['wss://relayA'],
      backoff: { initialMs: 50, maxMs: 120, factor: 2, jitterMs: 0 },
      debounceMs: 1
    });

    await service.start();
    (service as any).scheduleReconnect('wss://relayA', 1);

    expect(jest.getTimerCount()).toBeGreaterThan(0);

    service.stop();

    expect((service as any).backoffTimers.size).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('schedules reconnect when relay appears stale (flap simulation)', async () => {
    const service = createService({
      relays: ['wss://relayA'],
      backoff: { initialMs: 25, maxMs: 25, factor: 2, jitterMs: 0 },
      debounceMs: 1
    });

    await service.start();

    // Force lastSeen to stale and mark as disconnected
    (service as any).relayStatus.set('wss://relayA', { url: 'wss://relayA', connected: false, attempts: 0, lastSeen: 0 });

    (service as any).runHealthCheck();

    expect((service as any).backoffTimers.size).toBe(1);

    service.stop();
  });

  it('handles high-volume bursts with dedupe and caps', async () => {
    const service = createService({
      relays: ['wss://relayA'],
      debounceMs: 1,
      freshnessWindowMs: 100_000,
      maxEventsStored: 60
    });

    await service.start();

    const handler = getHandler('wss://relayA', 'event') as ((ev: NostrEvent) => void) | undefined;
    expect(handler).toBeDefined();

    const createdAt = Math.floor(Date.now() / 1000);

    for (let i = 0; i < 120; i++) {
      const id = i < 80 ? `evt-${i}` : `evt-${i - 40}`; // 40 duplicates
      handler?.(makeEvent({
        id,
        content: JSON.stringify({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-75 + (i % 50) * 0.1, 40 + (i % 30) * 0.1] }
        }),
        created_at: createdAt
      }));
    }

    const pendingBefore = (service as any).pending.length;
    expect(pendingBefore).toBe(80);

    await (service as any).flushPending();
    const pendingAfter = (service as any).pending.length;
    expect(pendingAfter).toBe(0);

    jest.runOnlyPendingTimers();

    const metrics = service.getMetrics();
    const importCalls = (importIntelReportMock as jest.Mock).mock.calls.length;
    expect(metrics.imported).toBe(80);
    expect(metrics.dropped.deduped).toBe(40);
    expect(importCalls).toBe(80);

    const cacheValues = (service as any).cache.values();
    expect(cacheValues.length).toBeLessThanOrEqual(60);

    service.stop();
  });
});
