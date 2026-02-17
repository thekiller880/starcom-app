import { useContext, useEffect, useMemo, useState } from 'react';
import { useApplicationRouter } from '../../hooks/useApplicationRouter';
import { useNetworkValidation } from '../../hooks/useNetworkValidation';
import { UnifiedAuthContext } from '../../security/context/AuthContext';
import { useFeatureFlag } from '../../utils/featureFlags';
import { nostrGeoIntService } from '../../services/geoint';
import { intelReportService } from '../../services/intel/IntelReportService';
import type { IntelReportStatus, IntelReportUI } from '../../types/intel/IntelReportUI';
import {
  nostrStarcomIntelIngest,
  type NostrRelayState,
  type NostrStarcomIntelIngestMetrics
} from '../../services/intel/NostrStarcomIntelIngest';

export interface PrimaryMarqueeSignal {
  id: string;
  label: string;
  value: string;
}

export interface PrimaryMarqueeData {
  title: string;
  signals: PrimaryMarqueeSignal[];
}

interface NostrMarqueeSnapshot {
  active: boolean;
  relayConnected: number;
  relayTotal: number;
  probeOpen: number;
  probeTotal: number;
  ingest: NostrStarcomIntelIngestMetrics;
  geointImported: number;
  geointParsed: number;
}

interface ThroughputSample {
  timestamp: number;
  intelAccepted: number;
  geointImported: number;
}

interface IntelWorkflowCounters {
  total: number;
  byStatus: Record<IntelReportStatus, number>;
}

const MARQUEE_ACTIVE_SAMPLE_MS = 15000;
const MARQUEE_IDLE_SAMPLE_MS = 60000;

const defaultWorkflowCounters = (): IntelWorkflowCounters => ({
  total: 0,
  byStatus: {
    DRAFT: 0,
    SUBMITTED: 0,
    REVIEWED: 0,
    APPROVED: 0,
    ARCHIVED: 0
  }
});

const summarizeWorkflow = (reports: IntelReportUI[]): IntelWorkflowCounters => {
  const counters = defaultWorkflowCounters();
  counters.total = reports.length;

  reports.forEach((report) => {
    counters.byStatus[report.status] += 1;
  });

  return counters;
};

const getNostrSnapshot = (): NostrMarqueeSnapshot => {
  const relayStatus = nostrStarcomIntelIngest.getRelayStatus();
  const probeStatus = nostrStarcomIntelIngest.getRelayProbeStatus();
  const geointMetrics = nostrGeoIntService.getMetrics();

  return {
    active: nostrStarcomIntelIngest.isActive() || nostrGeoIntService.isActive(),
    relayConnected: relayStatus.filter((relay: NostrRelayState) => relay.connected).length,
    relayTotal: relayStatus.length,
    probeOpen: probeStatus.filter((probe) => probe.status === 'open').length,
    probeTotal: probeStatus.length,
    ingest: nostrStarcomIntelIngest.getMetrics(),
    geointImported: geointMetrics.imported,
    geointParsed: geointMetrics.parsed
  };
};

const computeWindowRate = (
  samples: ThroughputSample[],
  windowMs: number,
  key: 'intelAccepted' | 'geointImported'
): number => {
  if (samples.length < 2) return 0;

  const latest = samples[samples.length - 1];
  const cutoff = latest.timestamp - windowMs;
  const oldestInWindow = samples.find((sample) => sample.timestamp >= cutoff) ?? samples[0];

  const deltaCount = latest[key] - oldestInWindow[key];
  const deltaTimeMs = latest.timestamp - oldestInWindow.timestamp;

  if (deltaCount <= 0 || deltaTimeMs <= 0) return 0;

  const perMinute = (deltaCount * 60000) / deltaTimeMs;
  return Math.round(perMinute * 10) / 10;
};

const toPercent = (numerator: number, denominator: number): number => {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
};

const formatTimestamp = (timestamp: Date): string => {
  const date = timestamp.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const time = timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return `${date} ${time}L`;
};

const formatAuthPosture = (authContext: React.ContextType<typeof UnifiedAuthContext>): string => {
  if (!authContext) {
    return 'AUTH CONTEXT OFFLINE';
  }

  if (authContext.isLoading || authContext.isSigningIn) {
    return 'AUTH VALIDATING';
  }

  if (authContext.isAuthenticated) {
    return 'SESSION VERIFIED';
  }

  if (authContext.connectionStatus === 'connected') {
    return 'WALLET LINKED / SESSION IDLE';
  }

  if (authContext.connectionStatus === 'connecting') {
    return 'WALLET HANDSHAKE';
  }

  return 'AUTH DISCONNECTED';
};

