import React from 'react';
import { usePopup } from '../../../Popup/PopupManager';
import InvestigationWorkflowPopup from '../../Popups/InvestigationWorkflowPopup';
import NOAAStatusPopup from '../../Popups/NOAAStatusPopup';
import { useVisualizationMode } from '../../../../context/VisualizationModeContext';
import { useVisualizationOverlay } from '../../../../hooks/useVisualizationOverlay';
import { PRIMARY_RAIL_MODES } from './railModeConfig';
import { handleVerticalRailKeyNavigation } from './railKeyboardNavigation';
import styles from './CyberCommandRightSideRail.module.css';

export const CyberCommandRightSideRail: React.FC = () => {
  const { visualizationMode, setPrimaryMode } = useVisualizationMode();
  const {
    nationalTerritoriesOverlayEnabled,
    cursorTrailIndicatorEnabled,
    toggleCursorTrailIndicator
  } = useVisualizationOverlay();
  const { showPopup } = usePopup();
  const modeButtonRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const focusModeButton = (nextIndex: number) => {
    modeButtonRefs.current[nextIndex]?.focus();
  };

  const openInvestigationWorkflowPopup = () => {
    showPopup({
      component: InvestigationWorkflowPopup,
      backdrop: true,
      zIndex: 3100
    });
  };

  const openStatusPopup = () => {
    showPopup({
      component: NOAAStatusPopup,
      backdrop: true,
      zIndex: 3100
    });
  };

  return (
    <aside className={styles.rail} data-testid="cyber-right-side-rail" aria-label="CyberCommand right side rail">
      <div className={styles.modeList}>
        {PRIMARY_RAIL_MODES.map(({ mode, emoji, tooltip }, index) => (
          <button
            key={mode}
            type="button"
            ref={(element) => {
              modeButtonRefs.current[index] = element;
            }}
            className={`${styles.modeButton} ${visualizationMode.mode === mode ? styles.modeButtonActive : ''}`}
            onClick={() => setPrimaryMode(mode)}
            onKeyDown={(event) =>
              handleVerticalRailKeyNavigation(
                event,
                index,
                PRIMARY_RAIL_MODES.length,
                focusModeButton
              )
            }
            aria-label={`${tooltip} primary mode`}
            aria-pressed={visualizationMode.mode === mode}
            data-testid={`cyber-right-rail-mode-${mode}`}
            title={tooltip}
          >
            <span aria-hidden="true">{emoji}</span>
          </button>
        ))}
      </div>

      <div className={styles.quickActions}>
        <button
          type="button"
          className={`${styles.quickActionButton} ${styles.overlayToggleButton} ${nationalTerritoriesOverlayEnabled ? styles.quickActionButtonActive : ''}`}
          aria-label="National territories overlay on (locked)"
          aria-pressed={nationalTerritoriesOverlayEnabled}
          data-testid="cyber-right-rail-toggle-national-territories"
          title="National territories overlay: ON (locked)"
          disabled
        >
          🗺️
        </button>
        <button
          type="button"
          className={`${styles.quickActionButton} ${cursorTrailIndicatorEnabled ? styles.quickActionButtonActive : ''}`}
          onClick={toggleCursorTrailIndicator}
          aria-label={`Cursor trail indicator ${cursorTrailIndicatorEnabled ? 'on' : 'off'}`}
          aria-pressed={cursorTrailIndicatorEnabled}
          data-testid="cyber-right-rail-toggle-cursor-trail"
          title={`Cursor trail indicator: ${cursorTrailIndicatorEnabled ? 'ON' : 'OFF'}`}
        >
          🟢
        </button>
        <button
          type="button"
          className={styles.quickActionButton}
          onClick={openStatusPopup}
          aria-label="Open status popup"
          data-testid="cyber-right-rail-status-popup"
          title="Open status popup"
        >
          📡
        </button>
        <button
          type="button"
          className={styles.quickActionButton}
          onClick={openInvestigationWorkflowPopup}
          aria-label="Open investigation workflow popup"
          data-testid="cyber-right-rail-intel-popup"
          title="Open investigation workflow popup"
        >
          🎯
        </button>
      </div>
    </aside>
  );
};

export default CyberCommandRightSideRail;
