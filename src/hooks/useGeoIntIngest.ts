import { useCallback, useEffect, useMemo, useState } from 'react';
import { nostrGeoIntService } from '../services/geoint';
import { GeoIntMetrics, RelayStatus } from '../services/geoint/types';

interface UseGeoIntIngestOptions {
  autoStart?: boolean;
}

interface GeoIntIngestState {
  active: boolean;
  metrics: GeoIntMetrics;
  relays: RelayStatus[];
  start: () => Promise<void>;
  stop: () => void;
}

function cloneMetrics(metrics: GeoIntMetrics): GeoIntMetrics {
  return { ...metrics, dropped: { ...metrics.dropped } };
}

export function useGeoIntIngest(options: UseGeoIntIngestOptions = {}): GeoIntIngestState {
  const [active, setActive] = useState(() => nostrGeoIntService.isActive());
  const [metrics, setMetrics] = useState<GeoIntMetrics>(() => cloneMetrics(nostrGeoIntService.getMetrics()));
  const [relays, setRelays] = useState<RelayStatus[]>(() => nostrGeoIntService.getRelayStatus());

  const autoStart = options.autoStart ?? true;

  const start = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (nostrGeoIntService.isActive()) return;
    await nostrGeoIntService.start();
    setActive(true);
    setMetrics(cloneMetrics(nostrGeoIntService.getMetrics()));
    setRelays(nostrGeoIntService.getRelayStatus());
  }, []);

  const stop = useCallback(() => {
    nostrGeoIntService.stop();
    setActive(false);
    setMetrics(cloneMetrics(nostrGeoIntService.getMetrics()));
    setRelays(nostrGeoIntService.getRelayStatus());
  }, []);

  useEffect(() => {
    const unsubMetrics = nostrGeoIntService.onMetrics(m => setMetrics(cloneMetrics(m)));
    const unsubRelays = nostrGeoIntService.onRelayStatus(setRelays);
    return () => {
      unsubMetrics();
      unsubRelays();
    };
  }, []);

  useEffect(() => {
    if (!autoStart) return;
    void start();
    return () => {
      stop();
    };
  }, [autoStart, start, stop]);

  return useMemo(() => ({ active, metrics, relays, start, stop }), [active, metrics, relays, start, stop]);
}
