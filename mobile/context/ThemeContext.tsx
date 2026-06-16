import React, { createContext, useContext } from 'react';

const phaseColors = {
  before_applying: '#888780',
  after_acceptance: '#1D9E75',
  visa_process: '#534AB7',
  before_departure: '#BA7517',
  after_arrival: '#639922',
} as const;

const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
const radius = { card: 16, button: 12, pill: 20 } as const;

const typography = {
  screenTitle: { fontSize: 24, fontWeight: '600' as const },
  sectionHeader: { fontSize: 18, fontWeight: '600' as const },
  cardTitle: { fontSize: 15, fontWeight: '500' as const },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 22 },
  hint: { fontSize: 13, fontWeight: '400' as const },
} as const;

const lightPalette = {
  bg: '#FAFAF7',
  surface: '#FFFFFF',
  surfaceAlt: '#F4F2EC',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#9B9B9B',
  border: '#ECECEC',
  primary: '#534AB7',
  primarySoft: '#7F77DD',
  ...phaseColors,
};

const darkPalette = {
  bg: '#121212',
  surface: '#1E1E1E',
  surfaceAlt: '#2A2A2A',
  textPrimary: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textTertiary: '#777777',
  border: '#333333',
  primary: '#7F77DD',
  primarySoft: '#9B95E8',
  ...phaseColors,
};

type Palette = typeof lightPalette;

interface Theme {
  colors: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  isDark: boolean;
}

const defaultTheme: Theme = {
  colors: lightPalette,
  spacing,
  radius,
  typography,
  isDark: false,
};

const ThemeContext = createContext<Theme>(defaultTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const isDark = false; // flip to true when dark mode is active
  const colors = isDark ? darkPalette : lightPalette;
  return (
    <ThemeContext.Provider value={{ colors, spacing, radius, typography, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
