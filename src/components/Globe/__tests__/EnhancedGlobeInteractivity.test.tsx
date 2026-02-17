// EnhancedGlobeInteractivity.test.tsx
// Comprehensive UI/UX tests for globe interaction drag vs click detection

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import EnhancedGlobeInteractivity from '../EnhancedGlobeInteractivity';
import { IntelReportOverlayMarker } from '../../../interfaces/IntelReportOverlay';

// Mock wallet context
const mockWallet = {
  publicKey: null,
  connected: false,
  connecting: false,
  disconnect: vi.fn(),
  wallet: null,
  wallets: [],
  select: vi.fn(),
  signTransaction: vi.fn(),
  signAllTransactions: vi.fn(),
  signMessage: vi.fn(),
  sendTransaction: vi.fn()
};

vi.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => mockWallet
}));

// Mock Three.js objects
const mockScene = {
  add: vi.fn(),
  remove: vi.fn(),
  traverse: vi.fn((callback: (child: { geometry?: { constructor: { name: string } }; isMesh?: boolean }) => void) => {
    // Mock globe mesh
    const mockGlobeMesh = {
      geometry: { constructor: { name: 'SphereGeometry' } },
      isMesh: true
    };
    callback(mockGlobeMesh);
  }),
  children: []
};

const mockCamera = {
  position: { x: 0, y: 0, z: 100 },
  lookAt: vi.fn(),
  updateProjectionMatrix: vi.fn()
};

const mockControls = {
  enableRotate: true,
  enableZoom: true,
  enablePan: true,
  dampingFactor: 0.1,
  enableDamping: true
};

const mockGlobeRef = {
  current: {
    scene: () => mockScene,
    camera: () => mockCamera,
    controls: () => mockControls
  }
};

// Mock Three.js raycaster
const mockRaycaster = {
  setFromCamera: vi.fn(),
  intersectObject: vi.fn(() => [{
    point: { x: 0, y: 50, z: 0, length: () => 50 },
    distance: 50
  }]),
  intersectObjects: vi.fn(() => [])
};

vi.mock('three', async () => {
  const actual = await vi.importActual('three');
  return {
    ...actual,
    Raycaster: vi.fn(() => mockRaycaster),
    Vector2: vi.fn(() => ({ x: 0, y: 0 })),
    Vector3: vi.fn((x = 0, y = 0, z = 0) => ({ x, y, z, copy: vi.fn(), normalize: vi.fn(() => ({ multiplyScalar: vi.fn() })) })),
    SphereGeometry: vi.fn(),
    MeshBasicMaterial: vi.fn(),
    Mesh: vi.fn(() => ({
      position: { copy: vi.fn(), normalize: vi.fn(() => ({ multiplyScalar: vi.fn() })) },
      visible: false
    })),
    Group: vi.fn(() => ({
      add: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    })),
    BufferGeometry: vi.fn(() => ({
      setFromPoints: vi.fn()
    })),
    LineBasicMaterial: vi.fn(),
    Line: vi.fn()
  };
});

// Mock hooks
vi.mock('../../../hooks/useIntelReportInteractivity', () => ({
  useIntelReportInteractivity: () => ({
    hoveredReport: null,
    selectedReport: null,
    tooltipVisible: false,
    popupVisible: false,
    handleModelHover: vi.fn(),
    handleModelClick: vi.fn(),
    handlePopupClose: vi.fn()
  })
}));

// Mock UI components
vi.mock('../../ui/IntelReportTooltip/IntelReportTooltip', () => ({
  IntelReportTooltip: ({ visible }: { visible: boolean }) => 
    visible ? <div data-testid="intel-tooltip">Tooltip</div> : null
}));

vi.mock('../../ui/IntelReportPopup/IntelReportPopup', () => ({
  IntelReportPopup: ({ visible }: { visible: boolean }) => 
    visible ? <div data-testid="intel-popup">Popup</div> : null
}));

// Mock services
vi.mock('../../../services/collaboration/EnhancedTeamCollaborationService', () => ({
  EnhancedTeamCollaborationService: vi.fn()
}));

// Mock intel report creation
const mockCreateIntelReport = vi.fn();
const mockAlert = vi.fn();
vi.mock('../../../services/IntelReportService', () => ({
  IntelReportService: vi.fn(() => ({
    submitIntelReport: mockCreateIntelReport
  }))
}));

