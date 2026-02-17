import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import NOAADeepControlsPopup from '../NOAADeepControlsPopup';
import { NOAA_VISUALIZATIONS } from '../../Bars/CyberCommandLeftSideBar/NOAAVisualizationConfig';

jest.mock('../../Bars/CyberCommandLeftSideBar/NOAAGlobeVisualizationManager', () => ({
  globeVisualizationManager: {
    forceSync: jest.fn()
  }
}));

describe('NOAADeepControlsPopup', () => {
  const initialState = NOAA_VISUALIZATIONS.map((dataset) =>
    dataset.options.map((option) => option.enabled)
  );

  afterEach(() => {
    NOAA_VISUALIZATIONS.forEach((dataset, datasetIndex) => {
      dataset.options.forEach((option, optionIndex) => {
        option.enabled = initialState[datasetIndex][optionIndex];
      });
    });
  });

  it('supports none/all preset flow for deep controls parity', () => {
    render(<NOAADeepControlsPopup onClose={jest.fn()} />);

    fireEvent.click(screen.getByText('None'));

    const activeAfterNone = NOAA_VISUALIZATIONS.reduce(
      (count, dataset) => count + dataset.options.filter((option) => option.enabled).length,
      0
    );
    expect(activeAfterNone).toBe(0);

    fireEvent.click(screen.getByText('All'));

    const activeAfterAll = NOAA_VISUALIZATIONS.reduce(
      (count, dataset) => count + dataset.options.filter((option) => option.enabled).length,
      0
    );
    expect(activeAfterAll).toBeGreaterThan(0);
  });
});