import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PopupProvider, usePopup } from '../PopupManager';

interface TestPopupProps {
  onClose: () => void;
}

const TestPopup: React.FC<TestPopupProps> = ({ onClose }) => {
  return (
    <div>
      <div data-testid="test-popup">Popup Body</div>
      <button type="button" onClick={onClose}>Close</button>
    </div>
  );
};

const Harness: React.FC = () => {
  const { showPopup } = usePopup();

  return (
    <button
      type="button"
      data-testid="open-popup"
      onClick={() => showPopup({ component: TestPopup })}
    >
      Open
    </button>
  );
};

describe('PopupManager lifecycle', () => {
  it('closes topmost popup on Escape and restores focus to launcher', () => {
    render(
      <PopupProvider>
        <Harness />
      </PopupProvider>
    );

    const launchButton = screen.getByTestId('open-popup');
    launchButton.focus();

    fireEvent.click(launchButton);
    expect(screen.getByTestId('test-popup')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByTestId('test-popup')).toBeNull();
    expect(document.activeElement).toBe(launchButton);
  });

  it('supports repeated open/close cycles without stale popup state', () => {
    render(
      <PopupProvider>
        <Harness />
      </PopupProvider>
    );

    const launchButton = screen.getByTestId('open-popup');

    for (let index = 0; index < 5; index += 1) {
      fireEvent.click(launchButton);
      expect(screen.getByTestId('test-popup')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByTestId('test-popup')).toBeNull();
    }
  });
});