DRAFT — UNVERIFIED

# Proposed App Structure: Necessities Feature

This document sketches the intended information architecture for the "necessities" feature so it is ready to build next session. Nothing here implies any UI implementation — it is a content and navigation structure proposal only.

---

## Core Framing: Two Tiers

The feature divides into two clearly named sections with different urgency levels:

| Tier | Name | User mental model |
|------|------|-------------------|
| 1 | **Mandatories** | "If I skip this, I am in trouble." Legal or institutional requirements. Time-sensitive. |
| 2 | **Necessities** | "I need this to live normally." Practical setup tasks. Urgent but not legally risky. |

The naming is intentional and should be surfaced in the UI — not just used internally. Users should understand why something is in Mandatories vs. Necessities before they tap in.

---

## Proposed Top-Level Structure

```
Necessities Feature
├── Mandatories                  (ordered checklist — sequence matters)
│   ├── SEVIS Check-In
│   ├── Report to International Office
│   ├── Register for Classes (Full-Time)
│   ├── Enroll in Health Insurance
│   ├── Open a US Bank Account
│   └── Apply for SSN (if eligible)
│
└── Necessities                  (unordered or loosely grouped — can do in any order)
    ├── Get a US Phone Plan
    ├── Get a Transit Card
    ├── Sort Basic Furniture
    ├── Find Groceries
    └── Get Weather-Appropriate Clothing
```

---

## Key Design Decisions to Make at Build Time

**1. Mandatories should be ordered, not just listed.**
The sequence matters (SEVIS check-in before anything else, bank account before SSN application). The UI should communicate order — a numbered list or a step-by-step flow rather than a grid of cards.

**2. Necessities can be a flexible checklist.**
Users can tackle these in any order. A tappable checklist where they mark items done is a natural pattern.

**3. Each item needs at minimum:**
- A plain-English title
- A 1–2 sentence "why this matters" explanation
- A link to the relevant official source (for Mandatories) or a practical tip (for Necessities)
- A "mark as done" interaction

**4. Country-scoping.**
This first pass covers the US. The structure should be designed so that a UK version, Canadian version, etc., can be added by adding a new content file per country, not by rebuilding the feature. The content files (`mandatories_us.md`, `necessities_us.md`) are the seed for this approach.

**5. "If eligible" items.**
The SSN item is only relevant for students with employment authorization. Consider a soft filter or a note at the top of that card rather than hiding it entirely — the user may not know they need it until they get a job offer.

**6. Relationship to the existing city guide.**
The necessities feature is country-level (US, UK, Canada), not city-level. The existing city guides (Boston, London, etc.) are hyper-local. These two layers should be clearly separated in navigation so users understand which is which.

---

## What Is Explicitly Out of Scope for This Feature

- Specific fees or dollar amounts (change too frequently)
- Specific deadlines (vary by school and semester)
- Step-by-step instructions for forms or government portals (too much maintenance surface)
- Housing search or lease guidance (complex enough for its own feature)

---

DRAFT — UNVERIFIED
