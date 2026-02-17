import React from 'react';
import styles from './GeoIntFilters.module.css';

export type RecencyOption = 'any' | 5 | 15 | 60 | 240 | 1440;

export interface RelayOption {
  url: string;
  connected: boolean;
}

interface Props {
  recency: RecencyOption;
  onRecencyChange: (value: RecencyOption) => void;
  risk: 'all' | 'high' | 'medium' | 'low';
  onRiskChange: (value: 'all' | 'high' | 'medium' | 'low') => void;
  relays: RelayOption[];
  selectedRelays: string[];
  onRelaysChange: (urls: string[]) => void;
  sourceTag: string;
  onSourceTagChange: (value: string) => void;
}

const recencyOptions: { value: RecencyOption; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: 5, label: 'Last 5 min' },
  { value: 15, label: 'Last 15 min' },
  { value: 60, label: 'Last hour' },
  { value: 240, label: 'Last 4 hours' },
  { value: 1440, label: 'Last 24 hours' },
];

export function GeoIntFilters({
  recency,
  onRecencyChange,
  risk,
  onRiskChange,
  relays,
  selectedRelays,
  onRelaysChange,
  sourceTag,
  onSourceTagChange,
}: Props) {
  return (
    <div className={styles.filters}>
      <div className={styles.field}>
        <span className={styles.label}>Risk level</span>
        <select
          className={styles.select}
          value={risk}
          onChange={(e) => onRiskChange(e.target.value as 'all' | 'high' | 'medium' | 'low')}
        >
          <option value="all">All</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Recency</span>
        <select
          className={styles.select}
          value={recency}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === 'any') {
              onRecencyChange('any');
            } else {
              onRecencyChange(Number(raw) as RecencyOption);
            }
          }}
        >
          {recencyOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Relay whitelist</span>
        <select
          className={styles.select}
          multiple
          value={selectedRelays}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
            onRelaysChange(selected);
          }}
        >
          {relays.map((relay) => (
            <option key={relay.url} value={relay.url}>
                {relay.connected ? '🟢' : '🔴'} {relay.url}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Source tag filter</span>
        <input
          className={styles.input}
          placeholder="e.g. source:agency"
          value={sourceTag}
          onChange={(e) => onSourceTagChange(e.target.value)}
        />
      </div>
    </div>
  );
}

export default GeoIntFilters;
