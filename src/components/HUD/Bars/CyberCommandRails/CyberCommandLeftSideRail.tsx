import React from 'react';
import type { VisualizationMode } from '../../../../context/VisualizationModeContext';
import { useVisualizationMode } from '../../../../context/VisualizationModeContext';
import { SECONDARY_RAIL_MODES } from './railModeConfig';
import { handleVerticalRailKeyNavigation } from './railKeyboardNavigation';
import styles from './CyberCommandLeftSideRail.module.css';

type CyberCommandSubMode = Extract<VisualizationMode, { mode: 'CyberCommand' }>['subMode'];
type GeoPoliticalSubMode = Extract<VisualizationMode, { mode: 'GeoPolitical' }>['subMode'];
type EcoNaturalSubMode = Extract<VisualizationMode, { mode: 'EcoNatural' }>['subMode'];

const setSecondaryModeForPrimary = (
  mode: VisualizationMode['mode'],
  subMode: string,
  setVisualizationMode: (nextMode: VisualizationMode) => void
) => {
  if (mode === 'CyberCommand') {
    setVisualizationMode({ mode, subMode: subMode as CyberCommandSubMode });
    return;
  }

  if (mode === 'GeoPolitical') {
    setVisualizationMode({ mode, subMode: subMode as GeoPoliticalSubMode });
    return;
  }

  setVisualizationMode({ mode: 'EcoNatural', subMode: subMode as EcoNaturalSubMode });
};

export const CyberCommandLeftSideRail: React.FC = () => {
  const { visualizationMode, setVisualizationMode } = useVisualizationMode();
  const options = SECONDARY_RAIL_MODES[visualizationMode.mode];
  const modeButtonRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const focusModeButton = (nextIndex: number) => {
    modeButtonRefs.current[nextIndex]?.focus();
  };

  return (
    <aside className={styles.rail} data-testid="cyber-left-side-rail" aria-label="CyberCommand left side rail">
      <div className={styles.modeList}>
        {options.map(({ subMode, emoji, tooltip }, index) => (
          <button
            key={subMode}
            type="button"
            ref={(element) => {
              modeButtonRefs.current[index] = element;
            }}
            className={`${styles.modeButton} ${visualizationMode.subMode === subMode ? styles.modeButtonActive : ''}`}
            onClick={() => setSecondaryModeForPrimary(visualizationMode.mode, subMode, setVisualizationMode)}
            onKeyDown={(event) => handleVerticalRailKeyNavigation(event, index, options.length, focusModeButton)}
            aria-label={`${tooltip} secondary mode`}
            aria-pressed={visualizationMode.subMode === subMode}
            data-testid={`cyber-left-rail-mode-${subMode}`}
            title={tooltip}
          >
            <span aria-hidden="true">{emoji}</span>
          </button>
        ))}
      </div>
    </aside>
  );
};

export default CyberCommandLeftSideRail;
