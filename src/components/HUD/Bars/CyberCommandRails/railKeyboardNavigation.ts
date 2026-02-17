import type React from 'react';

export const handleVerticalRailKeyNavigation = (
  event: React.KeyboardEvent<HTMLButtonElement>,
  index: number,
  total: number,
  focusByIndex: (nextIndex: number) => void
): void => {
  if (total <= 0) {
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    focusByIndex((index + 1) % total);
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    focusByIndex((index - 1 + total) % total);
    return;
  }

  if (event.key === 'Home') {
    event.preventDefault();
    focusByIndex(0);
    return;
  }

  if (event.key === 'End') {
    event.preventDefault();
    focusByIndex(total - 1);
  }
};
