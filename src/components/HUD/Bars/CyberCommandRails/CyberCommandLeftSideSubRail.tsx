import React from 'react';
import { useSpaceWeatherSidebarLayout } from '../../../SpaceWeather/SpaceWeatherSidebarLayout';
import { useVisualizationMode } from '../../../../context/VisualizationModeContext';
import { useSpaceWeatherContext } from '../../../../context/SpaceWeatherContext';
import { usePopup } from '../../../Popup/PopupManager';
import SpaceWeatherSubRailSettingsPopup from '../../Popups/SpaceWeatherSubRailSettingsPopup';
import styles from './CyberCommandLeftSideSubRail.module.css';

export const CyberCommandLeftSideSubRail: React.FC = () => {
  const { visualizationMode } = useVisualizationMode();
  const layout = useSpaceWeatherSidebarLayout();
  const { settings, updateSettings } = useSpaceWeatherContext();
  const { showPopup } = usePopup();

  const visible = visualizationMode.mode === 'EcoNatural' && visualizationMode.subMode === 'SpaceWeather' && layout.isSpaceWeatherActive;
  if (!visible) {
    return null;
  }

  const toggle = (key: 'showElectricFields' | 'showMagnetopause' | 'showSolarWind' | 'showAuroralOval') => {
    updateSettings({ [key]: !settings[key] });
  };

  const openSettingsPopup = () => {
    showPopup({
      component: SpaceWeatherSubRailSettingsPopup,
      backdrop: true,
      zIndex: 3200
    });
  };

  return (
    <aside className={styles.rail} data-testid="cyber-left-side-sub-rail" aria-label="CyberCommand left side sub rail">
      <div className={styles.toggleList}>
        <button
          type="button"
          className={`${styles.toggleButton} ${settings.showElectricFields ? styles.toggleButtonActive : ''}`}
          onClick={() => toggle('showElectricFields')}
          aria-pressed={settings.showElectricFields}
          data-testid="cyber-left-subrail-toggle-electric-fields"
          title="Toggle electric field vectors"
        >
          ⚡
        </button>
        <button
          type="button"
          className={`${styles.toggleButton} ${settings.showMagnetopause ? styles.toggleButtonActive : ''}`}
          onClick={() => toggle('showMagnetopause')}
          aria-pressed={settings.showMagnetopause}
          data-testid="cyber-left-subrail-toggle-magnetopause"
          title="Toggle magnetopause shell"
        >
          🛡️
        </button>
        <button
          type="button"
          className={`${styles.toggleButton} ${settings.showSolarWind ? styles.toggleButtonActive : ''}`}
          onClick={() => toggle('showSolarWind')}
          aria-pressed={settings.showSolarWind}
          data-testid="cyber-left-subrail-toggle-bow-shock"
          title="Toggle bow shock shell"
        >
          🌬️
        </button>
        <button
          type="button"
          className={`${styles.toggleButton} ${settings.showAuroralOval ? styles.toggleButtonActive : ''}`}
          onClick={() => toggle('showAuroralOval')}
          aria-pressed={settings.showAuroralOval}
          data-testid="cyber-left-subrail-toggle-aurora"
          title="Toggle aurora boundary"
        >
          🌌
        </button>
      </div>

      <div className={styles.footerActions}>
        <button
          type="button"
          className={styles.settingsButton}
          onClick={openSettingsPopup}
          data-testid="cyber-left-subrail-open-settings"
          aria-label="Open space weather settings"
          title="Open space weather settings"
        >
          ⚙️
        </button>
      </div>
    </aside>
  );
};

export default CyberCommandLeftSideSubRail;
