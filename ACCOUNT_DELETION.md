# Account Deletion — what gets removed

This documents the "delete my account" feature that backs the privacy right to
deletion. It records the complete inventory of a user's data and confirms that
deletion leaves nothing behind.

## Endpoint

`DELETE /account` — authenticated and confirmation-gated.

- **Auth-gated:** requires a valid Bearer token. The account deleted is always
  the token's own user (`current_user`); no user id is accepted from the request,
  so a user can only ever delete *their own* account.
- **Confirmation-gated:** the request body must include the account `password`,
  which is re-verified server-side (`verify_password`) before anything is
  deleted. A wrong password returns `401` and deletes nothing.
- **Result:** `204 No Content` on success. The user row is gone and the token is
  immediately dead (see "Token invalidation").

Implementation: `app/routes/account.py`, schema `AccountDeleteRequest` in
`app/schemas/user.py`.

## Data inventory — everything tied to a user

The data model was audited for every table/record that stores personal data or
references a user (searched for foreign keys to `users`).

| Data | Where | Removed on deletion? |
|------|-------|----------------------|
| Account row (id, **email**, **hashed_password**, **full_name**, origin/destination country codes, created_at) | `users` table (`app/models/user.py`) | **Yes** — the row is deleted |
| Saved progress / completed steps | **Not server-side.** Lives only in the mobile app's in-memory `progressStore` (`mobile/lib/progressStore.ts`) — never persisted or sent to the backend | Cleared on the device at delete time |
| Preferences (e.g. dark mode) | **Not stored.** Theme override is in-memory only (`ThemeContext`) | n/a — nothing persisted |
| Auth tokens / sessions / refresh tokens | **None stored.** Auth uses stateless JWTs; there is no session, token, or refresh table | n/a — nothing to delete |

### Why deleting one row is complete

- **No table has a foreign key to `users`.** The `User` row references shared
  reference data (`countries`) via `origin_country_code` /
  `destination_country_code` — the user is the *child* of `countries`, never the
  parent. Deleting the user does not touch, and is not blocked by, any other
  table, and produces **no orphaned rows**. (Other tables — `countries`,
  `info_steps`, `country_guides`, `universities` — are global content, not
  user-owned.)
- Therefore `db.delete(current_user)` removes 100% of the user's server-side
  data in a single, complete operation.

## Token invalidation

Auth is stateless JWT. `get_current_user` (`app/core/deps.py`) looks the user up
by id **on every request** and raises `401` if the row is missing. So the moment
the `users` row is deleted, the user's existing token can no longer authenticate
*any* endpoint — no separate revocation/denylist is required.

## Mobile flow

`mobile/app/(tabs)/profile.tsx` → **Profile → Danger zone → Delete account**:

1. Clearly-labelled "Delete account" action in a "Danger zone" section.
2. A confirmation modal states the action is **permanent and cannot be undone**
   and requires the user to **re-enter their password** to proceed.
3. On confirm it calls `DELETE /account`, then **clears the local session**
   (`logout()` — drops the token from SecureStore) and resets the in-memory
   progress store, and returns to the logged-out login screen.
4. Loading state (spinner on the Delete button, inputs disabled, dismiss
   blocked while in flight) and error state (inline message, e.g. wrong password
   or unreachable server) are handled — it never hangs or fails silently.

## Verification performed

- Unauthenticated `DELETE /account` → `401`.
- Authenticated with **wrong** password → `401`, account still present.
- Authenticated with **correct** password → `204`; the `users` row is gone.
- The same token afterwards → `401` on `/auth/me` (token invalidated).
- The email can be re-registered afterwards with no unique-constraint conflict
  (confirms no leftover/orphaned row).
