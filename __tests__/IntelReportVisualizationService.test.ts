import { IntelReportVisualizationService } from '../src/services/IntelReportVisualizationService';
import type { IntelReportUI } from '../src/types/intel/IntelReportUI';

jest.mock('../src/services/intel/IntelReportService', () => {
  const listReports = jest.fn<Promise<IntelReportUI[]>, []>().mockResolvedValue([]);
  const onChange = jest.fn().mockReturnValue(() => {});
  return {
    __esModule: true,
    intelReportService: { listReports, onChange },
    __mockFns: { listReports, onChange }
  };
});

const { __mockFns } = jest.requireMock('../src/services/intel/IntelReportService') as any;
const listReports = __mockFns.listReports as jest.MockedFunction<() => Promise<IntelReportUI[]>>;
const onChange = __mockFns.onChange as jest.MockedFunction<() => () => void>;

describe('IntelReportVisualizationService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    listReports.mockReset();
    onChange.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function report(overrides: Partial<IntelReportUI> = {}): IntelReportUI {
    return {
      id: overrides.id || 'r1',
      title: overrides.title || 'Test',
      content: overrides.content || 'c',
      author: overrides.author || 'a',
      category: overrides.category || 'GEOINT',
      tags: overrides.tags || ['nostr-geoint'],
      status: overrides.status || 'SUBMITTED',
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
      latitude: overrides.latitude !== undefined ? overrides.latitude : 10,
      longitude: overrides.longitude !== undefined ? overrides.longitude : 20,
      version: overrides.version || 1,
      manualSummary: false,
      history: []
    };
  }

  it('builds markers and skips invalid coordinates', async () => {
    listReports.mockResolvedValue([
      report({ id: 'ok1', latitude: 10, longitude: 20, category: 'GEOINT', tags: ['x'] }),
      report({ id: 'bad', latitude: null }),
      report({ id: 'ok2', latitude: '5', longitude: '-10', category: 'SIGINT', tags: [] })
    ]);

    const svc = new IntelReportVisualizationService();
    const markers = await svc.getIntelReportMarkers();

    expect(markers.map(m => m.pubkey)).toEqual(['ok1', 'ok2']);
    expect(markers[0].tags).toEqual(expect.arrayContaining(['GEOINT']));
  });

  it('notifies subscribers when adding marker', () => {
    listReports.mockResolvedValue([]);
    const svc = new IntelReportVisualizationService();
    const listener = jest.fn();
    const unsubscribe = svc.subscribe(listener);

    svc.addMarker(report({ id: 'live', latitude: 1, longitude: 2, category: 'GEOINT' }));

    expect(listener).toHaveBeenCalledTimes(1);
    const payload = listener.mock.calls[0][0];
    expect(payload[0].pubkey).toBe('live');
    expect(payload[0].tags).toEqual(expect.arrayContaining(['GEOINT']));

    unsubscribe();
  });
});
