import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CyberCommandLeftSideRail from '../CyberCommandLeftSideRail';

const setVisualizationMode = jest.fn();

const modeState = {
  visualizationMode: { mode: 'CyberCommand' as const, subMode: 'IntelReports' as const },
  setVisualizationMode
};

jest.mock('../../../../../context/VisualizationModeContext', () => ({
  useVisualizationMode: () => modeState
}));

describe('CyberCommandLeftSideRail', () => {
  beforeEach(() => {
    setVisualizationMode.mockClear();
    modeState.visualizationMode = { mode: 'CyberCommand', subMode: 'IntelReports' };
  });

  it('renders secondary controls and selected state for active primary mode', () => {
    render(<CyberCommandLeftSideRail />);

    const intelReports = screen.getByTestId('cyber-left-rail-mode-IntelReports');
    const satellites = screen.getByTestId('cyber-left-rail-mode-Satellites');

    expect(intelReports).toHaveAttribute('aria-pressed', 'true');
    expect(satellites).toHaveAttribute('aria-pressed', 'false');
    expect(satellites).toHaveAttribute('aria-label', 'Satellites secondary mode');
  });

  it('writes secondary mode while preserving active primary mode', () => {
    render(<CyberCommandLeftSideRail />);

    fireEvent.click(screen.getByTestId('cyber-left-rail-mode-Satellites'));

    expect(setVisualizationMode).toHaveBeenCalledWith({
      mode: 'CyberCommand',
      subMode: 'Satellites'
    });
  });

  it('supports arrow key navigation across secondary controls', () => {
    render(<CyberCommandLeftSideRail />);

    const first = screen.getByTestId('cyber-left-rail-mode-IntelReports');
    const second = screen.getByTestId('cyber-left-rail-mode-CyberThreats');

    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowDown' });

    expect(document.activeElement).toBe(second);
  });

  it('updates control set on primary mode transitions without stale controls', () => {
    const { rerender } = render(<CyberCommandLeftSideRail />);

    expect(screen.getByTestId('cyber-left-rail-mode-IntelReports')).toBeInTheDocument();

    modeState.visualizationMode = { mode: 'GeoPolitical', subMode: 'DiplomaticEvents' } as any;
    rerender(<CyberCommandLeftSideRail />);

    expect(screen.getByTestId('cyber-left-rail-mode-DiplomaticEvents')).toBeInTheDocument();
    expect(screen.queryByTestId('cyber-left-rail-mode-IntelReports')).toBeNull();
  });
});
