import React from 'react';
import CompactNOAAControls from '../Bars/CyberCommandLeftSideBar/CompactNOAAControls';
import styles from './NOAADeepControlsPopup.module.css';

interface NOAADeepControlsPopupProps {
  onClose: () => void;
}

const NOAADeepControlsPopup: React.FC<NOAADeepControlsPopupProps> = ({ onClose }) => {
  return (
    <section className={styles.popup} aria-label="NOAA deep controls popup">
      <header className={styles.header}>
        <h2 className={styles.title}>NOAA Deep Controls</h2>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close NOAA deep controls popup"
        >
          ✕
        </button>
      </header>

      <div className={styles.body}>
        <CompactNOAAControls />
      </div>
    </section>
  );
};

export default NOAADeepControlsPopup;