describe('EnhancedGlobeInteractivity - Drag vs Click Detection', () => {
  let container: HTMLElement;
  let containerElRef: React.RefObject<HTMLDivElement>;
  
  const mockIntelReports: IntelReportOverlayMarker[] = [];
  const mockVisualizationMode = {
    mode: 'CyberCommand',
    subMode: 'IntelReports'
  };

  beforeEach(() => {
    vi.useFakeTimers();
    mockCreateIntelReport.mockClear();
    mockAlert.mockClear();
    vi.stubGlobal('alert', mockAlert);
    containerElRef = React.createRef<HTMLDivElement>();
    
    render(
      <div ref={containerElRef} data-testid="globe-container" style={{ width: '800px', height: '600px' }}>
        <EnhancedGlobeInteractivity
          globeRef={mockGlobeRef}
          intelReports={mockIntelReports}
          visualizationMode={mockVisualizationMode}
          models={[]}
          containerRef={containerElRef}
          interactionConfig={{
            dragThreshold: 5,
            timeThreshold: 300
          }}
        />
      </div>
    );
    
    container = screen.getByTestId('globe-container');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe('Click Detection (Should Create Intel Reports)', () => {
    it('should create intel report on quick click (under threshold)', async () => {
      console.log('🧪 Testing: Quick click should create intel report');
      
      // Quick click: mouse down, small movement, quick mouse up
      fireEvent.mouseDown(container, { 
        clientX: 400, 
        clientY: 300,
        bubbles: true 
      });
      
      // Very small movement (under 5px threshold)
      fireEvent.mouseMove(container, { 
        clientX: 402, 
        clientY: 301,
        bubbles: true 
      });
      
      // Quick mouse up (under 300ms threshold)
      act(() => {
        vi.advanceTimersByTime(100); // 100ms - well under threshold
      });
      
      fireEvent.mouseUp(container, { 
        clientX: 402, 
        clientY: 301,
        bubbles: true 
      });
      
      await act(async () => {
        vi.runOnlyPendingTimers();
        await Promise.resolve();
      });

      expect(mockCreateIntelReport).toHaveBeenCalled();
      
      console.log('✅ Quick click test passed');
    });

    it('should create intel report on stationary click', async () => {
      console.log('🧪 Testing: Stationary click should create intel report');
      
      // Perfect click: no movement at all
      fireEvent.mouseDown(container, { 
        clientX: 400, 
        clientY: 300,
        bubbles: true 
      });
      
      // No mouse movement
      
      // Quick mouse up
      act(() => {
        vi.advanceTimersByTime(150);
      });
      
      fireEvent.mouseUp(container, { 
        clientX: 400, 
        clientY: 300,
        bubbles: true 
      });
      
      await act(async () => {
        vi.runOnlyPendingTimers();
        await Promise.resolve();
      });

      expect(mockCreateIntelReport).toHaveBeenCalled();
      
      console.log('✅ Stationary click test passed');
    });
  });

  describe('Drag Detection (Should NOT Create Intel Reports)', () => {
    it('should NOT create intel report on small drag (over distance threshold)', async () => {
      console.log('🧪 Testing: Small drag should NOT create intel report');
      
      mockCreateIntelReport.mockClear();
      
      // Small drag: mouse down, move over threshold, mouse up
      fireEvent.mouseDown(container, { 
        clientX: 400, 
        clientY: 300,
        bubbles: true 
      });
      
      // Movement over 5px threshold (drag detected)
      fireEvent.mouseMove(container, { 
        clientX: 407, // 7px movement
        clientY: 300,
        bubbles: true 
      });
      
      // Quick mouse up
      act(() => {
        vi.advanceTimersByTime(100);
      });
      
      fireEvent.mouseUp(container, { 
        clientX: 407, 
        clientY: 300,
        bubbles: true 
      });
      
      // Wait to ensure no intel report is created
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      
      expect(mockCreateIntelReport).not.toHaveBeenCalled();
      console.log('✅ Small drag test passed - no intel report created');
    });

    it('should NOT create intel report on long drag', async () => {
      console.log('🧪 Testing: Long drag should NOT create intel report');
      
      mockCreateIntelReport.mockClear();
      
      // Long drag: mouse down, big movement, mouse up
      fireEvent.mouseDown(container, { 
        clientX: 400, 
        clientY: 300,
        bubbles: true 
      });
      
      // Simulate dragging across the globe
      for (let i = 0; i < 10; i++) {
        fireEvent.mouseMove(container, { 
          clientX: 400 + (i * 10), 
          clientY: 300 + (i * 5),
          bubbles: true 
        });
        
        act(() => {
          vi.advanceTimersByTime(20);
        });
      }
      
      // Mouse up after significant drag
      fireEvent.mouseUp(container, { 
        clientX: 500, 
        clientY: 350,
        bubbles: true 
      });
      
      // Wait to ensure no intel report is created
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      
      expect(mockCreateIntelReport).not.toHaveBeenCalled();
      console.log('✅ Long drag test passed - no intel report created');
    });

    it('should NOT create intel report on slow movement (over time threshold)', async () => {
      console.log('🧪 Testing: Slow movement should NOT create intel report');
      
      mockCreateIntelReport.mockClear();
      
      // Slow movement: mouse down, wait too long, mouse up
      fireEvent.mouseDown(container, { 
        clientX: 400, 
        clientY: 300,
        bubbles: true 
      });
      
      // Small movement but wait too long (over 300ms threshold)
      act(() => {
        vi.advanceTimersByTime(400); // Over time threshold
      });
      
      fireEvent.mouseMove(container, { 
        clientX: 402, 
        clientY: 301,
        bubbles: true 
      });
      
      fireEvent.mouseUp(container, { 
        clientX: 402, 
        clientY: 301,
        bubbles: true 
      });
      
      // Wait to ensure no intel report is created
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      
      expect(mockCreateIntelReport).not.toHaveBeenCalled();
      console.log('✅ Slow movement test passed - no intel report created');
    });
  });

  describe('Edge Cases', () => {
    it('should handle mouse leave during drag', async () => {
      console.log('🧪 Testing: Mouse leave during drag');
      
      mockCreateIntelReport.mockClear();
      
      fireEvent.mouseDown(container, { 
        clientX: 400, 
        clientY: 300,
        bubbles: true 
      });
      
      // Start dragging
      fireEvent.mouseMove(container, { 
        clientX: 410, 
        clientY: 300,
        bubbles: true 
      });
      
      // Mouse leaves container
      fireEvent.mouseLeave(container);
      
      // Should not create intel report
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      
      expect(mockCreateIntelReport).not.toHaveBeenCalled();
      console.log('✅ Mouse leave test passed');
    });

    it('should handle rapid click sequences', async () => {
      console.log('🧪 Testing: Rapid click sequences');
      
      mockCreateIntelReport.mockClear();
      
      // First click
      fireEvent.mouseDown(container, { clientX: 400, clientY: 300 });
      fireEvent.mouseUp(container, { clientX: 400, clientY: 300 });
      
      act(() => {
        vi.advanceTimersByTime(50);
      });
      
      // Second click immediately after
      fireEvent.mouseDown(container, { clientX: 405, clientY: 305 });
      fireEvent.mouseUp(container, { clientX: 405, clientY: 305 });
      
      await act(async () => {
        vi.runOnlyPendingTimers();
        await Promise.resolve();
      });

      expect(mockCreateIntelReport.mock.calls.length).toBeGreaterThanOrEqual(1);
      
      console.log('✅ Rapid clicks test passed');
    });

    it('should only work in Intel Reports mode', async () => {
      console.log('🧪 Testing: Mode-specific behavior');
      
      mockCreateIntelReport.mockClear();
      const secondContainerRef = React.createRef<HTMLDivElement>();
      
      // Re-render with different mode
      render(
        <div ref={secondContainerRef} data-testid="globe-container-2" style={{ width: '800px', height: '600px' }}>
          <EnhancedGlobeInteractivity
            globeRef={mockGlobeRef}
            intelReports={mockIntelReports}
            visualizationMode={{ mode: 'Other', subMode: 'Mode' }}
            models={[]}
            containerRef={secondContainerRef}
          />
        </div>
      );
      
      const otherContainer = screen.getByTestId('globe-container-2');
      
      // Try to click in wrong mode
      fireEvent.mouseDown(otherContainer, { clientX: 400, clientY: 300 });
      fireEvent.mouseUp(otherContainer, { clientX: 400, clientY: 300 });
      
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      
      expect(mockCreateIntelReport).not.toHaveBeenCalled();
      console.log('✅ Mode-specific test passed');
    });
  });

  describe('Touch Events', () => {
    it('should handle touch tap correctly', async () => {
      console.log('🧪 Testing: Touch tap should create intel report');
      
      mockCreateIntelReport.mockClear();
      
      // Touch start
      fireEvent.touchStart(container, {
        touches: [{ clientX: 400, clientY: 300 }]
      });
      
      // Quick touch end
      act(() => {
        vi.advanceTimersByTime(100);
      });
      
      fireEvent.touchEnd(container);
      
      await act(async () => {
        vi.runOnlyPendingTimers();
        await Promise.resolve();
      });

      expect(mockCreateIntelReport).toHaveBeenCalled();
      
      console.log('✅ Touch tap test passed');
    });

    it('should handle touch drag correctly', async () => {
      console.log('🧪 Testing: Touch drag should NOT create intel report');
      
      mockCreateIntelReport.mockClear();
      
      // Touch start
      fireEvent.touchStart(container, {
        touches: [{ clientX: 400, clientY: 300 }]
      });
      
      // Touch move (drag)
      fireEvent.touchMove(container, {
        touches: [{ clientX: 420, clientY: 300 }]
      });
      
      // Touch end
      fireEvent.touchEnd(container);
      
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      
      expect(mockCreateIntelReport).not.toHaveBeenCalled();
      console.log('✅ Touch drag test passed');
    });
  });

  describe('Debug Information', () => {
    it('should log interaction state changes', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // Trigger a drag to see debug logs
      fireEvent.mouseDown(container, { clientX: 400, clientY: 300 });
      fireEvent.mouseMove(container, { clientX: 410, clientY: 300 });
      fireEvent.mouseUp(container, { clientX: 410, clientY: 300 });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🖱️ Mouse Down:'),
        expect.any(Object)
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🖱️ Drag detected:'),
        expect.any(Object)
      );
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🖱️ Mouse Up Analysis:'),
        expect.any(Object)
      );
      
      consoleSpy.mockRestore();
    });
  });
});
