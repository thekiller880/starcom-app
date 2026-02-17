/**
 * Network Validation Hook for Solana Web3 Login
 * Handles cluster detection, validation, and switching
 */

import { useState, useEffect, useCallback } from 'react';
import { Connection, clusterApiUrl } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';

export type SolanaCluster = 'devnet' | 'testnet' | 'mainnet-beta';

export interface NetworkInfo {
  cluster: SolanaCluster;
  endpoint: string;
  isConnected: boolean;
  latency: number | null;
  blockHeight: number | null;
  tps: number | null;
  error: string | null;
}

export interface NetworkValidationResult {
  isValid: boolean;
  cluster: SolanaCluster;
  endpoint: string;
  latency: number;
  error?: string;
}

interface SharedBootstrapResult {
  cluster: SolanaCluster;
  endpoint: string;
  isConnected: boolean;
  latency: number | null;
  error: string | null;
}

interface NetworkMonitorUpdate {
  blockHeight: number | null;
  tps: number | null;
  latency: number | null;
  error: string | null;
}

interface EndpointMonitor {
  connection: Connection;
  subscribers: Set<(update: NetworkMonitorUpdate) => void>;
  intervalId: ReturnType<typeof setInterval> | null;
  visibilityListener: (() => void) | null;
  inFlight: boolean;
}

const endpointMonitors = new Map<string, EndpointMonitor>();
let sharedBootstrapResult: SharedBootstrapResult | null = null;
let sharedBootstrapPromise: Promise<SharedBootstrapResult> | null = null;

const runEndpointMonitorTick = async (endpoint: string, monitor: EndpointMonitor) => {
  if (monitor.inFlight) {
    return;
  }

  if (typeof document !== 'undefined' && document.hidden) {
    return;
  }

  monitor.inFlight = true;
  const startTime = Date.now();

  try {
    const [blockHeight, recentPerformance] = await Promise.all([
      monitor.connection.getBlockHeight(),
      monitor.connection.getRecentPerformanceSamples(1)
    ]);

    const tps = recentPerformance.length > 0
      ? recentPerformance[0].numTransactions / recentPerformance[0].samplePeriodSecs
      : null;

    const update: NetworkMonitorUpdate = {
      blockHeight,
      tps,
      latency: Date.now() - startTime,
      error: null
    };

    monitor.subscribers.forEach((subscriber) => subscriber(update));
  } catch (error) {
    const update: NetworkMonitorUpdate = {
      blockHeight: null,
      tps: null,
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Network monitoring failed'
    };

    monitor.subscribers.forEach((subscriber) => subscriber(update));
  } finally {
    monitor.inFlight = false;
  }
};

const subscribeEndpointMonitor = (
  endpoint: string,
  subscriber: (update: NetworkMonitorUpdate) => void
): (() => void) => {
  let monitor = endpointMonitors.get(endpoint);

  if (!monitor) {
    monitor = {
      connection: new Connection(endpoint, 'confirmed'),
      subscribers: new Set(),
      intervalId: null,
      visibilityListener: null,
      inFlight: false
    };
    endpointMonitors.set(endpoint, monitor);
  }

  monitor.subscribers.add(subscriber);

  if (!monitor.intervalId) {
    monitor.intervalId = setInterval(() => {
      const activeMonitor = endpointMonitors.get(endpoint);
      if (!activeMonitor) {
        return;
      }
      void runEndpointMonitorTick(endpoint, activeMonitor);
    }, 30000);
  }

  if (!monitor.visibilityListener && typeof document !== 'undefined') {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        return;
      }
      const activeMonitor = endpointMonitors.get(endpoint);
      if (!activeMonitor) {
        return;
      }
      void runEndpointMonitorTick(endpoint, activeMonitor);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    monitor.visibilityListener = handleVisibilityChange;
  }

  void runEndpointMonitorTick(endpoint, monitor);

  return () => {
    const activeMonitor = endpointMonitors.get(endpoint);
    if (!activeMonitor) {
      return;
    }

    activeMonitor.subscribers.delete(subscriber);

    if (activeMonitor.subscribers.size === 0) {
      if (activeMonitor.intervalId) {
        clearInterval(activeMonitor.intervalId);
      }
      if (activeMonitor.visibilityListener && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', activeMonitor.visibilityListener);
      }
      endpointMonitors.delete(endpoint);
    }
  };
};

