import React, { useEffect, useState } from 'react';
import { usePopup } from '../../Popup/PopupManager';
import CyberInvestigationStorage from '../../../services/cyberInvestigationStorage';
import styles from './InvestigationWorkflowPopup.module.css';

interface InvestigationWorkflowPopupProps {
  onClose: () => void;
}

interface InvestigationStats {
  investigations: number;
  packages: number;
  teams: number;
}

const INITIAL_STATS: InvestigationStats = {
  investigations: 0,
  packages: 0,
  teams: 0
};

const InvestigationWorkflowPopup: React.FC<InvestigationWorkflowPopupProps> = ({ onClose }) => {
  const { showPopup } = usePopup();
  const [stats, setStats] = useState<InvestigationStats>(INITIAL_STATS);
  const [launchError, setLaunchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      const [investigations, packages, teams] = await Promise.all([
        CyberInvestigationStorage.loadInvestigations(),
        CyberInvestigationStorage.loadPackages(),
        CyberInvestigationStorage.loadTeams()
      ]);

      if (cancelled) {
        return;
      }

      setStats({
        investigations: investigations.filter((investigation) => investigation.status !== 'CLOSED').length,
        packages: packages.length,
        teams: teams.length
      });
    };

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  const openInvestigationBoard = async () => {
    try {
      const module = await import('../../Intel/InvestigationBoard');
      showPopup({
        component: module.default,
        backdrop: true,
        zIndex: 3200
      });
      setLaunchError(null);
    } catch {
      setLaunchError('Unable to open Investigation Board right now.');
    }
  };

  const openIntelPackageManager = async () => {
    try {
      const module = await import('../../Intel/IntelPackageManager');
      showPopup({
        component: module.default,
        backdrop: true,
        zIndex: 3200
      });
      setLaunchError(null);
    } catch {
      setLaunchError('Unable to open Intel Packages right now.');
    }
  };

  const openTeamManager = async () => {
    try {
      const module = await import('../../Intel/CyberTeamManager');
      showPopup({
        component: module.default,
        backdrop: true,
        zIndex: 3200
      });
      setLaunchError(null);
    } catch {
      setLaunchError('Unable to open Team Management right now.');
    }
  };

  return (
    <section className={styles.popup} aria-label="Cyber investigation workflow popup">
      <header className={styles.header}>
        <h2 className={styles.title}>Cyber Investigation Hub</h2>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close investigation workflow popup">
          ✕
        </button>
      </header>

      <div className={styles.stats}>
        <div className={styles.statRow}>
          <span>Active Investigations</span>
          <strong>{stats.investigations}</strong>
        </div>
        <div className={styles.statRow}>
          <span>Intel Packages</span>
          <strong>{stats.packages}</strong>
        </div>
        <div className={styles.statRow}>
          <span>Teams</span>
          <strong>{stats.teams}</strong>
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.actionButton} onClick={openInvestigationBoard}>
          📋 Investigation Board
        </button>
        <button type="button" className={styles.actionButton} onClick={openIntelPackageManager}>
          📦 Intel Packages
        </button>
        <button type="button" className={styles.actionButton} onClick={openTeamManager}>
          👥 Team Management
        </button>
      </div>

      {launchError ? <p className={styles.errorText}>{launchError}</p> : null}
    </section>
  );
};

export default InvestigationWorkflowPopup;