import React, { Suspense } from 'react';
// Replaced old monolithic settings panel with new layer system container
import { SpaceWeatherLayerSelector } from '../../../SpaceWeather/SpaceWeatherLayerSelector';
import { SpaceWeatherSettingsContainer } from '../../../SpaceWeather/SpaceWeatherSettingsContainer';
import { SpaceWeatherControlSurface } from '../../../SpaceWeather/SpaceWeatherControlSurface';
import { useSpaceWeatherSidebarLayout } from '../../../SpaceWeather/SpaceWeatherSidebarLayout';
import { VisualizationModeInterface } from '../../Common/VisualizationModeInterface';
import styles from './CyberCommandLeftSideBar.module.css';

const SettingsPanel: React.FC = () => {
  const layout = useSpaceWeatherSidebarLayout();
  const interactive = layout.interactive;
  const passive = layout.passive;
  const ready = Boolean(interactive && passive);

  return (
    <div className={styles.settingsPanel}>
      {ready && interactive && passive ? (
        <>
          <SpaceWeatherControlSurface interactive={interactive} passive={passive} />
          <SpaceWeatherSettingsContainer
            layerId={interactive.layerId}
            layerLabel={interactive.layer?.label ?? 'Layer'}
          />
        </>
      ) : (
        <div className={styles.settingsPlaceholder}>Settings</div>
      )}
    </div>
  );
};

const CyberCommandLeftSideBar: React.FC = () => {
  const layout = useSpaceWeatherSidebarLayout();
  const showSpaceWeather = layout.isSpaceWeatherActive;
  return (
    <div className={styles.cyberCommandLeftDock}>
      <div className={styles.cyberCommandLeftSideBar}>
        <div className={styles.content}>
          {/* Visualization Mode Controls - NEW: Primary + Secondary mode buttons */}
          <div className={styles.visualizationControls}>
            <Suspense fallback={<div className={styles.visualizationPlaceholder}>⚡</div>}>
              <VisualizationModeInterface compact={true} />
            </Suspense>
          </div>
          
          {/* Settings Panel - Clean placeholder */}
          <div className={styles.settingsSection}>
            <SettingsPanel />
          </div>
        </div>
      </div>
      {showSpaceWeather && (
        <div className={styles.spaceWeatherRailDock}>
          <div className={styles.spaceWeatherRailPanel}>
            <SpaceWeatherLayerSelector />
          </div>
        </div>
      )}
    </div>
  );
};

export default CyberCommandLeftSideBar;