# LAUNCH/archive — obsolete documents

> **Everything in this folder is out of date. Do not use any of it for App Store
> submission, for public hosting, or as input to legal review.**

These files are kept because they are part of the project's history and because
deleting drafts of legal documents is a bad habit. They are **not** maintained
and **must not** be edited to bring them up to date — the live documents listed
at the bottom of this file are the only ones that matter.

Archived 2026-08-16.

---

## Why each file is here

### The `.docx` binaries

| File | Why it is obsolete |
|---|---|
| `LandHere_Privacy_Policy_v3.docx` | A Word export of an earlier privacy policy. It predates the server-side purchase record, so it describes purchase handling that no longer matches the code. The live Markdown version has moved on. |
| `LandHere_Terms_of_Service_v2.docx` | A Word export of an earlier terms of service. Its purchase section describes a different free/paid split from the one that ships. |
| `LandHere_PRD_v1.docx` | The original product requirements document. Retained as product history; its feature split and pricing narrative no longer describe the app. |

A recurring problem with these three: being binaries, they do not show up in a
text search of the repository, so a contradiction inside them is invisible to
the kind of audit that catches problems in the Markdown files. That alone is
reason enough not to keep them in the working set.

### The superseded listing and legal drafts

| File | Why it is obsolete |
|---|---|
| `APP_STORE_LISTING.md` | rc.1-era store copy. Advertises "FREE TO START · ONE-TIME UNLOCK". Its feature split is wrong: it sells scholarships, work rules and money tools as paid, and those are **free**. |
| `APP_STORE_LISTING_root.md` | A duplicate of the above that lived at the repository root. Same content, same problems. |
| `AppStoreListing.md` | An older listing draft from `mobile/`, dated 2026-06-28. Describes the app as mirroring a Google Play release; there is no Android release. |
| `PRIVACY_POLICY_DRAFT.md` | First-pass privacy policy, superseded twice over. |
| `PRIVACY_POLICY_DRAFT_v2.md` | Second-pass privacy policy, superseded. |
| `TERMS_OF_SERVICE_DRAFT.md` | First-pass terms of service, superseded. |

Having three privacy-policy drafts and three listing files in circulation was
itself the hazard: the risk was never that someone would read the wrong one, but
that someone would *paste* the wrong one into App Store Connect or send it to a
lawyer.

---

## What to use instead

| Purpose | Live document |
|---|---|
| Privacy policy | `LAUNCH/PRIVACY_POLICY.md` |
| Terms of service | `LAUNCH/TERMS_OF_SERVICE.md` |
| App Store listing copy and privacy labels | `LAUNCH/APP_STORE_METADATA.md` |
| Legal review — start here | `LAUNCH/ATTORNEY_REVIEW_PACKET.md` |
| Legal review — background | `LAUNCH/ATTORNEY_BRIEF.md` |
| Product requirements | `LAUNCH/LandHere_PRD_v1.md` (Markdown; also dated, but readable and searchable) |

The live legal documents are **drafts awaiting review by a qualified lawyer** and
carry that notice at the top. Nothing in this project has legal sign-off.
