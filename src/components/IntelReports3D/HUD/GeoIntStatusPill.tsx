import React, { useMemo } from 'react';
import { useGeoIntIngest } from '../../../hooks/useGeoIntIngest';
import styles from './GeoIntStatusPill.module.css';

interface GeoIntStatusPillProps {
  autoStart?: boolean;
}

export const GeoIntStatusPill: React.FC<GeoIntStatusPillProps> = ({ autoStart = true }) => {
  const { active, metrics, relays, start, stop } = useGeoIntIngest({ autoStart });

  const relayUp = useMemo(() => relays.filter(r => r.connected).length, [relays]);
  const relayTotal = relays.length || 1;
  const statusColor = active ? '#5dffa8' : '#8891a8';
  const relaysLabel = `${relayUp}/${relayTotal}`;

  return (
    <div className={styles.pill}>
      <span className={styles.statusDot} style={{ background: statusColor }} />
      <span className={styles.statusLabel}>{active ? 'GEOINT Live' : 'GEOINT Paused'}</span>
      <span className={styles.metric} title="Imported / Deduped / Stale">
        📡 {metrics.imported}/{metrics.deduped}/{metrics.stale}
      </span>
      <span className={styles.metric} title="Relays up/total">
        🔗 <span className={styles.relayUp}>{relaysLabel}</span>
      </span>
      <span className={styles.actions}>
        {active ? (
          <button className={styles.button} onClick={stop}>Stop</button>
        ) : (
          <button className={styles.button} onClick={start}>Start</button>
        )}
      </span>
    </div>
  );
};
