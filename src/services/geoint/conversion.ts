import { IntelReportUI, IntelReportHistoryEntry, IntelReportPriority } from '../../types/intel/IntelReportUI';
import { IntelReportValidationService } from '../IntelReportValidationService';
import { intelReportService } from '../intel/IntelReportService';
import { GeoIntConfig, IntelConversionContext, ParsedFeature, ParsedLine, ParsedPolygon, IntelMappedReport } from './types';
import { intelReportVisualizationService } from '../IntelReportVisualizationService';
import { boundsCheck } from './validator';

const validation = new IntelReportValidationService();

function priorityFromConfidence(conf?: number, config?: GeoIntConfig): IntelReportPriority {
  const c = typeof conf === 'number' ? Math.max(0, Math.min(1, conf)) : (config?.intelDefaults.confidenceDefault ?? 0.5);
  if (c >= 0.8) return config?.intelDefaults.priorityHigh ?? 'IMMEDIATE';
  if (c >= 0.5) return config?.intelDefaults.priorityMed ?? 'PRIORITY';
  return config?.intelDefaults.priorityLow ?? 'ROUTINE';
}

export function mapFeatureToIntel(feature: ParsedFeature, ctx: IntelConversionContext, config: GeoIntConfig): IntelMappedReport | null {
  const coords = feature.kind === 'point'
    ? feature.geometry
    : feature.kind === 'line'
      ? (feature.geometry as ParsedLine).coords[0]
      : (feature.geometry as ParsedPolygon).rings[0]?.[0];
  const lat = (coords as any)?.lat;
  const lon = (coords as any)?.lon;
  if (!boundsCheck(lat, lon).ok) return null;

  const created = new Date(feature.createdAtMs);
  const title = feature.props.description?.slice(0, 120) || `GEOINT Report ${feature.id.slice(0, 8)}`;
  const content = feature.props.description || 'GEOINT event';
  const tags = new Set<string>();
  (feature.props.sourceTags || []).forEach(t => tags.add(t));
  if (feature.props.type) tags.add(feature.props.type);
  tags.add('nostr-geoint');
  tags.add(`geometry:${feature.kind}`);
  const riskTag = priorityFromConfidence(feature.props.confidence, config) === 'IMMEDIATE'
    ? 'risk:high'
    : (feature.props.confidence ?? 0.5) >= 0.5
      ? 'risk:medium'
      : 'risk:low';
  tags.add(riskTag);
  if (ctx.relay) tags.add(`relay:${ctx.relay}`);

  const history: IntelReportHistoryEntry[] = [
    { action: 'IMPORTED', timestamp: new Date().toISOString(), user: 'nostr-geoint' }
  ];

  const report: IntelReportUI = {
    id: `nostr-${feature.id}`,
    title,
    content: content.slice(0, 4000),
    author: ctx.sourceEvent.pubkey,
    category: config.intelDefaults.category,
    tags: Array.from(tags).slice(0, 50),
    classification: 'UNCLASSIFIED',
    latitude: lat,
    longitude: lon,
    createdAt: created,
    updatedAt: created,
    status: config.intelDefaults.status,
    confidence: feature.props.confidence ?? config.intelDefaults.confidenceDefault,
    priority: priorityFromConfidence(feature.props.confidence, config),
    version: 1,
    manualSummary: false,
    history
  };

  const validationResult = validation.validateCreate({
    title: report.title,
    content: report.content,
    tags: report.tags,
    latitude: report.latitude,
    longitude: report.longitude,
    author: report.author,
    timestamp: feature.createdAtMs
  });

  return {
    report,
    validationOk: validationResult.isValid,
    validationErrors: validationResult.errors?.map(e => e.message)
  };
}

export async function importIntelReport(mapped: IntelMappedReport | null): Promise<IntelReportUI | null> {
  if (!mapped || !mapped.validationOk) return null;
  const imported = await intelReportService.importReport(mapped.report, { strategy: 'newId' });
  if (imported) {
    // Push directly to visualization cache so GEOINT appears immediately
    intelReportVisualizationService.addMarker(imported);
  }
  return imported;
}
