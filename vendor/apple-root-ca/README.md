# vendor/apple-root-ca

Apple's **public** root certificates, used to verify App Store signed
transactions and server notifications (`app/core/appstore.py`).

These are trust anchors, not credentials. There is no private key here, nothing
to leak, and nothing that identifies our account. Committing them is safe; the
only reason they are not already in this directory is that they must be
downloaded from Apple rather than reproduced from memory.

## Populate it

1. Go to <https://www.apple.com/certificateauthority/>.
2. Download **Apple Root CA - G3 Root** (`AppleRootCA-G3.cer`). That is the
   anchor for the App Store's JWS signing chain.
3. Save it into this directory. Keep the `.cer` extension — the loader accepts
   `.cer`, `.der`, `.pem` and `.crt`, and ignores everything else.

```
vendor/apple-root-ca/
  README.md
  AppleRootCA-G3.cer      ← you add this
```

Add any additional root Apple publishes for this purpose the same way; every
certificate in the directory is loaded as a trust anchor.

## How it is wired

| Where | Value |
|---|---|
| Local `.env` | `APPLE_ROOT_CA_DIR=vendor/apple-root-ca` |
| Docker image | `COPY . .` includes this directory |
| Render | `APPLE_ROOT_CA_DIR=/app/vendor/apple-root-ca` |

## If you skip this

Verification is **unavailable**, not lenient. `POST /purchases/verify` and
`POST /purchases/notifications` return **503**, so nobody can buy anything and
Apple's notifications are retried rather than dropped. That is the fail-closed
behaviour working as designed — but it means an empty directory is a launch
blocker, and a silent one if you do not test a purchase.
