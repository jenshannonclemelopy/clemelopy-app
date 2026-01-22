'use client';

/**
 * Stub hook - dark mode has been removed
 * This file exists to prevent import errors from any components that still reference it
 */
export function useThemeToggle() {
  return {
    theme: 'light',
    setTheme: () => {},
    toggleTheme: () => {},
    isDark: false,
  };
}
