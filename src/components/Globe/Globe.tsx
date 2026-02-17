// @ts-nocheck
// src/components/Globe/Globe.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Globe, { GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';
import { useVisualizationMode } from '../../context/VisualizationModeContext';
import { useGlobeLoading } from '../../context/GlobeLoadingContext';
import { formatEcoDisasterLabel, formatEcoDisasterTooltip } from '../EcoNatural/formatters';
import { GlobeEngine } from '../../globe-engine/GlobeEngine';
import type { GlobeEvent } from '../../globe-engine/GlobeEngine';
import { GlobeMaterialManager } from '../../globe-engine/GlobeMaterialManager';
import { useSpaceWeatherContext } from '../../context/SpaceWeatherContext';
import GlobeLoadingManager from './GlobeLoadingManager';
import { useIntelReport3DMarkers } from '../../hooks/useIntelReport3DMarkers';
import { useCyberThreats3D } from '../../hooks/useCyberThreats3D';
import { useCyberAttacks3D } from '../../hooks/useCyberAttacks3D';
import { intelReportVisualizationService } from '../../services/IntelReportVisualizationService';
import { IntelReportOverlayMarker } from '../../interfaces/IntelReportOverlay';
import { Enhanced3DGlobeInteractivity } from './Enhanced3DGlobeInteractivity';
import { useGlobeSolarSystemIntegration } from './GlobeSolarSystemIntegration';
import type { SolarSystemState } from '../../solar-system/SolarSystemManager';
import useEcoNaturalSettings from '../../hooks/useEcoNaturalSettings';
import useGeoEvents from '../../hooks/useGeoEvents';
import { visualizationResourceMonitor } from '../../services/visualization/VisualizationResourceMonitor';
import { memoryBudgetConfig } from '../../config/memoryBudgets';
import { intelReportService } from '../../services/intel/IntelReportService';
import { intelWorkspaceManager } from '../../services/intel/IntelWorkspaceManager';
import { nostrStarcomIntelIngest } from '../../services/intel/NostrStarcomIntelIngest';
import RealTimeEventSystem from '../../services/realTimeEventSystem';
// Cyber visualization services
import { ThreatIntelligenceService } from '../../services/CyberThreats/ThreatIntelligenceService';
import { RealTimeAttackService } from '../../services/CyberAttacks/RealTimeAttackService';
import { satelliteVisualizationService } from '../../services/Satellites/SatelliteVisualizationService';
import { collectGeometryStats } from '../../utils/threeResourceMetrics';
import { latLngToGlobeVector3 } from '../../utils/globeCoordinates';
import type { CyberThreatData } from '../../types/CyberThreats';
import type { CyberAttackData } from '../../types/CyberAttacks';
// GeoPolitical + territories integration
import { useGeoPoliticalSettings } from '../../hooks/useGeoPoliticalSettings';
import { useNationalTerritories3D } from '../../geopolitical/hooks/useNationalTerritories3D';
import { verifyGeopoliticalAssets } from '../../geopolitical/integrity/verifyGeopoliticalAssets';
import { useVisualizationOverlay } from '../../hooks/useVisualizationOverlay';

// TS shim for process env in browser build (debug flags) - safe no-op in prod bundlers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const process: any;

// Define ModelInstance interface locally since it's used in multiple files
interface ModelInstance {
  positionContainer: THREE.Group;
  orientationContainer: THREE.Group;
  rotationContainer: THREE.Group;
  mesh: THREE.Object3D;
  report: IntelReportOverlayMarker;
  basePosition: THREE.Vector3;
  hoverOffset: number;
  localRotationY: number;
}

const SATELLITES_MODE_KEY = 'CyberCommand.Satellites' as const;

