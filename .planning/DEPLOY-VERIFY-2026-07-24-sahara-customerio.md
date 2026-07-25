# Sahara Customer.io and CI/CD deploy verification

Date: 2026-07-24 PDT

## Change under review

- Repository: `Julianb233/sierra-fred-carey`
- Pull request: `#341`
- Branch: `codex/sahara-capture-first-july22`
- Verified application commit: `a5b3df241768a758b6081b8c676bda0eb65dbac6`
- Base commit: `68239ab653109c3a652edd504ff60ae6077ae993`
- Merge state: draft pull request; not merged

## Validation evidence

- Focused Customer.io tests: 18/18 passed.
- TypeScript: passed.
- ESLint: passed with zero errors and 367 pre-existing warnings.
- Production build: passed.
- GitHub Actions run `30137047929`:
  - build: passed
  - unit tests: passed
  - security scan: passed
  - end-to-end tests: passed
- Vercel Git checks passed for all three connected projects:
  - `sahara`
  - `sierra-fred-carey`
  - `sierra-fred-cary`

## Preview proof

The `sahara` project was redeployed after adding Customer.io credentials to the
Preview environment only.

- Deployment: `dpl_D1wi99NuCHAYhrv9BXNnaLPpJVDN`
- URL: `https://sahara-3j5jbmsug-ai-acrobatics.vercel.app`
- State: `READY`
- Target: preview
- `/start-now`: HTTP 200
- `/api/health`: HTTP 200
- `/api/webhooks/sentry`: HTTP 405 for GET, proving the POST-only route exists

## Customer.io proof

- Workspace: `Sahara International`
- Workspace ID: `226236`
- Role: Workspace admin
- Region: US, verified through `GET /api/v1/accounts/region` with HTTP 200
- Dedicated Track credential: `Sahara member lifecycle production`
- Secret storage: `CUSTOMERIO-sahara` in the shared `API-Keys` 1Password vault
- Vercel scope: Preview only
- Identity canary: HTTP 200
- Event canary: HTTP 200
- Suppression canary: HTTP 200
- Unsuppression recovery: HTTP 200
- UI readback: profile creation, attribute changes, segment changes, and
  `sahara_customerio_canary` event appeared in Customer.io activity
- Sending mode: test mode
- Existing Fred-created Track credential and `Untitled Automation 1` were
  preserved
- Seven Sahara lifecycle automations were created with event triggers and left
  in Draft/PAUSED state:
  - Welcome and onboarding
  - Incomplete onboarding
  - Inactivity re-engagement
  - Founder milestones
  - Payment recovery
  - Conversion and upgrade
  - Cancellation lifecycle

## Protected production boundary

No Customer.io production variables were added and no journey was activated.
Existing Resend and Twilio sends remain authoritative until an explicit cutover
prevents duplicate messages.

Production still runs base commit `68239ab6`. The pull request was not merged
or promoted because fleet policy requires review and forbids automatic merge.

The Customer.io sender domain `saharamembers.com` is created with
`hello@saharamembers.com`, but its DNS is still unverified. The domain does not
appear in either currently accessible GoDaddy portfolio (Julian or delegated
Tyler), so the required MX, SPF, DKIM, DMARC, and link-tracking records cannot
be changed without access to the owning registrar account.

Customer.io Startup Program enrollment also remains gated by adding a payment
method. That is a billing action and was not performed automatically.

The public `joinsahara.com` hostname is not attached to any accessible
AI Acrobatics Vercel project. Its existing production content was therefore not
overwritten or re-aliased.