const runSharedBootstrap = async (
  supportedNetworks: SolanaCluster[],
  validateNetwork: (cluster: SolanaCluster) => Promise<NetworkValidationResult>
): Promise<SharedBootstrapResult> => {
  const savedCluster = localStorage.getItem('starcom-preferred-cluster') as SolanaCluster;

  if (savedCluster && supportedNetworks.includes(savedCluster)) {
    const validation = await validateNetwork(savedCluster);
    if (validation.isValid) {
      return {
        cluster: savedCluster,
        endpoint: validation.endpoint,
        isConnected: true,
        latency: validation.latency,
        error: null
      };
    }
  }

  const validationResults = await Promise.all(
    supportedNetworks.map(async (cluster) => ({
      cluster,
      validation: await validateNetwork(cluster)
    }))
  );

  const valid = validationResults
    .filter(({ validation }) => validation.isValid)
    .sort((a, b) => a.validation.latency - b.validation.latency);

  if (valid.length > 0) {
    const best = valid[0];
    return {
      cluster: best.cluster,
      endpoint: best.validation.endpoint,
      isConnected: true,
      latency: best.validation.latency,
      error: null
    };
  }

  const fallback = clusterApiUrl('devnet');
  return {
    cluster: 'devnet',
    endpoint: fallback,
    isConnected: false,
    latency: null,
    error: 'Network validation failed'
  };
};

const initializeNetworkShared = (
  supportedNetworks: SolanaCluster[],
  validateNetwork: (cluster: SolanaCluster) => Promise<NetworkValidationResult>
): Promise<SharedBootstrapResult> => {
  if (sharedBootstrapResult) {
    return Promise.resolve(sharedBootstrapResult);
  }

  if (!sharedBootstrapPromise) {
    sharedBootstrapPromise = runSharedBootstrap(supportedNetworks, validateNetwork)
      .then((result) => {
        sharedBootstrapResult = result;
        sharedBootstrapPromise = null;
        return result;
      })
      .catch((error) => {
        sharedBootstrapPromise = null;
        throw error;
      });
  }

  return sharedBootstrapPromise;
};

