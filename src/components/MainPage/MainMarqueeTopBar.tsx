import React, { useEffect, useRef, useState } from 'react';
import { usePrimaryMarqueeData, type PrimaryMarqueeSignal } from './usePrimaryMarqueeData';
import styles from './MainMarqueeTopBar.module.css';

const AnimatedSignalItem: React.FC<{ signal: PrimaryMarqueeSignal }> = ({ signal }) => {
  const [currentValue, setCurrentValue] = useState(signal.value);
  const [previousValue, setPreviousValue] = useState(signal.value);
  const [isAnimating, setIsAnimating] = useState(false);
  const [valueWidthCh, setValueWidthCh] = useState(Math.max(signal.value.length + 2, 9));

  useEffect(() => {
    if (signal.value === currentValue) {
      return;
    }

    setPreviousValue(currentValue);
    setCurrentValue(signal.value);
    setValueWidthCh((prev) => Math.max(prev, signal.value.length + 2));
    setIsAnimating(true);

    const animationTimer = setTimeout(() => {
      setIsAnimating(false);
      setValueWidthCh(Math.max(signal.value.length + 2, 9));
    }, 260);

    return () => clearTimeout(animationTimer);
  }, [signal.value, currentValue]);

  return (
    <span className={styles.marqueeItem}>
      <span className={styles.marqueeLabel}>{signal.label}:</span>{' '}
      <span
        className={`${styles.marqueeValueSlot} ${isAnimating ? styles.animating : ''}`}
        style={{ '--value-width-ch': `${valueWidthCh}ch` } as React.CSSProperties}
      >
        <span className={`${styles.marqueeValueLayer} ${styles.currentValue}`}>{currentValue}</span>
        <span className={`${styles.marqueeValueLayer} ${styles.previousValue}`}>{previousValue}</span>
      </span>
    </span>
  );
};

const MainMarqueeTopBar: React.FC = () => {
  const { title, signals } = usePrimaryMarqueeData();
  const marqueeContentRef = useRef<HTMLDivElement | null>(null);

  const [renderedSignals, setRenderedSignals] = useState<PrimaryMarqueeSignal[]>(signals);
  const pendingSignalsRef = useRef<PrimaryMarqueeSignal[]>(signals);

  useEffect(() => {
    pendingSignalsRef.current = signals;
    if (renderedSignals.length === 0) {
      setRenderedSignals(signals);
      return;
    }

    const sameStructure = signals.length === renderedSignals.length && signals.every((signal, index) => {
      const renderedSignal = renderedSignals[index];
      return renderedSignal && renderedSignal.id === signal.id;
    });

    const hasValueChanges = sameStructure && signals.some((signal, index) => {
      return renderedSignals[index].value !== signal.value;
    });

    if (hasValueChanges) {
      setRenderedSignals(signals);
    }
  }, [signals, renderedSignals]);

  useEffect(() => {
    const node = marqueeContentRef.current;
    if (!node) return;

    const handleIteration = () => {
      const nextSignals = pendingSignalsRef.current;
      const hasChanges = nextSignals.length !== renderedSignals.length || nextSignals.some((nextSignal, index) => {
        const currentSignal = renderedSignals[index];
        return !currentSignal || currentSignal.id !== nextSignal.id || currentSignal.value !== nextSignal.value;
      });

      if (hasChanges) {
        setRenderedSignals(nextSignals);
      }
    };

    node.addEventListener('animationiteration', handleIteration);
    return () => {
      node.removeEventListener('animationiteration', handleIteration);
    };
  }, [renderedSignals]);
  
  return (
    <header className={styles.marqueeTopBar} aria-label="Status Information">
      <div className={styles.titleSection}>
        <h1 className={styles.screenTitle}>{title}</h1>
      </div>
      
      <div className={styles.marqueeSection}>
        <div ref={marqueeContentRef} className={styles.marqueeContent}>
          {/* First instance of content */}
          {renderedSignals.map((signal) => (
            <React.Fragment key={`first-${signal.id}`}>
              <AnimatedSignalItem signal={signal} />
            </React.Fragment>
          ))}
          {/* Duplicate instance for seamless loop */}
          {renderedSignals.map((signal) => (
            <React.Fragment key={`second-${signal.id}`}>
              <AnimatedSignalItem signal={signal} />
            </React.Fragment>
          ))}
        </div>
      </div>
    </header>
  );
};

export default MainMarqueeTopBar;
