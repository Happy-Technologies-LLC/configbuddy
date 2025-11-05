import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeToggleButton, useThemeTransition } from '../ui/theme-toggle-button';

export const ThemeToggle: React.FC = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const { startTransition } = useThemeTransition();

  const toggleTheme = () => {
    startTransition(() => {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    });
  };

  return (
    <ThemeToggleButton
      theme={resolvedTheme}
      onClick={toggleTheme}
      variant="circle-blur"
      start="top-right"
    />
  );
};

export default ThemeToggle;
