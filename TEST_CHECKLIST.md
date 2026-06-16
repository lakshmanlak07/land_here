# LandHere — Manual QA Checklist

A screen-by-screen, tap-by-tap checklist to verify the app on your phone. Work top
to bottom. For each row, note ✅ pass / ❌ fail and anything odd.

**Before you start**
- [ ] Backend is running and reachable from your phone (the API base is
      `EXPO_PUBLIC_API_URL` — for a physical device this must be your machine's LAN
      IP, e.g. `http://192.168.x.x:8000`, **not** `localhost`).
- [ ] The phone and the computer are on the same Wi-Fi network.
- [ ] You have the Expo dev server running and the app open on the device.
- [ ] Have two sets of credentials ready: one existing account, and a fresh email
      for a new sign-up.

---

## 0. Launch & splash

- [ ] App opens to the animated **splash**: "LandHere" wordmark fades/scales in,
      tagline "Your companion from acceptance to graduation" lifts in, three dots
      pulse.
- [ ] Splash stays ~2 seconds then dismisses on its own (no manual tap needed).
- [ ] **Not logged in:** after splash you land on the **Login** screen.
- [ ] **Already logged in:** after splash you land on the **Home** tab (session
      persisted from last time).
- [ ] No white flash or double-splash between the splash and the first real screen.

---

## 1. Register (new account)

Screen: Create account.

- [ ] Title "Create account" and subtitle show; the 🌍 / form renders cleanly.
- [ ] Tapping **Create Account** with empty email/password shows the error
      "Email and password are required." (red banner).
- [ ] "Full name" is clearly marked optional.
- [ ] **Origin country** picker opens a bottom sheet; search filters the list;
      selecting a country fills the field and closes the sheet.
- [ ] **Destination country** picker behaves the same way.
- [ ] The country search box auto-focuses when the sheet opens.
- [ ] Register with a brand-new email + password (corridor optional). Button shows a
      spinner, then you're taken to the **Home** tab, logged in.
