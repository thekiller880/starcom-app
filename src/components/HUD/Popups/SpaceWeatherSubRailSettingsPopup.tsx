import React from 'react';
import { SpaceWeatherControlSurface } from '../../SpaceWeather/SpaceWeatherControlSurface';
import { SpaceWeatherLayerSelector } from '../../SpaceWeather/SpaceWeatherLayerSelector';
import { SpaceWeatherSettingsContainer } from '../../SpaceWeather/SpaceWeatherSettingsContainer';
import { useSpaceWeatherSidebarLayout } from '../../SpaceWeather/SpaceWeatherSidebarLayout';
import styles from './SpaceWeatherSubRailSettingsPopup.module.css';

interface SpaceWeatherSubRailSettingsPopupProps {
  onClose: () => void;
}

const SpaceWeatherSubRailSettingsPopup: React.FC<SpaceWeatherSubRailSettingsPopupProps> = ({ onClose }) => {
  const layout = useSpaceWeatherSidebarLayout();

  const interactive = layout.interactive;
  const passive = layout.passive;

  return (
    <section className={styles.popup} aria-label="Space weather settings popup">
      <header className={styles.header}>
        <h2 className={styles.title}>Space Weather Settings</h2>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close space weather settings popup"
        >
          ✕
        </button>
      </header>

      <div className={styles.body}>
        <div className={styles.selectorWrap}>
          <SpaceWeatherLayerSelector />
        </div>

        {interactive && passive ? (
          <div className={styles.panelWrap}>
            <SpaceWeatherControlSurface interactive={interactive} passive={passive} />
            <SpaceWeatherSettingsContainer
              layerId={interactive.layerId}
              layerLabel={interactive.layer?.label ?? 'Layer'}
            />
          </div>
        ) : (
          <div className={styles.placeholder}>SpaceWeather controls unavailable in current context.</div>
        )}
      </div>
    </section>
  );
};

export default SpaceWeatherSubRailSettingsPopup;
