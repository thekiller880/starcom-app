// simpleDragScroll.ts
// A clean, simple drag-to-scroll implementation for the marquee
import { useState, useRef, useCallback, useEffect } from 'react';

interface DragScrollState {
  isDragging: boolean;
  startX: number;
  scrollLeft: number;
  currentX: number;
  velocity: number;
  momentumId: number | null;
}

interface DragScrollReturn {
  dragState: DragScrollState;
  dragHandlers: {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
  };
  scrollOffset: number;
  isDragging: boolean;
  resetScroll: () => void;
}

export const useSimpleDragScroll = (): DragScrollReturn => {
  const DRAG_THRESHOLD_PX = 4;
  const MOMENTUM_FRICTION_PER_16MS = 0.95;
  const MOMENTUM_STOP_THRESHOLD = 0.02;

  const [dragState, setDragState] = useState<DragScrollState>({
    isDragging: false,
    startX: 0,
    scrollLeft: 0,
    currentX: 0,
    velocity: 0,
    momentumId: null,
  });

  const [scrollOffset, setScrollOffset] = useState(0);
  const lastTimeRef = useRef<number>(0);
  const lastXRef = useRef<number>(0);
  const pointerDownRef = useRef(false);
  const dragActivatedRef = useRef(false);
  const startXRef = useRef(0);
  const startOffsetRef = useRef(0);
  const velocityRef = useRef(0);
  const momentumIdRef = useRef<number | null>(null);
  const scrollOffsetRef = useRef(0);
  const stateRafRef = useRef<number | null>(null);
  const lastMomentumTsRef = useRef<number | null>(null);

  const commitOffset = useCallback((nextOffset: number) => {
    scrollOffsetRef.current = nextOffset;

    if (stateRafRef.current !== null) {
      return;
    }

    stateRafRef.current = requestAnimationFrame(() => {
      stateRafRef.current = null;
      setScrollOffset(scrollOffsetRef.current);
    });
  }, []);

  const stopMomentum = useCallback(() => {
    if (momentumIdRef.current !== null) {
      cancelAnimationFrame(momentumIdRef.current);
      momentumIdRef.current = null;
    }
    lastMomentumTsRef.current = null;
    velocityRef.current = 0;
    setDragState(prev => ({ ...prev, momentumId: null, velocity: 0 }));
  }, []);

  // Start drag
  const startDrag = useCallback((clientX: number) => {
    stopMomentum();

    pointerDownRef.current = true;
    dragActivatedRef.current = false;
    startXRef.current = clientX;
    startOffsetRef.current = scrollOffsetRef.current;
    lastTimeRef.current = performance.now();
    lastXRef.current = clientX;
    setDragState(prev => ({
      ...prev,
      isDragging: false,
      startX: clientX,
      scrollLeft: scrollOffsetRef.current,
      currentX: clientX,
      velocity: 0,
      momentumId: null,
    }));
  }, [stopMomentum]);

  const startMomentum = useCallback((initialVelocity: number) => {
    velocityRef.current = initialVelocity;
    lastMomentumTsRef.current = null;

    const animateMomentum = (timestamp: number) => {
      if (typeof document !== 'undefined' && document.hidden) {
        momentumIdRef.current = requestAnimationFrame(animateMomentum);
        return;
      }

      if (lastMomentumTsRef.current === null) {
        lastMomentumTsRef.current = timestamp;
      }

      const deltaMs = Math.max(1, timestamp - (lastMomentumTsRef.current ?? timestamp));
      lastMomentumTsRef.current = timestamp;

      const friction = Math.pow(MOMENTUM_FRICTION_PER_16MS, deltaMs / 16.67);
      velocityRef.current *= friction;

      const nextOffset = scrollOffsetRef.current + velocityRef.current * deltaMs;
      commitOffset(nextOffset);

      if (Math.abs(velocityRef.current) > MOMENTUM_STOP_THRESHOLD) {
        momentumIdRef.current = requestAnimationFrame(animateMomentum);
      } else {
        stopMomentum();
      }
    };

    momentumIdRef.current = requestAnimationFrame(animateMomentum);
    setDragState(prev => ({ ...prev, momentumId: momentumIdRef.current, velocity: initialVelocity }));
  }, [commitOffset, stopMomentum]);

  // Handle drag move
  const handleDragMove = useCallback((clientX: number) => {
    if (!pointerDownRef.current) {
      return;
    }

    const now = performance.now();
    const timeDelta = now - lastTimeRef.current;

    const totalDeltaX = clientX - startXRef.current;
    const shouldActivate = !dragActivatedRef.current && Math.abs(totalDeltaX) >= DRAG_THRESHOLD_PX;

    if (shouldActivate) {
      dragActivatedRef.current = true;
      setDragState(prev => ({ ...prev, isDragging: true }));
    }

    if (!dragActivatedRef.current) {
      return;
    }

    if (timeDelta > 0) {
      velocityRef.current = (clientX - lastXRef.current) / timeDelta;
    }

    const nextOffset = startOffsetRef.current + totalDeltaX;
    commitOffset(nextOffset);

    setDragState(prev => ({
      ...prev,
      currentX: clientX,
      velocity: velocityRef.current,
    }));

    lastTimeRef.current = now;
    lastXRef.current = clientX;
  }, [commitOffset]);

  // End drag and start momentum
  const endDrag = useCallback(() => {
    const wasDragging = dragActivatedRef.current;
    pointerDownRef.current = false;
    dragActivatedRef.current = false;

    setDragState(prev => ({
      ...prev,
      isDragging: false,
      velocity: velocityRef.current,
    }));

    if (wasDragging && Math.abs(velocityRef.current) > MOMENTUM_STOP_THRESHOLD) {
      startMomentum(velocityRef.current);
      return;
    }

    stopMomentum();
  }, [startMomentum, stopMomentum]);

  // Mouse handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    startDrag(e.clientX);
  }, [startDrag]);

  // Touch handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      startDrag(e.touches[0].clientX);
    }
  }, [startDrag]);

  // Global event listeners
  useEffect(() => {
    if (!pointerDownRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX);
    };

    const handleMouseUp = () => {
      endDrag();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        handleDragMove(e.touches[0].clientX);
      }
    };

    const handleTouchEnd = () => {
      endDrag();
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleDragMove, endDrag, dragState.isDragging]);

  // Cleanup momentum on unmount
  useEffect(() => {
    return () => {
      if (momentumIdRef.current !== null) {
        cancelAnimationFrame(momentumIdRef.current);
      }
      if (stateRafRef.current !== null) {
        cancelAnimationFrame(stateRafRef.current);
      }
    };
  }, []);

  const resetScroll = useCallback(() => {
    stopMomentum();
    commitOffset(0);
    pointerDownRef.current = false;
    dragActivatedRef.current = false;
    setDragState({
      isDragging: false,
      startX: 0,
      scrollLeft: 0,
      currentX: 0,
      velocity: 0,
      momentumId: null,
    });
  }, [stopMomentum, commitOffset]);

  return {
    dragState,
    dragHandlers: {
      onMouseDown,
      onTouchStart,
    },
    scrollOffset,
    isDragging: dragState.isDragging,
    resetScroll,
  };
};