- [ ] Registering again with the **same** email shows a clear error ("Email already
      registered" or similar) rather than crashing.
- [ ] "Already have an account? Sign in" link navigates to **Login**.
- [ ] Keyboard doesn't cover the inputs (form scrolls / avoids the keyboard).

---

## 2. Login

Screen: Welcome back.

- [ ] Empty submit shows "Please fill in all fields."
- [ ] Wrong password shows a generic failure message (not "no such user").
- [ ] Password field is masked (dots).
- [ ] Correct credentials: spinner, then **Home** tab.
- [ ] "Don't have an account? Sign up" navigates to **Register**.
- [ ] After a successful login, fully closing and reopening the app keeps you logged
      in (lands on Home, not Login).

---

## 3. Home tab

- [ ] Greeting matches time of day (Good morning / afternoon / evening) and shows
      your first name (or "there" if no name).
- [ ] Avatar (top right) shows your initial; tapping it opens **Profile**.
- [ ] **If a destination is set:** the hero card shows your corridor
      (e.g. "India → United States"), an "X of Y steps done" line, and a progress
      bar. **Continue journey** opens the **Journey** tab.
- [ ] **If no destination is set:** the hero is an empty-state ("Set your
      destination") that opens **Profile** when tapped.
- [ ] **Quick access** grid has four tiles: Necessities, Rankings, Visa steps,
      Explore — each navigates to the right screen.
- [ ] **Fun facts** card shows and can be swiped between facts.
- [ ] **Popular destinations** shelf scrolls horizontally; tapping a card opens that
      country's detail screen.
- [ ] Pull-to-refresh at the top reloads the journey + destinations (spinner shows,
      then content).
- [ ] Destination images load (or fall back gracefully if an image fails).

---

## 4. Journey tab

- [ ] **No destination set:** shows "No corridor set" empty state pointing you to
      Profile.
- [ ] **Destination set:** collapsing hero image at the top with title "Your
      Journey", corridor, and "X of Y steps complete" + progress bar.
- [ ] Steps are grouped into phases with icons/labels (Before Applying, After
      Acceptance, Visa Process, Before Departure, After Arrival) and a per-phase step
      count.
- [ ] Each step card shows a number badge, title, explanation, and an official source
      button.
- [ ] Tapping a step's **checkbox** marks it done: checkmark fills, title gets a
      strikethrough, card dims.
- [ ] The done count and progress bar (here **and** on Home) update accordingly.
- [ ] Completed state **persists** after leaving and returning to the tab, and after
      restarting the app.
- [ ] Tapping the **official source** button opens the correct external link in the
      browser.
- [ ] Scrolling up collapses/fades the hero smoothly; pull-to-refresh works.
- [ ] Error/loading states render (spinner while loading; a "Try again" retry if the
      server is unreachable — test by stopping the backend briefly).

---

## 5. Explore tab

- [ ] Header "Explore / Find your destination" renders.
- [ ] Country grid (2 columns) loads with images, name, visa name, currency pill, and
      a short descriptor.
- [ ] Search box filters countries as you type; the ✕ clears it.
- [ ] No-match search shows the "No results" empty state.
- [ ] Tapping a country card opens its **Country detail** screen.
- [ ] Stopping the backend and reopening shows the "Couldn't load countries" error
      with a working **Try again**.

---

## 6. Country detail

- [ ] Large hero image with country code + name overlay.
- [ ] **Back** button (top left, floating) returns to the previous screen.
- [ ] Student Visa card and Currency card show when data exists.
- [ ] "Did you know?" rotating facts display and rotate.
- [ ] **Official Immigration Site** button opens the correct external link (only
      shown if a URL exists).
- [ ] Loading + error states behave (spinner; "Couldn't load country" + Try again).

---

## 7. Rankings tab

- [ ] Header "Rankings / The LandHere Score" with an ⓘ info button.
- [ ] ⓘ button opens the **Methodology** screen.
- [ ] List loads universities, each row: rank number, name, state · intl tuition/yr,
      and a big SCORE.
- [ ] A **Disclaimer** appears at the top of the list with a methodology link.
- [ ] **Search**: typing filters results (debounced ~0.35s); ✕ clears it.
- [ ] **Budget chips** (Any budget, ≤$20k, ≤$40k, ≤$60k): selecting one filters the
      list; the active chip is highlighted.
- [ ] No-match (e.g. nonsense search + low budget) shows the "No matches" empty
      state.
- [ ] **Infinite scroll**: scrolling to the bottom loads more (footer spinner), until
      no more results.
- [ ] Pull-to-refresh reloads from the top.
- [ ] Tapping a row opens the **University detail** screen.
- [ ] Stopping the backend shows "Couldn't load rankings" + Try again.

---

## 8. University detail

- [ ] Hero image (leads with the university, falls back to generic campus).
- [ ] **Back** button works.
- [ ] Large **LandHere Score** card (value out of 100).
- [ ] "Key numbers" grid: intl tuition, avg net price, median earnings, completion
      rate, published works, citations — values formatted sensibly (currency, %,
      counts; "—" where data is missing).
- [ ] "How this score is built" card shows Research and Outcomes sub-scores.
- [ ] Disclaimer with a **methodology** link that opens the Methodology screen.
- [ ] **Visit official site** opens the university's site (only if a URL exists).
- [ ] Loading + error states behave.

---

## 9. Methodology screen

- [ ] **Back** returns to where you came from (Rankings or a detail screen).
- [ ] Intro "The LandHere Score" reads correctly, with the "not an opinion poll / no
      one can pay to move up" framing.
- [ ] Two weighted cards: **Research 50%** and **Outcomes 50%**, each with their
      factor bullets.
- [ ] "Five factors in total…" note shows.
- [ ] Data sources (College Scorecard, OpenAlex) cards show.
- [ ] "This is an estimate" disclaimer at the bottom.

---

## 10. Necessities

Reached via Home → Necessities quick-access tile.

- [ ] **Country picker** lists US, UK, Canada, Australia, Germany, Ireland.
- [ ] Countries **with** content are tappable (chevron); countries marked "Soon" /
      "Coming soon" are dimmed and **not** tappable.
- [ ] Tapping a ready country opens its detail with sections.
- [ ] Sections render with a title, tagline, and item cards.
- [ ] **Mandatories** items show a number badge (ordered); **Necessities** items show
      a • bullet (unordered) — and the accent colour differs between the two.
- [ ] Each item shows title, optional note box, explanation, and (where present) a
      tappable source button that opens the official link.
- [ ] The bottom **Disclaimer** ("general guidance… not legal advice") shows.
- [ ] **Back** returns to the picker, and again to Home.

> Note: any new draft content (Australia / Germany / Ireland) only appears in the app
> if it has been added to `constants/necessities.ts`. The markdown drafts alone do
> not change the app — verify the picker reflects whatever is actually wired in.

---

## 11. Profile tab

- [ ] Avatar shows your initials; name and email display (or "Student" / "—"
      fallbacks).
- [ ] Info card shows Full name, Email, Origin, Destination.
- [ ] "Dark mode" toggle shows as **disabled / Coming soon** (does nothing — expected).
- [ ] **Sign Out** logs you out and returns to **Login**.
- [ ] After sign-out, the back gesture/button does **not** let you back into the
      authed tabs.
- [ ] After sign-out, restarting the app lands on **Login** (session cleared).

---

## 12. Cross-cutting checks

- [ ] **Tab bar**: all tabs (Home, Journey, Explore, Rankings, Profile) switch
      correctly and keep their state.
- [ ] **Offline / server down**: each data screen shows a friendly error + retry,
      not a crash or infinite spinner.
- [ ] **Back navigation** from every pushed screen returns correctly.
- [ ] **External links** all open in the browser and point somewhere sensible.
- [ ] **Rotation / safe areas**: content respects the notch/status bar; nothing is
      cut off at the top or bottom.
- [ ] **Two accounts**: data shown (corridor, journey, name) matches the
      logged-in account — log out and into the other to confirm no data bleed.
- [ ] **Checklist persistence**: completed journey steps survive an app restart.
- [ ] No console-level red error screens during any of the above.

---

## Notes / bugs found

| Screen | What happened | Expected | Severity |
|--------|---------------|----------|----------|
|        |               |          |          |
|        |               |          |          |
