/**
 * IntelReportsPanel - Left sidebar Intel Reports 3D panel
 * Integrates with the LeftSideBar to provide quick access to Intel Reports 3D functionality
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useIntelReports3D } from '../../../hooks/intelligence/useIntelReports3D';
import { useIntelContextAdapter } from '../../../hooks/intelligence/useIntelContextAdapter';
import { IntelCategory, IntelPriority } from '../../../models/Intel/IntelEnums';
import { GeoIntStatusPill } from './GeoIntStatusPill';
import { GeoIntFilters, RecencyOption } from './GeoIntFilters';
import { useGeoIntIngest } from '../../../hooks/useGeoIntIngest';
import styles from './IntelReportsPanel.module.css';

interface IntelReportsPanelProps {
  /** Whether the panel is collapsed */
  isCollapsed?: boolean;
  /** Callback when a report is selected */
  onReportSelect?: (reportId: string) => void;
  /** Optional hover callback for globe/list sync */
  onReportHover?: (reportId: string | null) => void;
  /** Callback when panel wants to expand/collapse */
  onToggleCollapse?: () => void;
  /** Custom CSS class */
  className?: string;
}

/**
 * IntelReportsPanel - Left sidebar panel for Intel Reports 3D
 * Provides quick access to reports, filters, and actions
 */
