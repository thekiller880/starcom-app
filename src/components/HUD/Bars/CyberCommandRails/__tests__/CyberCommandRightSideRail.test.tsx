import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CyberCommandRightSideRail from '../CyberCommandRightSideRail';
import InvestigationWorkflowPopup from '../../../Popups/InvestigationWorkflowPopup';
import NOAAStatusPopup from '../../../Popups/NOAAStatusPopup';

const setPrimaryMode = jest.fn();
const showPopup = jest.fn();
const toggleNationalTerritoriesOverlay = jest.fn();
const toggleCursorTrailIndicator = jest.fn();

jest.mock('../../../../../context/VisualizationModeContext', () => ({
  useVisualizationMode: () => ({
    visualizationMode: { mode: 'CyberCommand', subMode: 'IntelReports' },
    setPrimaryMode
  })
}));

jest.mock('../../../../../hooks/useVisualizationOverlay', () => ({
  useVisualizationOverlay: () => ({
    nationalTerritoriesOverlayEnabled: true,
    toggleNationalTerritoriesOverlay,
    cursorTrailIndicatorEnabled: true,
    toggleCursorTrailIndicator
  })
}));

jest.mock('../../../../Popup/PopupManager', () => ({
  usePopup: () => ({ showPopup })
}));

describe('CyberCommandRightSideRail', () => {
  beforeEach(() => {
    setPrimaryMode.mockClear();
    showPopup.mockClear();
    toggleNationalTerritoriesOverlay.mockClear();
    toggleCursorTrailIndicator.mockClear();
  });

  it('renders primary controls with aria labels and selected state', () => {
    render(<CyberCommandRightSideRail />);

    const cyber = screen.getByTestId('cyber-right-rail-mode-CyberCommand');
    const geo = screen.getByTestId('cyber-right-rail-mode-GeoPolitical');
    const eco = screen.getByTestId('cyber-right-rail-mode-EcoNatural');

    expect(cyber).toHaveAttribute('aria-label', 'Cyber Command primary mode');
    expect(geo).toHaveAttribute('aria-label', 'Geo Political primary mode');
    expect(eco).toHaveAttribute('aria-label', 'Eco Natural primary mode');

    expect(cyber).toHaveAttribute('aria-pressed', 'true');
    expect(geo).toHaveAttribute('aria-pressed', 'false');
    expect(eco).toHaveAttribute('aria-pressed', 'false');
  });

  it('writes primary mode only when mode buttons are clicked', () => {
    render(<CyberCommandRightSideRail />);

    fireEvent.click(screen.getByTestId('cyber-right-rail-mode-GeoPolitical'));
    fireEvent.click(screen.getByTestId('cyber-right-rail-mode-EcoNatural'));

    expect(setPrimaryMode).toHaveBeenCalledTimes(2);
    expect(setPrimaryMode).toHaveBeenNthCalledWith(1, 'GeoPolitical');
    expect(setPrimaryMode).toHaveBeenNthCalledWith(2, 'EcoNatural');
  });

  it('supports arrow key navigation across primary mode controls', () => {
    render(<CyberCommandRightSideRail />);

    const cyber = screen.getByTestId('cyber-right-rail-mode-CyberCommand');
    const geo = screen.getByTestId('cyber-right-rail-mode-GeoPolitical');

    cyber.focus();
    fireEvent.keyDown(cyber, { key: 'ArrowDown' });

    expect(document.activeElement).toBe(geo);
  });

  it('routes deep interactions to popup launch points', () => {
    render(<CyberCommandRightSideRail />);

    fireEvent.click(screen.getByTestId('cyber-right-rail-status-popup'));
    fireEvent.click(screen.getByTestId('cyber-right-rail-intel-popup'));

    expect(showPopup).toHaveBeenCalledTimes(2);
    expect(showPopup).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ component: NOAAStatusPopup })
    );
    expect(showPopup).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ component: InvestigationWorkflowPopup })
    );
    expect(setPrimaryMode).not.toHaveBeenCalled();
  });

  it('keeps national territories overlay locked on', () => {
    render(<CyberCommandRightSideRail />);

    const overlayToggle = screen.getByTestId('cyber-right-rail-toggle-national-territories');

    expect(overlayToggle).toBeDisabled();
    fireEvent.click(overlayToggle);

    expect(toggleNationalTerritoriesOverlay).not.toHaveBeenCalled();
    expect(setPrimaryMode).not.toHaveBeenCalled();
    expect(showPopup).not.toHaveBeenCalled();
  });

  it('toggles cursor trail indicator independently', () => {
    render(<CyberCommandRightSideRail />);

    fireEvent.click(screen.getByTestId('cyber-right-rail-toggle-cursor-trail'));

    expect(toggleCursorTrailIndicator).toHaveBeenCalledTimes(1);
    expect(setPrimaryMode).not.toHaveBeenCalled();
    expect(showPopup).not.toHaveBeenCalled();
  });

  it('does not render secondary or tertiary rail controls', () => {
    render(<CyberCommandRightSideRail />);

    expect(screen.queryByTestId('cyber-left-rail-mode-IntelReports')).toBeNull();
    expect(screen.queryByTestId('cyber-left-side-sub-rail')).toBeNull();
    expect(screen.queryByText('Status Content')).toBeNull();
    expect(screen.queryByText('Intel Content')).toBeNull();
  });
});
