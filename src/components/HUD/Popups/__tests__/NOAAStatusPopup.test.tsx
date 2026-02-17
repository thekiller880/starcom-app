import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import NOAAStatusPopup from '../NOAAStatusPopup';
import NOAADeepControlsPopup from '../NOAADeepControlsPopup';

const showPopup = jest.fn();
const modeState = { mode: 'EcoNatural', subMode: 'SpaceWeather' };

jest.mock('../../../Popup/PopupManager', () => ({
  usePopup: () => ({ showPopup })
}));

jest.mock('../../../../context/VisualizationModeContext', () => ({
  useVisualizationMode: () => ({
    visualizationMode: modeState
  })
}));

describe('NOAAStatusPopup', () => {
  beforeEach(() => {
    showPopup.mockClear();
    modeState.mode = 'EcoNatural';
    modeState.subMode = 'SpaceWeather';
  });

  it('renders mode details and launches deep controls popup', () => {
    render(<NOAAStatusPopup onClose={jest.fn()} />);

    expect(screen.getByText('EcoNatural')).toBeInTheDocument();
    expect(screen.getByText('SpaceWeather')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('noaa-status-open-deep-controls'));

    expect(showPopup).toHaveBeenCalledWith(
      expect.objectContaining({ component: NOAADeepControlsPopup })
    );
  });

  it('hides deep-controls launch outside EcoNatural/SpaceWeather', () => {
    modeState.mode = 'CyberCommand';
    modeState.subMode = 'IntelReports';

    render(<NOAAStatusPopup onClose={jest.fn()} />);

    expect(screen.queryByTestId('noaa-status-open-deep-controls')).toBeNull();
    expect(screen.getByTestId('noaa-status-deep-controls-unavailable')).toBeInTheDocument();
  });
});