export const IntelReportsPanel: React.FC<IntelReportsPanelProps> = ({
  isCollapsed = false,
  onReportSelect,
  onReportHover,
  onToggleCollapse,
  className = ''
}) => {
  const [activeFilter, setActiveFilter] = useState<IntelCategory | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<IntelPriority | 'all'>('all');
  const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [recency, setRecency] = useState<RecencyOption>('any');
  const [relayWhitelist, setRelayWhitelist] = useState<string[]>([]);
  const [sourceTag, setSourceTag] = useState('');
  const [searchText, setSearchText] = useState('');
  const [sortMode, setSortMode] = useState<'recency' | 'severity'>('recency');

  // Hook integrations
  const {
    intelReports,
    filteredReports: serviceFilteredReports,
    loading,
    error,
    metrics,
    refreshIntelReports,
    addIntelReport,
    setFilters
  } = useIntelReports3D();

  const { relays } = useGeoIntIngest({ autoStart: true });

  const relayOptions = useMemo(() => relays.map(r => ({ url: r.url, connected: r.connected })), [relays]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const recencyParam = params.get('geointRecency');
    if (recencyParam) {
      setRecency(recencyParam === 'any' ? 'any' : (Number(recencyParam) as RecencyOption));
    }
    const riskParam = params.get('geointRisk') as 'all' | 'high' | 'medium' | 'low' | null;
    if (riskParam) setRiskFilter(riskParam);
    const relayParam = params.get('geointRelays');
    if (relayParam) setRelayWhitelist(relayParam.split(',').filter(Boolean));
    const sourceParam = params.get('geointSource');
    if (sourceParam) setSourceTag(sourceParam);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('geointRecency', String(recency));
    params.set('geointRisk', riskFilter);
    params.set('geointRelays', relayWhitelist.join(','));
    if (sourceTag) params.set('geointSource', sourceTag); else params.delete('geointSource');
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [recency, riskFilter, relayWhitelist, sourceTag]);

  useEffect(() => {
    const timeRange = recency === 'any'
      ? undefined
      : { start: new Date(Date.now() - recency * 60_000), end: new Date() };
    setFilters({
      timeRange,
      riskLevels: riskFilter === 'all' ? undefined : [riskFilter],
      relayWhitelist: relayWhitelist.length ? relayWhitelist : undefined,
      sourceTag: sourceTag || undefined
    });
  }, [recency, riskFilter, relayWhitelist, sourceTag, setFilters]);

  const {
    context,
    isAdapting
  } = useIntelContextAdapter();

  // Filter reports based on active filters
  const visibleReports = useMemo(() => {
    if (!intelReports) return [];

    const base = serviceFilteredReports && serviceFilteredReports.length ? serviceFilteredReports : intelReports;
    const priorityRank: Record<IntelPriority | 'critical', number> = {
      critical: 5,
      high: 4,
      medium: 3,
      low: 2,
      background: 1
    };

    const filtered = base.filter(report => {
      const category = report.metadata?.category as IntelCategory | undefined;
      const categoryMatch = activeFilter === 'all' || (!!category && category === activeFilter);
      if (!categoryMatch) return false;

      const priorityMatch = priorityFilter === 'all' || report.visualization.priority === priorityFilter;
      if (!priorityMatch) return false;

      if (searchText.trim()) {
        const haystack = `${report.title} ${(report.metadata?.tags || []).join(' ')}`.toLowerCase();
        if (!haystack.includes(searchText.trim().toLowerCase())) return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      if (sortMode === 'severity') {
        const aRank = priorityRank[(a.visualization.priority as IntelPriority) || 'background'] || 0;
        const bRank = priorityRank[(b.visualization.priority as IntelPriority) || 'background'] || 0;
        return bRank - aRank;
      }
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    });
  }, [intelReports, serviceFilteredReports, activeFilter, priorityFilter, searchText, sortMode]);

  // Priority color mapping
  const getPriorityColor = useCallback((priority: IntelPriority): string => {
    switch (priority) {
      case 'critical': return '#ff4444';
      case 'high': return '#ff8800';
      case 'medium': return '#ffaa00';
      case 'low': return '#00aa00';
      case 'background': return '#888888';
      default: return '#888888';
    }
  }, []);

  // Category icon mapping
  const getCategoryIcon = useCallback((category: IntelCategory): string => {
    switch (category) {
      case 'cyber_threat': return '⚠️';
      case 'physical_security': return '🔓';
      case 'financial_crime': return '🚨';
      case 'geopolitical': return '🔍';
      case 'infrastructure': return '👁️';
      case 'personnel': return '📊';
      default: return '📋';
    }
  }, []);

  // Handle report selection
  const handleReportClick = useCallback((reportId: string) => {
    onReportSelect?.(reportId);
  }, [onReportSelect]);

  const handleReportHover = useCallback((reportId: string | null) => {
    onReportHover?.(reportId);
  }, [onReportHover]);

  // Handle quick actions
  const handleQuickAction = useCallback(async (action: string) => {
    try {
      switch (action) {
        case 'refresh':
          await refreshIntelReports();
          break;
        case 'new-threat':
          await addIntelReport({
            id: `threat-${Date.now()}`,
            title: 'New Threat Report',
            source: 'Panel',
            timestamp: new Date(),
            location: { lat: 0, lng: 0 },
            content: { summary: 'Quick threat report created from panel', details: '', attachments: [] },
            visualization: { 
              markerType: 'priority',
              color: '#ff4444', 
              size: 1.0, 
              opacity: 0.8,
              priority: 'high'
            },
            metadata: {
              tags: ['threat'],
              confidence: 0.7,
              reliability: 0.8,
              freshness: 1.0,
              category: 'cyber_threat'
            }
          });
          break;
        case 'new-incident':
          await addIntelReport({
            id: `incident-${Date.now()}`,
            title: 'New Incident Report',
            source: 'Panel',
            timestamp: new Date(),
            location: { lat: 0, lng: 0 },
            content: { summary: 'Quick incident report created from panel', details: '', attachments: [] },
            visualization: { 
              markerType: 'alert',
              color: '#ff0000', 
              size: 1.2, 
              opacity: 0.9,
              priority: 'critical'
            },
            metadata: {
              tags: ['incident'],
              confidence: 0.9,
              reliability: 0.9,  
              freshness: 1.0,
              category: 'physical_security'
            }
          });
          break;
      }
    } catch (error) {
      console.error('Quick action failed:', error);
    }
  }, [refreshIntelReports, addIntelReport]);

  // Loading state
  if (loading) {
    return (
      <div className={`${styles.panel} ${isCollapsed ? styles.collapsed : ''} ${className}`}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          {!isCollapsed && <span>Loading Reports...</span>}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`${styles.panel} ${isCollapsed ? styles.collapsed : ''} ${className}`}>
        <div className={styles.error}>
          <span className={styles.errorIcon}>⚠️</span>
          {!isCollapsed && (
            <div className={styles.errorContent}>
              <span>Error loading reports</span>
              <button onClick={() => handleQuickAction('refresh')} className={styles.retryBtn}>
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.panel} ${isCollapsed ? styles.collapsed : ''} ${className}`}>
      {/* Panel Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <span className={styles.headerIcon}>📊</span>
          {!isCollapsed && (
            <>
              <span className={styles.headerTitle}>Intel Reports 3D</span>
              <button
                onClick={onToggleCollapse}
                className={styles.collapseBtn}
                title="Toggle panel"
              >
                ⫸
              </button>
            </>
          )}
        </div>
        {!isCollapsed && (
          <div className={styles.headerActions}>
            <GeoIntStatusPill />
          </div>
        )}
      </div>

      {/* Context Selector */}
      {!isCollapsed && context && (
        <div className={styles.contextSelector}>
          <div className={styles.contextInfo}>
            Context: {context ? 'Active' : 'Default'}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {!isCollapsed && metrics && (
        <div className={styles.quickStats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total:</span>
            <span className={styles.statValue}>{metrics.totalIntelReports}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Visible:</span>
            <span className={styles.statValue}>{metrics.visibleIntelReports}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Memory:</span>
            <span className={styles.statValue}>{Math.round(metrics.memoryUsage / 1024)}KB</span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {!isCollapsed && (
        <div className={styles.quickActions}>
          <button
            onClick={() => handleQuickAction('refresh')}
            className={styles.actionBtn}
            title="Refresh reports"
          >
            🔄
          </button>
          <button
            onClick={() => handleQuickAction('new-threat')}
            className={styles.actionBtn}
            title="New threat report"
          >
            ⚠️
          </button>
          <button
            onClick={() => handleQuickAction('new-incident')}
            className={styles.actionBtn}
            title="New incident report"
          >
            🚨
          </button>
        </div>
      )}

      {/* GEOINT Filters */}
      {!isCollapsed && (
        <GeoIntFilters
          recency={recency}
          onRecencyChange={setRecency}
          risk={riskFilter}
          onRiskChange={setRiskFilter}
          relays={relayOptions}
          selectedRelays={relayWhitelist}
          onRelaysChange={setRelayWhitelist}
          sourceTag={sourceTag}
          onSourceTagChange={setSourceTag}
        />
      )}

      {/* Filters */}
      {!isCollapsed && (
        <div className={styles.filters}>
          <div className={styles.searchRow}>
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search title or tags"
              className={styles.searchInput}
            />
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as 'recency' | 'severity')}
              className={styles.filterSelect}
            >
              <option value="recency">Sort: Recency</option>
              <option value="severity">Sort: Severity</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Type:</label>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as IntelCategory | 'all')}
              className={styles.filterSelect}
            >
              <option value="all">All</option>
              <option value="cyber_threat">Cyber Threats</option>
              <option value="physical_security">Physical Security</option>
              <option value="financial_crime">Financial Crime</option>
              <option value="geopolitical">Geopolitical</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="personnel">Personnel</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Priority:</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as IntelPriority | 'all')}
              className={styles.filterSelect}
            >
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="background">Background</option>
            </select>
          </div>
        </div>
      )}

      {/* Report List */}
      <div className={styles.reportList}>
        {visibleReports.length === 0 ? (
          <div className={styles.emptyState}>
            {!isCollapsed && <span>No reports found</span>}
          </div>
        ) : (
          visibleReports.slice(0, isCollapsed ? 3 : 10).map(report => {
            const category = (report.metadata?.category as IntelCategory | undefined) ?? 'cyber_threat';

            return (
              <div
                key={report.id}
                className={styles.reportItem}
                onClick={() => handleReportClick(report.id)}
                onMouseEnter={() => handleReportHover(report.id)}
                onMouseLeave={() => handleReportHover(null)}
                title={isCollapsed ? report.title : undefined}
              >
                <div className={styles.reportHeader}>
                  <span className={styles.reportIcon}>{getCategoryIcon(category)}</span>
                  <div
                    className={styles.priorityDot}
                    style={{ backgroundColor: getPriorityColor(report.visualization.priority) }}
                  ></div>
                  {!isCollapsed && (
                    <span className={styles.reportTitle}>{report.title}</span>
                  )}
                </div>
                {!isCollapsed && (
                  <div className={styles.reportMeta}>
                    <span className={styles.reportType}>{category}</span>
                    <span className={styles.reportTime}>
                      {report.timestamp
                        ? (report.timestamp instanceof Date
                            ? report.timestamp
                            : new Date(report.timestamp)).toLocaleTimeString()
                        : 'Unknown'}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Status Footer */}
      <div className={styles.statusFooter}>
        <div className={`${styles.statusDot} ${!isAdapting ? styles.active : styles.inactive}`}></div>
        {!isCollapsed && (
          <span className={styles.statusText}>
            {!isAdapting ? 'Ready' : 'Adapting...'}
          </span>
        )}
      </div>
    </div>
  );
};

export default IntelReportsPanel;