export function useNetworkValidation() {
  const { wallet } = useWallet();
  const [currentNetwork, setCurrentNetwork] = useState<NetworkInfo>({
    cluster: sharedBootstrapResult?.cluster ?? 'devnet',
    endpoint: sharedBootstrapResult?.endpoint ?? clusterApiUrl('devnet'),
    isConnected: sharedBootstrapResult?.isConnected ?? false,
    latency: sharedBootstrapResult?.latency ?? null,
    blockHeight: null,
    tps: null,
    error: sharedBootstrapResult?.error ?? null
  });
  
  const [isValidating, setIsValidating] = useState(false);
  const [supportedNetworks] = useState<SolanaCluster[]>(['devnet', 'testnet', 'mainnet-beta']);

  /**
   * Validate network connectivity and health
   */
  const validateNetwork = useCallback(async (cluster: SolanaCluster): Promise<NetworkValidationResult> => {
    const startTime = Date.now();
    const endpoint = clusterApiUrl(cluster);
    
    try {
      const connection = new Connection(endpoint, 'confirmed');
      
      // Test connection with multiple checks
      await Promise.all([
        connection.getSlot(),
        connection.getBlockHeight(),
        connection.getVersion()
      ]);

      const latency = Date.now() - startTime;

      return {
        isValid: true,
        cluster,
        endpoint,
        latency,
      };
    } catch (error) {
      return {
        isValid: false,
        cluster,
        endpoint,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown network error'
      };
    }
  }, []);

  /**
   * Switch to different Solana cluster
   */
  const switchNetwork = useCallback(async (cluster: SolanaCluster): Promise<boolean> => {
    setIsValidating(true);
    
    try {
      const validation = await validateNetwork(cluster);
      
      if (validation.isValid) {
        const nextState: SharedBootstrapResult = {
          cluster,
          endpoint: validation.endpoint,
          isConnected: true,
          latency: validation.latency,
          error: null
        };

        setCurrentNetwork({
          ...nextState,
          blockHeight: null, // Will be updated by monitoring
          tps: null
        });

        sharedBootstrapResult = nextState;
        
        // Store user preference
        localStorage.setItem('starcom-preferred-cluster', cluster);
        return true;
      } else {
        setCurrentNetwork(prev => ({
          ...prev,
          error: validation.error || 'Network validation failed'
        }));
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network switch failed';
      setCurrentNetwork(prev => ({
        ...prev,
        error: errorMessage
      }));
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [validateNetwork]);

  /**
   * Auto-detect optimal network
   */
  const autoDetectNetwork = useCallback(async (): Promise<SolanaCluster> => {
    const validationPromises = supportedNetworks.map(cluster => 
      validateNetwork(cluster).then(result => ({ cluster, result }))
    );
    
    const results = await Promise.all(validationPromises);
    
    // Find fastest responding network
    const validNetworks = results
      .filter(({ result }) => result.isValid)
      .sort((a, b) => a.result.latency - b.result.latency);
    
    if (validNetworks.length > 0) {
      return validNetworks[0].cluster;
    }
    
    // Fallback to devnet
    return 'devnet';
  }, [supportedNetworks, validateNetwork]);

  /**
   * Monitor network health
   */
  const monitorNetworkHealth = useCallback(async () => {
    if (!currentNetwork.isConnected) return;
    
    try {
      const connection = new Connection(currentNetwork.endpoint, 'confirmed');
      const [blockHeight, recentPerformance] = await Promise.all([
        connection.getBlockHeight(),
        connection.getRecentPerformanceSamples(1)
      ]);

      const tps = recentPerformance.length > 0 
        ? recentPerformance[0].numTransactions / recentPerformance[0].samplePeriodSecs
        : null;

      setCurrentNetwork(prev => ({
        ...prev,
        blockHeight,
        tps,
        latency: null,
        error: null
      }));
    } catch (error) {
      setCurrentNetwork(prev => ({
        ...prev,
        latency: null,
        error: error instanceof Error ? error.message : 'Network monitoring failed'
      }));
    }
  }, [currentNetwork.endpoint, currentNetwork.isConnected]);

  /**
   * Get network display name
   */
  const getNetworkDisplayName = useCallback((cluster: SolanaCluster): string => {
    const names = {
      'devnet': 'Devnet',
      'testnet': 'Testnet', 
      'mainnet-beta': 'Mainnet'
    };
    return names[cluster];
  }, []);

  /**
   * Check if wallet supports current network
   */
  const isWalletCompatible = useCallback((): boolean => {
    // Most Solana wallets support all clusters
    // This could be enhanced to check specific wallet capabilities
    return !!wallet;
  }, [wallet]);

  // Initialize network on mount
  useEffect(() => {
    let mounted = true;

    const initializeNetwork = async () => {
      try {
        const result = await initializeNetworkShared(supportedNetworks, validateNetwork);

        if (!mounted) {
          return;
        }

        setCurrentNetwork((previous) => ({
          ...previous,
          cluster: result.cluster,
          endpoint: result.endpoint,
          isConnected: result.isConnected,
          latency: result.latency,
          error: result.error
        }));

        if (result.isConnected) {
          localStorage.setItem('starcom-preferred-cluster', result.cluster);
        }
      } catch (error) {
        if (!mounted) {
          return;
        }

        setCurrentNetwork((previous) => ({
          ...previous,
          isConnected: false,
          error: error instanceof Error ? error.message : 'Network initialization failed'
        }));
      }
    };

    void initializeNetwork();

    return () => {
      mounted = false;
    };
  }, [supportedNetworks, validateNetwork]);

  // Monitor network health periodically
  useEffect(() => {
    if (!currentNetwork.isConnected) return;

    const unsubscribe = subscribeEndpointMonitor(currentNetwork.endpoint, (update) => {
      setCurrentNetwork((prev) => {
        if (prev.endpoint !== currentNetwork.endpoint || !prev.isConnected) {
          return prev;
        }

        return {
          ...prev,
          blockHeight: update.blockHeight,
          tps: update.tps,
          latency: update.latency,
          error: update.error
        };
      });
    });

    return unsubscribe;
  }, [currentNetwork.isConnected, currentNetwork.endpoint]);

  return {
    currentNetwork,
    supportedNetworks,
    isValidating,
    validateNetwork,
    switchNetwork,
    autoDetectNetwork,
    getNetworkDisplayName,
    isWalletCompatible,
    monitorNetworkHealth
  };
}
