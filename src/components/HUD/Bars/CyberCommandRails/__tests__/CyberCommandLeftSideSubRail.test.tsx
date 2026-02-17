import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CyberCommandLeftSideSubRail from '../CyberCommandLeftSideSubRail';

const modeState = {
  visualizationMode: { mode: 'EcoNatural' as const, subMode: 'SpaceWeather' as const }
};

const updateSettings = jest.fn();
const showPopup = jest.fn();

const contextState = {
  settings: {
    showElectricFields: true,
    showMagnetopause: false,
    showSolarWind: false,
    showAuroralOval: false
  },
  updateSettings
};

const layoutState = {
  isSpaceWeatherActive: true,
  layerId: 'geomagneticIndex',
  layer: { label: 'Geomagnetic Index' },
  interactive: { layerId: 'geomagneticIndex', layer: { label: 'Geomagnetic Index' } },
  passive: { telemetry: {}, telemetryHistory: [] }
};

jest.mock('../../../../../context/VisualizationModeContext', () => ({
  useVisualizationMode: () => modeState
}));

jest.mock('../../../../../context/SpaceWeatherContext', () => ({
  useSpaceWeatherContext: () => contextState
}));

jest.mock('../../../../Popup/PopupManager', () => ({
  usePopup: () => ({ showPopup })
}));

jest.mock('../../../Popups/SpaceWeatherSubRailSettingsPopup', () => () => null);

jest.mock('../../../../SpaceWeather/SpaceWeatherSidebarLayout', () => ({
  useSpaceWeatherSidebarLayout: () => layoutState
}));

describe('CyberCommandLeftSideSubRail', () => {
  beforeEach(() => {
    updateSettings.mockClear();
    showPopup.mockClear();
    contextState.settings = {
      showElectricFields: true,
      showMagnetopause: false,
      showSolarWind: false,
      showAuroralOval: false
    };
  });

  it('is visible for EcoNatural -> SpaceWeather context with toggle controls', () => {
    render(<CyberCommandLeftSideSubRail />);

    expect(screen.getByTestId('cyber-left-side-sub-rail')).toBeInTheDocument();
    expect(screen.getByTestId('cyber-left-subrail-toggle-electric-fields')).toBeInTheDocument();
    expect(screen.getByTestId('cyber-left-subrail-toggle-magnetopause')).toBeInTheDocument();
    expect(screen.getByTestId('cyber-left-subrail-toggle-bow-shock')).toBeInTheDocument();
    expect(screen.getByTestId('cyber-left-subrail-toggle-aurora')).toBeInTheDocument();
    expect(screen.getByTestId('cyber-left-subrail-open-settings')).toBeInTheDocument();
  });

  it('is hidden outside tertiary-eligible contexts', () => {
    modeState.visualizationMode = { mode: 'CyberCommand', subMode: 'IntelReports' } as any;

    const { queryByTestId } = render(<CyberCommandLeftSideSubRail />);

    expect(queryByTestId('cyber-left-side-sub-rail')).toBeNull();

    modeState.visualizationMode = { mode: 'EcoNatural', subMode: 'SpaceWeather' };
  });

  it('restores sub-rail on context re-entry', () => {
    const { rerender, queryByTestId } = render(<CyberCommandLeftSideSubRail />);
    expect(queryByTestId('cyber-left-side-sub-rail')).toBeInTheDocument();

    modeState.visualizationMode = { mode: 'EcoNatural', subMode: 'EarthWeather' } as any;
    rerender(<CyberCommandLeftSideSubRail />);
    expect(queryByTestId('cyber-left-side-sub-rail')).toBeNull();

    modeState.visualizationMode = { mode: 'EcoNatural', subMode: 'SpaceWeather' };
    rerender(<CyberCommandLeftSideSubRail />);
    expect(queryByTestId('cyber-left-side-sub-rail')).toBeInTheDocument();
  });

  it('toggles visualization settings directly from sub-rail', () => {
    render(<CyberCommandLeftSideSubRail />);

    fireEvent.click(screen.getByTestId('cyber-left-subrail-toggle-magnetopause'));
    fireEvent.click(screen.getByTestId('cyber-left-subrail-toggle-bow-shock'));
    fireEvent.click(screen.getByTestId('cyber-left-subrail-toggle-aurora'));

    expect(updateSettings).toHaveBeenNthCalledWith(1, { showMagnetopause: true });
    expect(updateSettings).toHaveBeenNthCalledWith(2, { showSolarWind: true });
    expect(updateSettings).toHaveBeenNthCalledWith(3, { showAuroralOval: true });
  });

  it('opens settings popup from bottom settings button', () => {
    render(<CyberCommandLeftSideSubRail />);

    fireEvent.click(screen.getByTestId('cyber-left-subrail-open-settings'));

    expect(showPopup).toHaveBeenCalledTimes(1);
    expect(showPopup).toHaveBeenCalledWith(expect.objectContaining({
      backdrop: true,
      zIndex: 3200
    }));
  });
});
