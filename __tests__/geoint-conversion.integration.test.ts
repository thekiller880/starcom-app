import type { IntelReportUI } from '../src/types/intel/IntelReportUI';
import { importIntelReport } from '../src/services/geoint/conversion';

jest.mock('../src/services/intel/IntelReportService', () => {
  return {
    __esModule: true,
    intelReportService: {
      importReport: jest.fn()
    }
  };
});

jest.mock('../src/services/IntelReportVisualizationService', () => {
  return {
    __esModule: true,
    intelReportVisualizationService: {
      addMarker: jest.fn()
    }
  };
});

const { intelReportService } = jest.requireMock('../src/services/intel/IntelReportService') as any;
const { intelReportVisualizationService } = jest.requireMock('../src/services/IntelReportVisualizationService') as any;

function report(overrides: Partial<IntelReportUI> = {}): IntelReportUI {
  return {
    id: overrides.id || 'r1',
    title: overrides.title || 'GEOINT report',
    content: overrides.content || 'c',
    author: overrides.author || 'a',
    category: overrides.category || 'GEOINT',
    tags: overrides.tags || ['nostr-geoint'],
    status: overrides.status || 'SUBMITTED',
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    latitude: overrides.latitude ?? 1,
    longitude: overrides.longitude ?? 2,
    confidence: overrides.confidence ?? 0.7,
    priority: overrides.priority || 'PRIORITY',
    version: overrides.version || 1,
    manualSummary: overrides.manualSummary ?? false,
    history: overrides.history || []
  };
}

describe('importIntelReport → visualization path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('imports and pushes to visualization cache when valid', async () => {
    const mapped = { report: report({ id: 'ok' }), validationOk: true };
    intelReportService.importReport.mockResolvedValue(mapped.report);

    const result = await importIntelReport(mapped);

    expect(intelReportService.importReport).toHaveBeenCalledWith(mapped.report, { strategy: 'newId' });
    expect(intelReportVisualizationService.addMarker).toHaveBeenCalledWith(mapped.report);
    expect(result?.id).toBe('ok');
  });

  it('skips import when validation fails', async () => {
    const mapped = { report: report({ id: 'bad' }), validationOk: false };

    const result = await importIntelReport(mapped as any);

    expect(result).toBeNull();
    expect(intelReportService.importReport).not.toHaveBeenCalled();
    expect(intelReportVisualizationService.addMarker).not.toHaveBeenCalled();
  });
});
