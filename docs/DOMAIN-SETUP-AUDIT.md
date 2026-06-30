# Sahara — Vercel Subdomain & Domain Setup Audit

> **Linear:** AI-3339 — `[Meeting] Check Vercel subdomain and domain setup for join.sahara and deck subdomain`
> **Source:** Fireflies meeting "Zoom meeting - Julian + Alessandro" (Mar 16, 2026)
> **Action item:** Check and confirm access to the Vercel subdomain and domain setup for `join.sahara` (joinsahara.com) and the deck subdomain.
> **Audited:** 2026-06-30 — live DNS/HTTP + Vercel API enumeration.

## TL;DR

| What | Where it actually lives | Owned by AI Acrobatics Vercel team? | Action needed |
|---|---|---|---|
| `joinsahara.com` (apex) | Vercel — 307 → `www.joinsahara.com` | **No** — separate Vercel account | Julian to confirm access to the owning account |
| `www.joinsahara.com` | Vercel (production site, 200) | **No** — separate Vercel account | Julian to confirm access |
| `you.joinsahara.com` | Vercel (Alex LaTorre's funnel build, 200) | **No** — separate Vercel account | Confirm with Alex / Julian |
| `u.joinsahara.com` | **Dead** — no DNS, HTTP 000 | n/a (Vercel API: misconfigured) | Decommission references or repoint |
| `deck.joinsahara.com` | **Cloudflare Pages** (`sahara-pitch-deck.pages.dev`), NOT Vercel | **No** — Cloudflare, not Vercel | Julian to confirm Cloudflare access |
| This repo's deploy | `sierra-fred-carey.vercel.app` (legacy dashboard) | **Yes** — team `team_Fs8nLavBTXBbOfb7Yxcydw83`, project `sahara` | — |

**Bottom line:** None of the public `joinsahara.com` hostnames are attached to the AI Acrobatics Vercel team. The `sahara` Vercel project in our team only serves `sierra-fred-carey.vercel.app`. The "deck subdomain" is not on Vercel at all — it is a standalone **Cloudflare Pages** deployment. This is an access-confirmation item for Julian, not a code change.

## Vercel team inventory (team `team_Fs8nLavBTXBbOfb7Yxcydw83`)

Projects matching sahara/deck and the domains assigned to each:

| Project | Project ID | Custom/assigned domains |
|---|---|---|
| `sahara` | `prj_SMYMDJ30eBOJKoFWxFwLoI73rupP` | `sierra-fred-carey.vercel.app` only |
| `sierra-fred-carey` | `prj_HTCFqpyGb8GMaZRPa7qoEKYa55vo` | `sierra-fred-carey-blond.vercel.app` only |
| `sierra-fred-cary` | `prj_O87HDciphgfqynCyUFyZjIfnQk5E` | `sierra-fred-cary.vercel.app` only |
| `bt-storyboard-deck` | `prj_dycoLykzLuCW2qO99wEQOUQyBxgK` | `bt-storyboard-deck.vercel.app` only — **unrelated** ("Better Together — The Garden, storyboard"; a name collision on "deck") |

No project in the team has `joinsahara.com`, `www.joinsahara.com`, `you.joinsahara.com`, or `deck.joinsahara.com` assigned as a custom domain.

## Live state (verified 2026-06-30)

```
joinsahara.com        DNS A 216.150.1.1                              HTTP 307 → https://www.joinsahara.com/   (Vercel)
www.joinsahara.com    CNAME c194456c5921c869.vercel-dns-017.com      HTTP 200                                  (Vercel, cache HIT)
you.joinsahara.com    CNAME cname.vercel-dns.com                     HTTP 200                                  (Vercel — Alex LaTorre funnel)
u.joinsahara.com      no DNS record                                  HTTP 000                                  (dead)
deck.joinsahara.com   CNAME sahara-pitch-deck.pages.dev              HTTP 200                                  (Cloudflare Pages — server: cloudflare, cf-ray present)
```

DNS for `joinsahara.com` is managed at **GoDaddy** (nameservers `pdns05/pdns06.domaincontrol.com`).

## The "deck" subdomain — important finding

The pitch deck is published in **two independent places** with the same content/title ("Sahara | Institutional Founder Intelligence"):

1. **This Next.js repo** — `app/deck/` route. Live on the Vercel deploy and reachable at:
   - `sierra-fred-carey.vercel.app/deck` → 200
   - `www.joinsahara.com/deck` → 200
   - `you.joinsahara.com/deck` → 200
2. **A standalone Cloudflare Pages site** — `deck.joinsahara.com` → `sahara-pitch-deck.pages.dev` (Cloudflare, not Vercel).

So `deck.joinsahara.com` is **not** served by any Vercel project we control; it is a separate Cloudflare Pages project. If the intent is to consolidate the deck onto the Vercel `/deck` route, `deck.joinsahara.com` would need its CNAME repointed (or a Vercel custom domain added) — a DNS/access decision for Julian.

## Middleware note (this repo)

`middleware.ts` bounces inbound `joinsahara.com` / `www.joinsahara.com` traffic (302) to `you.joinsahara.com`, on the assumption this repo's deployment owns the apex/www aliases. In reality the live `www.joinsahara.com` returns 200 from a **different** Vercel project (not `sierra-fred-carey.vercel.app`), so that redirect block is currently dormant for production traffic — it only fires if this deploy were ever aliased to the apex. Left unchanged; flagged here for awareness. See `middleware.ts` lines ~40–82.

## Items requiring Julian's action (access confirmation)

1. **Confirm which Vercel account owns `joinsahara.com` / `www.joinsahara.com` / `you.joinsahara.com`** — they are not in the AI Acrobatics team. Likely Alex LaTorre's account. Confirm access or get the team transferred/invited.
2. **Confirm Cloudflare access for `deck.joinsahara.com`** (`sahara-pitch-deck.pages.dev`). It is on Cloudflare Pages, not Vercel.
3. **Decide the fate of `u.joinsahara.com`** — referenced across code/docs as the funnel domain but it has no live DNS. Either repoint it or scrub the references in `funnel/`, `docs/research-funnel-u-joinsahara.md`, and tests.

## How this was verified

```bash
# Vercel project + domain enumeration
curl -s "https://api.vercel.com/v9/projects/<projectId>/domains?teamId=team_Fs8nLavBTXBbOfb7Yxcydw83" \
  -H "Authorization: Bearer $VERCEL_TOKEN"

# Live DNS + HTTP per host
for h in joinsahara.com www.joinsahara.com you.joinsahara.com u.joinsahara.com deck.joinsahara.com; do
  dig +short "$h"; dig +short CNAME "$h"
  curl -sI "https://$h"
done
```
