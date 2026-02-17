import { PrimaryIntelSource } from '../../models/Intel/Sources';

export interface AnalysisContext {
  analystId: string;
  reportTitle: string;
  keyQuestions: string[];
  timeframe: { start: number; end: number };
  analysisMethod?: string;
  focusAreas?: string[];
  geographicScope?: {
    type: 'GLOBAL' | 'REGIONAL' | 'NATIONAL' | 'LOCAL' | 'SPECIFIC';
    coordinates?: { latitude: number; longitude: number; radius?: number }[];
  };
  prioritySources?: PrimaryIntelSource[] | string[];
  analysisObjectives?: string[];
  constraints?: string[];
  backgroundContext?: string;
  operationalEnvironment?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  purpose?: string;
}

export type LegacyAnalysisContext = Partial<AnalysisContext> & {
  focus_areas?: string[];
  time_range?: { start: number; end: number };
  priority_sources?: PrimaryIntelSource[] | string[];
  analysis_objectives?: string[];
  background_context?: string;
};

export function normalizeAnalysisContext(context?: LegacyAnalysisContext | null): AnalysisContext {
  const now = Date.now();
  const fallback: AnalysisContext = {
    analystId: 'system',
    reportTitle: 'Automated Analysis',
    keyQuestions: ['What intelligence has been collected?', 'What are the key findings?'],
    timeframe: { start: now - 86400000, end: now },
    focusAreas: ['threat_detection']
  };

  if (!context) return fallback;

  return {
    analystId: context.analystId || 'system',
    reportTitle: context.reportTitle || 'Automated Analysis',
    keyQuestions: context.keyQuestions && context.keyQuestions.length ? context.keyQuestions : fallback.keyQuestions,
    timeframe: context.timeframe || context.time_range || fallback.timeframe,
    analysisMethod: context.analysisMethod,
    focusAreas: context.focusAreas || context.focus_areas,
    geographicScope: context.geographicScope,
    prioritySources: context.prioritySources || context.priority_sources,
    analysisObjectives: context.analysisObjectives || context.analysis_objectives,
    constraints: context.constraints,
    backgroundContext: context.backgroundContext || context.background_context,
    operationalEnvironment: context.operationalEnvironment,
    priority: context.priority,
    purpose: context.purpose
  };
}
