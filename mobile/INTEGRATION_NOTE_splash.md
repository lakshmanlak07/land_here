# Wiring in the LandHere splash screen

`components/SplashScreen.tsx` is fully standalone and **not yet wired in**.
Nothing in the app renders it yet. This note is the exact one-step change to
add tomorrow.

## Where it goes

The single integration point is **`app/_layout.tsx`** (the root layout). That
file already wraps everything in `ThemeProvider`, which `SplashScreen` needs
for its colors — so the splash must render *inside* the providers.

The idea: keep showing the splash until `useAuthStore.hydrate()` has finished
(plus the splash's own minimum on-screen time), then swap to the normal
`<Stack>`.

## The change

Currently `app/_layout.tsx` renders the `<Stack>` unconditionally. To wire the
splash in, add a small piece of local state that flips when the splash reports
it's done, and render the splash over (or instead of) the Stack until then.

Drop-in version of the file:

```tsx
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../lib/store';
import { ThemeProvider } from '../context/ThemeContext';
import { SplashScreen } from '../components/SplashScreen';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 60_000 } },
});

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const [ready, setReady] = useState(false); // <-- new

  useEffect(() => {
    hydrate();
  }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false }} />
          {!ready && (
            <SplashScreen
              onFinish={() => setReady(true)}
              // optional: minDurationMs={2200}
            />
          )}
        </SafeAreaProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```

### Why render it *on top of* the Stack (not instead of it)

Rendering `<Stack>` always, with the splash absolutely-positioned over it while
`!ready`, lets expo-router mount/route underneath so the first real screen is
ready the instant the splash dismisses — no second flash. To do that, give the
splash an absolute-fill wrapper, e.g. wrap the `<SplashScreen />` in a
`<View style={StyleSheet.absoluteFill}>` (import `StyleSheet`/`View` from
`react-native`). If you'd rather keep it dead simple, the version above already
works because the splash fills the screen with its own opaque background.

## Tuning knobs (props, no edits to the component needed)

- `onFinish?: () => void` — fires after the intro settles + `minDurationMs`.
  Use it to flip your `ready` flag.
- `minDurationMs?: number` — minimum time on screen (default `2200`). Raise it
  if hydration is slow, lower it if the splash feels long.

## What was intentionally NOT touched

No existing screen, route, `context/ThemeContext.tsx`, or navigation was
modified. The only new files are `components/SplashScreen.tsx` and this note.
