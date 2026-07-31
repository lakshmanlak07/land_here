# LandHere — Product Requirements Document (v1.0)

_Owner: Lakshman · Last updated: July 3, 2026 · Status: build complete, pre-submission_

## 1. Product summary

LandHere is a mobile companion for international students moving from India to
university abroad. It starts where every admissions app ends: the moment the
offer letter arrives. The app turns the visa-and-relocation chaos into a
personalised, step-by-step plan — every step compiled from official government
and institutional sources, human-verified before it ships, and linked back to
the source so students can confirm it themselves.

**Positioning:** "You got in. Now what?" — the post-acceptance companion.
**Platform:** iOS first (Expo SDK 54 / React Native 0.81, TypeScript). Android
is a fast follow. **Backend:** FastAPI + PostgreSQL. **Price:** free core +
US $1.99 one-time unlock (no subscription).

## 2. Problem statement

Every year, roughly 1.3 million Indian students study abroad. Between
acceptance and settling in, they navigate visa filings, biometrics, proof of
funds, housing, insurance, SIMs, bank accounts, and work-rule limits — across
government websites that are fragmented, jargon-heavy, and frequently out of
date on third-party blogs. Getting one step wrong (a missed SEVIS payment, an
expired financial document, working over the legal hour cap) can cost a
student their visa. Existing apps focus on admissions and abandon the student
exactly when the stakes get highest.

## 3. Target users

- **Primary — the admitted student (17–25, India):** offer letter in hand for
  the US, Canada, or the UK; anxious, deadline-driven, mostly on WhatsApp for
  advice of wildly varying quality. Note: some users are minors — this shapes
  legal and data decisions throughout.
- **Secondary — the deciding student:** comparing universities and countries;
  needs trustworthy comparative data (rankings, tuition, work rights).
- **Tertiary — parents:** often fund and co-plan the move; trust official
  sources over influencer content.

## 4. Goals

- Ship an iOS v1.0 that takes a student from offer letter to first weeks
  abroad with zero incorrect visa guidance (target: 0 verified-content
  corrections needed in the first 90 days).
- 60% of new users complete onboarding and reach their personalised plan.
- 30% Day-7 retention among users with a set corridor.
- 8–15% free→paid conversion on the $1.99 unlock within 30 days of install.
- Maintain the trust moat: 100% of visa steps and work rules carry an official
  source link and a human-verified flag; freshness reviewed every 90 days.

## 5. Non-goals (v1.0)

- **No admissions/application features** — different problem, crowded market.
- **No document vault or file upload** — storing passports/transcripts creates
  a PII and security surface a solo founder should not carry at launch.
- **No community/chat** — moderation burden and minors-safety risk; revisit
  after launch.
- **No corridors beyond IN→US/CA/UK** — a perfectly maintained 3 corridors
  beats 9 half-stale ones. Unverified content never ships.
- **No analytics SDK in v1.0** — privacy-first stance for an audience that
  includes minors; only privacy-safe aggregate counts are planned (P1).
- **No Android binary at launch** — separate milestone immediately after iOS.

## 6. What's in v1.0 (built and verified)

**Onboarding & personalisation.** An 11-question flow (destination, origin,
university, stage, concerns, work/scholarship intent, first-month priority,
experience, goal, confidence) with answer buffering for anonymous users, a
plan reveal BEFORE account creation, and account creation as the final step.
Destination picker restricted to live corridors only.

**Journey (core feature).** A phased, corridor-specific timeline
(after acceptance → visa → departure → arrival) with per-step plain-English
explanations, official source links, verified/unverified badges, progress
tracking (device-local), a "NOW" anchor derived from the user's stage, and
phase-grouped headers. IN→US/CA/UK content is human-verified and seeded.

**University rankings.** 500 US universities scored 0–100 (LandHere Score)
from College Scorecard + OpenAlex data: research impact 30%, research output
20%, earnings 20%, affordability (intl tuition) 15%, graduation 15%. Search,
budget filters, infinite scroll, full detail pages with score breakdowns, and
a methodology page. Honestly labelled as US/undergraduate-leaning data.

**Reference features.** Work-hour rules for 9 countries (3 human-verified,
6 marked unverified; all reviewed against official sources July 2026);
official-sources-only scholarship directory (60+ entries, 20+ groups); country
guides with live ECB currency converter; arrival necessities checklists for 6
countries; fun-facts content layer.

**Monetisation — freemium with one-time unlock ($1.99).**
- Free: onboarding + plan, first half of the journey, top-10 rankings,
  country guides, necessities, profile.
- Paid: full journey, all 500 rankings + search + filters, scholarship
  directory, work-hour rules, money tools, currency converter.
- StoreKit/Play Billing via react-native-iap; non-consumable
  `com.landhere.app.pro`; restore purchases in paywall and profile; ghost
  previews at every gate; "no subscription" stated at every touchpoint.

**Platform quality.** Full dark mode (system + manual, persisted); central
theme/motion tokens with reduced-motion support; skeleton loaders everywhere;
image caching with right-sized requests; JWT auth with silent refresh and
single-flight 401 recovery; in-app account deletion with password re-entry;
WCAG AA contrast (fixed July 2026); screen-reader labels on interactive
elements; error boundaries; offline-tolerant error states with retry.

## 7. User stories (priority order)

- As an admitted student, I want a step-by-step visa plan for my exact
  corridor so that I never miss a deadline or requirement.
