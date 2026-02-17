import type { IntelReport3DData } from '../../models/Intel/IntelVisualization3D';
import type { IntelCategory, IntelPriority, IntelThreatLevel } from '../../models/Intel/IntelEnums';
import type { IntelReportFilters } from './IntelReports3DService';

/**
 * Apply Intel report filters (shared by hooks/tests) to a list of reports.
 */
export function applyIntelFilters(reports: IntelReport3DData[], filters: IntelReportFilters): IntelReport3DData[] {
  if (!reports.length) return reports;

  let filtered = [...reports];

  const deriveRisk = (report: IntelReport3DData): 'high' | 'medium' | 'low' => {
    const tags = report.metadata?.tags ?? [];
    const tagRisk = tags.find(tag => tag.startsWith('risk:'))?.slice(5).toLowerCase();
    if (tagRisk === 'high' || tagRisk === 'medium' || tagRisk === 'low') return tagRisk;
    const priority = (report.visualization as any)?.priority as IntelPriority | 'critical' | undefined;
    if (priority === 'critical') return 'high';
    if (priority === 'high' || priority === 'medium') return 'medium';
    return 'low';
  };

  if (filters.tags?.length) {
    filtered = filtered.filter(report => {
      const tags = report.metadata?.tags ?? [];
      return filters.tags!.some(tag => tags.includes(tag));
    });
  }

  if (filters.category?.length) {
    filtered = filtered.filter(report => {
      const categoryValue = report.metadata?.category as IntelCategory | undefined;
      return !!categoryValue && filters.category!.includes(categoryValue);
    });
  }

  if (filters.threatLevel?.length) {
    filtered = filtered.filter(report => {
      const threatLevel = report.metadata?.threat_level as IntelThreatLevel | undefined;
      return !!threatLevel && filters.threatLevel!.includes(threatLevel);
    });
  }

  if (filters.timeRange) {
    const { start, end } = filters.timeRange;
    filtered = filtered.filter(report => {
      if (!report.timestamp) return false;
      const timestamp = report.timestamp instanceof Date ? report.timestamp : new Date(report.timestamp);
      return timestamp >= start && timestamp <= end;
    });
  }

  if (filters.riskLevels?.length) {
    filtered = filtered.filter(report => filters.riskLevels!.includes(deriveRisk(report)));
  }

  if (filters.relayWhitelist?.length) {
    filtered = filtered.filter(report => {
      const tags = report.metadata?.tags ?? [];
      return filters.relayWhitelist!.some(relay => tags.includes(`relay:${relay}`));
    });
  }

  if (filters.sourceTag?.trim()) {
    const needle = filters.sourceTag.trim().toLowerCase();
    filtered = filtered.filter(report => {
      const tags = report.metadata?.tags ?? [];
      return tags.some(tag => tag.toLowerCase().includes(needle));
    });
  }

  if (filters.geographic) {
    const bounds = filters.geographic.bounds;
    filtered = filtered.filter(report => {
      if (!report.location) return false;
      const { lat, lng } = report.location;
      return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east;
    });
  }

  if (filters.confidence) {
    filtered = filtered.filter(report => {
      const confidence = report.metadata?.confidence ?? 0;
      return confidence >= filters.confidence!.min && confidence <= filters.confidence!.max;
    });
  }

  if (filters.reliability) {
    filtered = filtered.filter(report => {
      const reliability = report.metadata?.reliability ?? 0;
      return reliability >= filters.reliability!.min && reliability <= filters.reliability!.max;
    });
  }

  if (filters.freshness) {
    filtered = filtered.filter(report => {
      const freshness = report.metadata?.freshness ?? 0;
      return freshness >= filters.freshness!.min && freshness <= filters.freshness!.max;
    });
  }

  if (filters.searchText) {
    const searchLower = filters.searchText.toLowerCase();
    filtered = filtered.filter(report => {
      const tags = report.metadata?.tags ?? [];
      const titleMatch = report.title?.toLowerCase().includes(searchLower);
      const summaryMatch = report.content?.summary?.toLowerCase().includes(searchLower);
      const detailsMatch = report.content?.details?.toLowerCase().includes(searchLower);
      const keywordMatch = (report.content?.keywords ?? []).some(keyword => keyword.toLowerCase().includes(searchLower));
      return titleMatch || summaryMatch || detailsMatch || keywordMatch || tags.some(tag => tag.toLowerCase().includes(searchLower));
    });
  }

  if (filters.authorFilter?.length) {
    filtered = filtered.filter(report => {
      const content = (report as Partial<{ content?: { author?: string; source?: string } }>).content;
      const author = content?.author ?? (report as any).author;
      return !!author && filters.authorFilter!.includes(author);
    });
  }

  if (filters.sourceFilter?.length) {
    filtered = filtered.filter(report => {
      const content = (report as Partial<{ content?: { author?: string; source?: string } }>).content;
      const source = content?.source ?? (report as any).source;
      return !!source && filters.sourceFilter!.includes(source);
    });
  }

  return filtered;
}