export const usePrimaryMarqueeData = (): PrimaryMarqueeData => {
  const { currentApp, getApplication, presentationMode, history } = useApplicationRouter();
  const { currentNetwork, getNetworkDisplayName, isValidating } = useNetworkValidation();
  const authContext = useContext(UnifiedAuthContext);
  const uiTestingDiagnosticsEnabled = useFeatureFlag('uiTestingDiagnosticsEnabled');
  const walletDiagnosticsEnabled = useFeatureFlag('walletDiagnosticsEnabled');
  const [timestamp, setTimestamp] = useState<Date>(new Date());
  const [nostrSnapshot, setNostrSnapshot] = useState<NostrMarqueeSnapshot>(() => getNostrSnapshot());
  const [workflowCounters, setWorkflowCounters] = useState<IntelWorkflowCounters>(defaultWorkflowCounters);
  const [throughputSamples, setThroughputSamples] = useState<ThroughputSample[]>(() => {
    const initialSnapshot = getNostrSnapshot();
    return [{
      timestamp: Date.now(),
      intelAccepted: initialSnapshot.ingest.accepted,
      geointImported: initialSnapshot.geointImported
    }];
  });

  useEffect(() => {
    const updateTimestamp = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }
      setTimestamp(new Date());
    };

    updateTimestamp();
    const interval = setInterval(updateTimestamp, 60000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimestamp(new Date());
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const refreshWorkflow = async () => {
      try {
        const reports = await intelReportService.listReports();
        if (!mounted) return;
        setWorkflowCounters(summarizeWorkflow(reports));
      } catch {
        if (!mounted) return;
        setWorkflowCounters(defaultWorkflowCounters());
      }
    };

    void refreshWorkflow();
    const unsubscribe = intelReportService.onChange((reports) => {
      if (!mounted) return;
      setWorkflowCounters(summarizeWorkflow(reports));
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const scheduleNext = (delay: number) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(sampleMetrics, delay);
    };

    const sampleMetrics = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        scheduleNext(MARQUEE_IDLE_SAMPLE_MS);
        return;
      }

      const nextSnapshot = getNostrSnapshot();
      const now = Date.now();

      setNostrSnapshot(nextSnapshot);
      setThroughputSamples((previousSamples) => {
        const nextSamples = [
          ...previousSamples,
          {
            timestamp: now,
            intelAccepted: nextSnapshot.ingest.accepted,
            geointImported: nextSnapshot.geointImported
          }
        ].filter((sample) => now - sample.timestamp <= 5 * 60 * 1000);

        return nextSamples;
      });

      scheduleNext(nextSnapshot.active ? MARQUEE_ACTIVE_SAMPLE_MS : MARQUEE_IDLE_SAMPLE_MS);
    };

    sampleMetrics();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        sampleMetrics();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const title = useMemo(() => {
    const currentAppConfig = currentApp ? getApplication(currentApp) : null;
    return currentAppConfig?.name ?? 'Starcom Platform';
  }, [currentApp, getApplication]);

  const signals = useMemo<PrimaryMarqueeSignal[]>(() => {
    const lane = currentApp ? currentApp.toUpperCase() : 'COMMAND HUB';
    const mode = presentationMode.toUpperCase();
    const networkName = getNetworkDisplayName(currentNetwork.cluster).toUpperCase();

    const networkPosture = currentNetwork.error
      ? `${networkName} DEGRADED`
      : currentNetwork.isConnected
        ? `${networkName} LINK UP`
        : isValidating
          ? `${networkName} PROBING`
          : `${networkName} LINK DOWN`;

    const tpsValue = currentNetwork.tps != null ? `${Math.round(currentNetwork.tps)} TPS` : 'TPS N/A';
    const blockValue = currentNetwork.blockHeight != null ? `BLK ${currentNetwork.blockHeight}` : 'BLK N/A';
    const relayStatus = nostrSnapshot.relayTotal > 0
      ? `${nostrSnapshot.relayConnected}/${nostrSnapshot.relayTotal} UP`
      : 'NO RELAYS';
    const probeStatus = nostrSnapshot.probeTotal > 0
      ? `${nostrSnapshot.probeOpen}/${nostrSnapshot.probeTotal} OPEN`
      : 'PROBE N/A';
    const ingestDrops = nostrSnapshot.ingest.droppedNoGeo + nostrSnapshot.ingest.droppedInvalid;
    const intelAcceptanceRatio = toPercent(nostrSnapshot.ingest.accepted, nostrSnapshot.ingest.seen);
    const geointImportRatio = toPercent(nostrSnapshot.geointImported, nostrSnapshot.geointParsed);
    const geointNoGeoRatio = toPercent(nostrSnapshot.ingest.droppedNoGeo, nostrSnapshot.ingest.seen);

    const intelRate1m = computeWindowRate(throughputSamples, 60 * 1000, 'intelAccepted');
    const intelRate5m = computeWindowRate(throughputSamples, 5 * 60 * 1000, 'intelAccepted');
    const geointRate1m = computeWindowRate(throughputSamples, 60 * 1000, 'geointImported');
    const geointRate5m = computeWindowRate(throughputSamples, 5 * 60 * 1000, 'geointImported');

    const hasCriticalIssue = Boolean(currentNetwork.error || authContext?.error || authContext?.authError);
    const hasWarningIssue = !hasCriticalIssue && (
      !currentNetwork.isConnected ||
      (nostrSnapshot.active && nostrSnapshot.relayConnected === 0)
    );
    const diagnosticsState = hasCriticalIssue ? 'ALERT' : hasWarningIssue ? 'WATCH' : 'NOMINAL';

    const fullSignalSet: PrimaryMarqueeSignal[] = [
      {
        id: 'timestamp',
        label: 'MISSION TIME',
        value: formatTimestamp(timestamp)
      },
      {
        id: 'mission-lane',
        label: 'MISSION LANE',
        value: lane
      },
      {
        id: 'presentation-mode',
        label: 'ROUTE MODE',
        value: mode
      },
      {
        id: 'network-posture',
        label: 'SOLANA',
        value: networkPosture
      },
      {
        id: 'network-telemetry',
        label: 'CHAIN TELEMETRY',
        value: `${tpsValue} | ${blockValue}`
      },
      {
        id: 'auth-posture',
        label: 'AUTH POSTURE',
        value: formatAuthPosture(authContext)
      },
      {
        id: 'nostr-relays',
        label: 'NOSTR RELAYS',
        value: nostrSnapshot.active ? `${relayStatus} | PROBE ${probeStatus}` : 'INGEST STANDBY'
      },
      {
        id: 'nostr-ingest-counters',
        label: 'NOSTR INGEST',
        value: `SEEN ${nostrSnapshot.ingest.seen} | ACCEPT ${nostrSnapshot.ingest.accepted} | DROP ${ingestDrops}`
      },
      {
        id: 'nostr-throughput-window',
        label: 'INGEST RATE',
        value: `INTEL ${intelRate1m}/${intelRate5m} MPM | GEOINT ${geointRate1m}/${geointRate5m} MPM`
      },
      {
        id: 'geoint-throughput-counters',
        label: 'GEOINT PIPELINE',
        value: `PARSED ${nostrSnapshot.geointParsed} | IMPORTED ${nostrSnapshot.geointImported}`
      },
      {
        id: 'geoint-quality-ratio',
        label: 'GEOINT QUALITY',
        value: `IMPORT ${geointImportRatio}% | ACCEPT ${intelAcceptanceRatio}% | NO-GEO ${geointNoGeoRatio}%`
      },
      {
        id: 'operator-diagnostics',
        label: 'OPERATOR DIAG',
        value: `${diagnosticsState} | UI ${uiTestingDiagnosticsEnabled ? 'ON' : 'OFF'} | WALLET ${walletDiagnosticsEnabled ? 'ON' : 'OFF'}`
      },
      {
        id: 'intel-workflow-counters',
        label: 'INTEL WORKFLOW',
        value: `TOTAL ${workflowCounters.total} | D ${workflowCounters.byStatus.DRAFT} S ${workflowCounters.byStatus.SUBMITTED} R ${workflowCounters.byStatus.REVIEWED} A ${workflowCounters.byStatus.APPROVED}`
      },
      {
        id: 'intel-workflow-archive',
        label: 'INTEL ARCHIVE',
        value: `${workflowCounters.byStatus.ARCHIVED} ARCHIVED`
      },
      {
        id: 'navigation-depth',
        label: 'NAV HISTORY',
        value: `${history.length} APP${history.length === 1 ? '' : 'S'} THIS SESSION`
      }
    ];

    return fullSignalSet;
  }, [
    currentApp,
    presentationMode,
    getNetworkDisplayName,
    currentNetwork.cluster,
    currentNetwork.error,
    currentNetwork.isConnected,
    currentNetwork.tps,
    currentNetwork.blockHeight,
    isValidating,
    authContext,
    currentNetwork.error,
    nostrSnapshot.active,
    nostrSnapshot.relayConnected,
    nostrSnapshot.relayTotal,
    nostrSnapshot.probeOpen,
    nostrSnapshot.probeTotal,
    nostrSnapshot.ingest.seen,
    nostrSnapshot.ingest.accepted,
    nostrSnapshot.ingest.droppedNoGeo,
    nostrSnapshot.ingest.droppedInvalid,
    nostrSnapshot.geointParsed,
    nostrSnapshot.geointImported,
    uiTestingDiagnosticsEnabled,
    walletDiagnosticsEnabled,
    workflowCounters.total,
    workflowCounters.byStatus.DRAFT,
    workflowCounters.byStatus.SUBMITTED,
    workflowCounters.byStatus.REVIEWED,
    workflowCounters.byStatus.APPROVED,
    workflowCounters.byStatus.ARCHIVED,
    throughputSamples,
    history.length,
    timestamp
  ]);

  return {
    title,
    signals
  };
};
