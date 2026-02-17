/**
 * Enhanced3DGlobeInteractivity - UNIFIED 3D interaction for Intel Reports
 * 
 * This component provides a complete 3D interaction system for Intel Report models
 * with consolidated mouse handling to eliminate infinite loops.
 * 
 * ARCHITECTURAL CHANGE: Removed useIntel3DInteraction hook dependency and merged
 * logic directly to eliminate competing event systems.
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { IntelReportOverlayMarker } from '../../interfaces/IntelReportOverlay';
import { useGlobeRightClickInteraction } from '../../hooks/useGlobeRightClickInteraction';
import { IntelReportTooltip } from '../ui/IntelReportTooltip/IntelReportTooltip';
import { IntelReportPopupPortal } from '../ui/IntelReportPopup/IntelReportPopupPortal';
import { GlobeContextAction, GlobeContextActionData } from '../ui/GlobeContextMenu/GlobeContextMenu';
import { OfflineIntelReportService } from '../../services/OfflineIntelReportService';
import { OfflineIntelReportsManager } from '../Intel/OfflineIntelReportsManager';
import { useWallet } from '@solana/wallet-adapter-react';
import { usePopup } from '../Popup/PopupManager';
import { findPrimaryGlobeMesh, worldPointToGeoOnGlobe } from '../../utils/globeSurfaceMapping';
import { useVisualizationOverlay } from '../../hooks/useVisualizationOverlay';

interface Enhanced3DGlobeInteractivityProps {
  globeRef: React.RefObject<{ camera: () => THREE.Camera; scene: () => THREE.Scene }>;
  intelReports: IntelReportOverlayMarker[];
  visualizationMode: {
    mode: string;
    subMode: string;
  };
  models: ModelInstance[];
  onHoverChange?: (reportId: string | null) => void;
  containerRef?: React.RefObject<HTMLDivElement>;
  onCreateIntelReport?: (geoLocation: { lat: number; lng: number }) => void;
}

interface ModelInstance {
  positionContainer: THREE.Group;
  orientationContainer: THREE.Group;
  rotationContainer: THREE.Group;
  mesh: THREE.Object3D;
  report: IntelReportOverlayMarker;
  basePosition: THREE.Vector3;
  hoverOffset: number;
  localRotationY: number;
  surfaceAnchor: THREE.Vector3;
  surfaceAnchorIsWorld: boolean;
  globeRadius: number;
  hoverAltitude: number;
}

export const Enhanced3DGlobeInteractivity: React.FC<Enhanced3DGlobeInteractivityProps> = ({
  globeRef,
  intelReports,
  visualizationMode,
  models,
  onHoverChange,
  containerRef: parentContainerRef,
  onCreateIntelReport
}) => {
  const localContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = parentContainerRef || localContainerRef;
  const { cursorTrailIndicatorEnabled } = useVisualizationOverlay();
  const { showPopup, hidePopup } = usePopup();
  const intelPopupIdRef = useRef<string | null>(null);
  const intelReportsRef = useRef(intelReports);
  const lastPopupReportRef = useRef<string | null>(null);
  
  // Wallet connection for online/offline Intel Report creation
  const { connected, publicKey } = useWallet();
  
  // Offline Intel Report service
  const offlineService = OfflineIntelReportService.getInstance();
  
  // UI state
  const [showOfflineManager, setShowOfflineManager] = useState(false);
  
  // State for UI components
  const [tooltipVisible, setTooltipVisible] = useState(false);

  // New features state
  const indicatorMeshRef = useRef<THREE.Mesh | null>(null);
  const indicatorTailRef = useRef<THREE.Line | null>(null);
  const indicatorTailAttributeRef = useRef<THREE.BufferAttribute | null>(null);
  const indicatorTailGeometryRef = useRef<THREE.BufferGeometry | null>(null);
  const indicatorTailPositionsRef = useRef<Float32Array | null>(null);
  const indicatorTailHistoryRef = useRef<THREE.Vector3[]>([]);
  const indicatorMotionIntensityRef = useRef<number>(0);
  const indicatorLastScreenPosRef = useRef<{ x: number; y: number } | null>(null);
  const connectionLinesRef = useRef<THREE.Group>(new THREE.Group());
  const cachedGlobeMeshRef = useRef<THREE.Mesh | null>(null);
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const indicatorTargetNormalRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1, 0));
  const indicatorDisplayNormalRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1, 0));
  const indicatorTargetRadiusRef = useRef<number>(0);
  const indicatorTargetActiveRef = useRef<boolean>(false);
  const indicatorDisplayInitializedRef = useRef<boolean>(false);
  const indicatorRotationAxisRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const indicatorFallbackAxisRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1, 0));
  const prefersReducedMotionRef = useRef<boolean>(false);

  // Check if we're in the correct visualization mode
  const isIntelReportsMode = visualizationMode.mode === 'CyberCommand' && 
                            visualizationMode.subMode === 'IntelReports';

  // UNIFIED STATE MANAGEMENT - Direct state instead of hook
  const [unifiedInteractionState, setUnifiedInteractionState] = useState({
    // Mouse interaction state
    hoveredModel: null as ModelInstance | null,
    clickedModel: null as ModelInstance | null,
    mousePosition: { x: 0, y: 0 },
    
    // Drag/click detection state (game development pattern)
    isMouseDown: false,
    dragStartPos: { x: 0, y: 0 },
    currentPos: { x: 0, y: 0 },
    dragDistance: 0,
    mouseDownTime: 0,
    isDragging: false,
    hasDraggedPastThreshold: false,
    
    // Globe hover state
    globeHoverPosition: null as { lat: number; lng: number } | null
  });

  // Configuration for drag/click detection
  const dragThreshold = 5; // pixels
  const timeThreshold = 300; // ms

  // Refs for high-frequency updates that don't need React re-renders
  const currentMousePosRef = useRef({ x: 0, y: 0 });
  const lastMouseStateUpdateRef = useRef(0);
  const isDraggingRef = useRef(false);
  const currentCursorRef = useRef<string>('grab');
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster()); // Reuse raycaster for performance
  
  // Advanced throttling configuration
  const MOUSE_STATE_UPDATE_THROTTLE = 100; // Only update React state every 100ms
  const HOVER_DETECTION_THROTTLE = 50; // Hover detection can be more frequent
  const DRAG_DETECTION_THROTTLE = 16; // Drag detection at ~60fps for responsiveness
  const CURSOR_TRAIL_RESPONSIVENESS = 16;
  const CURSOR_TRAIL_MAX_DEG_PER_SEC = 300;
  const CURSOR_SURFACE_OFFSET = 1;
  const CURSOR_ANGLE_EPSILON = 1e-5;
  const CURSOR_TAIL_MAX_POINTS = 24;
  const CURSOR_TAIL_MIN_POINTS = 8;
  const CURSOR_TAIL_BASE_OPACITY = 0.22;
  const CURSOR_TAIL_MAX_OPACITY = 0.58;
  const CURSOR_TAIL_MIN_INTENSITY = 0.22;
  const CURSOR_TAIL_PX_FOR_MAX_INTENSITY = 28;
  const CURSOR_TAIL_INTENSITY_DECAY_PER_SEC = 2.4;
  
  // Performance tracking refs
  const lastHoverDetectionRef = useRef(0);
  const lastDragDetectionRef = useRef(0);
  const frameSkipCounterRef = useRef(0);
  const lastHoverRaycastPositionRef = useRef<{ x: number; y: number } | null>(null);
  
  // Performance monitoring (development only)
  const performanceStatsRef = useRef({
    totalMouseMoves: 0,
    skippedFrames: 0,
    reactStateUpdates: 0,
    hoverDetections: 0,
    lastResetTime: Date.now()
  });

  useEffect(() => {
    intelReportsRef.current = intelReports;
  }, [intelReports]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => {
      prefersReducedMotionRef.current = mediaQuery.matches;
    };

    updatePreference();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePreference);
      return () => mediaQuery.removeEventListener('change', updatePreference);
    }

    mediaQuery.addListener(updatePreference);
    return () => mediaQuery.removeListener(updatePreference);
  }, []);

  // Direct cursor management without React re-renders
  const updateCursor = useCallback((newCursor: string) => {
    if (currentCursorRef.current !== newCursor && containerRef.current) {
      currentCursorRef.current = newCursor;
      containerRef.current.style.cursor = newCursor;
    }
  }, [containerRef]);

  // Screen position tracking for UI positioning
  const [screenPositions, _setScreenPositions] = useState<Map<string, THREE.Vector2>>(new Map());

  const modelMeshMap = useMemo(() => {
    const map = new Map<string, ModelInstance>();
    models.forEach((model) => {
      if (model?.mesh) {
        map.set(model.mesh.uuid, model);
      }
    });
    return map;
  }, [models]);

  const modelRootMeshes = useMemo(() => {
    return models
      .map((model) => model?.mesh)
      .filter((mesh): mesh is THREE.Object3D => !!mesh);
  }, [models]);

  // Helper functions for model interactions
  const clearClickedState = useCallback(() => {
    setUnifiedInteractionState(prev => ({
      ...prev,
      clickedModel: null
    }));
  }, []);

  const getModelScreenPosition = useCallback((modelId: string): THREE.Vector2 | null => {
    return screenPositions.get(modelId) || null;
  }, [screenPositions]);

  const resolveGlobeMesh = useCallback((scene: THREE.Scene): THREE.Mesh | null => {
    const cached = cachedGlobeMeshRef.current;
    if (cached && cached.parent) {
      return cached;
    }

    const found = findPrimaryGlobeMesh(scene);
    cachedGlobeMeshRef.current = found;
    return found;
  }, []);

  // Handle context menu actions with enhanced offline Intel Report support
  const handleCustomContextAction = useCallback(async (
    action: GlobeContextAction, 
    data?: GlobeContextActionData
  ) => {
    console.log('🎯 Context action triggered:', { action: action.id, data });

    if (!data?.geoLocation) {
      console.warn('No geo location provided for action:', action.id);
      return;
    }

    const { lat, lng } = data.geoLocation;

    // Handle specific actions with enhanced offline support
    switch (action.id) {
      case 'create-intel-report': {
        console.log('📝 Creating intel report at:', { lat, lng });
        
        // Enhanced Intel Report creation with comprehensive offline fallback
        if (connected && publicKey && onCreateIntelReport) {
          // User is connected - use standard Web3 flow
          console.log('✅ Wallet connected - using Web3 Intel Report creation');
          onCreateIntelReport(data.geoLocation);
        } else {
          // User not connected - create offline report with comprehensive UX
          console.log('🌐 Wallet not connected - creating offline Intel Report');
          
          try {
            // Prompt user for basic report data
            const title = prompt('Enter Intel Report title:') || 'Untitled Report';
            if (!title || title === 'Untitled Report') {
              const confirmed = confirm('Create report without title? You can edit it later.');
              if (!confirmed) return;
            }
            
            const content = prompt('Enter report content (optional):') || '';
            
            // Create offline report
            const offlineReport = await offlineService.createOfflineReport({
              title,
              content,
              subtitle: '',
              tags: ['location', 'offline'],
              categories: ['intelligence'],
              lat: lat,
              long: lng,
              date: new Date().toISOString(),
              author: 'offline-user',
              metaDescription: `Intel report created offline at ${lat.toFixed(4)}, ${lng.toFixed(4)}`
            }, { lat, lng });
            
            // Show success message with options
            const message = `📝 Offline Intel Report Created!\n\n` +
                          `Title: ${title}\n` +
                          `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}\n` +
                          `Status: Stored locally - will sync when you connect wallet\n\n` +
                          `Choose an option:`;
            
            if (confirm(`${message}\n\n[OK] - View offline reports\n[Cancel] - Continue`)) {
              setShowOfflineManager(true);
            }
            
            console.log('✅ Offline Intel Report created:', offlineReport.offlineId);
          } catch (error) {
            console.error('❌ Failed to create offline Intel Report:', error);
            alert(`Failed to create offline Intel Report: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or connect your wallet for full functionality.`);
          }
        }
        break;
      }
      
      case 'add-marker':
        console.log('📍 Adding marker at:', { lat, lng });
        alert(`Marker added at coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        // TODO: Integrate with marker system
        break;
      
      case 'set-waypoint':
        console.log('🎯 Setting waypoint at:', { lat, lng });
        alert(`Waypoint set at: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        // TODO: Integrate with navigation system
        break;
      
      case 'location-details': {
        console.log('🌍 Showing location details for:', { lat, lng });
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        alert(`Location Details:\nCoordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}\nTimezone: ${timezone}\nRegion: ${lat > 0 ? 'Northern' : 'Southern'} Hemisphere`);
        break;
      }
      
      case 'area-statistics': {
        console.log('📊 Fetching area statistics for:', { lat, lng });
        const mockStats = {
          population: Math.floor(Math.random() * 1000000),
          strategicValue: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
          elevation: Math.floor(Math.random() * 3000)
        };
        alert(`Area Statistics:\nEstimated Population: ${mockStats.population.toLocaleString()}\nStrategic Value: ${mockStats.strategicValue}\nElevation: ${mockStats.elevation}m`);
        break;
      }
      
      case 'satellite-view':
        console.log('🛰️ Switching to satellite view at:', { lat, lng });
        alert('Satellite view activated. Enhanced imagery loading...');
        // TODO: Integrate with globe view switching
        break;
      
      case 'historical-data':
        console.log('🗺️ Loading historical data for:', { lat, lng });
        alert('Historical data:\n• Previous intel reports: 3\n• Last activity: 2 days ago\n• Threat level history: Low → Medium');
        // TODO: Integrate with historical data service
        break;
      
      case 'measure-distance':
        console.log('📏 Starting distance measurement from:', { lat, lng });
        alert(`Distance measurement started from: ${lat.toFixed(4)}, ${lng.toFixed(4)}\nClick another location to complete measurement.`);
        // TODO: Integrate with measurement tools
        break;
      
      case 'scan-area':
        console.log('🔍 Scanning area around:', { lat, lng });
        alert('Area scan initiated...\n• Communications: 5 signals detected\n• Movement: 2 contacts identified\n• Infrastructure: 3 facilities mapped');
        // TODO: Integrate with intelligence scanning
        break;
      
      case 'signal-analysis': {
        console.log('📡 Analyzing signals at:', { lat, lng });
        const signalStrength = Math.floor(Math.random() * 100);
        alert(`Signal Analysis:\nSignal Strength: ${signalStrength}%\nEncryption: ${signalStrength > 70 ? 'Military Grade' : 'Standard'}\nInterference: ${signalStrength < 30 ? 'High' : 'Low'}`);
        break;
      }
      
      case 'threat-assessment': {
        console.log('⚠️ Assessing threats at:', { lat, lng });
        const threatLevels = ['Low', 'Medium', 'High', 'Critical'];
        const threatLevel = threatLevels[Math.floor(Math.random() * threatLevels.length)];
        alert(`Threat Assessment:\nCurrent Level: ${threatLevel}\nKey Risks: Environmental, Communications\nRecommendation: ${threatLevel === 'High' || threatLevel === 'Critical' ? 'Exercise Caution' : 'Proceed Normally'}`);
        break;
      }
      
      case 'share-location':
        console.log('� Sharing location:', { lat, lng });
        navigator.clipboard?.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        alert(`Location shared!\nCoordinates copied to clipboard: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        break;
      
      case 'leave-comment': {
        console.log('💬 Leaving comment at:', { lat, lng });
        const comment = prompt(`Leave a comment for this location (${lat.toFixed(4)}, ${lng.toFixed(4)}):`);
        if (comment) {
          alert(`Comment saved: "${comment}"\nLocation: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          // TODO: Integrate with comment system
        }
        break;
      }
      
      case 'report-incident': {
        console.log('🚨 Reporting incident at:', { lat, lng });
        const incidentTypes = ['Security Breach', 'Equipment Failure', 'Suspicious Activity', 'Environmental Hazard'];
        const selectedType = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
        alert(`Incident Report Submitted\nType: ${selectedType}\nLocation: ${lat.toFixed(4)}, ${lng.toFixed(4)}\nStatus: Under Review\nIncident ID: INC-${Date.now().toString().slice(-6)}`);
        // TODO: Integrate with incident reporting system
        break;
      }
      
      default:
        console.log('🔧 Action not yet implemented:', action.id);
        alert(`Feature "${action.label}" is coming soon!`);
        break;
    }
  }, [onCreateIntelReport, connected, publicKey, offlineService, setShowOfflineManager]);

  // Use the right-click interaction hook (for globe surface interactions)
  useGlobeRightClickInteraction({
    globeRef,
    containerRef,
    enabled: isIntelReportsMode,
    onContextAction: handleCustomContextAction
  });
  useEffect(() => {
    const shouldShowTooltip = isIntelReportsMode && unifiedInteractionState.hoveredModel !== null;
    setTooltipVisible(shouldShowTooltip);
  }, [unifiedInteractionState.hoveredModel, isIntelReportsMode]);

  const teardownIntelPopupState = useCallback(() => {
    intelPopupIdRef.current = null;
    lastPopupReportRef.current = null;
    clearClickedState();
    onHoverChange?.(null);
  }, [clearClickedState, onHoverChange]);

  const closeIntelPopup = useCallback(() => {
    if (intelPopupIdRef.current) {
      hidePopup(intelPopupIdRef.current);
    } else {
      teardownIntelPopupState();
    }
  }, [hidePopup, teardownIntelPopupState]);

  // Update popup visibility based on clicked state using top-level popup manager
  useEffect(() => {
    if (!isIntelReportsMode) {
      return;
    }

    const clickedReport = unifiedInteractionState.clickedModel?.report;
    if (!clickedReport) {
      return;
    }

    if (intelPopupIdRef.current && lastPopupReportRef.current === clickedReport.pubkey) {
      clearClickedState();
      return;
    }

    if (intelPopupIdRef.current) {
      hidePopup(intelPopupIdRef.current);
    }

    const reportsSnapshot = intelReportsRef.current.slice();

    const popupId = showPopup({
      component: IntelReportPopupPortal as unknown as React.ComponentType<{ onClose: () => void; [key: string]: unknown }>,
      props: {
        reports: reportsSnapshot,
        initialPubkey: clickedReport.pubkey,
        onCloseComplete: () => {
          teardownIntelPopupState();
        },
        onReportChange: (report: IntelReportOverlayMarker | null) => {
          const reportId = report?.pubkey || null;
          lastPopupReportRef.current = reportId;
          onHoverChange?.(reportId);
        }
      },
      backdrop: true,
      onClose: () => {
        teardownIntelPopupState();
      },
      zIndex: 4000
    });

    intelPopupIdRef.current = popupId;
    lastPopupReportRef.current = clickedReport.pubkey;
    setTooltipVisible(false);
    clearClickedState();
  }, [
    isIntelReportsMode,
    unifiedInteractionState.clickedModel,
    showPopup,
    hidePopup,
    teardownIntelPopupState,
    clearClickedState,
    onHoverChange
  ]);

  // Notify parent of hover changes
  useEffect(() => {
    const reportId = unifiedInteractionState.hoveredModel?.report?.pubkey || null;
    onHoverChange?.(reportId);
  }, [unifiedInteractionState.hoveredModel, onHoverChange]);

  // Close popup when leaving Intel Reports mode or unmounting
  useEffect(() => {
    if (!isIntelReportsMode) {
      closeIntelPopup();
    }

    return () => {
      closeIntelPopup();
    };
  }, [isIntelReportsMode, closeIntelPopup]);

  // Calculate tooltip position
  const getTooltipPosition = () => {
    if (!unifiedInteractionState.hoveredModel) {
      return unifiedInteractionState.mousePosition;
    }

    // Try to get the model's screen position for more accurate tooltip placement
    const screenPos = getModelScreenPosition(unifiedInteractionState.hoveredModel.report.pubkey);
    if (screenPos) {
      return {
        x: screenPos.x + 15, // Offset to avoid overlapping the model
        y: screenPos.y - 10
      };
    }

    // Fallback to mouse position
    return {
      x: unifiedInteractionState.mousePosition.x + 15,
      y: unifiedInteractionState.mousePosition.y - 10
    };
  };
  // Initialize mouse position indicator
  useEffect(() => {
    if (!globeRef.current) return;

    const globeObj = globeRef.current;
    const scene = globeObj?.scene();
    if (!scene || typeof scene.add !== 'function') return; // Defensive check for testing

    try {
      // Create a small sphere to indicate mouse position on globe
      const geometry = new THREE.SphereGeometry(0.5, 8, 8);
      const material = new THREE.MeshBasicMaterial({ 
        color: 0x00ff41, 
        transparent: true, 
        opacity: 0.7,
        wireframe: true
      });
      const indicator = new THREE.Mesh(geometry, material);
      indicator.visible = false; // Initially hidden
      scene.add(indicator);
      indicatorMeshRef.current = indicator;

      const tailGeometry = new THREE.BufferGeometry();
      const tailPositions = new Float32Array(CURSOR_TAIL_MAX_POINTS * 3);
      const tailAttribute = new THREE.BufferAttribute(tailPositions, 3);
      tailGeometry.setAttribute('position', tailAttribute);
      tailGeometry.setDrawRange(0, 0);

      const tailMaterial = new THREE.LineBasicMaterial({
        color: 0x00ff41,
        transparent: true,
        opacity: CURSOR_TAIL_BASE_OPACITY,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending
      });

      const tail = new THREE.Line(tailGeometry, tailMaterial);
      tail.visible = false;
      scene.add(tail);

      indicatorTailRef.current = tail;
      indicatorTailGeometryRef.current = tailGeometry;
      indicatorTailAttributeRef.current = tailAttribute;
      indicatorTailPositionsRef.current = tailPositions;
      indicatorTailHistoryRef.current = [];

      return () => {
        indicatorTargetActiveRef.current = false;
        indicatorDisplayInitializedRef.current = false;
        indicatorMeshRef.current = null;
        indicatorTailRef.current = null;
        indicatorTailGeometryRef.current = null;
        indicatorTailAttributeRef.current = null;
        indicatorTailPositionsRef.current = null;
        indicatorTailHistoryRef.current = [];
        if (scene && typeof scene.remove === 'function') {
          scene.remove(indicator);
          scene.remove(tail);
        }

        tailGeometry.dispose();
        tailMaterial.dispose();
      };
    } catch (error) {
      console.warn('Failed to initialize mouse position indicator:', error);
    }
  }, [globeRef, CURSOR_TAIL_BASE_OPACITY, CURSOR_TAIL_MAX_POINTS]);

  useEffect(() => {
    let animationFrameId: number | null = null;
    let lastFrameTime = 0;

    const animateIndicator = (timestamp: number) => {
      const indicator = indicatorMeshRef.current;
      const tail = indicatorTailRef.current;
      if (!indicator) {
        animationFrameId = requestAnimationFrame(animateIndicator);
        return;
      }

      const dtRaw = lastFrameTime > 0 ? (timestamp - lastFrameTime) / 1000 : 0;
      const dt = Math.min(Math.max(dtRaw, 0), 0.05);
      lastFrameTime = timestamp;

      if (!cursorTrailIndicatorEnabled || !indicatorTargetActiveRef.current || document.hidden) {
        indicator.visible = false;
        indicatorMotionIntensityRef.current = 0;
        if (tail) {
          tail.visible = false;
        }
        animationFrameId = requestAnimationFrame(animateIndicator);
        return;
      }

      const targetNormal = indicatorTargetNormalRef.current;
      const displayNormal = indicatorDisplayNormalRef.current;

      if (!indicatorDisplayInitializedRef.current) {
        displayNormal.copy(targetNormal);
        indicatorDisplayInitializedRef.current = true;
      }

      const dot = THREE.MathUtils.clamp(displayNormal.dot(targetNormal), -1, 1);
      const angle = Math.acos(dot);

      if (angle > CURSOR_ANGLE_EPSILON) {
        const desiredStep = prefersReducedMotionRef.current
          ? angle
          : angle * (1 - Math.exp(-CURSOR_TRAIL_RESPONSIVENESS * Math.max(dt, 1 / 120)));
        const maxStep = THREE.MathUtils.degToRad(CURSOR_TRAIL_MAX_DEG_PER_SEC) * Math.max(dt, 1 / 120);
        const step = prefersReducedMotionRef.current
          ? angle
          : Math.min(angle, desiredStep, maxStep);

        if (step > 0) {
          const rotationAxis = indicatorRotationAxisRef.current;
          rotationAxis.copy(displayNormal).cross(targetNormal);

          if (rotationAxis.lengthSq() < 1e-10) {
            rotationAxis.copy(displayNormal).cross(indicatorFallbackAxisRef.current);
            if (rotationAxis.lengthSq() < 1e-10) {
              rotationAxis.set(1, 0, 0);
            }
          }

          rotationAxis.normalize();
          displayNormal.applyAxisAngle(rotationAxis, step).normalize();
        }
      } else {
        displayNormal.copy(targetNormal);
      }

      const targetRadius = indicatorTargetRadiusRef.current;
      if (!Number.isFinite(targetRadius) || targetRadius <= 0) {
        indicator.visible = false;
        if (tail) {
          tail.visible = false;
        }
        indicatorTargetActiveRef.current = false;
        animationFrameId = requestAnimationFrame(animateIndicator);
        return;
      }

      indicator.position.copy(displayNormal).multiplyScalar(targetRadius);
      indicator.visible = true;

      if (tail && indicatorTailAttributeRef.current && indicatorTailPositionsRef.current) {
        const tailAttribute = indicatorTailAttributeRef.current;
        const tailPositions = indicatorTailPositionsRef.current;
        const tailHistory = indicatorTailHistoryRef.current;

        if (tailHistory.length !== CURSOR_TAIL_MAX_POINTS) {
          tailHistory.length = 0;
          for (let index = 0; index < CURSOR_TAIL_MAX_POINTS; index += 1) {
            tailHistory.push(indicator.position.clone());
          }
        }

        for (let index = CURSOR_TAIL_MAX_POINTS - 1; index > 0; index -= 1) {
          tailHistory[index].copy(tailHistory[index - 1]);
        }
        tailHistory[0].copy(indicator.position);

        indicatorMotionIntensityRef.current = Math.max(
          0,
          indicatorMotionIntensityRef.current - CURSOR_TAIL_INTENSITY_DECAY_PER_SEC * Math.max(dt, 1 / 120)
        );

        const intensity = prefersReducedMotionRef.current
          ? 0
          : (() => {
              const normalized = THREE.MathUtils.clamp(indicatorMotionIntensityRef.current, 0, 1);
              if (normalized <= 0) {
                return 0;
              }

              return Math.max(CURSOR_TAIL_MIN_INTENSITY, Math.sqrt(normalized));
            })();

        const activeTailPoints = prefersReducedMotionRef.current
          ? 1
          : Math.max(
              CURSOR_TAIL_MIN_POINTS,
              Math.min(
                CURSOR_TAIL_MAX_POINTS,
                CURSOR_TAIL_MIN_POINTS + Math.round((CURSOR_TAIL_MAX_POINTS - CURSOR_TAIL_MIN_POINTS) * intensity)
              )
            );

        const curveHistoryPoints = tailHistory
          .slice(0, Math.max(activeTailPoints, 2))
          .map((point) => point.clone().normalize().multiplyScalar(targetRadius));
        const curvedPoints = curveHistoryPoints.length >= 2
          ? new THREE.CatmullRomCurve3(curveHistoryPoints, false, 'centripetal', 0.25).getPoints(activeTailPoints - 1)
          : curveHistoryPoints;

        for (let index = 0; index < CURSOR_TAIL_MAX_POINTS; index += 1) {
          const source = curvedPoints[Math.min(index, activeTailPoints - 1)] || curvedPoints[0] || tailHistory[0];
          const offset = index * 3;
          tailPositions[offset] = source.x;
          tailPositions[offset + 1] = source.y;
          tailPositions[offset + 2] = source.z;
        }

        tailAttribute.needsUpdate = true;
        tail.geometry.setDrawRange(0, activeTailPoints);

        const tailMaterial = tail.material as THREE.LineBasicMaterial;
        tailMaterial.opacity = prefersReducedMotionRef.current
          ? 0
          : CURSOR_TAIL_BASE_OPACITY + (CURSOR_TAIL_MAX_OPACITY - CURSOR_TAIL_BASE_OPACITY) * intensity;

        tail.visible = activeTailPoints > 1 && tailMaterial.opacity > 0;
      }

      animationFrameId = requestAnimationFrame(animateIndicator);
    };

    animationFrameId = requestAnimationFrame(animateIndicator);

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [
    cursorTrailIndicatorEnabled,
    CURSOR_ANGLE_EPSILON,
    CURSOR_TRAIL_MAX_DEG_PER_SEC,
    CURSOR_TRAIL_RESPONSIVENESS,
    CURSOR_TAIL_BASE_OPACITY,
    CURSOR_TAIL_MAX_OPACITY,
    CURSOR_TAIL_MIN_INTENSITY,
    CURSOR_TAIL_INTENSITY_DECAY_PER_SEC,
    CURSOR_TAIL_MAX_POINTS,
    CURSOR_TAIL_MIN_POINTS
  ]);

  // Initialize connection lines group
  useEffect(() => {
    if (!globeRef.current) return;

    const globeObj = globeRef.current;
    const scene = globeObj?.scene();
    if (!scene || typeof scene.add !== 'function') return; // Defensive check for testing

    try {
      const linesGroup = connectionLinesRef.current;
      scene.add(linesGroup);

      return () => {
        if (scene && typeof scene.remove === 'function') {
          scene.remove(linesGroup);
        }
      };
    } catch (error) {
      console.warn('Failed to initialize connection lines group:', error);
    }
  }, [globeRef]);

  // Update connection lines for Intel Reports
  useEffect(() => {
    const clearConnectionLines = () => {
      const group = connectionLinesRef.current;
      if (!group) {
        return;
      }

      while (group.children.length > 0) {
        const child = group.children[0];
        if (child instanceof THREE.Line) {
          child.geometry?.dispose();
          const material = child.material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(material)) {
            material.forEach((m) => m.dispose());
          } else {
            material?.dispose();
          }
        }
        group.remove(child);
      }
    };

    if (!models.length || !isIntelReportsMode) {
      clearConnectionLines();
      return;
    }

    // Clear existing lines
    clearConnectionLines();

    const globeObj = globeRef.current;
    const scene = globeObj?.scene();
    const globeMesh = scene ? resolveGlobeMesh(scene) : null;

    if (globeMesh) {
      globeMesh.updateMatrixWorld(true);
    }

    try {
      // Create connection lines for each Intel Report
      models.forEach((model) => {
        // Defensive checks for model structure
        if (!model || !model.report || !model.positionContainer?.position) return;

        const surfacePosition = model.surfaceAnchor.clone();
        if (!model.surfaceAnchorIsWorld && globeMesh) {
          surfacePosition.applyMatrix4(globeMesh.matrixWorld);
        }

        const modelPosition = new THREE.Vector3();
        model.positionContainer.getWorldPosition(modelPosition);

        const points = [surfacePosition, modelPosition];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        // Create semi-transparent line material
        const material = new THREE.LineBasicMaterial({ 
          color: 0x00ff41, 
          transparent: true, 
          opacity: 0.3,
          linewidth: 1
        });
        
        const line = new THREE.Line(geometry, material);
        if (connectionLinesRef.current && typeof connectionLinesRef.current.add === 'function') {
          connectionLinesRef.current.add(line);
        }
      });
    } catch (error) {
      console.warn('Failed to update connection lines:', error);
    }
  }, [models, isIntelReportsMode, globeRef, resolveGlobeMesh]);

  // Note: Intel Report creation is now handled through the right-click context menu
  // to avoid interference with globe drag interactions

  // UNIFIED COMPREHENSIVE THROTTLED MOUSE HANDLER
  // This is a complete rewrite that consolidates all mouse interactions with advanced throttling
  const handleUnifiedMouseMove = useCallback((event: MouseEvent) => {
    if (!isIntelReportsMode || !containerRef.current || !globeRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const currentTime = Date.now();

    // PERFORMANCE MONITORING (development only)
    if (process.env.NODE_ENV === 'development') {
      performanceStatsRef.current.totalMouseMoves++;
      
      // Reset stats every 10 seconds
      if (currentTime - performanceStatsRef.current.lastResetTime > 10000) {
        console.log('🔧 Mouse Handler Performance Stats (10s):', {
          totalMoves: performanceStatsRef.current.totalMouseMoves,
          skippedFrames: performanceStatsRef.current.skippedFrames,
          reactUpdates: performanceStatsRef.current.reactStateUpdates,
          hoverDetections: performanceStatsRef.current.hoverDetections,
          efficiency: `${(100 - (performanceStatsRef.current.skippedFrames / performanceStatsRef.current.totalMouseMoves * 100)).toFixed(1)}%`
        });
        
        performanceStatsRef.current = {
          totalMouseMoves: 0,
          skippedFrames: 0,
          reactStateUpdates: 0,
          hoverDetections: 0,
          lastResetTime: currentTime
        };
      }
    }

    // LEVEL 1: ALWAYS update mouse position ref (no React re-render, essential for tooltips)
    currentMousePosRef.current = {
      x: event.clientX, // Global coordinates for tooltips
      y: event.clientY
    };

    if (cursorTrailIndicatorEnabled) {
      const prevScreenPos = indicatorLastScreenPosRef.current;
      indicatorLastScreenPosRef.current = { x: event.clientX, y: event.clientY };
      if (prevScreenPos) {
        const dx = event.clientX - prevScreenPos.x;
        const dy = event.clientY - prevScreenPos.y;
        const pxDelta = Math.sqrt(dx * dx + dy * dy);
        const normalizedDelta = THREE.MathUtils.clamp(pxDelta / CURSOR_TAIL_PX_FOR_MAX_INTENSITY, 0, 1);
        indicatorMotionIntensityRef.current = Math.max(indicatorMotionIntensityRef.current * 0.65, normalizedDelta);
      }
    } else {
      indicatorLastScreenPosRef.current = null;
      indicatorTargetActiveRef.current = false;
      const indicator = indicatorMeshRef.current;
      if (indicator) {
        indicator.visible = false;
      }
      const tail = indicatorTailRef.current;
      if (tail) {
        tail.visible = false;
      }
    }

    // LEVEL 2: DRAG DETECTION (high frequency ~60fps for responsive dragging)
    const isDraggingPlanet = isDraggingRef.current;
    let shouldUpdateDragState = false;
    
    if (currentTime - lastDragDetectionRef.current >= DRAG_DETECTION_THROTTLE) {
      shouldUpdateDragState = true;
      lastDragDetectionRef.current = currentTime;
    }

    // LEVEL 3: REACT STATE UPDATES (low frequency 100ms to prevent infinite loops)
    let shouldUpdateReactState = false;
    if (!isDraggingPlanet && currentTime - lastMouseStateUpdateRef.current >= MOUSE_STATE_UPDATE_THROTTLE) {
      shouldUpdateReactState = true;
      lastMouseStateUpdateRef.current = currentTime;
    }

    // LEVEL 4: HOVER DETECTION (medium frequency 50ms for good responsiveness)
    let shouldUpdateHoverState = false;
    if (!isDraggingPlanet && currentTime - lastHoverDetectionRef.current >= HOVER_DETECTION_THROTTLE) {
      shouldUpdateHoverState = true;
      lastHoverDetectionRef.current = currentTime;
    }

    // PERFORMANCE TRACKING: Skip frames if called too frequently
    frameSkipCounterRef.current++;
    if (frameSkipCounterRef.current % 3 === 0) { // Process every 3rd call for heavy operations
      frameSkipCounterRef.current = 0;
    } else if (!shouldUpdateDragState && !shouldUpdateReactState) {
      if (process.env.NODE_ENV === 'development') {
        performanceStatsRef.current.skippedFrames++;
      }
      return; // Skip this frame entirely if no updates are needed
    }

    // === DRAG STATE PROCESSING ===
    if (shouldUpdateDragState && shouldUpdateReactState) {
      if (process.env.NODE_ENV === 'development') {
        performanceStatsRef.current.reactStateUpdates++;
      }
      setUnifiedInteractionState(prev => {
        let newState = { ...prev };
        
        // Update drag detection if mouse is down
        if (prev.isMouseDown) {
          const dragDistance = Math.sqrt(
            Math.pow(x - prev.dragStartPos.x, 2) + 
            Math.pow(y - prev.dragStartPos.y, 2)
          );
          
          const isDragging = dragDistance > dragThreshold;
          const hasDraggedPastThreshold = prev.hasDraggedPastThreshold || isDragging;
          
          // Update the ref immediately for other systems
          isDraggingRef.current = hasDraggedPastThreshold;
          
          newState = {
            ...newState,
            currentPos: { x, y },
            dragDistance,
            isDragging,
            hasDraggedPastThreshold
          };

          // Debug logging (throttled)
          if (isDragging && !prev.isDragging) {
            if (process.env.NODE_ENV === 'development') {
              console.log('🖱️ COMPREHENSIVE Handler - Drag detected:', { dragDistance, dragThreshold });
            }
          }
        }

        // Update mouse position
        newState.mousePosition = { ...currentMousePosRef.current };
        return newState;
      });
    }

    // === EARLY EXIT: Skip expensive 3D operations during dragging ===
    if (isDraggingPlanet) {
      return;
    }

    // === 3D INTERSECTION AND HOVER DETECTION ===
    if (shouldUpdateHoverState) {
      if (process.env.NODE_ENV === 'development') {
        performanceStatsRef.current.hoverDetections++;
      }
      const globeObj = globeRef.current;
      const scene = globeObj?.scene();
      const camera = globeObj?.camera();

      if (!scene || !camera) return;

      const previousRaycastPosition = lastHoverRaycastPositionRef.current;
      const deltaX = previousRaycastPosition ? x - previousRaycastPosition.x : 0;
      const deltaY = previousRaycastPosition ? y - previousRaycastPosition.y : 0;
      const movementSq = deltaX * deltaX + deltaY * deltaY;
      if (previousRaycastPosition && movementSq < 4) {
        return;
      }
      lastHoverRaycastPositionRef.current = { x, y };

      // Normalize mouse coordinates to [-1, 1] range
      mouseRef.current.x = (x / rect.width) * 2 - 1;
      mouseRef.current.y = -(y / rect.height) * 2 + 1;

      // Update reused raycaster
      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      // PRIORITY 1: Intel model intersection detection
      let hoveredIntelModel: ModelInstance | null = null;
      if (modelRootMeshes.length > 0) {
        const intersects = raycasterRef.current.intersectObjects(modelRootMeshes, true);
        if (intersects.length > 0) {
          let currentObject: THREE.Object3D | null = intersects[0].object;
          while (currentObject) {
            const matchedModel = modelMeshMap.get(currentObject.uuid);
            if (matchedModel) {
              hoveredIntelModel = matchedModel;
              break;
            }
            currentObject = currentObject.parent;
          }
        }
      }

      if (hoveredIntelModel) {
        indicatorTargetActiveRef.current = false;
        const indicator = indicatorMeshRef.current;
        if (indicator) {
          indicator.visible = false;
        }
        const tail = indicatorTailRef.current;
        if (tail) {
          tail.visible = false;
        }
      }

      // PRIORITY 2: Globe surface intersection (only if no intel model hovered)
      let newGlobeHoverPosition: { lat: number; lng: number } | null = null;
      if (!hoveredIntelModel) {
        const globeMesh = resolveGlobeMesh(scene);

        if (globeMesh) {
          const globeIntersects = raycasterRef.current.intersectObject(globeMesh);
          if (globeIntersects.length > 0) {
            const intersectionPoint = globeIntersects[0].point;
            const globeGeo = worldPointToGeoOnGlobe(intersectionPoint, globeMesh);
            
            newGlobeHoverPosition = globeGeo;

            const radius = intersectionPoint.length() + CURSOR_SURFACE_OFFSET;
            const targetNormal = intersectionPoint.clone().normalize();
            const isValidTarget =
              Number.isFinite(targetNormal.x) &&
              Number.isFinite(targetNormal.y) &&
              Number.isFinite(targetNormal.z) &&
              Number.isFinite(radius) &&
              radius > 0;

            if (isValidTarget && cursorTrailIndicatorEnabled) {
              indicatorTargetNormalRef.current.copy(targetNormal);
              indicatorTargetRadiusRef.current = radius;
              indicatorTargetActiveRef.current = true;

              if (!indicatorDisplayInitializedRef.current) {
                indicatorDisplayNormalRef.current.copy(targetNormal);
                indicatorDisplayInitializedRef.current = true;
              }
            } else {
              indicatorTargetActiveRef.current = false;
              const indicator = indicatorMeshRef.current;
              if (indicator) {
                indicator.visible = false;
              }
              const tail = indicatorTailRef.current;
              if (tail) {
                tail.visible = false;
              }
            }
          } else {
            indicatorTargetActiveRef.current = false;
            const indicator = indicatorMeshRef.current;
            if (indicator) {
              indicator.visible = false;
            }
            const tail = indicatorTailRef.current;
            if (tail) {
              tail.visible = false;
            }
          }
        }
      }

      // BATCHED STATE UPDATE: Update hover states together
      if (shouldUpdateReactState) {
        setUnifiedInteractionState(prev => ({
          ...prev,
          hoveredModel: hoveredIntelModel,
          globeHoverPosition: newGlobeHoverPosition
        }));
      }

      // IMMEDIATE CURSOR UPDATE: Don't wait for React state
      if (hoveredIntelModel) {
        updateCursor('pointer');
      } else {
        updateCursor('grab');
      }
    }
  }, [
    isIntelReportsMode,
    cursorTrailIndicatorEnabled,
    containerRef, 
    globeRef, 
    modelRootMeshes,
    modelMeshMap,
    dragThreshold, 
    CURSOR_SURFACE_OFFSET,
    CURSOR_TAIL_PX_FOR_MAX_INTENSITY,
    updateCursor,
    // Throttling constants (these never change, but including for completeness)
    MOUSE_STATE_UPDATE_THROTTLE,
    HOVER_DETECTION_THROTTLE,
    DRAG_DETECTION_THROTTLE,
    resolveGlobeMesh
  ]);

  // Global cursor trail tracking for non-Intel visualization modes
  useEffect(() => {
    if (!containerRef.current || !globeRef.current) {
      return;
    }

    const container = containerRef.current;

    const hideIndicator = () => {
      indicatorLastScreenPosRef.current = null;
      indicatorTargetActiveRef.current = false;
      const indicator = indicatorMeshRef.current;
      if (indicator) {
        indicator.visible = false;
      }
      const tail = indicatorTailRef.current;
      if (tail) {
        tail.visible = false;
      }
    };

    const handleGlobalCursorMove = (event: MouseEvent) => {
      if (isIntelReportsMode) {
        return;
      }

      if (!cursorTrailIndicatorEnabled || !containerRef.current || !globeRef.current) {
        hideIndicator();
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        hideIndicator();
        return;
      }

      const prevScreenPos = indicatorLastScreenPosRef.current;
      indicatorLastScreenPosRef.current = { x: event.clientX, y: event.clientY };
      if (prevScreenPos) {
        const dx = event.clientX - prevScreenPos.x;
        const dy = event.clientY - prevScreenPos.y;
        const pxDelta = Math.sqrt(dx * dx + dy * dy);
        const normalizedDelta = THREE.MathUtils.clamp(pxDelta / CURSOR_TAIL_PX_FOR_MAX_INTENSITY, 0, 1);
        indicatorMotionIntensityRef.current = Math.max(indicatorMotionIntensityRef.current * 0.65, normalizedDelta);
      }

      const globeObj = globeRef.current;
      const scene = globeObj?.scene();
      const camera = globeObj?.camera();
      if (!scene || !camera) {
        hideIndicator();
        return;
      }

      mouseRef.current.x = (x / rect.width) * 2 - 1;
      mouseRef.current.y = -(y / rect.height) * 2 + 1;
      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      const globeMesh = resolveGlobeMesh(scene);
      if (!globeMesh) {
        hideIndicator();
        return;
      }

      const globeIntersects = raycasterRef.current.intersectObject(globeMesh);
      if (!globeIntersects.length) {
        hideIndicator();
        return;
      }

      const intersectionPoint = globeIntersects[0].point;
      const radius = intersectionPoint.length() + CURSOR_SURFACE_OFFSET;
      const targetNormal = intersectionPoint.clone().normalize();
      const isValidTarget =
        Number.isFinite(targetNormal.x) &&
        Number.isFinite(targetNormal.y) &&
        Number.isFinite(targetNormal.z) &&
        Number.isFinite(radius) &&
        radius > 0;

      if (!isValidTarget) {
        hideIndicator();
        return;
      }

      indicatorTargetNormalRef.current.copy(targetNormal);
      indicatorTargetRadiusRef.current = radius;
      indicatorTargetActiveRef.current = true;

      if (!indicatorDisplayInitializedRef.current) {
        indicatorDisplayNormalRef.current.copy(targetNormal);
        indicatorDisplayInitializedRef.current = true;
      }
    };

    container.addEventListener('mousemove', handleGlobalCursorMove);
    container.addEventListener('mouseleave', hideIndicator);

    return () => {
      container.removeEventListener('mousemove', handleGlobalCursorMove);
      container.removeEventListener('mouseleave', hideIndicator);
    };
  }, [
    isIntelReportsMode,
    cursorTrailIndicatorEnabled,
    containerRef,
    globeRef,
    resolveGlobeMesh,
    CURSOR_SURFACE_OFFSET,
    CURSOR_TAIL_PX_FOR_MAX_INTENSITY
  ]);

  // COMPREHENSIVE MOUSE DOWN HANDLER
  const handleUnifiedMouseDown = useCallback((event: MouseEvent) => {
    if (!isIntelReportsMode || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🖱️ COMPREHENSIVE Handler - Mouse Down:', { x, y, timestamp: Date.now() });
    }
    
    // Reset frame skip counter for immediate drag detection
    frameSkipCounterRef.current = 0;
    
    // Batch all mouse down state updates
    setUnifiedInteractionState(prev => ({
      ...prev,
      isMouseDown: true,
      dragStartPos: { x, y },
      currentPos: { x, y },
      dragDistance: 0,
      mouseDownTime: Date.now(),
      isDragging: false,
      hasDraggedPastThreshold: false
    }));
  }, [isIntelReportsMode, containerRef]);

  // COMPREHENSIVE MOUSE UP HANDLER
  const handleUnifiedMouseUp = useCallback((event: MouseEvent) => {
    if (!isIntelReportsMode) return;
    
    console.debug('🖱️ COMPREHENSIVE Handler - Mouse up event at:', event.clientX, event.clientY);
    
    // Reset dragging ref immediately
    isDraggingRef.current = false;
    
    setUnifiedInteractionState(prev => {
      if (!prev.isMouseDown) return prev;
      
      const currentTime = Date.now();
      const timeSinceMouseDown = currentTime - prev.mouseDownTime;
      
      // Determine if this was a click or drag based on distance and time
      const wasClick = !prev.hasDraggedPastThreshold && timeSinceMouseDown < timeThreshold;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🖱️ COMPREHENSIVE Handler - Mouse Up Analysis:', {
          dragDistance: prev.dragDistance,
          dragThreshold,
          timeSinceMouseDown,
          timeThreshold,
          hasDraggedPastThreshold: prev.hasDraggedPastThreshold,
          wasClick,
          hoveredModel: prev.hoveredModel?.report?.title || 'none',
          globePosition: prev.globeHoverPosition
        });
      }
      
      // Handle click actions
      if (wasClick && prev.hoveredModel) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ COMPREHENSIVE Handler - Processing intel model click:', prev.hoveredModel.report.title);
        }
        return {
          ...prev,
          clickedModel: prev.hoveredModel,
          isMouseDown: false,
          isDragging: false,
          hasDraggedPastThreshold: false
        };
      } else if (wasClick && prev.globeHoverPosition) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ COMPREHENSIVE Handler - Globe click at:', prev.globeHoverPosition);
        }
        // Globe click - handled via context menu
      }
      
      // Reset interaction state
      return {
        ...prev,
        isMouseDown: false,
        isDragging: false,
        hasDraggedPastThreshold: false,
        dragDistance: 0
      };
    });
  }, [isIntelReportsMode, timeThreshold, dragThreshold]);

  // Set up unified mouse event listeners
  useEffect(() => {
    if (!isIntelReportsMode || !containerRef.current) return;

    const container = containerRef.current;
    
    container.addEventListener('mousemove', handleUnifiedMouseMove);
    container.addEventListener('mousedown', handleUnifiedMouseDown);
    container.addEventListener('mouseup', handleUnifiedMouseUp);
    container.addEventListener('mouseleave', handleUnifiedMouseUp); // Reset on mouse leave

    return () => {
      container.removeEventListener('mousemove', handleUnifiedMouseMove);
      container.removeEventListener('mousedown', handleUnifiedMouseDown);
      container.removeEventListener('mouseup', handleUnifiedMouseUp);
      container.removeEventListener('mouseleave', handleUnifiedMouseUp);
    };
  }, [isIntelReportsMode, containerRef, handleUnifiedMouseMove, handleUnifiedMouseDown, handleUnifiedMouseUp]);

  // Update screen positions for UI positioning (from original useIntel3DInteraction logic)
  useEffect(() => {
    const shouldTrackScreenPositions =
      isIntelReportsMode &&
      (unifiedInteractionState.hoveredModel !== null || unifiedInteractionState.clickedModel !== null);

    if (!shouldTrackScreenPositions || !globeRef.current || !containerRef.current || !models.length) return;

    let updateIntervalId: ReturnType<typeof setInterval> | null = null;
    const UPDATE_INTERVAL_MS = 500;
    let lastScreenPositions = new Map<string, THREE.Vector2>();

    const updateScreenPositions = () => {
      if (document.hidden) {
        return;
      }

      const globeObj = globeRef.current as unknown as { camera: () => THREE.Camera; };
      const camera = globeObj?.camera();
      const container = containerRef.current;
      
      if (camera && container && models.length > 0) {
        const rect = container.getBoundingClientRect();
        
        // Calculate screen positions for models
        const newScreenPositions = new Map<string, THREE.Vector2>();
        let hasSignificantChanges = false;
        
        models.forEach(modelInstance => {
          if (modelInstance.mesh && modelInstance.report?.pubkey) {
            // Get world position of the model
            const worldPos = new THREE.Vector3();
            modelInstance.mesh.getWorldPosition(worldPos);
            
            // Project to screen coordinates
            const screenPos = worldPos.clone().project(camera);
            const x = (screenPos.x * 0.5 + 0.5) * rect.width;
            const y = (screenPos.y * -0.5 + 0.5) * rect.height;
            
            const currentPos = lastScreenPositions.get(modelInstance.report.pubkey);
            const newPos = new THREE.Vector2(x, y);
            
            // Only update if position changed significantly (> 15 pixels)
            if (!currentPos || 
                Math.abs(currentPos.x - newPos.x) > 15 || 
                Math.abs(currentPos.y - newPos.y) > 15) {
              newScreenPositions.set(modelInstance.report.pubkey, newPos);
              hasSignificantChanges = true;
            } else {
              newScreenPositions.set(modelInstance.report.pubkey, currentPos);
            }
          }
        });
        
        // Only update state if there are significant changes
        if (hasSignificantChanges) {
          lastScreenPositions = new Map(newScreenPositions);
          _setScreenPositions(newScreenPositions);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateScreenPositions();
      }
    };

    updateScreenPositions();
    updateIntervalId = setInterval(updateScreenPositions, UPDATE_INTERVAL_MS);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (updateIntervalId) {
        clearInterval(updateIntervalId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    isIntelReportsMode,
    unifiedInteractionState.hoveredModel,
    unifiedInteractionState.clickedModel,
    globeRef,
    containerRef,
    models
  ]);

  // Set initial cursor
  useEffect(() => {
    if (!isIntelReportsMode || !containerRef.current) return;
    updateCursor('grab');
  }, [isIntelReportsMode, containerRef, updateCursor]);

  return (
    <>
      {/* Tooltip for hover state */}
      {isIntelReportsMode && (
        <IntelReportTooltip
          report={unifiedInteractionState.hoveredModel?.report || null}
          position={getTooltipPosition()}
          visible={tooltipVisible}
          onClose={() => {
            setTooltipVisible(false);
          }}
        />
      )}
      {/* Offline Intel Reports Manager */}
      <OfflineIntelReportsManager
        wallet={connected ? { publicKey } : undefined}
        isOpen={showOfflineManager}
        onClose={() => setShowOfflineManager(false)}
        onViewReport={(report) => {
          console.log('Viewing offline report:', report);
        }}
        onEditReport={(report) => {
          console.log('Editing offline report:', report);
        }}
      />

      {/* Screen reader announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden'
        }}
      >
        {unifiedInteractionState.hoveredModel && isIntelReportsMode && (
          <div>
            Intel Report: {unifiedInteractionState.hoveredModel.report.title}
          </div>
        )}
      </div>
    </>
  );
};

export default Enhanced3DGlobeInteractivity;
