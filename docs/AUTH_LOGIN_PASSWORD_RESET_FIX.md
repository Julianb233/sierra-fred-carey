# Login & Password Reset Fix — Sahara Emails

**Date:** 2026-02-25
**Linear:** AI-903
**Source:** Sahara Founders meeting (09:30)

## Problem

Login issues and password resets related to @saharacompanies.com email addresses were causing friction for team members.

### Root causes identified

1. **Email normalization inconsistency** — The login page was not normalizing email to lowercase before submitting, while the backend did. Mixed-case emails (e.g. `Fred@SaharaCompanies.com`) could fail silently.
2. **Forgot-password had no client-side validation** — Users could submit malformed emails and receive a generic "Failed to send reset email" error with no guidance.
3. **Reset-password page got stuck on spinner** — If a reset link was expired or invalid, users saw an infinite "Verifying your reset link..." spinner with no timeout.
4. **Password requirements mismatch** — Signup required 8+ chars, uppercase, and number, but the reset-password page only enforced 8+ chars. Users could set a weak password via reset, then fail validation elsewhere.
5. **Error messages were not actionable** — Generic errors like "Failed to send reset email. Please try again." gave users no path forward.

## Changes made

### `app/login/page.tsx`
- Email is now trimmed and lowercased before submission
- Error message for "Invalid email or password" now includes guidance to use "Forgot password?"
- Placeholder updated to `you@saharacompanies.com`

### `app/forgot-password/page.tsx`
- Email is trimmed and lowercased before Supabase call
- Client-side email format validation with clear error message
- Rate-limit and authorization errors surfaced with specific messages
- Success state includes tip about checking spam/junk and IT-managed filters (relevant for corporate @saharacompanies.com addresses)
- Placeholder updated to `you@saharacompanies.com`

### `app/reset-password/page.tsx`
- **15-second timeout** on session verification — shows clear "link expired" message with CTA to request a new one, instead of infinite spinner
- **Live password requirements checklist** matching signup rules (8+ chars, uppercase, number)
- **Real-time confirm-password validation** with visual feedback (red border on mismatch)
- Submit button disabled until all requirements met and passwords match
- Auth listener properly cleaned up on unmount (prevents memory leaks)
- Specific error messages for "same password" and "expired session" errors

## 1Password CLI Integration (Team Recommendation)

For the Sahara team using @saharacompanies.com emails, we recommend setting up 1Password CLI to streamline credential management:

### Quick setup

```bash
# Install 1Password CLI
brew install --cask 1password/tap/1password-cli

# Sign in (connects to your 1Password account)
op signin

# Save Sahara credentials
op item create \
  --category login \
  --title "Sahara Platform" \
  --url "https://app.saharacompanies.com/login" \
  --generate-password='letters,digits,symbols,20' \
  login.username="your.name@saharacompanies.com"

# Retrieve password (for scripts/CI)
op item get "Sahara Platform" --fields password
```

### Browser integration

1. Install the [1Password browser extension](https://1password.com/downloads/browser-extension/)
2. Enable "Suggest passwords on sign-up and change forms"
3. The extension auto-fills on the Sahara login and reset-password pages

### Team provisioning

For IT admins managing the @saharacompanies.com domain:

```bash
# Create a shared vault for team credentials
op vault create "Sahara Team"

# Provision a user
op user provision \
  --email "new.hire@saharacompanies.com" \
  --name "New Hire"

# Grant vault access
op vault user grant \
  --vault "Sahara Team" \
  --user "new.hire@saharacompanies.com" \
  --permissions manage_items
```

### SSH + CLI usage

```bash
# Use 1Password SSH agent for git operations
export SSH_AUTH_SOCK=~/Library/Group\ Containers/2BUA8C4S2C.com.1password/t/agent.sock

# Reference secrets in env files without storing them
export SUPABASE_KEY="op://Sahara Team/Supabase/credential"
```

## Verification

- [x] Password reset works for @saharacompanies.com emails (email normalized, clear errors)
- [x] Error messages are clear and actionable at every step
- [x] 1Password CLI integration documented for team
- [x] Password requirements consistent between signup and reset flows
- [x] No infinite spinners on expired reset links
