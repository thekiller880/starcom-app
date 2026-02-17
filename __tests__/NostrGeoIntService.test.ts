import './testPolyfills';
import type { Event as NostrEvent } from 'nostr-tools';
import * as nostrTools from 'nostr-tools';
import { NostrGeoIntService } from '../src/services/geoint';
import { GeoIntConfig } from '../src/services/geoint/types';

const mockPoolClose = jest.fn();
const mockPoolSub = jest.fn();
const mockSubUnsub = jest.fn();
const mockValidateEvent = nostrTools.validateEvent as jest.MockedFunction<typeof nostrTools.validateEvent>;
const mockVerifySignature = (nostrTools as any).verifySignature as jest.MockedFunction<any>;

type Handler = (event: NostrEvent) => void;
let lastSub: { handlers: Record<string, Handler>; unsub: jest.Mock } | null = null;

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

function makeEvent(overrides: Partial<NostrEvent> = {}): NostrEvent {
  return {
    id: 'evt1',
    kind: 1,
    pubkey: 'pub',
    sig: 'sig',
    content: overrides.content ?? '{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]} }',
    tags: overrides.tags ?? [['app', 'starcom']],
    created_at: overrides.created_at ?? Math.floor(Date.now() / 1000),
    ...overrides
  } as NostrEvent;
}

function createService(overrides: Partial<GeoIntConfig> = {}): NostrGeoIntService {
  return new NostrGeoIntService({
    relays: ['wss://relay.test'],
    debounceMs: 5,
    freshnessWindowMs: 1_000,
    backoff: { initialMs: 10, maxMs: 10, factor: 1, jitterMs: 0 },
    ...overrides
  });
}

beforeEach(() => {
  jest.useFakeTimers({ now: 1_700_000_000_000 });
  mockPoolClose.mockClear();
  mockPoolSub.mockClear();
  mockSubUnsub.mockClear();
  mockValidateEvent.mockClear();
  mockVerifySignature.mockClear();
  mockValidateEvent.mockReturnValue(true);
  mockVerifySignature.mockReturnValue(true);
  lastSub = null;
  mockPoolSub.mockImplementation(() => {
    const handlers: Record<string, Handler> = {};
    const sub = {
      on: jest.fn((evt: string, cb: Handler) => {
        handlers[evt] = cb;
      }),
      unsub: mockSubUnsub,
      handlers
    } as any;
    lastSub = sub;
    return sub;
  });
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('NostrGeoIntService', () => {
  it('guards start/stop idempotently', async () => {
    const service = createService();

    await service.start();
    expect(mockPoolSub).toHaveBeenCalledTimes(1);

    await service.start();
    expect(mockPoolSub).toHaveBeenCalledTimes(1);

    service.stop();
    expect(mockSubUnsub).toHaveBeenCalledTimes(1);
    expect(mockPoolClose).toHaveBeenCalledTimes(1);

    service.stop();
    expect(mockSubUnsub).toHaveBeenCalledTimes(1);
    expect(mockPoolClose).toHaveBeenCalledTimes(1);
  });

  it('drops invalid signatures', async () => {
    mockValidateEvent.mockReturnValue(false);
    const service = createService();
    await service.start();

    const handler = lastSub?.handlers.event as ((ev: NostrEvent) => void) | undefined;
    expect(handler).toBeDefined();

    handler?.(makeEvent());

    const metrics = service.getMetrics();
    expect(metrics.dropped.invalid_sig).toBe(1);
  });

  it('drops out-of-bounds geo payloads', async () => {
    const service = createService();
    await service.start();

    const handler = lastSub?.handlers.event as ((ev: NostrEvent) => void) | undefined;
    expect(handler).toBeDefined();

    handler?.(makeEvent({ content: '', tags: [['app', 'starcom'], ['geo', 'lat:123;lon:0']] }));

    const metrics = service.getMetrics();
    expect(metrics.dropped.invalid_geojson).toBe(1);
  });

  it('drops events missing app/client tag', async () => {
    const service = createService();
    await service.start();

    const handler = lastSub?.handlers.event as ((ev: NostrEvent) => void) | undefined;
    handler?.(makeEvent({ tags: [['p', 'peer'], ['geo', 'lat:1;lon:1']] }));

    const metrics = service.getMetrics();
    expect(metrics.dropped.missing_app_tag).toBe(1);
  });

  it('drops events when tag count exceeds cap', async () => {
    const service = createService({ tagCountCap: 50 });
    await service.start();

    const tags: string[][] = Array.from({ length: 55 }, (_, i) => ['t', `v${i}`]);
    tags.push(['app', 'starcom']);

    const handler = lastSub?.handlers.event as ((ev: NostrEvent) => void) | undefined;
    handler?.(makeEvent({ tags }));

    const metrics = service.getMetrics();
    expect(metrics.dropped.too_many_tags).toBe(1);
  });

  it('drops invalid kinds', async () => {
    const service = createService();
    await service.start();

    const handler = lastSub?.handlers.event as ((ev: NostrEvent) => void) | undefined;
    handler?.(makeEvent({ kind: 2 as any }));

    const metrics = service.getMetrics();
    expect(metrics.dropped.invalid_kind).toBe(1);
  });

  it('drops stale events based on freshness window', async () => {
    const service = createService({ freshnessWindowMs: 1_000 });
    await service.start();

    const handler = lastSub?.handlers.event as ((ev: NostrEvent) => void) | undefined;
    expect(handler).toBeDefined();

    const staleCreatedAt = Math.floor((Date.now() - 10_000) / 1000);
    handler?.(makeEvent({ created_at: staleCreatedAt }));

    const metrics = service.getMetrics();
    expect(metrics.stale).toBe(1);
    expect(metrics.dropped.stale).toBe(1);
  });

  it('clears pending, subs, and timers across stop/restart cycles', async () => {
    const service = createService({ debounceMs: 1 });
    await service.start();

    const handler = lastSub?.handlers.event as ((ev: NostrEvent) => void) | undefined;
    handler?.(makeEvent());

    // Allow debounce to schedule then stop before flush executes
    jest.runOnlyPendingTimers();
    service.stop();

    expect((service as any).pending.length).toBe(0);
    expect((service as any).backoffTimers.size).toBe(0);
    expect(mockSubUnsub).toHaveBeenCalledTimes(1);
    expect(mockPoolClose).toHaveBeenCalledTimes(1);

    // Restart should not accumulate prior subs or timers
    await service.start();
    service.stop();

    expect(mockPoolSub).toHaveBeenCalledTimes(2);
    expect(mockSubUnsub).toHaveBeenCalledTimes(2);
    expect((service as any).backoffTimers.size).toBe(0);
    expect(service.getMetrics().imported).toBe(0);
  });
});