- As an anxious first-timer, I want to see my next step the moment I open the
  app so that I always know what to do right now.
- As a deciding student, I want rankings scored on data that matters to
  internationals (real tuition, outcomes) so I can shortlist honestly.
- As a student on a budget, I want official scholarship sources without spam
  or aggregator sign-up walls so I don't waste time on dead ends.
- As a student planning to work, I want the legal hour limits for my country
  from the official source so I never jeopardise my visa.
- As a paying user, I want my unlock to restore on a new phone so I never pay
  twice.
- As a user who hits an error, I want a clear message and a retry — never a
  dead end or a blank screen.

## 8. Requirements status

**P0 — launch blockers (product: done · operations: open).**
Done in build: freemium gating exactly as specced; purchase + restore flows;
verified corridor content; onboarding stability; account deletion; privacy
policy and ToS drafts (v3/v2) ready for counsel. Open (human-only): Apple
Developer enrollment; production deploy (host, managed Postgres, real
SECRET_KEY, locked CORS, seed); lawyer sign-off on minimum age / minors /
purchases; IAP product created in App Store Connect; privacy policy at a
public URL; store listing assets (icon, screenshots); TestFlight pass on the
production build including sandbox purchase + restore.

**P1 — fast follows (first 60 days).** Privacy-safe funnel counts (onboarding
drop-off, paywall conversion); waitlist capture for unsupported corridors and
Android; Android build + Play listing; "This looks outdated" one-tap report on
every step; re-verification workflow with visible "checked on" dates per step;
Redis-backed rate limiting for multi-worker deploys; Sign in with Apple.

**P2 — future (design for, don't build).** IN→AU corridor (drafted, pending
human verification); post-landing layer (first-90-days content, renewal and
tax-date nudges); shareable plan / cohort referral loop; rankings segmented by
degree level (master's view for the core persona); server-side sync of journey
progress; more origin countries.

## 9. Success metrics

**Leading (first 2–4 weeks).** Onboarding completion ≥60% (stretch 70%);
plan-reveal→account conversion ≥70%; D1 retention ≥40%; paywall view→purchase
≥5% (stretch 8%); crash-free sessions ≥99.5%; App Store rating ≥4.5 with the
first 50 reviews.

**Lagging (quarter one).** D7 retention ≥30%; free→paid ≥8% by day 30;
organic installs ≥50% of total by month 3 (cohort/WhatsApp sharing);
support volume <5 emails/week/1,000 users; zero founded reports of incorrect
verified content.

**Measurement note:** with no analytics SDK in v1.0, leading indicators come
from store metrics (App Store Connect), backend aggregates (registrations,
corridor counts), and IAP reports until privacy-safe counts ship (P1).

## 10. Risks and mitigations

- **Stale verified content is the brand-killing risk.** Mitigation: 90-day
  re-verification SLA, dated review stamps (work rules already dated July
  2026), P1 outdated-report button, never marking unverified content verified.
- **Paywall too early caps conversion.** Mitigated by design: value lands
  before payment (plan reveal, half journey, top-10). Watch conversion, be
  ready to widen the free tier rather than raise price.
- **iOS-first in an Android-majority market.** India skews heavily Android;
  launch marketing must include an Android waitlist (P1), or demand is
  generated that can't be served.
- **Minors compliance is unresolved until counsel signs off.** No launch
  before the minimum-age and parental-consent position is set; drafts flag
  every decision point for the lawyer.
- **Solo-founder bus factor on ops.** Managed hosting, fail-open rate
  limiter, and boring infrastructure choices keep the run cost of being alone
  low.

## 11. Open questions

- Legal (blocking): minimum age; parental consent position; minors' purchase
  voidability wording; governing law. → Counsel, before submission.
- Product (non-blocking): require onboarding answers or keep skippable?
  Current: skippable by design; revisit with funnel data.
- Product (non-blocking): widen the free rankings preview if conversion is
  healthy but reviews cite the gate?
- Ops (non-blocking): hosting provider final choice (Railway vs Render) and
  data region — affects the privacy policy's infrastructure clause.

## 12. Current diagnosis (July 3, 2026)

TypeScript: clean. Backend: 30/30 tests passing. Bundle IDs consistent
(com.landhere.app). 20 screens, 16 shared components, 16 API routes. Content
fact-checked against official sources July 2026. Accessibility: WCAG AA
contrast and screen-reader pass completed. Known good: auth refresh flow,
purchase/restore, gating, deep-link back-navigation. Outstanding hygiene: ~79
modified files uncommitted in git — commit before building; production env
(.env SECRET_KEY, CORS, EXPO_PUBLIC_API_URL) still points at development.

## 13. Release plan

1. Tonight: commit the working tree; enroll Apple Developer; deploy backend +
   managed Postgres; send legal pack to counsel.
2. Day 2: App Store Connect record + IAP product; host privacy policy; icon +
   screenshots; EAS production build; TestFlight (full purchase/restore pass).
3. On lawyer sign-off: submit for review (1–3 days typical).
4. Launch week: monitor reviews/support inbox daily; hotfix branch ready.
5. Weeks 2–6: P1 items — funnel counts, waitlists, Android build, outdated-
   report button.

---

_This PRD reflects the codebase as of July 3, 2026 — features listed as built
were verified in code, typechecked, and tested, not aspirational._