const GlobeView: React.FC = () => {
  const [globeData, setGlobeData] = useState<object[]>([]);
  const globeRef = useRef<GlobeMethods>();
  const { visualizationMode } = useVisualizationMode();
  const { hasGlobeLoadedBefore, markGlobeAsLoaded, setGlobeInitialized } = useGlobeLoading();
  const [globeEngine, setGlobeEngine] = useState<GlobeEngine | null>(null);
  const [material, setMaterial] = useState<THREE.Material | null>(null);
  
  // Intel Report 3D markers state
  const [intelReports, setIntelReports] = useState<IntelReportOverlayMarker[]>([]);
  const intelMarkerGroupRef = useRef<THREE.Group>(new THREE.Group());
  const intelReportsSignatureRef = useRef<string>('');
  const [intelModels, setIntelModels] = useState<ModelInstance[]>([]); // Store 3D model instances for interactivity
  const [hoveredReportId, setHoveredReportId] = useState<string | null>(null); // Track hovered model

  // CyberThreats and CyberAttacks visualization state
  const cyberThreatsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const cyberAttacksGroupRef = useRef<THREE.Group>(new THREE.Group());
  const networkInfraGroupRef = useRef<THREE.Group>(new THREE.Group());
  const commHubsGroupRef = useRef<THREE.Group>(new THREE.Group());
  // Debug: Prime meridian/equator marker(s)
  const primeMeridianMarkerRef = useRef<THREE.Group>(new THREE.Group());
  const boundaryObjectsRef = useRef<Record<string, THREE.Object3D | undefined>>({});
  const boundaryOverlays = ['spaceWeatherMagnetopause', 'spaceWeatherBowShock', 'spaceWeatherAurora'];
  const [spaceWeatherBoundaryStatus, setSpaceWeatherBoundaryStatus] = useState({
    magnetopause: { enabled: false, attached: false },
    bowShock: { enabled: false, attached: false },
    aurora: { enabled: false, attached: false }
  });
  const boundaryDiagnosticsRef = useRef({
    signature: '',
    lastLogAt: 0
  });
  
  // Cyber data services and state
  const threatServiceRef = useRef<ThreatIntelligenceService | null>(null);
  const attackServiceRef = useRef<RealTimeAttackService | null>(null);
  const [cyberThreatsData, setCyberThreatsData] = useState<CyberThreatData[]>([]);
  const [cyberAttacksData, setCyberAttacksData] = useState<CyberAttackData[]>([]);
  const [cyberDataLoading, setCyberDataLoading] = useState(false);
  const enableLegacyCyberDataPipeline = false;
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Space weather integration via context
  const { 
    visualizationVectors 
    // isLoading: _spaceWeatherLoading,
    // error: _spaceWeatherError 
  } = useSpaceWeatherContext();
  const { settings: spaceWeatherSettings } = useSpaceWeatherContext();
  const logBoundaryAttachmentDiagnostics = useCallback((reason: string) => {
    if (!isDevelopment) return;

    const scene = globeRef.current?.scene?.();
    const now = Date.now();
    const details = [
      {
        id: 'magnetopause',
        enabled: spaceWeatherSettings?.showMagnetopause === true,
        key: 'spaceWeatherMagnetopause'
      },
      {
        id: 'bowShock',
        enabled: spaceWeatherSettings?.showSolarWind === true,
        key: 'spaceWeatherBowShock'
      },
      {
        id: 'aurora',
        enabled: spaceWeatherSettings?.showAuroralOval === true,
        key: 'spaceWeatherAuroraLinesNorth'
      }
    ].map((entry) => {
      const objectKey = entry.key;
      const objectRef = boundaryObjectsRef.current[objectKey] ?? globeEngine?.getOverlayObject(objectKey);
      const attached = Boolean(scene && objectRef && scene.children.includes(objectRef));

      let boundsRadius: number | null = null;
      let worldDistance: number | null = null;
      if (objectRef) {
        const box = new THREE.Box3().setFromObject(objectRef);
        if (box.isEmpty() === false) {
          const sphere = box.getBoundingSphere(new THREE.Sphere());
          boundsRadius = Number(sphere.radius.toFixed(3));
          worldDistance = Number(sphere.center.length().toFixed(3));
        }
      }

      return {
        id: entry.id,
        enabled: entry.enabled,
        attached,
        hasObject: Boolean(objectRef),
        objectKey,
        boundsRadius,
        worldDistance
      };
    });

    const enabledMissing = details.filter((entry) => entry.enabled && !entry.attached);
    if (enabledMissing.length === 0) return;

    const signature = JSON.stringify({
      reason,
      missing: enabledMissing.map((entry) => ({ id: entry.id, hasObject: entry.hasObject, attached: entry.attached }))
    });

    if (boundaryDiagnosticsRef.current.signature === signature && now - boundaryDiagnosticsRef.current.lastLogAt < 5000) {
      return;
    }

    boundaryDiagnosticsRef.current.signature = signature;
    boundaryDiagnosticsRef.current.lastLogAt = now;

    console.warn('[SpaceWeather][BoundaryDiagnostics] enabled overlay missing from scene', {
      reason,
      sceneReady: Boolean(scene),
      overlaysActive: globeEngine?.getOverlays(),
      details
    });
  }, [
    globeEngine,
    isDevelopment,
    spaceWeatherSettings?.showAuroralOval,
    spaceWeatherSettings?.showMagnetopause,
    spaceWeatherSettings?.showSolarWind
  ]);
  const refreshBoundaryStatus = useCallback(() => {
    const scene = globeRef.current?.scene?.();
    const isAttached = (key: string) => {
      const objectRef = boundaryObjectsRef.current[key] ?? globeEngine?.getOverlayObject(key);
      return Boolean(scene && objectRef && scene.children.includes(objectRef));
    };

    setSpaceWeatherBoundaryStatus({
      magnetopause: {
        enabled: spaceWeatherSettings?.showMagnetopause === true,
        attached: isAttached('spaceWeatherMagnetopause')
      },
      bowShock: {
        enabled: spaceWeatherSettings?.showSolarWind === true,
        attached: isAttached('spaceWeatherBowShock')
      },
      aurora: {
        enabled: spaceWeatherSettings?.showAuroralOval === true,
        attached:
          isAttached('spaceWeatherAuroraLinesNorth') &&
          isAttached('spaceWeatherAuroraLinesSouth') &&
          isAttached('spaceWeatherAuroraBlackout')
      }
    });
    logBoundaryAttachmentDiagnostics('refreshBoundaryStatus');
  }, [
    logBoundaryAttachmentDiagnostics,
    globeEngine,
    spaceWeatherSettings?.showAuroralOval,
    spaceWeatherSettings?.showMagnetopause,
    spaceWeatherSettings?.showSolarWind
  ]);
  const { config: ecoSettings } = useEcoNaturalSettings();
  const ecoResourceBudgetSet = useRef(false);

  const ecoDisastersEnabled = visualizationMode.mode === 'EcoNatural' && visualizationMode.subMode === 'EcologicalDisasters';

  const {
    filtered: ecoEvents,
    error: ecoEventsError,
    stale: ecoEventsStale,
    refetch: refetchEcoEvents
  } = useGeoEvents({
    enabled: ecoDisastersEnabled,
    refreshMinutes: 1,
    timeRangeDays: ecoSettings.ecologicalDisasters.timeRange,
    disasterTypes: ecoSettings.ecologicalDisasters.disasterTypes,
    severity: ecoSettings.ecologicalDisasters.severity
  });

  const ecoRefetchTriggered = useRef(false);

  useEffect(() => {
    if (!ecoDisastersEnabled) {
      ecoRefetchTriggered.current = false;
      return;
    }
    if (!globeEngine) return;
    if (ecoRefetchTriggered.current) return;
    ecoRefetchTriggered.current = true;
    refetchEcoEvents().catch((err) => console.warn('EcoNatural refetch failed after engine init', err));
  }, [ecoDisastersEnabled, globeEngine, refetchEcoEvents]);

  useEffect(() => {
    if (ecoResourceBudgetSet.current) return;
    visualizationResourceMonitor.setBudgets('EcoNatural.EcologicalDisasters', {
      maxVectors: 900,
      maxPipelineVectors: 1800,
      maxHeapBytes: memoryBudgetConfig.ecoHeapBudgetBytes
    });
    ecoResourceBudgetSet.current = true;
  }, []);

  useEffect(() => {
    if (!ecoDisastersEnabled) return;
    const off = visualizationResourceMonitor.onWarning((snapshot) => {
      if (snapshot.mode !== 'EcoNatural.EcologicalDisasters') return;
      console.warn('[EcoDisasters][resource-budget]', snapshot.warnings, {
        vectors: snapshot.vectors,
        pipelineVectors: snapshot.pipelineVectors,
        heap: snapshot.heap
      });
    });
    return () => off();
  }, [ecoDisastersEnabled]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitializing, setIsInitializing] = useState(!hasGlobeLoadedBefore);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const snapDoneRef = useRef(false);
  const isMobileDevice = useMemo(() => {
    if (typeof navigator === 'undefined') {
      return false;
    }
    return /iPhone|iPad|iPod|Android|Mobile|webOS/i.test(navigator.userAgent);
  }, []);
  const rendererConfig = useMemo(() => ({
    antialias: !isMobileDevice,
    alpha: true,
    preserveDrawingBuffer: false,
    powerPreference: isMobileDevice ? 'low-power' as const : 'high-performance' as const
  }), [isMobileDevice]);
  // GeoPolitical settings (used for dev-only geoSnap toggles)
  const { config: geoPoliticalConfig, updateNationalTerritories } = useGeoPoliticalSettings();
  const { nationalTerritoriesOverlayEnabled } = useVisualizationOverlay();

  // Solar system integration (optional feature - can be enabled/disabled)
  // Only activate in compatible visualization modes to prevent conflicts
  const solarSystemEnabled = visualizationMode.mode === 'EcoNatural' || 
                              (visualizationMode.mode === 'CyberCommand' && visualizationMode.subMode !== 'IntelReports');
  
  const handleSolarSystemStateChange = useCallback((state: SolarSystemState) => {
    if (process.env.NODE_ENV === 'development') {
      if (state.sunState?.isVisible) {
        console.log(`Sun is now visible in ${state.currentContext} scale`);
      }
      console.log('Solar system state change:', state);
    }
  }, []);

  const solarSystemIntegration = useGlobeSolarSystemIntegration({
    globeRef,
    enabled: solarSystemEnabled, // Only enable in compatible modes
    debugMode: false, // Disabled debug mode to reduce console noise
    onStateChange: handleSolarSystemStateChange
  });

  const solarDirection = useMemo(() => {
    const sunPosition = solarSystemIntegration?.solarSystemState?.sunState?.currentPosition;
    if (!sunPosition) return null;
    const vector = new THREE.Vector3(sunPosition.x, sunPosition.y, sunPosition.z);
    if (vector.lengthSq() < 1e-8) return null;
    return vector.normalize();
  }, [
    solarSystemIntegration?.solarSystemState?.sunState?.currentPosition?.x,
    solarSystemIntegration?.solarSystemState?.sunState?.currentPosition?.y,
    solarSystemIntegration?.solarSystemState?.sunState?.currentPosition?.z
  ]);

  useEffect(() => {
    if (!material || !solarDirection) return;
    GlobeMaterialManager.updateSunDirection(material, solarDirection);
  }, [material, solarDirection]);

  useEffect(() => {
    // Fast track initialization if Globe has loaded before
    const initDelay = hasGlobeLoadedBefore ? 0 : 800; // No delay for subsequent loads
    let materialCheckTimer: ReturnType<typeof setInterval> | null = null;
    let initFailsafeTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    
    const initTimer = setTimeout(() => {
      if (cancelled) {
        return;
      }
      const overlays: string[] = [];
      if (visualizationMode.mode === 'EcoNatural' && visualizationMode.subMode === 'SpaceWeather') {
        overlays.push('spaceWeather', 'spaceWeatherMagnetopause', 'spaceWeatherBowShock', 'spaceWeatherAurora');
      }
      if (visualizationMode.mode === 'EcoNatural' && visualizationMode.subMode === 'EcologicalDisasters') {
        overlays.push('naturalEvents');
      }
      const engine = new GlobeEngine({ mode: visualizationMode.mode, overlays });
      setGlobeEngine(engine);

      initFailsafeTimer = setTimeout(() => {
        if (cancelled) {
          return;
        }
        setIsInitializing(false);
        setGlobeInitialized(true);
        if (!hasGlobeLoadedBefore) {
          markGlobeAsLoaded();
        }
      }, hasGlobeLoadedBefore ? 1500 : 5000);
      
      // Check for material with appropriate timing
      const materialCheckInterval = hasGlobeLoadedBefore ? 10 : 100; // Faster checks for subsequent loads
      materialCheckTimer = setInterval(() => {
        if (cancelled) {
          if (materialCheckTimer) {
            clearInterval(materialCheckTimer);
            materialCheckTimer = null;
          }
          return;
        }
        const mat = engine.getMaterial();
        if (mat) {
          setMaterial(mat);
          if (initFailsafeTimer) {
            clearTimeout(initFailsafeTimer);
            initFailsafeTimer = null;
          }
          // Mark as ready for rendering
          const readyDelay = hasGlobeLoadedBefore ? 0 : 100; // Instant for subsequent loads
          setTimeout(() => {
            if (cancelled) {
              return;
            }
            setIsInitializing(false);
            setGlobeInitialized(true);
            if (!hasGlobeLoadedBefore) {
              markGlobeAsLoaded(); // Mark as loaded only on first successful initialization
            }
          }, readyDelay);
          if (materialCheckTimer) {
            clearInterval(materialCheckTimer);
            materialCheckTimer = null;
          }
        }
      }, materialCheckInterval);
    }, initDelay);

    return () => {
      cancelled = true;
      clearTimeout(initTimer);
      if (initFailsafeTimer) {
        clearTimeout(initFailsafeTimer);
      }
      if (materialCheckTimer) {
        clearInterval(materialCheckTimer);
      }
    };
  }, [visualizationMode.mode, visualizationMode.subMode, hasGlobeLoadedBefore, markGlobeAsLoaded, setGlobeInitialized]);

  // Track container size for responsive Globe
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Use the full available space, only enforce minimum for very small screens
        setContainerSize({ 
          width: Math.max(rect.width, 200), 
          height: Math.max(rect.height, 200) 
        });
      }
    };

    // Initial size
    updateSize();

    // Create ResizeObserver to watch container size changes
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);

    // Also listen to window resize as backup
    window.addEventListener('resize', updateSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  useEffect(() => {
    // If additional globeEngine-driven overlays are needed, merge them instead of wiping data.
    // Intentionally avoid clearing globeData here to preserve the first paint from hooks.
  }, [globeEngine]);

  // Ecological disasters data -> globe markers
  useEffect(() => {
    if (!ecoDisastersEnabled) {
      visualizationResourceMonitor.clearMode('EcoNatural.EcologicalDisasters');
      setGlobeData(prevData => prevData.filter((d: { type?: string }) => d.type !== 'eco-disaster'));
      console.info('[Globe][Eco] Cleared eco-disaster markers (mode disabled)');
      return;
    }

    const colorForSeverity = (bucket?: string) => {
      switch (bucket) {
        case 'catastrophic':
          return '#ff4d4f';
        case 'major':
          return '#fa8c16';
        default:
          return '#ffd666';
      }
    };

    const sizeForSeverity = (bucket?: string) => {
      switch (bucket) {
        case 'catastrophic':
          return 0.85;
        case 'major':
          return 0.65;
        default:
          return 0.45;
      }
    };

    const formatLabel = (event: typeof ecoEvents[number]) => formatEcoDisasterLabel(event);

    const validEvents = ecoEvents.filter((event) => Number.isFinite(event.lat) && Number.isFinite(event.lng));
    const invalidCount = ecoEvents.length - validEvents.length;
    if (invalidCount > 0) {
      console.warn(`Dropping ${invalidCount} eco-disaster events with invalid coordinates`);
    }

    const markers = validEvents.map(event => ({
      lat: event.lat,
      lng: event.lng,
      size: sizeForSeverity(event.severityBucket),
      color: colorForSeverity(event.severityBucket),
      label: formatLabel(event),
      tooltip: formatEcoDisasterTooltip(event),
      magnitude: event.magnitude,
      type: 'eco-disaster',
      hazardType: event.type,
      severityBucket: event.severityBucket,
      timestamp: event.timestamp,
      source: event.source || 'geo-events'
    }));

    setGlobeData(prevData => {
      const nonEco = prevData.filter((d: { type?: string }) => d.type !== 'eco-disaster');
      return [...nonEco, ...markers];
    });

    const volcanoCount = markers.filter(m => m.hazardType === 'volcano').length;
    console.info('[Globe][Eco] Applied eco-disaster markers', {
      markers: markers.length,
      volcanoes: volcanoCount,
      earthquakes: markers.filter(m => m.hazardType === 'earthquake').length,
      wildfires: markers.filter(m => m.hazardType === 'wildfire').length,
      stale: ecoEventsStale,
      error: Boolean(ecoEventsError)
    });

    visualizationResourceMonitor.recordPipelineVectors('EcoNatural.EcologicalDisasters', {
      count: ecoEvents.length,
      approxBytes: ecoEvents.length * 128
    });

    visualizationResourceMonitor.recordVectors('EcoNatural.EcologicalDisasters', {
      count: markers.length,
      approxBytes: markers.length * 128
    });

    if (typeof performance !== 'undefined' && 'memory' in performance && (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory) {
      const { usedJSHeapSize, jsHeapSizeLimit } = (performance as Performance & { memory: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      visualizationResourceMonitor.recordHeap('EcoNatural.EcologicalDisasters', usedJSHeapSize, jsHeapSizeLimit);
    }

    if (ecoEventsError) {
      console.error('Ecological disasters data error:', ecoEventsError);
    }
    if (ecoEventsStale) {
      console.warn('Ecological disasters data stale');
    }
  }, [ecoDisastersEnabled, ecoEvents, ecoEventsError, ecoEventsStale]);

  // Attach space weather boundary meshes from GlobeEngine into the scene
  useEffect(() => {
    if (!globeEngine) return;
    let disposed = false;

    const getScene = () => globeRef.current?.scene?.();

    const attachObjects = (overlay: string) => {
      const scene = getScene();
      if (!scene) return false;

      const applySolarAlignment = (obj: THREE.Object3D | undefined, overlayName: string) => {
        if (!obj || !solarDirection) return;
        if (overlayName !== 'spaceWeatherMagnetopause' && overlayName !== 'spaceWeatherBowShock') return;
        const target = solarDirection.clone().normalize();
        const reference = new THREE.Vector3(1, 0, 0);
        const q = new THREE.Quaternion().setFromUnitVectors(reference, target);
        obj.quaternion.copy(q);
      };

      if (overlay === 'spaceWeatherAurora') {
        const keys = ['spaceWeatherAuroraLinesNorth', 'spaceWeatherAuroraLinesSouth', 'spaceWeatherAuroraBlackout'];
        keys.forEach((key) => {
          const obj = globeEngine.getOverlayObject(key);
          const prev = boundaryObjectsRef.current[key];
          if (prev && scene.children.includes(prev)) scene.remove(prev);
          if (obj) {
            scene.add(obj);
            boundaryObjectsRef.current[key] = obj;
          } else {
            boundaryObjectsRef.current[key] = undefined;
          }
        });
        return true;
      }

      const obj = globeEngine.getOverlayObject(overlay);
      const prev = boundaryObjectsRef.current[overlay];
      if (prev && scene.children.includes(prev)) scene.remove(prev);
      if (obj) {
        applySolarAlignment(obj, overlay);
        scene.add(obj);
        boundaryObjectsRef.current[overlay] = obj;
      } else {
        boundaryObjectsRef.current[overlay] = undefined;
      }
      return true;
    };

    const attachAllWhenSceneReady = (attempt = 0) => {
      if (disposed) return;
      const scene = getScene();
      if (!scene) {
        if (attempt < 120) {
          requestAnimationFrame(() => attachAllWhenSceneReady(attempt + 1));
        }
        logBoundaryAttachmentDiagnostics('scene-not-ready');
        return;
      }
      boundaryOverlays.forEach(attachObjects);
      refreshBoundaryStatus();
      logBoundaryAttachmentDiagnostics('attach-all');
    };

    const handler = ({ type, payload }: GlobeEvent) => {
      if (type === 'overlayDataUpdated' && payload && typeof payload === 'object') {
        const p = payload as { overlay?: string; unchanged?: boolean };
        if (p.unchanged) return;
        if (p.overlay && boundaryOverlays.includes(p.overlay)) {
          attachObjects(p.overlay);
          refreshBoundaryStatus();
          logBoundaryAttachmentDiagnostics(`overlay-updated:${p.overlay}`);
        }
      }
      if (type === 'overlayRemoved' && typeof payload === 'string') {
        if (boundaryOverlays.includes(payload)) {
          const scene = getScene();
          const keys = payload === 'spaceWeatherAurora'
            ? ['spaceWeatherAuroraLinesNorth', 'spaceWeatherAuroraLinesSouth', 'spaceWeatherAuroraBlackout']
            : [payload];
          keys.forEach((key) => {
            const prev = boundaryObjectsRef.current[key];
            if (scene && prev && scene.children.includes(prev)) scene.remove(prev);
            boundaryObjectsRef.current[key] = undefined;
          });
          refreshBoundaryStatus();
          logBoundaryAttachmentDiagnostics(`overlay-removed:${payload}`);
        }
      }
    };

    globeEngine.on('overlayDataUpdated', handler);
    globeEngine.on('overlayRemoved', handler as unknown as (event: GlobeEvent) => void);

    // Attach existing cached objects once scene is available
    attachAllWhenSceneReady();

    return () => {
      disposed = true;
      const scene = getScene();
      ['spaceWeatherMagnetopause', 'spaceWeatherBowShock', 'spaceWeatherAuroraLinesNorth', 'spaceWeatherAuroraLinesSouth', 'spaceWeatherAuroraBlackout'].forEach((key) => {
        const prev = boundaryObjectsRef.current[key];
        if (scene && prev && scene.children.includes(prev)) scene.remove(prev);
        boundaryObjectsRef.current[key] = undefined;
      });
      refreshBoundaryStatus();
    };
  }, [globeEngine, logBoundaryAttachmentDiagnostics, refreshBoundaryStatus, solarDirection]);

  // Sync overlay activation with space weather settings
  useEffect(() => {
    if (!globeEngine || !spaceWeatherSettings) return;

    const toggleOverlay = (overlay: string, enabled: boolean) => {
      const active = globeEngine.getOverlays().includes(overlay);
      if (enabled && !active) globeEngine.addOverlay(overlay);
      if (!enabled && active) globeEngine.removeOverlay(overlay);
    };

    toggleOverlay('spaceWeatherMagnetopause', spaceWeatherSettings.showMagnetopause === true);
    // Bow shock depends on solar wind visibility; reuse that toggle
    toggleOverlay('spaceWeatherBowShock', spaceWeatherSettings.showSolarWind === true);
    toggleOverlay('spaceWeatherAurora', spaceWeatherSettings.showAuroralOval === true);
    refreshBoundaryStatus();
  }, [globeEngine, spaceWeatherSettings, refreshBoundaryStatus]);

  // DEV: scripted camera snapshots for alignment/QA baseline
  useEffect(() => {
    if (process?.env?.NODE_ENV !== 'development') return;
    if (!globeRef.current || !containerRef.current) return;
    if (snapDoneRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const snapParam = params.get('geoSnap');
    if (!snapParam) return;

    const shots: Record<string, { lat: number; lng: number; altitude?: number; ms?: number } > = {
      seam0: { lat: 0, lng: 0, altitude: 2.6, ms: 700 },
      eq90E: { lat: 0, lng: 90, altitude: 2.6, ms: 700 },
      eq90W: { lat: 0, lng: -90, altitude: 2.6, ms: 700 },
      anti180: { lat: 0, lng: 180, altitude: 2.6, ms: 700 },
      pm45N: { lat: 45, lng: 0, altitude: 2.8, ms: 800 },
      pm45S: { lat: -45, lng: 0, altitude: 2.8, ms: 800 },
      lat45E: { lat: 45, lng: 90, altitude: 2.8, ms: 800 },
      lat45W: { lat: 45, lng: -90, altitude: 2.8, ms: 800 },
      // Limb comparison viewpoint
      limb: { lat: 0, lng: 90, altitude: 2.6, ms: 800 },
      limbNoBias: { lat: 0, lng: 90, altitude: 2.6, ms: 800 },
      limbWithBias: { lat: 0, lng: 90, altitude: 2.6, ms: 800 },
      // Poles
      northPole: { lat: 85, lng: 0, altitude: 3.0, ms: 800 },
      southPole: { lat: -85, lng: 0, altitude: 3.0, ms: 800 },
      // Small islands regions (approximate centers)
      maldives: { lat: 3.2, lng: 73.2, altitude: 2.2, ms: 900 },
      aegean: { lat: 37.9, lng: 25.0, altitude: 2.2, ms: 900 },
      caribbean: { lat: 13.1, lng: -59.6, altitude: 2.2, ms: 900 },
      pacificMicro: { lat: 7.0, lng: 158.0, altitude: 2.3, ms: 900 },
  // Disputed and maritime hotspots (approximate views for QA)
  kashmirLoC: { lat: 34.4, lng: 74.3, altitude: 3.0, ms: 900 },
  westSahara: { lat: 24.5, lng: -13.0, altitude: 3.0, ms: 900 },
  southChinaSea: { lat: 15.0, lng: 115.0, altitude: 2.9, ms: 900 },
    };

    const keys = snapParam === 'all' ? Object.keys(shots) : snapParam.split(',').map(s => s.trim()).filter(Boolean);
    // Helper to wait for animation frames (ensure renders settled)
    const awaitFrames = async (count = 2) => {
      for (let i = 0; i < count; i++) {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      }
    };

    const g = globeRef.current as unknown as GlobeMethods;
    const doSnap = (name: string) => {
      const canvas = containerRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
      if (!canvas) {
        console.warn('Snapshot skipped, canvas not found for', name);
        return;
      }
      try {
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        a.href = url;
        a.download = `globe-${name}-${ts}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
  console.log(`📸 Captured snapshot: ${name}`);
      } catch (err) {
  console.warn('Snapshot failed for', name, err);
      }
    };

    snapDoneRef.current = true; // ensure single run
    (async () => {
      // Optional: apply URL flags for maritime/disputed visibility to stabilize QA flows
      const fParams = new URLSearchParams(window.location.search);
    const maritimeFlag = fParams.get('geoMaritime');
    const disputedFlag = fParams.get('geoDisputed');
    const lodFlag = fParams.get('geoLod'); // 0|1|2 to lock LOD deterministically
    if (maritimeFlag !== null || disputedFlag !== null || lodFlag !== null) {
        updateNationalTerritories({
          ...(maritimeFlag !== null ? { showMaritimeBorders: maritimeFlag !== '0' && maritimeFlag !== 'false' } : {}),
      ...(disputedFlag !== null ? { showDisputedTerritories: disputedFlag !== '0' && disputedFlag !== 'false' } : {}),
      ...(lodFlag !== null ? { lod: { mode: 'locked', lockedLevel: (['0','1','2'].includes(lodFlag) ? Number(lodFlag) : 2) as 0|1|2, hysteresis: geoPoliticalConfig?.nationalTerritories?.lod?.hysteresis ?? 25 } } : {})
        });
        // allow settings to propagate
        await new Promise(r => setTimeout(r, 300));
      }
      // Capture original rendering bias settings to restore later
      const originalBias = {
        fillElevationEpsilon: geoPoliticalConfig?.nationalTerritories?.fillElevationEpsilon,
        usePolygonOffset: geoPoliticalConfig?.nationalTerritories?.usePolygonOffset,
        polygonOffsetFactor: geoPoliticalConfig?.nationalTerritories?.polygonOffsetFactor,
        polygonOffsetUnits: geoPoliticalConfig?.nationalTerritories?.polygonOffsetUnits,
      };
      for (const k of keys) {
        const s = shots[k];
        if (!s) { console.warn('Unknown geoSnap key:', k); continue; }
        try {
          // For limb comparison keys, toggle rendering bias first
          if (k === 'limbNoBias') {
            updateNationalTerritories({
              fillElevationEpsilon: 0,
              usePolygonOffset: false
            });
            // Give time for rerender and settle
            await new Promise(r => setTimeout(r, 500));
            await awaitFrames(2);
          }
          if (k === 'limbWithBias') {
            updateNationalTerritories({
              fillElevationEpsilon: 0.3,
              usePolygonOffset: true,
              polygonOffsetFactor: -1.5,
              polygonOffsetUnits: -1.5
            });
            // Give time for rerender and settle
            await new Promise(r => setTimeout(r, 600));
            await awaitFrames(2);
          }
          // Move camera
          g.pointOfView({ lat: s.lat, lng: s.lng, altitude: s.altitude ?? 2.6 }, s.ms ?? 700);
        } catch {
          // ignore
        }
        // Wait for POV transition, then ensure a couple of frames
        await new Promise(r => setTimeout(r, (s.ms ?? 700) + 300));
        await awaitFrames(2);
        doSnap(k);
        await new Promise(r => setTimeout(r, 250));
      }
      // Restore original rendering bias settings
      if (originalBias) {
        updateNationalTerritories({
          fillElevationEpsilon: originalBias.fillElevationEpsilon,
          usePolygonOffset: originalBias.usePolygonOffset,
          polygonOffsetFactor: originalBias.polygonOffsetFactor,
          polygonOffsetUnits: originalBias.polygonOffsetUnits
        });
      }
    })();
  }, [globeRef, containerRef, updateNationalTerritories, geoPoliticalConfig]);

  // -----------------------------------------------------------------------------
  // DEBUG MARKERS: Prime meridian / equator alignment indicators
  // Uses the same phi/theta convention as other Globe overlays (theta = lon+180, inverted X)
  // Dev modes:
  // - ?geoDebugOverlay=markers  -> marker set only
  // - ?geoDebugOverlay=audit    -> marker set + full prime meridian/equator/anti-meridian lines
  useEffect(() => {
    if (process?.env?.NODE_ENV !== 'development') return;
    if (!globeRef.current) return;

    const globeObj = globeRef.current as unknown as { scene: () => THREE.Scene };
    const scene = globeObj?.scene();
    if (!scene) return;

    const group = primeMeridianMarkerRef.current;

    // Clean any previous marker content
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        const geom = (child as THREE.Mesh | THREE.Line).geometry as THREE.BufferGeometry | undefined;
        geom?.dispose();
        const material = (child as THREE.Mesh | THREE.Line).material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) {
          material.forEach((m) => m.dispose());
        } else if (material) {
          material.dispose();
        }
      }
    }

    // Helper to add a small marker just above the globe surface
    const radius = 102; // Globe radius is ~100; place slightly above to avoid z-fighting
    const addMarker = (latDeg: number, lonDeg: number, color = 0xffff00) => {
      const pos = latLngToGlobeVector3(latDeg, lonDeg, radius);
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 16, 12),
        new THREE.MeshBasicMaterial({ color, depthTest: false })
      );
      sphere.position.copy(pos);
      group.add(sphere);
      // short radial line
      const lineGeom = new THREE.BufferGeometry().setFromPoints([
        pos.clone().multiplyScalar(0.985),
        pos.clone().multiplyScalar(1.015)
      ]);
      const line = new THREE.Line(
        lineGeom,
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, depthTest: false })
      );
      group.add(line);
    };

    const addPolyline = (points: Array<{ lat: number; lon: number }>, color: number, opacity = 0.8) => {
      const vectors = points.map((point) => latLngToGlobeVector3(point.lat, point.lon, radius));
      const geometry = new THREE.BufferGeometry().setFromPoints(vectors);
      const material = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthTest: false
      });
      const line = new THREE.LineLoop(geometry, material);
      group.add(line);
    };

    // Always show the prime-meridian/equator marker at (0,0) in dev
    addMarker(0, 0, 0xffff00);

    // Optionally show full alignment set if URL param is enabled
    const params = new URLSearchParams(window.location.search);
    const overlayMode = params.get('geoDebugOverlay');
    const showFull = overlayMode === 'markers';
    const showAudit = overlayMode === 'audit';
    if (showFull || showAudit) {
      // (0°, ±90°)
      addMarker(0, 90, 0x00ffff);
      addMarker(0, -90, 0x00ffff);
      // (±45°, 0/90/180)
      const lats = [45, -45];
      const lons = [0, 90, 180];
      for (const lat of lats) {
        for (const lon of lons) {
          addMarker(lat, lon, 0xff66ff);
        }
      }
    }

    if (showAudit) {
      const meridianPoints: Array<{ lat: number; lon: number }> = [];
      const antiMeridianPoints: Array<{ lat: number; lon: number }> = [];
      const equatorPoints: Array<{ lat: number; lon: number }> = [];
      for (let lat = -90; lat <= 90; lat += 2) {
        meridianPoints.push({ lat, lon: 0 });
        antiMeridianPoints.push({ lat, lon: 180 });
      }
      for (let lon = -180; lon <= 180; lon += 2) {
        equatorPoints.push({ lat: 0, lon });
      }

      addPolyline(meridianPoints, 0xffdd00, 0.95);
      addPolyline(equatorPoints, 0x00ffcc, 0.8);
      addPolyline(antiMeridianPoints, 0xff5599, 0.7);

      // Greenwich Observatory (approx) to visually compare texture vs geometry meridian
      addMarker(51.4769, 0, 0xffffff);

      console.info('[GeoAudit] Enabled coordinate audit overlay', {
        mode: 'audit',
        includes: ['origin-marker', 'prime-meridian-line', 'equator-line', 'anti-meridian-line', 'greenwich-marker']
      });
    }

    if (!scene.children.includes(group)) {
      scene.add(group);
    }

    return () => {
      if (scene && group && scene.children.includes(group)) {
        scene.remove(group);
      }
      while (group.children.length > 0) {
        const child = group.children[0];
        group.remove(child);
        if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
          const geom = (child as THREE.Mesh | THREE.Line).geometry as THREE.BufferGeometry | undefined;
          geom?.dispose();
          const material = (child as THREE.Mesh | THREE.Line).material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(material)) {
            material.forEach((m) => m.dispose());
          } else if (material) {
            material.dispose();
          }
        }
      }
    };
  }, [globeRef, isInitializing]);

  // Intel Report 3D markers integration - only show when CyberCommand + IntelReports mode
  useEffect(() => {
    let mounted = true;
    let currentLoadRequest: Promise<void> | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    let diagnosticsInterval: ReturnType<typeof setInterval> | null = null;
    let persistFlushTimer: ReturnType<typeof setTimeout> | null = null;
    let unsubscribe: (() => void) | undefined;
    let unsubscribeNostr: (() => void) | undefined;
    let nostrStop: (() => void) | undefined;
    const persistInFlight = new Set<string>();
    const pendingPersistReports = new Map<string, IntelReportOverlayMarker>();
    let droppedPersistCount = 0;
    const eventSystem = RealTimeEventSystem.getInstance();
    let lastDiagSample: {
      timestamp: number;
      eventLoopProcessed: number;
      eventLoopTicks: number;
      workspaceFlushes: number;
      workspaceSaveRequests: number;
      droppedPersist: number;
      eventLoopQueueDepth: number;
      pendingPersistDepth: number;
    } | null = null;
    let queueGrowthStreak = 0;

    const PERSIST_FLUSH_INTERVAL_MS = 1500;
    const PERSIST_MAX_PER_FLUSH = 12;
    const PERSIST_MAX_PENDING = 240;
    const PERSIST_MAX_CONCURRENT = 4;

    const schedulePersistFlush = () => {
      if (persistFlushTimer || !mounted) {
        return;
      }

      persistFlushTimer = setTimeout(() => {
        persistFlushTimer = null;

        if (!mounted || pendingPersistReports.size === 0) {
          return;
        }

        const availableSlots = Math.max(0, PERSIST_MAX_CONCURRENT - persistInFlight.size);
        if (availableSlots === 0) {
          if (pendingPersistReports.size > 0) {
            schedulePersistFlush();
          }
          return;
        }

        const toPersist: IntelReportOverlayMarker[] = [];
        for (const report of pendingPersistReports.values()) {
          toPersist.push(report);
          pendingPersistReports.delete(report.id);
          if (toPersist.length >= Math.min(PERSIST_MAX_PER_FLUSH, availableSlots)) {
            break;
          }
        }

        toPersist.forEach((report) => {
          if (persistInFlight.has(report.id)) {
            return;
          }

          persistInFlight.add(report.id);
          void intelReportService.importReport(report, { strategy: 'overwrite' })
            .catch(() => {
              // Ignore persistence failures here; visualization path remains live via addMarker.
            })
            .finally(() => {
              persistInFlight.delete(report.id);
            });
        });

        if (pendingPersistReports.size > 0) {
          schedulePersistFlush();
        }
      }, PERSIST_FLUSH_INTERVAL_MS);
    };

    const applyMarkers = (markers: IntelReportOverlayMarker[]) => {
      if (!mounted) {
        return;
      }
      const limited = markers.slice(0, 25);
      const signature = limited
        .map((marker) => {
          const markerId = marker.pubkey || marker.title || '';
          const lat = typeof marker.latitude === 'number' ? marker.latitude.toFixed(5) : 'na';
          const lng = typeof marker.longitude === 'number' ? marker.longitude.toFixed(5) : 'na';
          return `${markerId}:${lat}:${lng}`;
        })
        .join('|');

      if (signature === intelReportsSignatureRef.current) {
        return;
      }

      intelReportsSignatureRef.current = signature;
      setIntelReports(limited);
      if (process.env.NODE_ENV === 'development' && limited.length > 0) {
        console.log(`📊 Intel Report 3D markers synced (${limited.length} visible)`);
      }
    };

    const refreshMarkers = async () => {
      if (currentLoadRequest) {
        return currentLoadRequest;
      }

      currentLoadRequest = (async () => {
        try {
          const markers = await intelReportVisualizationService.getIntelReportMarkers({
            maxReports: 25
          });
          applyMarkers(markers);
        } catch (error) {
          if (mounted) {
            console.error('Error loading Intel Report markers:', error);
          }
        } finally {
          currentLoadRequest = null;
        }
      })();

      return currentLoadRequest;
    };

    if (visualizationMode.mode === 'CyberCommand' && visualizationMode.subMode === 'IntelReports') {
      if (process.env.NODE_ENV === 'development') {
        console.log('🛰️ CYBERCOMMAND INTEL REPORTS MODE ACTIVATED - Live intel updates enabled');
      }
      unsubscribe = intelReportVisualizationService.subscribe(applyMarkers);

      // Start Nostr hashtag ingest for #starcom_intel so decentralized reports can appear on the globe.
      // This is intentionally scoped to IntelReports mode to avoid persistent background relay traffic.
      void (async () => {
        try {
          if (!mounted) return;
          unsubscribeNostr = nostrStarcomIntelIngest.subscribe((report) => {
            intelReportVisualizationService.addMarker(report);

            if (!pendingPersistReports.has(report.id) && pendingPersistReports.size >= PERSIST_MAX_PENDING) {
              const oldestPendingId = pendingPersistReports.keys().next().value;
              if (oldestPendingId) {
                pendingPersistReports.delete(oldestPendingId);
                droppedPersistCount += 1;

                if (process.env.NODE_ENV === 'development' && droppedPersistCount % 25 === 0) {
                  console.warn('[IntelReports] Persistence backlog dropped oldest pending reports', {
                    droppedPersistCount,
                    pending: pendingPersistReports.size,
                    inFlight: persistInFlight.size
                  });
                }
              }
            }

            pendingPersistReports.set(report.id, report);
            schedulePersistFlush();
          });
          await nostrStarcomIntelIngest.start();
          nostrStop = () => nostrStarcomIntelIngest.stop();
        } catch (error) {
          console.warn('[IntelReports] Failed to start Nostr ingest for #starcom_intel', error);
        }
      })();

      void refreshMarkers();

      interval = setInterval(() => {
        if (mounted) {
          void refreshMarkers();
        }
      }, 60000);

      if (process.env.NODE_ENV === 'development') {
        diagnosticsInterval = setInterval(() => {
          if (!mounted) {
            return;
          }

          try {
            const vizStats = intelReportVisualizationService.getDebugStats();
            const loopStats = eventSystem.getLoopStats();
            const workspaceStats = intelWorkspaceManager.getPersistenceStats();
            const now = Date.now();

            console.info('[IntelReports][Diag]', {
              visualization: vizStats,
              nostrMetrics: nostrStarcomIntelIngest.getMetrics(),
              nostrRelays: nostrStarcomIntelIngest.getRelayStatus(),
              eventLoop: loopStats,
              workspacePersistence: workspaceStats,
              persistenceBackpressure: {
                pending: pendingPersistReports.size,
                inFlight: persistInFlight.size,
                dropped: droppedPersistCount,
                maxPending: PERSIST_MAX_PENDING,
                maxConcurrent: PERSIST_MAX_CONCURRENT
              }
            });

            if (lastDiagSample) {
              const elapsedSec = Math.max(1, (now - lastDiagSample.timestamp) / 1000);
              const processedDelta = Math.max(0, loopStats.processedEvents - lastDiagSample.eventLoopProcessed);
              const tickDelta = Math.max(0, loopStats.tickCount - lastDiagSample.eventLoopTicks);
              const flushDelta = Math.max(0, workspaceStats.flushCount - lastDiagSample.workspaceFlushes);
              const saveReqDelta = Math.max(0, workspaceStats.saveRequests - lastDiagSample.workspaceSaveRequests);
              const droppedDelta = Math.max(0, droppedPersistCount - lastDiagSample.droppedPersist);

              console.info('[IntelReports][DiagDelta]', {
                windowSec: Number(elapsedSec.toFixed(1)),
                eventLoop: {
                  processedDelta,
                  ticksDelta: tickDelta,
                  processedPerSec: Number((processedDelta / elapsedSec).toFixed(2)),
                  ticksPerSec: Number((tickDelta / elapsedSec).toFixed(2)),
                  avgEventsPerTick: tickDelta > 0 ? Number((processedDelta / tickDelta).toFixed(2)) : 0,
                  queueDepthNow: loopStats.queueDepth,
                  maxQueueDepthSeen: loopStats.maxQueueDepth
                },
                workspacePersistence: {
                  saveRequestsDelta: saveReqDelta,
                  flushesDelta: flushDelta,
                  coalescedSavesDelta: Math.max(0, saveReqDelta - flushDelta),
                  flushesPerSec: Number((flushDelta / elapsedSec).toFixed(2)),
                  saveRequestsPerSec: Number((saveReqDelta / elapsedSec).toFixed(2)),
                  lastSerializedBytes: workspaceStats.lastSerializedBytes
                },
                backpressure: {
                  droppedDelta,
                  droppedPerSec: Number((droppedDelta / elapsedSec).toFixed(3)),
                  pendingNow: pendingPersistReports.size,
                  inFlightNow: persistInFlight.size
                }
              });

              if (droppedDelta > 0) {
                console.warn('[IntelReports][DiagWarn] Persistence backpressure drops detected', {
                  droppedDelta,
                  droppedPerSec: Number((droppedDelta / elapsedSec).toFixed(3)),
                  pendingNow: pendingPersistReports.size,
                  maxPending: PERSIST_MAX_PENDING,
                  inFlightNow: persistInFlight.size,
                  maxConcurrent: PERSIST_MAX_CONCURRENT
                });
              }

              if (loopStats.queueDepth > lastDiagSample.eventLoopQueueDepth && pendingPersistReports.size > lastDiagSample.pendingPersistDepth) {
                queueGrowthStreak += 1;
              } else {
                queueGrowthStreak = 0;
              }

              if (queueGrowthStreak >= 3) {
                console.warn('[IntelReports][DiagWarn] Sustained queue growth trend', {
                  queueGrowthStreak,
                  eventLoopQueueDepth: loopStats.queueDepth,
                  pendingPersistDepth: pendingPersistReports.size,
                  eventLoopProcessedPerSec: Number((processedDelta / elapsedSec).toFixed(2)),
                  persistFlushesPerSec: Number((flushDelta / elapsedSec).toFixed(2))
                });
              }
            }

            lastDiagSample = {
              timestamp: now,
              eventLoopProcessed: loopStats.processedEvents,
              eventLoopTicks: loopStats.tickCount,
              workspaceFlushes: workspaceStats.flushCount,
              workspaceSaveRequests: workspaceStats.saveRequests,
              droppedPersist: droppedPersistCount,
              eventLoopQueueDepth: loopStats.queueDepth,
              pendingPersistDepth: pendingPersistReports.size
            };
          } catch {
            // Ignore diagnostics errors in dev-only interval.
          }
        }, 45000);
      }
    } else if (mounted) {
      intelReportsSignatureRef.current = '';
      setIntelReports([]);
      if (process.env.NODE_ENV === 'development') {
        console.log('🧹 Intel Report 3D markers cleared - not in CyberCommand/IntelReports mode');
      }
    }

    return () => {
      mounted = false;
      if (interval) {
        clearInterval(interval);
      }
      if (diagnosticsInterval) {
        clearInterval(diagnosticsInterval);
      }
      if (persistFlushTimer) {
        clearTimeout(persistFlushTimer);
      }
      currentLoadRequest = null;
      pendingPersistReports.clear();
      unsubscribe?.();
      unsubscribeNostr?.();
      nostrStop?.();
    };
  }, [visualizationMode.mode, visualizationMode.subMode]);

  // Add Intel Report 3D markers to the Globe scene - respect visualization mode
  useEffect(() => {
    if (!globeRef.current) return;

    const globeObj = globeRef.current as unknown as { scene: () => THREE.Scene };
    const scene = globeObj?.scene();
    const intelGroup = intelMarkerGroupRef.current;

    if (scene && intelGroup) {
      // Only add to scene if we're in the correct visualization mode and have reports
      if (visualizationMode.mode === 'CyberCommand' && 
          visualizationMode.subMode === 'IntelReports' && 
          intelReports.length > 0 &&
          !scene.children.includes(intelGroup)) {
        scene.add(intelGroup);
        if (process.env.NODE_ENV === 'development') {
          console.log('Intel Report 3D marker group added to Globe scene');
        }
      } else if (scene.children.includes(intelGroup)) {
        // Remove from scene if mode changed or no reports
        scene.remove(intelGroup);
        if (process.env.NODE_ENV === 'development') {
          console.log('Intel Report 3D marker group removed from Globe scene');
        }
      }
    }
  }, [globeRef, intelReports, visualizationMode.mode, visualizationMode.subMode]);

  useEffect(() => {
    return () => {
      const globeObj = globeRef.current as unknown as { scene?: () => THREE.Scene } | undefined;
      const scene = globeObj?.scene?.();
      const intelGroup = intelMarkerGroupRef.current;
      if (scene && intelGroup && scene.children.includes(intelGroup)) {
        scene.remove(intelGroup);
      }
    };
  }, []);

  // =============================================================================
  // CYBER THREATS DATA INTEGRATION - Real data loading and visualization
  // =============================================================================
  useEffect(() => {
    let mounted = true;
    let dataRefreshInterval: ReturnType<typeof setInterval> | null = null;

    const disposeThreatService = () => {
      if (threatServiceRef.current) {
        threatServiceRef.current.dispose();
        threatServiceRef.current = null;
      }
    };

    if (enableLegacyCyberDataPipeline && visualizationMode.mode === 'CyberCommand' && visualizationMode.subMode === 'CyberThreats') {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔒 CYBER THREATS MODE ACTIVATED - Loading real threat data');
      }
      
      // Initialize threat service if not already done
      if (!threatServiceRef.current) {
        threatServiceRef.current = new ThreatIntelligenceService({
          updateInterval: 10000, // 10 seconds
          maxActiveThreatss: 1000,
          enableGeographicCorrelation: true,
          enableTemporalCorrelation: true,
          debugMode: process.env.NODE_ENV === 'development'
        });
      }

      const loadThreatData = async () => {
        if (!mounted || !threatServiceRef.current) return;
        
        try {
          setCyberDataLoading(true);
          if (process.env.NODE_ENV === 'development') {
            console.log('� Fetching cyber threat intelligence data...');
          }
          
          const threatData = await threatServiceRef.current.getData({
            limit: 100, // Limit for performance
            target_countries: ['US', 'CA', 'GB', 'DE', 'FR', 'JP', 'AU'], // Focus regions
            severity_min: 3, // Medium severity and above
            time_window: {
              start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
              end: new Date()
            },
            sort_by: 'severity',
            sort_order: 'desc'
          });
          
          if (mounted) {
            setCyberThreatsData(threatData);
            if (process.env.NODE_ENV === 'development') {
              console.log(`🔒 Loaded ${threatData.length} cyber threat data points`);
            }
          }
        } catch (error) {
          if (mounted) {
            console.error('Error loading cyber threat data:', error);
            // Fallback to mock data for development
            if (process.env.NODE_ENV === 'development') {
              console.log('� Using mock threat data for development');
            }
          }
        } finally {
          if (mounted) {
            setCyberDataLoading(false);
          }
        }
      };

      // Initial data load
      loadThreatData();

      // Set up periodic data refresh
      dataRefreshInterval = setInterval(() => {
        if (mounted && visualizationMode.mode === 'CyberCommand' && visualizationMode.subMode === 'CyberThreats') {
          loadThreatData();
        }
      }, 30000); // Refresh every 30 seconds

      return () => {
        mounted = false;
        if (dataRefreshInterval) {
          clearInterval(dataRefreshInterval);
        }
        disposeThreatService();
      };
    } else {
      // Clear data when leaving CyberThreats mode
      if (mounted) {
        setCyberThreatsData([]);
        if (process.env.NODE_ENV === 'development') {
          console.log('🧹 Cyber threats data cleared - left CyberThreats mode');
        }
      }
      disposeThreatService();
    }

    return () => {
      mounted = false;
      if (dataRefreshInterval) {
        clearInterval(dataRefreshInterval);
      }
      disposeThreatService();
    };
  }, [visualizationMode.mode, visualizationMode.subMode, enableLegacyCyberDataPipeline]);

  // =============================================================================
  // CYBER ATTACKS DATA INTEGRATION - Real data loading and visualization  
  // =============================================================================
  useEffect(() => {
    let mounted = true;
    let dataRefreshInterval: ReturnType<typeof setInterval> | null = null;

    const disposeAttackService = () => {
      if (attackServiceRef.current) {
        attackServiceRef.current.dispose();
        attackServiceRef.current = null;
      }
    };

    if (enableLegacyCyberDataPipeline && visualizationMode.mode === 'CyberCommand' && visualizationMode.subMode === 'CyberAttacks') {
      if (process.env.NODE_ENV === 'development') {
        console.log('⚡ CYBER ATTACKS MODE ACTIVATED - Loading real attack data');
      }
      
      // Initialize attack service if not already done
      if (!attackServiceRef.current) {
        attackServiceRef.current = new RealTimeAttackService();
      }

      const loadAttackData = async () => {
        if (!mounted || !attackServiceRef.current) return;
        
        try {
          setCyberDataLoading(true);
          if (process.env.NODE_ENV === 'development') {
            console.log('📡 Fetching real-time cyber attack data...');
          }
          
          const attackData = await attackServiceRef.current.getData({
            limit: 150, // More attacks for dynamic visualization
            time_window: {
              start: new Date(Date.now() - 2 * 60 * 60 * 1000), // Last 2 hours
              end: new Date()
            },
            attack_statuses: ['detected', 'in_progress', 'escalated'],
            severity_min: 3, // Medium severity (3) and above
            real_time: true
          });
          
          if (mounted) {
            setCyberAttacksData(attackData);
            if (process.env.NODE_ENV === 'development') {
              console.log(`⚡ Loaded ${attackData.length} cyber attack data points`);
            }
          }
        } catch (error) {
          if (mounted) {
            console.error('Error loading cyber attack data:', error);
            // Fallback to mock data for development
            if (process.env.NODE_ENV === 'development') {
              console.log('🔧 Using mock attack data for development');
            }
          }
        } finally {
          if (mounted) {
            setCyberDataLoading(false);
          }
        }
      };

      // Initial data load
      loadAttackData();

      // Set up faster refresh for real-time attacks
      dataRefreshInterval = setInterval(() => {
        if (mounted && visualizationMode.mode === 'CyberCommand' && visualizationMode.subMode === 'CyberAttacks') {
          loadAttackData();
        }
      }, 15000); // Refresh every 15 seconds for more dynamic feel

      return () => {
        mounted = false;
        if (dataRefreshInterval) {
          clearInterval(dataRefreshInterval);
        }
        disposeAttackService();
      };
    } else {
      // Clear data when leaving CyberAttacks mode
      if (mounted) {
        setCyberAttacksData([]);
        if (process.env.NODE_ENV === 'development') {
          console.log('🧹 Cyber attacks data cleared - left CyberAttacks mode');
        }
      }
      disposeAttackService();
    }

    return () => {
      mounted = false;
      if (dataRefreshInterval) {
        clearInterval(dataRefreshInterval);
      }
      disposeAttackService();
    };
  }, [visualizationMode.mode, visualizationMode.subMode, enableLegacyCyberDataPipeline]);

  // =============================================================================
  // SATELLITES INTEGRATION - Real satellite tracking (MVP)
  // =============================================================================
  useEffect(() => {
    if (!globeRef.current) return;

    const globeObj = globeRef.current as unknown as { scene: () => THREE.Scene };
    const scene = globeObj?.scene();
    const satellitesGroup = networkInfraGroupRef.current;
    if (!scene || !satellitesGroup) return;

    let cancelled = false;

    const disposeMaterial = (material: THREE.Material | THREE.Material[] | undefined) => {
      if (!material) return;
      if (Array.isArray(material)) {
        material.forEach(m => m.dispose());
      } else {
        material.dispose();
      }
    };

    const clearSatellitesGroup = () => {
      while (satellitesGroup.children.length > 0) {
        const child = satellitesGroup.children[0];
        satellitesGroup.remove(child);
        if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) {
          child.geometry?.dispose();
          disposeMaterial(child.material as THREE.Material | THREE.Material[] | undefined);
        }
      }
    };

    const teardownSatellites = () => {
      clearSatellitesGroup();
      if (scene.children.includes(satellitesGroup)) {
        scene.remove(satellitesGroup);
      }
      satelliteVisualizationService.dispose();
      visualizationResourceMonitor.clearMode(SATELLITES_MODE_KEY);
    };

    const recordSatelliteGeometry = (target: THREE.Object3D | THREE.Object3D[], instanceCount = 0) => {
      const stats = collectGeometryStats(target);
      if (instanceCount > 0) {
        const perInstanceMatrixBytes = 64; // approx 4x4 matrix + color buffer per instance
        stats.approxGpuBytes += instanceCount * perInstanceMatrixBytes;
      }
      visualizationResourceMonitor.recordGeometry(SATELLITES_MODE_KEY, stats);
    };

    const loadSatellites = async () => {
      try {
        await satelliteVisualizationService.initialize();
        if (cancelled) return;
        const satellites = await satelliteVisualizationService.getSatelliteData();
        if (cancelled) return;

        clearSatellitesGroup();

        const maxSatellites = Math.max(100, satellites.length);
        const geometry = new THREE.SphereGeometry(0.3, 8, 6);
        const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8 });
        const instancedMesh = new THREE.InstancedMesh(geometry, material, maxSatellites);
        const tempMatrix = new THREE.Matrix4();
        const tempColor = new THREE.Color();

        satellites.forEach((satellite, index) => {
          const { lat, lng, altitude, type } = satellite;
          const radius = 100 + (altitude / 1000);
          const position = latLngToGlobeVector3(lat, lng, radius);

          const scale = type === 'space_station' ? 2.0 :
                         type === 'scientific' ? 1.5 :
                         type === 'gps_satellite' ? 1.2 : 1.0;

          tempMatrix.compose(position, new THREE.Quaternion(), new THREE.Vector3(scale, scale, scale));
          instancedMesh.setMatrixAt(index, tempMatrix);

          const color = type === 'space_station' ? 0x00ff88 :
                       type === 'scientific' ? 0xff8800 :
                       type === 'gps_satellite' ? 0x4488ff :
                       type === 'starlink' ? 0xaaaaaa :
                       type === 'weather' ? 0x88ff44 :
                       type === 'communication' ? 0xff4488 :
                       0xffffff;
          tempColor.setHex(color);
          instancedMesh.setColorAt(index, tempColor);

          if (index === 0) {
            instancedMesh.userData = {
              type: 'satelliteGroup',
              satellites: satellites.map(sat => ({
                id: sat.id,
                name: sat.name,
                type: sat.type,
                altitude: sat.altitude,
                position: { lat: sat.lat, lng: sat.lng }
              }))
            };
          }
        });

        instancedMesh.instanceMatrix.needsUpdate = true;
        if (instancedMesh.instanceColor) {
          instancedMesh.instanceColor.needsUpdate = true;
        }

        if (cancelled) {
          instancedMesh.geometry.dispose();
          disposeMaterial(instancedMesh.material as THREE.Material | THREE.Material[] | undefined);
          return;
        }

        satellitesGroup.add(instancedMesh);
        recordSatelliteGeometry(instancedMesh, maxSatellites);
        console.log(`🛰️ Created instanced satellite visualization with ${satellites.length} satellites`);
      } catch (error) {
        if (cancelled) return;
        console.error('🛰️ Failed to load satellite data:', error);

        clearSatellitesGroup();
        const fallbackGeometry = new THREE.SphereGeometry(0.5, 8, 6);
        const fallbackMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
        const issMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
        issMesh.position.set(0, 110, 0);
        issMesh.userData = { type: 'satellite', name: 'ISS (Fallback)', id: 'iss-fallback' };
        satellitesGroup.add(issMesh);
        recordSatelliteGeometry(issMesh);
        console.log('🛰️ Added fallback satellite visualization');
      }
    };

    const isActive = visualizationMode.mode === 'CyberCommand' && visualizationMode.subMode === 'Satellites';

    if (isActive) {
      console.log('🛰️ SATELLITES MODE ACTIVATED - Enhanced satellite tracking');
      console.log('📊 Data Source: CelesTrak with intelligent curation');
      console.log('🎯 Showing: ~100 carefully selected satellites from 21K+ database');
      if (!scene.children.includes(satellitesGroup)) {
        scene.add(satellitesGroup);
        console.log('🛰️ Satellites visualization group added to Globe scene');
      }
      loadSatellites();
    } else {
      teardownSatellites();
    }

    return () => {
      cancelled = true;
      teardownSatellites();
    };
  }, [globeRef, visualizationMode.mode, visualizationMode.subMode]);

  // =============================================================================
  // COMMUNICATION HUBS INTEGRATION - New mode integration
  // =============================================================================
  useEffect(() => {
    if (!globeRef.current) return;

    const globeObj = globeRef.current as unknown as { scene: () => THREE.Scene };
    const scene = globeObj?.scene();
    const commGroup = commHubsGroupRef.current;

    if (visualizationMode.mode === 'CyberCommand' && visualizationMode.subMode === 'CommHubs') {
      console.log('📡 COMMUNICATION HUBS MODE ACTIVATED - New Integration Point');
      console.log('📊 Data Source: CommunicationHubsService (to be created)');
      console.log('🎯 Ready for: Satellite uplinks, radio towers, submarine cables, relay stations');
      
      // Add commGroup to scene
      if (scene && commGroup && !scene.children.includes(commGroup)) {
        scene.add(commGroup);
        console.log('📡 Communication Hubs visualization group added to Globe scene');
        
        // TODO: Create CommunicationHubsService
        // TODO: Add satellite constellation visualization
        // TODO: Add radio tower networks
        // TODO: Add submarine cable routes
        // TODO: Add relay station markers
      }
    } else {
      // Remove from scene if mode changed
      if (scene && commGroup && scene.children.includes(commGroup)) {
        scene.remove(commGroup);
        console.log('📡 Communication Hubs visualization group removed from Globe scene');
      }
    }

    return () => {
      if (scene && commGroup) {
        scene.remove(commGroup);
      }
    };
  }, [globeRef, visualizationMode.mode, visualizationMode.subMode]);

  // Initialize 3D Intel Report markers using the hook - capture models for interactivity
  const { models: intel3DModels } = useIntelReport3DMarkers(
    // Pass reports only when in correct visualization mode
    (visualizationMode.mode === 'CyberCommand' && visualizationMode.subMode === 'IntelReports') 
      ? intelReports 
      : [], 
    globeRef.current ? (globeRef.current as unknown as { scene: () => THREE.Scene }).scene() : null,
    globeRef.current ? (globeRef.current as unknown as { camera: () => THREE.Camera }).camera() : null,
    globeRef.current ? (globeRef.current as unknown as { getCoords?: (lat: number, lng: number, altitude?: number) => THREE.Vector3 }) : null,
    {
      globeRadius: 100,
      hoverAltitude: 10,  // Reduced from 12 to 10
      rotationSpeed: 0.003, // Reduced from 0.005 to 0.003 for better performance
      scale: 3.0  // Reduced from 4.0 to 3.0
    },
    hoveredReportId // Pass the currently hovered report ID
  );

  // Initialize CyberThreats 3D visualization using the new hook
  const cyberThreats = useCyberThreats3D(
    visualizationMode.mode === 'CyberCommand' && visualizationMode.subMode === 'CyberThreats',
    globeRef.current ? (globeRef.current as unknown as { scene: () => THREE.Scene }).scene() : null,
    globeRef.current ? (globeRef.current as unknown as { camera: () => THREE.Camera }).camera() : null,
    {
      globeRadius: 100,
      updateInterval: 5000,
      enableHeatMap: true,
      debugMode: process.env.NODE_ENV === 'development'
    }
  );

  // Initialize CyberAttacks 3D visualization using the new hook
  const cyberAttacks = useCyberAttacks3D(
    visualizationMode.mode === 'CyberCommand' && visualizationMode.subMode === 'CyberAttacks',
    globeRef.current ? (globeRef.current as unknown as { scene: () => THREE.Scene }).scene() : null,
    globeRef.current ? (globeRef.current as unknown as { camera: () => THREE.Camera }).camera() : null,
    {
      globeRadius: 100,
      updateInterval: 2000,
      enableTrajectories: true,
      trajectorySpeed: 1.0,
      debugMode: process.env.NODE_ENV === 'development'
    }
  );

  // Update the models state when intel3DModels changes
  useEffect(() => {
    setIntelModels(intel3DModels);
  }, [intel3DModels]);

  // Monitor CyberThreats hook status
  useEffect(() => {
    if (visualizationMode.mode === 'CyberCommand' && visualizationMode.subMode === 'CyberThreats') {
      if (isDevelopment) {
        console.log(`🔒 CYBER THREATS 3D HOOK STATUS: ${cyberThreats.threats.length} threats loaded, Loading: ${cyberThreats.isLoading}`);
      }
      if (cyberThreats.error) {
        console.error('🔒 CyberThreats Hook Error:', cyberThreats.error);
      }
      setCyberDataLoading(cyberThreats.isLoading);
    }
  }, [visualizationMode.mode, visualizationMode.subMode, cyberThreats.threats.length, cyberThreats.isLoading, cyberThreats.error, isDevelopment]);

  // Monitor CyberAttacks hook status
  useEffect(() => {
    if (visualizationMode.mode === 'CyberCommand' && visualizationMode.subMode === 'CyberAttacks') {
      if (isDevelopment) {
        console.log(`⚡ CYBER ATTACKS 3D HOOK STATUS: ${cyberAttacks.attacks.length} attacks loaded, Loading: ${cyberAttacks.isLoading}`);
      }
      if (cyberAttacks.error) {
        console.error('⚡ CyberAttacks Hook Error:', cyberAttacks.error);
      }
      setCyberDataLoading(cyberAttacks.isLoading);
    }
  }, [visualizationMode.mode, visualizationMode.subMode, cyberAttacks.attacks.length, cyberAttacks.isLoading, cyberAttacks.error, isDevelopment]);

  // =============================================================================
  // CYBER THREATS 3D VISUALIZATION - Real animated data-driven visualization
  // =============================================================================
  useEffect(() => {
    if (!enableLegacyCyberDataPipeline) return;
    if (!globeRef.current || cyberThreatsData.length === 0) return;
    
    const globeObj = globeRef.current as unknown as { scene: () => THREE.Scene };
    const scene = globeObj && globeObj.scene();
    const cyberThreatsGroup = cyberThreatsGroupRef.current;
    
    if (visualizationMode.mode === 'CyberCommand' && visualizationMode.subMode === 'CyberThreats') {
      if (isDevelopment) {
        console.log(`🔒 CYBER THREATS 3D VISUALIZATION - Rendering ${cyberThreatsData.length} threat objects`);
      }
      
      // Clear previous visualization efficiently
      while (cyberThreatsGroup.children.length > 0) {
        const child = cyberThreatsGroup.children[0];
        cyberThreatsGroup.remove(child);
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      }
      
      // Create animated threat visualizations from real data
      cyberThreatsData.forEach((threatData) => {
        const { location, category, severity, status, confidence } = threatData;
        
        const radius = 1.05 + (severity / 20); // Height varies by severity
        
        // Create threat geometry based on category
        let geometry: THREE.BufferGeometry;
        let color: number;
        
        switch (category) {
          case 'Malware':
            geometry = new THREE.IcosahedronGeometry(0.02 + severity * 0.005, 1);
            color = 0xff3333; // Red
            break;
          case 'APT':
            geometry = new THREE.ConeGeometry(0.015 + severity * 0.003, 0.04 + severity * 0.008, 6);
            color = 0xff1144; // Dark red
            break;
          case 'Botnet':
            geometry = new THREE.SphereGeometry(0.018 + severity * 0.004, 8, 6);
            color = 0xff6600; // Orange-red
            break;
          case 'Phishing':
            geometry = new THREE.TetrahedronGeometry(0.015 + severity * 0.003);
            color = 0xffaa00; // Orange
            break;
          case 'DataBreach':
            geometry = new THREE.OctahedronGeometry(0.02 + severity * 0.005);
            color = 0xcc0000; // Deep red
            break;
          default:
            geometry = new THREE.SphereGeometry(0.015 + severity * 0.003, 6, 4);
            color = 0xff4444; // Default red
        }
        
        // Create material with confidence-based opacity and status-based effects
        const material = new THREE.MeshBasicMaterial({ 
          color,
          transparent: true, 
          opacity: 0.7 + (confidence === 'Confirmed' ? 0.3 : 
                         confidence === 'High' ? 0.2 : 
                         confidence === 'Medium' ? 0.1 : 0),
          wireframe: status === 'Emerging' // Wireframe for emerging threats
        });
        
        const threatMarker = new THREE.Mesh(geometry, material);
        threatMarker.position.copy(latLngToGlobeVector3(location.latitude, location.longitude, radius));
        
        // Store metadata for interactivity
        threatMarker.userData = { 
          type: 'cyber-threat', 
          id: threatData.id,
          category: threatData.category,
          severity: threatData.severity,
          name: threatData.name,
          threatData: threatData
        };
        
        // Add pulsing animation for active threats
        if (status === 'Active') {
          const animationSpeed = 0.01 + (severity * 0.002);
          threatMarker.userData.animate = () => {
            const scale = 1 + Math.sin(Date.now() * animationSpeed) * 0.3;
            threatMarker.scale.setScalar(scale);
          };
        }
        
        cyberThreatsGroup.add(threatMarker);
      });
      
      // Add group to scene only once
      if (scene && !scene.children.includes(cyberThreatsGroup)) {
        scene.add(cyberThreatsGroup);
      }
      
      if (isDevelopment) {
        console.log(`🔒 Generated ${cyberThreatsGroup.children.length} 3D threat visualization objects`);
      }
      
    } else {
      // Clean up when leaving mode
      if (scene && scene.children.includes(cyberThreatsGroup)) {
        scene.remove(cyberThreatsGroup);
        // Dispose of geometries and materials to free memory
        cyberThreatsGroup.children.forEach(child => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (child.material instanceof THREE.Material) {
              child.material.dispose();
            }
          }
        });
        cyberThreatsGroup.clear();
      }
    }

    return () => {
      // Cleanup on unmount
      if (scene && cyberThreatsGroup && scene.children.includes(cyberThreatsGroup)) {
        scene.remove(cyberThreatsGroup);
      }
    };
  }, [globeRef, cyberThreatsData, visualizationMode.mode, visualizationMode.subMode, enableLegacyCyberDataPipeline, isDevelopment]);

  // =============================================================================
  // CYBER ATTACKS 3D VISUALIZATION - Real animated attack trajectories
  // =============================================================================
  useEffect(() => {
    if (!enableLegacyCyberDataPipeline) return;
    if (!globeRef.current || cyberAttacksData.length === 0) return;
    
    const globeObj = globeRef.current as unknown as { scene: () => THREE.Scene };
    const scene = globeObj && globeObj.scene();
    const cyberAttacksGroup = cyberAttacksGroupRef.current;
    
    if (visualizationMode.mode === 'CyberCommand' && visualizationMode.subMode === 'CyberAttacks') {
      if (isDevelopment) {
        console.log(`⚡ CYBER ATTACKS 3D VISUALIZATION - Rendering ${cyberAttacksData.length} attack objects with trajectories`);
      }
      
      // Clear previous visualization efficiently
      while (cyberAttacksGroup.children.length > 0) {
        const child = cyberAttacksGroup.children[0];
        cyberAttacksGroup.remove(child);
        if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (child.material instanceof THREE.Material) {
              child.material.dispose();
            }
          } else if (child instanceof THREE.Line) {
            child.geometry?.dispose();
            if (child.material instanceof THREE.Material) {
              child.material.dispose();
            }
          }
        }
      }
      
      // Create animated attack visualizations from real data
      cyberAttacksData.forEach((attackData) => {
        const { trajectory, attack_type, severity, attack_status } = attackData;
        
        // Source position (attack origin)
        const sourcePhi = (90 - trajectory.source.latitude) * (Math.PI / 180);
        const sourceTheta = (trajectory.source.longitude + 180) * (Math.PI / 180);
        const sourceRadius = 1.02;
        
        const sourcePosition = new THREE.Vector3(
          -sourceRadius * Math.sin(sourcePhi) * Math.cos(sourceTheta),
          sourceRadius * Math.cos(sourcePhi),
          sourceRadius * Math.sin(sourcePhi) * Math.sin(sourceTheta)
        );
        
        // Target position (attack destination)
        const targetPhi = (90 - trajectory.target.latitude) * (Math.PI / 180);
        const targetTheta = (trajectory.target.longitude + 180) * (Math.PI / 180);
        const targetRadius = 1.02;
        
        const targetPosition = new THREE.Vector3(
          -targetRadius * Math.sin(targetPhi) * Math.cos(targetTheta),
          targetRadius * Math.cos(targetPhi),
          targetRadius * Math.sin(targetPhi) * Math.sin(targetTheta)
        );
        
        // Create attack trajectory curve (great circle)
        const distance = sourcePosition.distanceTo(targetPosition);
        const midPoint = sourcePosition.clone().add(targetPosition).multiplyScalar(0.5);
        midPoint.normalize().multiplyScalar(1.15 + distance * 0.1); // Arc height based on distance
        
        const curve = new THREE.QuadraticBezierCurve3(sourcePosition, midPoint, targetPosition);
        const curveGeometry = new THREE.TubeGeometry(curve, 32, 0.003 + severity * 0.001, 8, false);
        
        // Color based on attack type and severity
        let attackColor: number;
        switch (attack_type) {
          case 'DDoS':
            attackColor = 0x00ffff; // Cyan
            break;
          case 'Malware':
            attackColor = 0xff3366; // Pink-red
            break;
          case 'Ransomware':
            attackColor = 0xff0000; // Red
            break;
          case 'DataBreach':
            attackColor = 0xffaa00; // Orange
            break;
          case 'WebAttack':
            attackColor = 0xff6600; // Orange-red
            break;
          case 'NetworkIntrusion':
            attackColor = 0x9900ff; // Purple
            break;
          case 'APT':
            attackColor = 0xcc0000; // Dark red
            break;
          case 'Botnet':
            attackColor = 0xff9900; // Orange
            break;
          default:
            attackColor = 0x00aaff; // Blue
        }
        
        const attackMaterial = new THREE.MeshBasicMaterial({ 
          color: attackColor,
          transparent: true, 
          opacity: attack_status === 'in_progress' ? 0.9 : 0.6
        });
        
        const trajectoryMesh = new THREE.Mesh(curveGeometry, attackMaterial);
        trajectoryMesh.userData = { 
          type: 'cyber-attack-trajectory', 
          id: attackData.id,
          attack_type: attackData.attack_type,
          severity: attackData.severity,
          attackData: attackData
        };
        
        cyberAttacksGroup.add(trajectoryMesh);
        
        // Source marker (attack origin)
        const sourceGeometry = new THREE.ConeGeometry(0.01 + severity * 0.002, 0.025 + severity * 0.005, 6);
        const sourceMaterial = new THREE.MeshBasicMaterial({ 
          color: attackColor,
          transparent: true,
          opacity: 0.8
        });
        const sourceMarker = new THREE.Mesh(sourceGeometry, sourceMaterial);
        sourceMarker.position.copy(sourcePosition);
        sourceMarker.lookAt(0, 0, 0);
        sourceMarker.userData = { 
          type: 'cyber-attack-source', 
          id: `${attackData.id}-source`,
          attackData: attackData
        };
        
        cyberAttacksGroup.add(sourceMarker);
        
        // Target marker (attack destination) - different shape
        const targetGeometry = new THREE.OctahedronGeometry(0.012 + severity * 0.003);
        const targetMaterial = new THREE.MeshBasicMaterial({ 
          color: attackColor,
          transparent: true,
          opacity: 0.9,
          wireframe: attack_status === 'detected'
        });
        const targetMarker = new THREE.Mesh(targetGeometry, targetMaterial);
        targetMarker.position.copy(targetPosition);
        targetMarker.userData = { 
          type: 'cyber-attack-target', 
          id: `${attackData.id}-target`,
          attackData: attackData
        };
        
        cyberAttacksGroup.add(targetMarker);
        
        // Add pulsing animation for active attacks
        if (attack_status === 'in_progress') {
          const animationSpeed = 0.008 + (severity * 0.003);
          sourceMarker.userData.animate = () => {
            const scale = 1 + Math.sin(Date.now() * animationSpeed) * 0.4;
            sourceMarker.scale.setScalar(scale);
          };
          targetMarker.userData.animate = () => {
            const scale = 1 + Math.sin(Date.now() * animationSpeed + Math.PI) * 0.3;
            targetMarker.scale.setScalar(scale);
          };
        }
        
        // Trajectory flow animation (if attack is in progress)
        if (attack_status === 'in_progress') {
          trajectoryMesh.userData.animate = () => {
            // Create flowing effect by modifying material properties
            const flow = (Date.now() * 0.001) % 1;
            attackMaterial.opacity = 0.6 + Math.sin(flow * Math.PI * 2) * 0.3;
          };
        }
      });
      
      // Add group to scene only once
      if (scene && !scene.children.includes(cyberAttacksGroup)) {
        scene.add(cyberAttacksGroup);
      }
      
      if (isDevelopment) {
        console.log(`⚡ Generated ${cyberAttacksGroup.children.length} 3D attack visualization objects with trajectories`);
      }
      
    } else {
      // Clean up when leaving mode
      if (scene && scene.children.includes(cyberAttacksGroup)) {
        scene.remove(cyberAttacksGroup);
        // Dispose of geometries and materials to free memory
        cyberAttacksGroup.children.forEach(child => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (child.material instanceof THREE.Material) {
              child.material.dispose();
            }
          } else if (child instanceof THREE.Line) {
            child.geometry?.dispose();
            if (child.material instanceof THREE.Material) {
              child.material.dispose();
            }
          }
        });
        cyberAttacksGroup.clear();
      }
    }

    return () => {
      // Cleanup on unmount
      if (scene && cyberAttacksGroup && scene.children.includes(cyberAttacksGroup)) {
        scene.remove(cyberAttacksGroup);
      }
    };
  }, [globeRef, cyberAttacksData, visualizationMode.mode, visualizationMode.subMode, enableLegacyCyberDataPipeline, isDevelopment]);

  // GeoPolitical settings (declared earlier for dev geoSnap too)
  // National territories overlay is controlled only by the dedicated overlay toggle.
  const geoModeActive = visualizationMode.mode === 'GeoPolitical';
  const nationalTerritories = useNationalTerritories3D({
    enabled: nationalTerritoriesOverlayEnabled,
    scene: globeRef.current ? (globeRef.current as unknown as { scene: () => THREE.Scene }).scene() : null,
    config: geoPoliticalConfig.nationalTerritories
  });
  useEffect(() => { if (nationalTerritories.error) console.error('NationalTerritories error:', nationalTerritories.error); }, [nationalTerritories.error]);

  // Integrity verification (lazy)
  const [geoIntegrity, setGeoIntegrity] = useState<{ status: 'idle'|'verifying'|'verified'|'mismatch'|'error'; mismatchCount?: number; artifacts?: { path: string; status: string; bytes: number }[] }>({ status: 'idle' });
  const [geoPanelOpen, setGeoPanelOpen] = useState(false);
  useEffect(() => {
    if (!geoModeActive) return;
    if (geoIntegrity.status !== 'idle') return;
    let cancelled = false;
    setGeoIntegrity({ status: 'verifying' });
    verifyGeopoliticalAssets({ includeClasses: ['topology','normalized'], maxBytes: 900000 })
      .then(r => { if (!cancelled) setGeoIntegrity({ status: r.ok ? 'verified':'mismatch', mismatchCount: r.mismatches.length, artifacts: r.artifacts.map(a => ({ path: a.path, status: a.status, bytes: a.bytes })) }); })
      .catch(() => { if (!cancelled) setGeoIntegrity({ status: 'error' }); });
    return () => { cancelled = true; };
  }, [geoModeActive, geoIntegrity.status]);

  // Add debounce utility for resize handling (fixes recursive resize event dispatch)
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function handleResize() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (globeRef.current) {
          const globeInstance = globeRef.current as unknown as { controls?: { update: () => void } };
          globeInstance.controls?.update?.();
        }
      }, 100);
    }
    function handleVisibilityChange() {
      if (!document.hidden) setTimeout(handleResize, 100);
    }
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    setTimeout(handleResize, 50);
    setTimeout(handleResize, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Space weather data visualization effect - only show when EcoNatural + SpaceWeather mode
  useEffect(() => {
    if (!globeEngine) return;
    const shouldShowSpaceWeather = (
      visualizationMode.mode === 'EcoNatural' &&
      visualizationMode.subMode === 'SpaceWeather' &&
      visualizationVectors.length > 0
    );
    if (!shouldShowSpaceWeather) {
      setGlobeData(prevData => {
        const filtered = prevData.filter((d: { type?: string }) => d.type !== 'space-weather');
        if (filtered.length === prevData.length) {
          return prevData;
        }
        if (filtered.length !== prevData.length) console.log('Space weather data cleared - not in EcoNatural/SpaceWeather mode');
        return filtered;
      });
      return;
    }
    const spaceWeatherMarkers = visualizationVectors.map(vector => ({
      lat: vector.latitude,
      lng: vector.longitude,
      size: vector.size,
      color: vector.color,
      label: `E-Field: ${vector.magnitude.toFixed(2)} mV/km`,
      magnitude: vector.magnitude,
      direction: vector.direction,
      quality: vector.quality,
      type: 'space-weather'
    }));
    const allowedBoundaryOverlays: string[] = [];
    if (spaceWeatherSettings?.showMagnetopause) allowedBoundaryOverlays.push('spaceWeatherMagnetopause');
    if (spaceWeatherSettings?.showSolarWind) allowedBoundaryOverlays.push('spaceWeatherBowShock');
    if (spaceWeatherSettings?.showAuroralOval) allowedBoundaryOverlays.push('spaceWeatherAurora');
    globeEngine.updateSpaceWeatherVisualization(spaceWeatherMarkers, allowedBoundaryOverlays);
    setGlobeData(prevData => {
      const nonSpace = prevData.filter((d: { type?: string }) => d.type !== 'space-weather');
      return [...nonSpace, ...spaceWeatherMarkers];
    });
    console.log(`Updated space weather visualization with ${spaceWeatherMarkers.length} markers for EcoNatural/SpaceWeather mode`);
  }, [
    globeEngine,
    spaceWeatherSettings,
    visualizationVectors,
    visualizationMode.mode,
    visualizationMode.subMode
  ]);

  // Handle intel report creation from context menu (reintroduced after integration)
  const handleCreateIntelReport = (geoLocation: { lat: number; lng: number }) => {
    const { lat, lng } = geoLocation;
    const newReport: IntelReportOverlayMarker = {
      pubkey: `report-${Date.now()}`,
      title: `Intel Report - ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      author: 'Current User',
      content: `Intelligence report created at coordinates ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      timestamp: Date.now(),
      latitude: lat,
      longitude: lng,
      tags: ['user-created', 'context-menu']
    };
    setIntelReports(prev => [...prev, newReport]);
    console.log('📝 Intel report created from context menu:', newReport);
  };

  // =============================================================================
  // ANIMATION LOOP - Real-time animations for cyber visualizations
  // =============================================================================
  useEffect(() => {
    let animationId: number;
    
    const animate = () => {
      // Animate cyber threats (pulsing for active threats)
      cyberThreatsGroupRef.current?.children.forEach(child => {
        if (child.userData.animate && typeof child.userData.animate === 'function') {
          child.userData.animate();
        }
      });
      
      // Animate cyber attacks (pulsing markers and flowing trajectories)
      cyberAttacksGroupRef.current?.children.forEach(child => {
        if (child.userData.animate && typeof child.userData.animate === 'function') {
          child.userData.animate();
        }
      });
      
      animationId = requestAnimationFrame(animate);
    };
    
    // Start animation loop when in cyber visualization modes
    if (visualizationMode.mode === 'CyberCommand' && 
        (visualizationMode.subMode === 'CyberThreats' || visualizationMode.subMode === 'CyberAttacks')) {
      animate();
    }
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [visualizationMode.mode, visualizationMode.subMode]);

  // Cleanup effect when component unmounts or visualization mode changes
  useEffect(() => {
    return () => {
      // Clean up all visualization groups
      [cyberThreatsGroupRef, cyberAttacksGroupRef, networkInfraGroupRef, commHubsGroupRef, intelMarkerGroupRef].forEach(groupRef => {
        const group = groupRef.current;
        if (group) {
          // Dispose of all geometries and materials
          group.children.forEach(child => {
            if (child instanceof THREE.Mesh) {
              child.geometry?.dispose();
              if (child.material instanceof THREE.Material) {
                child.material.dispose();
              } else if (Array.isArray(child.material)) {
                child.material.forEach(material => material.dispose());
              }
            }
          });
          group.clear();
        }
      });
      
      // Clear models array
      setIntelModels([]);
      setIntelReports([]);
      
      console.log('🧹 Globe cleanup completed - all visualization groups disposed');
    };
  }, []);

  return (
    <div ref={containerRef} style={{ 
      position: 'relative',
      width: '100%', 
      height: '100%', 
      overflow: 'hidden',
      opacity: isInitializing ? 0 : 1,
      transition: 'opacity 0.5s ease-in-out',
      // Remove centering from main container to let Globe fill space
      minWidth: '100%',
      minHeight: '100%'
    }}>
  <GlobeLoadingManager 
        material={material} 
        globeEngine={globeEngine}
        fastTrackMode={false} // TODO: Implement user preference for globe loading optimization (cached vs real-time data)
      >        {/* Globe render with full space utilization */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%'
        }}>
          <Globe
          ref={globeRef}
          width={containerSize.width}
          height={containerSize.height}
          pointsData={globeData.filter((d: { lat?: number; lng?: number }) => d.lat !== undefined && d.lng !== undefined)}
          pointAltitude={(d: { size?: number }) => d.size || 0.5}
          pointColor={(d: { type?: string; color?: string }) => {
            if (d.type === 'space-weather') return d.color || 'purple';
            if (d.type === 'intel') return 'orange';
            if (d.type === 'earthquake') return 'red';
            if (d.type === 'volcano') return 'purple';
            if (d.type === 'cyber') return 'cyan';
            if (d.type === 'system') return 'yellow';
            if (d.type === 'storm') return 'blue';
            if (d.type === 'cloud') return 'gray';
            return d.color || 'white';
          }}
          pointLabel={(d: { tooltip?: string; label?: string }) => d.tooltip || d.label || ''}
          globeMaterial={material ?? undefined}
          // Configure renderer for optimal space usage
          rendererConfig={rendererConfig}
          // Disable automatic camera positioning that might constrain view
          enablePointerInteraction={true}
          // ...existing Globe props...
        />
        </div>
        
        {/* Enhanced 3D Globe Interactivity - handles Intel Report model interactions with game-inspired 3D system */}
        <Enhanced3DGlobeInteractivity 
          globeRef={globeRef}
          intelReports={intelReports}
          visualizationMode={visualizationMode}
          models={intelModels}
          onHoverChange={setHoveredReportId}
          containerRef={containerRef}
          onCreateIntelReport={handleCreateIntelReport}
        />
  {/* Space Weather Telemetry HUD removed: telemetry now provided in sidebars */}
        
        {/* Cyber Data Loading Indicator */}
        {cyberDataLoading && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: '#00ffff',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 1000
          }}>
            {visualizationMode.subMode === 'CyberThreats' ? '🔒 Loading Threats...' : '⚡ Loading Attacks...'}
          </div>
        )}

        {(visualizationMode.mode === 'EcoNatural' && visualizationMode.subMode === 'SpaceWeather') && (
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: '#00ffff',
            padding: '8px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            zIndex: 1000,
            lineHeight: 1.3
          }}>
            <div>Space Weather Layers</div>
            <div>Magnetopause: {spaceWeatherBoundaryStatus.magnetopause.enabled ? 'on' : 'off'} / {spaceWeatherBoundaryStatus.magnetopause.attached ? 'attached' : 'missing'}</div>
            <div>Bow Shock: {spaceWeatherBoundaryStatus.bowShock.enabled ? 'on' : 'off'} / {spaceWeatherBoundaryStatus.bowShock.attached ? 'attached' : 'missing'}</div>
            <div>Aurora: {spaceWeatherBoundaryStatus.aurora.enabled ? 'on' : 'off'} / {spaceWeatherBoundaryStatus.aurora.attached ? 'attached' : 'missing'}</div>
          </div>
        )}
        
        {/* Solar System Debug Panel - Temporarily disabled for performance */}
        {/* <SolarSystemDebugPanel 
          solarSystemState={solarSystemIntegration.solarSystemState ? {
            isActive: solarSystemIntegration.isActive,
            currentScale: solarSystemIntegration.currentScale || 'unknown',
            sunVisible: solarSystemIntegration.sunVisible,
            cameraDistance: solarSystemIntegration.solarSystemState.cameraDistance || 0,
            sunState: solarSystemIntegration.solarSystemState.sunState,
            planetsVisible: solarSystemIntegration.solarSystemState.planetaryInfo?.visiblePlanets,
            activePlanets: solarSystemIntegration.solarSystemState.planetaryInfo?.activePlanets
          } : null}
        /> */}
        
        {/* Geopolitical Panel UI */}
        {geoModeActive && (
          <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.55)', padding: '10px 12px', borderRadius: 8, fontSize: 12, lineHeight: 1.4, maxWidth: 260 }}>
            <div style={{ fontWeight: 600, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setGeoPanelOpen(o => !o)}>
              <span>Geopolitical Layers {geoPanelOpen ? '▾' : '▸'}</span>
              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#222', border: '1px solid #444' }}>
                {geoIntegrity.status === 'idle' && '—'}
                {geoIntegrity.status === 'verifying' && 'Verifying'}
                {geoIntegrity.status === 'verified' && 'Verified'}
                {geoIntegrity.status === 'mismatch' && `Mismatch${geoIntegrity.mismatchCount ? ' ' + geoIntegrity.mismatchCount : ''}`}
                {geoIntegrity.status === 'error' && 'Error'}
              </span>
            </div>
            {geoPanelOpen && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 6 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="checkbox" checked={geoEnabled} readOnly /> Borders
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={geoPoliticalConfig.nationalTerritories.territoryColors.opacity > 0}
                      onChange={e => updateNationalTerritories({ territoryColors: { ...geoPoliticalConfig.nationalTerritories.territoryColors, opacity: e.target.checked ? 50 : 0 } })}
                    /> Fills
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={geoPoliticalConfig.nationalTerritories.showDisputedTerritories}
                      onChange={e => updateNationalTerritories({ showDisputedTerritories: e.target.checked })}
                    /> Show Disputed
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={geoPoliticalConfig.nationalTerritories.highlightOnHover}
                      onChange={e => updateNationalTerritories({ highlightOnHover: e.target.checked })}
                    /> Hover Highlight
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 66 }}>Opacity</span>
                    <input type="range" min={0} max={100} value={geoPoliticalConfig.nationalTerritories.territoryColors.opacity}
                      onChange={e => updateNationalTerritories({ territoryColors: { ...geoPoliticalConfig.nationalTerritories.territoryColors, opacity: parseInt(e.target.value, 10) } })} style={{ flex: 1 }} />
                    <span style={{ width: 32, textAlign: 'right' }}>{geoPoliticalConfig.nationalTerritories.territoryColors.opacity}</span>
                  </label>
                </div>
                {geoIntegrity.artifacts && (
                  <div style={{ maxHeight: 140, overflowY: 'auto', fontSize: 11, borderTop: '1px solid #333', paddingTop: 6, marginBottom: 6 }}>
                    {geoIntegrity.artifacts.map(a => (
                      <div key={a.path} style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.path.replace('public/','')}</span>
                        <span style={{ color: a.status === 'verified' ? '#55ff55' : a.status === 'mismatch' ? '#ff6666' : '#cccccc' }}>{a.status}</span>
                        <span style={{ opacity: 0.65 }}>{(a.bytes/1024).toFixed(1)}kB</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 6 }}>
              <div><span style={{ color: '#00ff41' }}>■</span> Intl</div>
              <div><span style={{ color: '#ff5555' }}>■</span> Disputed</div>
              <div><span style={{ color: '#ffcc00' }}>■</span> LoC</div>
              <div><span style={{ color: '#888888' }}>■</span> Indefinite</div>
            </div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>LOD: {geoPoliticalConfig.nationalTerritories.lod?.mode === 'locked' ? `Locked ${geoPoliticalConfig.nationalTerritories.lod.lockedLevel}` : 'Auto'}</div>
          </div>
        )}
        {/* Borders and territories overlays attached in scene via hook */}
      </GlobeLoadingManager>
    </div>
  );
};

export default React.memo(GlobeView);
// AI-NOTE: Refactored to use GlobeEngine. See globe-engine-api.artifact for integration details.
// Artifact references:
// - Overlay UI/UX: globe-overlays.artifact (UI/UX Guidelines)
// - Overlay logic: globe-engine-api.artifact, globe-modes.artifact