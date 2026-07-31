import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'theme_override';

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
// Design-system corner radii (8 / 12 / 16 / 20 / 26). `card`/`button`/`pill`
// keep their original names so existing screens compile unchanged; `lg`/`xl`
// are the larger radii the richer ported cards use.
const radius = { card: 16, button: 12, pill: 20, lg: 20, xl: 26 } as const;

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
  bg: '#FBF9F7',
  surface: '#FFFFFF',
  surfaceAlt: '#F4EEF0',
  textPrimary: '#1B1416',
  textSecondary: '#6E646A',
  // Darkened from #9A8E94 (3.0:1 — failed WCAG AA for the small hint text
  // this token labels). #7A7076 reads the same visual hierarchy at 4.8:1.
  textTertiary: '#7A7076',
  border: '#F0EAEC',
  primary: '#A4133C',
  primarySoft: '#C4456A',
  primaryPressed: '#8E1133',
  primarySubtle: '#FBEAEE',
  danger: '#C23A2A',
  success: '#1E8A5A',
  warning: '#B87514',
  factBg: '#FBF0DC',
  factBorder: '#E0B564',
  factLabel: '#B87514',
  ...phaseColors,
};

const darkPalette: typeof lightPalette = {
  bg: '#121013',
  surface: '#1C181B',
  surfaceAlt: '#2A262A',
  textPrimary: '#F4F0F2',
  textSecondary: '#9A9095',
  textTertiary: '#8C8288',
  border: 'rgba(255,255,255,0.07)',
  // Brighter on dark so the crimson stays legible against near-black surfaces.
  primary: '#FF5A78',
  primarySoft: '#F47C84',
  primaryPressed: '#E0506B',
  primarySubtle: 'rgba(164,19,60,0.22)',
  danger: '#FF6B52',
  success: '#46C88A',
  warning: '#E0A33A',
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
  // via the in-app toggle (Profile → Dark mode). Override persists across restarts.
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState<boolean | null>(null);
  const isDark = override ?? systemScheme === 'dark';

  // Load persisted theme preference on mount.
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((val) => {
      if (val === 'dark') setOverride(true);
      else if (val === 'light') setOverride(false);
    }).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setOverride((prev) => {
      const next = !(prev ?? systemScheme === 'dark');
      AsyncStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  }, [systemScheme]);

  const setDark = useCallback((value: boolean) => {
    setOverride(value);
    AsyncStorage.setItem(THEME_STORAGE_KEY, value ? 'dark' : 'light').catch(() => {});
  }, []);

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
