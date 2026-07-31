# Integration Guide — RotatingFacts and RotatingImage

This guide shows the exact, minimal changes needed to wire the two new components into the Home screen. Each change is a small, reviewable diff.

---

## File to edit

```
mobile/app/(tabs)/index.tsx
```

---

## Step 1 — Add the imports (top of the file, after existing imports)

```tsx
import { RotatingFacts } from '../../components/RotatingFacts';
import { RotatingImage } from '../../components/RotatingImage';
import { CAMPUS_QUERIES } from '../../constants/campusQueries';
```

---

## Step 2A — Replace the static fact card with RotatingFacts

**Find this block** (around line 144–148 in the original file):

```tsx
{/* Fun Fact Card */}
<View style={[s.factCard, { backgroundColor: '#FFF8E8', borderColor: '#F5D485' }]}>
  <Text style={s.factLabel}>Did you know? 💡</Text>
  <Text style={[s.factText, { color: colors.textPrimary }]}>{funFact}</Text>
</View>
```

**Replace it with:**

```tsx
{/* Fun Fact Card — auto-rotating */}
<RotatingFacts
  countryCode={user?.destination_country_code}
  style={{ marginHorizontal: spacing.lg, marginBottom: spacing.xl }}
/>
```

> **Note:** After this change you can remove the `funFact` useMemo at the top of the component — it is no longer needed. The `RotatingFacts` component manages its own state.

---

## Step 2B — Add RotatingImage as a new section (optional, additive)

To add a rotating campus-photo strip between the category pills and the fact card, insert the following **after** the category pills ScrollView and **before** the fact card:

```tsx
{/* Campus Photos */}
{destCode ? (
  <>
    <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Campus life</Text>
    <RotatingImage
      queries={CAMPUS_QUERIES[destCode] ?? CAMPUS_QUERIES['US']}
      countryCode={destCode}
      style={{ height: 180, marginHorizontal: spacing.lg, borderRadius: radius.card, marginBottom: spacing.xl }}
    />
  </>
) : null}
```

`destCode` is already defined in the file: `const destCode = user?.destination_country_code ?? '';`

---

## What each prop does

### RotatingFacts

| Prop | Type | Description |
|---|---|---|
| `countryCode` | `string \| null \| undefined` | ISO code of the destination country. Automatically selects the right fact pool. Falls back to generic study-abroad facts if the code is unknown. |
| `style` | `ViewStyle` (optional) | Extra style applied to the card container. |

### RotatingImage

| Prop | Type | Description |
|---|---|---|
| `queries` | `string[]` | Array of Unsplash search terms. One image is fetched per query, then cycled through every 8 seconds. Import from `CAMPUS_QUERIES[countryCode]`. |
| `countryCode` | `string` (optional) | Used for the fallback background colour if no images load (e.g. no API key). |
| `style` | `ViewStyle` (optional) | Controls size and position — **you must pass a `height` here** since the image is not intrinsically sized. |

---

## Behaviour notes

- **RotatingFacts** starts on a random fact from the pool, then fades to the next every 8 seconds. When `countryCode` changes it resets immediately.
- **RotatingImage** fetches all queries in parallel on mount (results are cached by `getCityImage` after the first fetch). It starts cycling once at least two images are loaded. If the backend image lookup (`GET /images/city`) is unavailable or the user is signed out, it shows the country-colour fallback immediately — no error. The Unsplash key is server-side only; there is no image credential in the mobile bundle.
- Both components are fully self-contained. If you decide not to use them, just delete the import lines and the JSX block — zero side effects.

---

## Cleanup after Step 2A

Remove the now-unused `funFact` variable from the component (search for `const funFact = useMemo`). This keeps the file clean and removes a `useMemo` that runs on every render.

The `factCard`, `factLabel`, and `factText` style entries in the `styles()` function at the bottom of the file can also be deleted — they are no longer referenced. (But leaving them in has no runtime effect.)

---

## Suggested review checklist

- [ ] Import lines added at top of file
- [ ] Old `<View style={[s.factCard...}}>` block replaced
- [ ] New JSX renders correctly on the Home screen with a destination set
- [ ] New JSX shows a graceful empty/fallback state when no destination is set
- [ ] RotatingImage fallback colour appears when Unsplash key is empty
- [ ] No TypeScript errors (`npx tsc --noEmit` from the `mobile/` directory)
