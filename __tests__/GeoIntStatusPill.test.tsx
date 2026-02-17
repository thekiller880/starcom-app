import './testPolyfills';
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GeoIntStatusPill } from '../src/components/IntelReports3D/HUD/GeoIntStatusPill';
import { useGeoIntIngest } from '../src/hooks/useGeoIntIngest';
import type { GeoIntMetrics, RelayStatus } from '../src/services/geoint/types';

jest.mock('../src/hooks/useGeoIntIngest');

const mockUseGeoIntIngest = useGeoIntIngest as jest.MockedFunction<typeof useGeoIntIngest>;

describe('GeoIntStatusPill', () => {
  const baseMetrics: GeoIntMetrics = {
    parsed: 0,
    dropped: {
      invalid_sig: 0,
      invalid_shape: 0,
      invalid_kind: 0,
      too_large: 0,
      too_many_tags: 0,
      invalid_tags: 0,
      missing_app_tag: 0,
      invalid_geo: 0,
      invalid_geojson: 0,
      stale: 1,
      deduped: 0,
      bounds: 0,
      parse_error: 0,
      validation_failed: 0
    },
    deduped: 2,
    stale: 1,
    imported: 3
  };
  const relays: RelayStatus[] = [
    { url: 'wss://a', connected: true, attempts: 0 },
    { url: 'wss://b', connected: false, attempts: 0 }
  ];

  it('shows active state and invokes stop', () => {
    const stop = jest.fn();
    mockUseGeoIntIngest.mockReturnValue({
      active: true,
      metrics: baseMetrics,
      relays,
      start: jest.fn(),
      stop
    });

    render(<GeoIntStatusPill autoStart={false} />);

    expect(screen.getByText(/GEOINT Live/i)).toBeInTheDocument();
    const throughput = screen.getByTitle(/Imported \/ Deduped \/ Stale/i);
    expect(throughput).toHaveTextContent('3/2/1');
    const relayStatus = screen.getByTitle(/Relays up\/total/i);
    expect(relayStatus).toHaveTextContent('1/2');
    fireEvent.click(screen.getByText(/Stop/i));
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('shows paused state and invokes start', () => {
    const start = jest.fn();
    mockUseGeoIntIngest.mockReturnValue({
      active: false,
      metrics: baseMetrics,
      relays,
      start,
      stop: jest.fn()
    });

    render(<GeoIntStatusPill autoStart={false} />);

    expect(screen.getByText(/GEOINT Paused/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Start/i));
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('reflects relay outage counts', () => {
    mockUseGeoIntIngest.mockReturnValue({
      active: true,
      metrics: baseMetrics,
      relays: [
        { url: 'wss://a', connected: false, attempts: 0 },
        { url: 'wss://b', connected: false, attempts: 0 }
      ],
      start: jest.fn(),
      stop: jest.fn()
    });

    render(<GeoIntStatusPill autoStart={false} />);

    const relayStatus = screen.getByTitle(/Relays up\/total/i);
    expect(relayStatus).toHaveTextContent('0/2');
  });
});
