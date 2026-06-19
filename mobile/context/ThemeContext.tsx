import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Journey-phase accent colours. A categorical scale (one hue per phase) that is
// mode-independent — each is shown as a small stripe/dot/badge with white text,
// which stays legible on both light and dark surfaces.
const phaseColors = {
  before_applying: '#888780',
  after_acceptance: '#1D9E75',
  // Steel blue. (Previously #534AB7 — the old indigo brand colour; recoloured so
  // no indigo remains now that the brand is crimson.)
  visa_process: '#3A72C0',
  before_departure: '#BA7517',
  after_arrival: '#639922',
} as const;

const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
const radius = { card: 16, button: 12, pill: 20 } as const;

// Mode-aware elevation presets. In LIGHT mode cards lift with a soft black
// shadow; in DARK mode shadows are nearly invisible against near-black, so we
// drop them and instead let the lighter surface + border do the separating.
// Spread one of these onto a card style: `...elevation.card`.
type ElevationStyle = {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  elevation: number;
};
type ElevationSet = { card: ElevationStyle; raised: ElevationStyle; hero: ElevationStyle };

const lightElevation: ElevationSet = {
  card: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  raised: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  hero: { shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
};

const darkElevation: ElevationSet = {
  card: { shadowColor: '#000', shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
  raised: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  hero: { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
};

const typography = {
  screenTitle: { fontSize: 24, fontWeight: '600' as const },
  sectionHeader: { fontSize: 18, fontWeight: '600' as const },
  cardTitle: { fontSize: 15, fontWeight: '500' as const },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 22 },
  hint: { fontSize: 13, fontWeight: '400' as const },
} as const;

// ── Brand palette ──────────────────────────────────────────────────────────
// The accent is crimson red. To re-tune the red later, edit `primary` (and its
// shades) in `lightPalette` / `darkPalette` below — those are the only places
// the brand colour is defined.
//
//   primary        main crimson (buttons, links, active states, hero/avatars)
//   primarySoft    lighter crimson (secondary tiles, splash dots)
//   primaryPressed darker crimson (pressed / active-press states)
//   primarySubtle  faint crimson-tinted fill (chips/badges backgrounds)
//   danger         destructive red (sign-out, error text)
//
// `factBg`/`factBorder`/`factLabel` style the warm "Did you know?" cards so they
// adapt to dark mode instead of being a fixed cream.

const lightPalette = {
  bg: '#F7F7F9',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F0F2',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#9B9B9B',
  border: '#E6E6E9',
  primary: '#D12E3A',
  primarySoft: '#E15B64',
  primaryPressed: '#B0252F',
  primarySubtle: '#FBE7E9',
  danger: '#E53E3E',
  factBg: '#FFF8E8',
  factBorder: '#F5D485',
  factLabel: '#B07C00',
  ...phaseColors,
};

const darkPalette: typeof lightPalette = {
  bg: '#121212',
  surface: '#1E1E1E',
  surfaceAlt: '#2A2A2A',
  textPrimary: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textTertiary: '#777777',
  border: '#333333',
  // Brighter on dark so the crimson stays legible against near-black surfaces.
  primary: '#F0555F',
  primarySoft: '#F47C84',
  primaryPressed: '#D12E3A',
  primarySubtle: '#3A2326',
  danger: '#FF6B6B',
  factBg: '#2E2716',
  factBorder: '#4A3F1E',
  factLabel: '#E0B64D',
  ...phaseColors,
};

type Palette = typeof lightPalette;

interface Theme {
  colors: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  /** Mode-aware shadow presets — spread onto a card style, e.g. `...elevation.card`. */
  elevation: ElevationSet;
  isDark: boolean;
  /** Toggle between light and dark for the whole app, live. */
  toggleTheme: () => void;
  /** Set dark mode explicitly. */
  setDark: (value: boolean) => void;
}

const defaultTheme: Theme = {
  colors: lightPalette,
  spacing,
  radius,
  typography,
  elevation: lightElevation,
  isDark: false,
  toggleTheme: () => {},
  setDark: () => {},
};

const ThemeContext = createContext<Theme>(defaultTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Seed from the device's colour scheme, then let the user override it live
  // via the in-app toggle (Profile → Dark mode). Override is kept in memory.
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState<boolean | null>(null);
  const isDark = override ?? systemScheme === 'dark';

  const toggleTheme = useCallback(() => setOverride((prev) => !(prev ?? systemScheme === 'dark')), [systemScheme]);
  const setDark = useCallback((value: boolean) => setOverride(value), []);

  const colors = isDark ? darkPalette : lightPalette;
  const elevation = isDark ? darkElevation : lightElevation;

  const value = useMemo<Theme>(
    () => ({ colors, spacing, radius, typography, elevation, isDark, toggleTheme, setDark }),
    [colors, elevation, isDark, toggleTheme, setDark],
  );

  return (
    <ThemeContext.Provider value={value}>
      {/* Keep the OS status-bar icons legible against the active background. */}
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
