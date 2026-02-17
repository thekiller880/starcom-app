import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { SpaceWeatherLayerSelector } from '../SpaceWeatherLayerSelector';

const updateSettings = jest.fn();

const contextState = {
  settings: {
    activeLayer: 'electricFields',
    showElectricFields: true,
    showGeomagneticIndex: false,
    showSolarWind: false,
    showMagnetopause: false,
    showAuroralOval: false,
    showRadiation: false,
    showMagneticField: false
  },
  updateSettings
};

const modeState = {
  visualizationMode: { mode: 'EcoNatural', subMode: 'SpaceWeather' }
};

jest.mock('../../../context/VisualizationModeContext', () => ({
  useVisualizationMode: () => modeState
}));

jest.mock('../../../context/SpaceWeatherContext', () => ({
  useSpaceWeatherContext: () => contextState
}));

describe('SpaceWeatherLayerSelector', () => {
  beforeEach(() => {
    updateSettings.mockClear();
    contextState.settings.activeLayer = 'electricFields';
  });

  it('auto-enables magnetopause when selecting magnetosphere layer', () => {
    render(<SpaceWeatherLayerSelector />);

    fireEvent.click(screen.getByTitle(/Magnetosphere/i));

    expect(updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        activeLayer: 'magnetosphere',
        showMagnetopause: true
      })
    );
  });

  it('auto-enables bow shock control when selecting solar wind layer', () => {
    render(<SpaceWeatherLayerSelector />);

    fireEvent.click(screen.getByTitle(/Solar Wind/i));

    expect(updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        activeLayer: 'solarWind',
        showSolarWind: true
      })
    );
  });

  it('auto-enables aurora boundary when selecting aurora layer', () => {
    render(<SpaceWeatherLayerSelector />);

    fireEvent.click(screen.getByTitle(/Aurora/i));

    expect(updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        activeLayer: 'aurora',
        showAuroralOval: true
      })
    );
  });

  it('does not update when selecting planned layers', () => {
    render(<SpaceWeatherLayerSelector />);

    fireEvent.click(screen.getByTitle(/Ionosphere/i));

    expect(updateSettings).not.toHaveBeenCalled();
  });
});
