import React, { createContext, useContext, useState, useEffect } from 'react';

export const FONT_SIZE_STEPS = [90, 100, 110, 120, 130] as const;
export type FontSizePercent = typeof FONT_SIZE_STEPS[number];

interface ThemeContextType {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  toggleDarkMode: () => void;
  fontSizePercent: FontSizePercent;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
  setFontSizePercent: (size: FontSizePercent) => void;
  canIncreaseFontSize: boolean;
  canDecreaseFontSize: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('lex_theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  const [fontSizePercent, setFontSizePercent] = useState<FontSizePercent>(() => {
    try {
      const saved = localStorage.getItem('lex_font_size');
      if (saved) {
        const num = parseInt(saved, 10);
        if (FONT_SIZE_STEPS.includes(num as FontSizePercent)) {
          return num as FontSizePercent;
        }
      }
    } catch {
      // fallback
    }
    return 100;
  });

  // Apply dark mode
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('lex_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('lex_theme', 'light');
    }
  }, [isDarkMode]);

  // Apply font size scale
  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = `${fontSizePercent}%`;
    localStorage.setItem('lex_font_size', fontSizePercent.toString());
  }, [fontSizePercent]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const currentIndex = FONT_SIZE_STEPS.indexOf(fontSizePercent);

  const increaseFontSize = () => {
    if (currentIndex < FONT_SIZE_STEPS.length - 1) {
      setFontSizePercent(FONT_SIZE_STEPS[currentIndex + 1]);
    }
  };

  const decreaseFontSize = () => {
    if (currentIndex > 0) {
      setFontSizePercent(FONT_SIZE_STEPS[currentIndex - 1]);
    }
  };

  const resetFontSize = () => {
    setFontSizePercent(100);
  };

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        setIsDarkMode,
        toggleDarkMode,
        fontSizePercent,
        increaseFontSize,
        decreaseFontSize,
        resetFontSize,
        setFontSizePercent,
        canIncreaseFontSize: currentIndex < FONT_SIZE_STEPS.length - 1,
        canDecreaseFontSize: currentIndex > 0
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
