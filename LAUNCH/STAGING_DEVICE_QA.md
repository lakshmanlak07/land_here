# LandHere — Staging Device QA

Branch `staging/rc5` · backend cut from `v0.1.0-rc.5` · **staging, not production**

For a real device pointed at the staging API. Not an App Review checklist and
not a production sign-off.

---

## 0. What this checklist cannot cover yet

**Purchase, paywall-purchase, and restore flows are NOT testable at the time of
writing. No result from them may be recorded as a pass.**

| Blocker | Consequence |
|---|---|
| No App Store Connect record, no `com.landhere.app.pro` product | StoreKit returns no products; the paywall has nothing to sell |
| No sandbox tester account | No purchase can be initiated on iOS |
| No Play Console record, internal-test track, or license tester | Same on Android |
| `vendor/apple-root-ca/` is empty | `POST /purchases/verify` returns 503 even for a valid signed transaction |
| `APPLE_APP_APPLE_ID` unset on staging | Production-environment verification returns 503 |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` unset on staging | `POST /purchases/verify/google` returns 503 |

What **is** testable now: every **locked** state, every **error** state, and the
fact that entitlement is server-owned — sections 8 and 9.

Mark purchase rows `BLOCKED`, never `PASS`, until products and test accounts exist.

---

## 1. Preconditions

- [ ] Staging API answers `GET /health/ready` with 200 over HTTPS
- [ ] Build produced with `--profile staging` — never `production`, which
      auto-increments the remote build number and is reserved for store builds
- [ ] Build log shows `Environment valid for a production build` and prints the
      staging API URL
- [ ] Two throwaway staging accounts registered: **A** and **B**
- [ ] Real handset, not a simulator — a simulator cannot exercise StoreKit,
      biometrics, or real network loss

---

## 2. Onboarding · `(auth)/onboarding.tsx`

- [ ] Cold launch on a clean install lands on onboarding, not a blank frame
- [ ] Every slide fits without clipping at the largest Dynamic Type size
- [ ] Skipping and completing both end on the same destination
- [ ] Force-quit mid-onboarding, relaunch: no crash, no half-state
- [ ] Onboarding does not reappear after a completed first run

## 3. Register and login · `(auth)/register.tsx`, `(auth)/login.tsx`

- [ ] Register account A; land in the app authenticated
- [ ] Wrong password shows a readable error, not a raw status code or stack
- [ ] Unknown email does not reveal whether the address exists
- [ ] Duplicate registration refused with a clear message
- [ ] Password field masks input and offers a reveal control
- [ ] Kill and relaunch: still signed in (refresh token survives)
- [ ] Airplane mode during login: network error, not a hang or crash

## 4. Account switching — regression, was a real defect

The React Query cache used to survive logout, so account B could be served
account A's cached journey. `resetServerCache()` now runs on both `logout()`
and `setAuth()`.

- [ ] Sign in as A, open Journey and Rankings so both are cached
- [ ] Sign out, sign in as **B** on the same device without reinstalling
- [ ] Journey, Rankings, Profile, entitlement all show **B's** data immediately —
      no flash of A's content, not even one frame
- [ ] Repeat A to B to A twice more; no leakage either direction
- [ ] Sign out with no network: local session still clears

## 5. Journey · `(tabs)/journey.tsx`

Server gate: `app/routes/info.py` serves only the first two phases to a free
account and reports the rest as locked.

- [ ] Screen renders content — it rendered nothing in rc.2, so this is a real
      regression check
- [ ] Free account sees phases 1–2 in full
- [ ] Phases beyond 2 appear locked, with a route to the paywall
- [ ] Step progress persists across a force-quit
- [ ] Pull-to-refresh does not duplicate or reorder steps

## 6. Rankings · `(tabs)/rankings.tsx`

Server gate: top 25 rows, applied to the SQL window before filters.

- [ ] Free account can scroll rows 1–25
- [ ] Row 26 onward is locked, not silently absent
- [ ] **Filter bypass:** apply a state or search filter, confirm a free account
      still cannot see a university outside the global top 25. This was an
      exploitable bypass — each filter used to produce its own "top 25"
- [ ] Sorting and filtering never blank the list or strand a spinner

## 7. University detail · `university/[id].tsx`

- [ ] Free account tapping a university reaches the paywall, not a broken screen
- [ ] API refuses rather than returning a partial record

## 8. Paywall — locked states only · `paywall.tsx`

- [ ] Opens from Journey, Rankings, and University detail
- [ ] Price line does not display a hardcoded "$1.99" when StoreKit returned no
      product; an unavailable state is correct
- [ ] With no products configured the buy control shows unavailable and does not
      spin forever
- [ ] Copy says one-time purchase; no subscription or recurring-billing wording
- [ ] Dismissing returns to the originating screen, not the tab root
- [ ] **Restore Purchases present on the paywall AND in Profile/Settings**
- [ ] Restore with nothing to restore says so plainly and grants nothing
- [ ] `BLOCKED` — buy flow (needs store product + sandbox/test account)
- [ ] `BLOCKED` — restore of a real purchase
- [ ] `BLOCKED` — restore on a second device with the same store account

## 9. Entitlement is server-owned

- [ ] Airplane mode, cold launch, free account: no Pro content granted
- [ ] Reinstalling does not grant Pro
- [ ] Nothing in device storage flips entitlement; the old `landhere_purchased`
      AsyncStorage flag must not exist

## 10. Account deletion · `(tabs)/profile.tsx`

- [ ] Deletion requires an explicit confirmation step
- [ ] Confirming calls `DELETE /account` and signs out
- [ ] Deleted account cannot log back in
- [ ] A fresh account can register with the same email afterwards, or the refusal
      is deliberate and explained
- [ ] Deletion with no network fails safely — does not sign out locally while
      leaving the server account alive

## 11. Offline and poor network

- [ ] Airplane mode on every tab: error or cached state, never a crash
- [ ] Cached content stays readable where the app claims it is available
- [ ] Restoring connectivity recovers without a manual restart
- [ ] Background 10+ minutes, return: no infinite spinner
- [ ] Token refresh across a network drop does not sign the user out
- [ ] Airplane mode during a purchase attempt reports a network error, grants
      nothing

## 12. Dark mode

- [ ] Every screen in sections 2–10 legible in dark mode
- [ ] Toggling light/dark while open does not require a restart
- [ ] No white flash on navigation in dark mode
- [ ] Locked/paywall states keep sufficient contrast — most likely to have been
      styled light-only

## 13. Accessibility

- [ ] VoiceOver (iOS) / TalkBack (Android) reaches and operates every control on
      onboarding, login, paywall, and delete-account confirmation
- [ ] Buttons announce a purpose, not "button" alone
- [ ] Locked rows announce that they are locked
- [ ] Largest Dynamic Type / font scale: no clipped or overlapping text
- [ ] Touch targets at least 44×44 pt
- [ ] Focus order logical; no keyboard/AT trap in modals
- [ ] Colour is never the only signal for a locked or error state
- [ ] Reduce Motion respected

---

## Recording results

`PASS` / `FAIL` / `BLOCKED`. `BLOCKED` is the only correct value for the marked
rows in section 8 until Apple and Google products and test accounts exist. Do not
upgrade a `BLOCKED` row to `PASS` on the strength of a mocked or simulated
purchase.
