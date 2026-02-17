import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CyberCommandRightSideBar from '../CyberCommandRightSideBar';
import NOAAStatusPopup from '../../../Popups/NOAAStatusPopup';
import NOAADeepControlsPopup from '../../../Popups/NOAADeepControlsPopup';
import InvestigationWorkflowPopup from '../../../Popups/InvestigationWorkflowPopup';

const showPopup = jest.fn();
const modeState = { mode: 'EcoNatural', subMode: 'SpaceWeather' };
const sidebarState = {
  isCollapsed: false,
  sidebarWidth: 120,
  activeSection: 'status',
  setIsCollapsed: jest.fn(),
  setSidebarWidth: jest.fn(),
  setActiveSection: jest.fn((section: string) => {
    sidebarState.activeSection = section;
  })
};

jest.mock('../../../../../context/useCyberCommandRightSideBar', () => ({
  useCyberCommandRightSideBar: () => sidebarState
}));

jest.mock('../../../../../context/VisualizationModeContext', () => ({
  useVisualizationMode: () => ({ visualizationMode: modeState })
}));

jest.mock('../../../../Popup/PopupManager', () => ({
  usePopup: () => ({ showPopup })
}));

jest.mock('../../../../../hooks/useEcoNaturalSettings', () => ({
  __esModule: true,
  default: () => ({ config: { globalSettings: { updateFrequency: 5 }, ecologicalDisasters: { timeRange: 14, disasterTypes: [], severity: [] } } })
}));

jest.mock('../../../../../hooks/useGeoEvents', () => ({
  useGeoEvents: () => ({
    data: [],
    filtered: [],
    stale: false,
    lastUpdated: null,
    error: null,
    status: 'success',
    refetch: jest.fn()
  })
}));

jest.mock('../../../../SpaceWeather/SpaceWeatherSidebarLayout', () => ({
  useSpaceWeatherSidebarLayout: () => ({
    isSpaceWeatherActive: true,
    layerId: 'geomagneticIndex',
    interactive: { layerId: 'geomagneticIndex', layer: { label: 'Geomagnetic Index' } },
    passive: { telemetry: {}, telemetryHistory: [], providerStatus: {}, currentProvider: 'stub', alerts: [], enhancedAlerts: [] }
  })
}));

jest.mock('../../../../SpaceWeather/SpaceWeatherMetricsPanel', () => () => <div data-testid="sw-metrics" />);
jest.mock('../../../../SpaceWeather/SpaceWeatherAlertPanel', () => ({ SpaceWeatherAlertPanel: () => <div data-testid="sw-alerts" /> }));
jest.mock('../../../../SpaceWeather/SpaceWeatherTelemetryHistoryCard', () => ({ SpaceWeatherTelemetryHistoryCard: () => <div data-testid="sw-history" /> }));
jest.mock('../../../../SpaceWeather/SpaceWeatherLayerPassiveCards', () => ({ SpaceWeatherLayerPassiveCard: () => <div data-testid="sw-passive" /> }));
jest.mock('../../../../SpaceWeather/SpaceWeatherStatusCard', () => ({ SpaceWeatherStatusCard: () => <div data-testid="sw-status" /> }));
jest.mock('../../../../EcoNatural/EcoDisastersStatusCard', () => () => <div data-testid="eco-status" />);
jest.mock('../../../../EcoNatural/EcoDisastersLegend', () => ({
  __esModule: true,
  default: () => <div data-testid="eco-legend" />
}));
jest.mock('../../../../../services/spaceWeather/SpaceWeatherExportService', () => ({
  exportSpaceWeatherSnapshot: jest.fn()
}));

describe('CyberCommandRightSideBar (P3 cleanup)', () => {
  beforeEach(() => {
    showPopup.mockClear();
    sidebarState.activeSection = 'status';
    modeState.mode = 'EcoNatural';
    modeState.subMode = 'SpaceWeather';
  });

  it('removes placeholder-only chat/apps/developer tab controls', () => {
    render(<CyberCommandRightSideBar />);

    expect(screen.queryByLabelText('Chat')).toBeNull();
    expect(screen.queryByLabelText('Apps')).toBeNull();
    expect(screen.queryByLabelText('Developer Tools')).toBeNull();

    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Intel')).toBeInTheDocument();
    expect(screen.getByLabelText('Controls')).toBeInTheDocument();
  });

  it('routes status/intel/controls actions to real popup workflows', () => {
    const { rerender } = render(<CyberCommandRightSideBar />);

    fireEvent.click(screen.getByTestId('legacy-right-sidebar-open-status-popup'));

    fireEvent.click(screen.getByLabelText('Intel'));
    rerender(<CyberCommandRightSideBar />);
    fireEvent.click(screen.getByTestId('legacy-right-sidebar-open-investigation-popup'));

    fireEvent.click(screen.getByLabelText('Controls'));
    rerender(<CyberCommandRightSideBar />);
    fireEvent.click(screen.getByTestId('legacy-right-sidebar-controls-open-deep-controls-popup'));

    expect(showPopup).toHaveBeenNthCalledWith(1, expect.objectContaining({ component: NOAAStatusPopup }));
    expect(showPopup).toHaveBeenNthCalledWith(2, expect.objectContaining({ component: InvestigationWorkflowPopup }));
    expect(showPopup).toHaveBeenNthCalledWith(3, expect.objectContaining({ component: NOAADeepControlsPopup }));
  });
});
