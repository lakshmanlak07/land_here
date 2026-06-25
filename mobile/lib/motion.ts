import { Easing, ReduceMotion, useReducedMotion } from 'react-native-reanimated';
import type { WithTimingConfig, WithSpringConfig } from 'react-native-reanimated';

/**
 * Central motion tokens. Every animated primitive pulls its durations, easings,
 * springs and cadences from here so the app feels consistent and is tunable in
 * one place. Values are derived from the existing components; where they had
 * drifted, two unifications were applied:
 *   - crossfade duration = 500ms (was 450 / 550 / 800)
 *   - auto-rotate interval = 8000ms (SwipeableFacts moved 7000 -> 8000)
 */

/** Durations in ms. fast = micro-interactions, base = entrances, slow = crossfades. */
export const duration = {
  /** Snap with no perceptible tween — used when Reduce Motion is on. */
  instant: 0,
  /** Press-in / quick taps. */
  fast: 110,
  /** Entrance fades, default content settle. */
  base: 220,
  /** Crossfades between media/text (unified from 450 / 550 / 800). */
  slow: 500,
} as const;

/**
 * Easing curves. standard = symmetric in/out; decelerate = entering content
 * (ease-out); accelerate = exiting content (ease-in). `press` is the snappy
 * quad ease-out used for tactile button feedback.
 */
export const easing = {
  standard: Easing.inOut(Easing.ease),
  decelerate: Easing.out(Easing.cubic),
  accelerate: Easing.in(Easing.cubic),
  press: Easing.out(Easing.quad),
} as const;

/** Ready-made Reanimated `withTiming` configs for common transitions. */
export const timing = {
  /** Button press-down. */
  pressIn: { duration: duration.fast, easing: easing.press } as WithTimingConfig,
  /** Button release — eases back slightly slower than it pressed in. */
  pressOut: { duration: 160, easing: easing.press } as WithTimingConfig,
  /** Mount entrance (opacity + small translate). */
  fadeIn: { duration: duration.base, easing: easing.decelerate } as WithTimingConfig,
  /** Crossfade between two pieces of content. */
  crossfade: { duration: duration.slow, easing: easing.standard } as WithTimingConfig,
} as const;

/**
 * Reanimated `withSpring` presets for physics-based motion. Not yet consumed by
 * existing primitives — provided as part of the shared foundation so future
 * gestures/transitions can reach for a consistent feel instead of ad-hoc values.
 */
export const spring = {
  /** Soft, settled — good for large surfaces. */
  gentle: { damping: 18, stiffness: 160, mass: 1 } as WithSpringConfig,
  /** Tight and quick — good for small controls. */
  snappy: { damping: 22, stiffness: 280, mass: 0.8 } as WithSpringConfig,
} as const;

/** Looping / auto-advance cadences in ms. */
export const interval = {
  /** Auto-rotate cadence for fact/image carousels (unified to 8000). */
  rotate: 8000,
  /** One half of the skeleton shimmer pulse. */
  pulse: 750,
} as const;

/**
 * Accessibility helper. Re-exports Reanimated's hook from a single place so
 * components have one import for both motion tokens and the reduced-motion flag.
 * Returns true when the OS "Reduce Motion" setting was enabled at app start;
 * callers should degrade to instant / non-looping motion when it is.
 */
export { useReducedMotion, ReduceMotion };
