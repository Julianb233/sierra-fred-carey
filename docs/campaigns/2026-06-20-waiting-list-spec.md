# Sahara Waiting List Email Campaign Spec & Technical Integration Brief

**Date:** June 20th, 2026
**Target Audience:** Sahara Waiting List / Pre-registrants (The "First 500 Founders")
**Creative Owner (Copy):** Fred Cary (AI-Host/Persona)
**Technical Owner (Trigger/Integration):** William Hood
**Priority:** P2 (High) — Active Campaign Setup

---

## Executive Summary

During the Sahara Founders sync on June 19th, 2026, William Hood, Fred Cary, and Julian Bradley agreed to expedite the activation of the **First 500 Founders** waiting list campaign. This document bridges the gap between Fred's creative copy vision and William's technical platform layer.

- **Objective:** Convert waiting list sign-ups into active platform users with a streamlined, 2-to-3 click onboarding flow.
- **Domain Strategy:** Use `saharamembers.com` as the primary sending domain to isolate list-building and member transactional communication from main marketing properties.
- **Platform Recommendation:** Resend or SendGrid integrated via standard webhook listeners.

---

## Part 1: Email Copy Options (Fred Cary's Persona/Voice)

These drafts are written in Fred's signature visionary, warm, and highly authoritative voice — positioning the Sahara AI-host as an active guide for the founder's journey.

### Option A: The Direct & Action-First Approach
*Best for: High conversion, clear next steps, and rapid onboarding.*

> **Subject:** Your spot in the Sahara First 500 is ready.
> **Preview Text:** Let's build your positioning and value prop today.
>
> Founder,
>
> When we started designing Sahara, we had one simple obsession: taking the friction out of building a legendary company. 
>
> Right now, you are sitting on the waiting list. But the doors to the **First 500 Founders** are open, and your workspace is fully initialized.
>
> I don't want you playing footsie with empty ideas. I want you inside the platform, shaping your value proposition, analyzing your competitive landscape, and crystallizing your market positioning in real-time.
>
> We have stripped down the entry barrier. No massive forms. No friction. It takes exactly two clicks to start co-engineering your roadmap with me.
>
> **[Claim Your Workspace & Join the First 500]** *(Dynamic link to new landing page)*
>
> I'll see you in the workspace.
>
> **Fred Cary**
> Founder & Active Guide, Sahara

---

### Option B: The Visionary & Story-Led Approach
*Best for: Strong brand alignment, deep emotional connection, and high-value positioning.*

> **Subject:** We are done playing footsie with average ideas.
> **Preview Text:** A personal invitation from Fred Cary to the First 500.
>
> Founder,
>
> Every great enterprise starts with a moment of absolute clarity. It's that moment where you look at the noise of the market and decide to carve out your own unique space.
>
> That's why we built Sahara. Not to be another static SaaS tool, but to act as your active, co-engineering partner. A partner that speaks with my voice, guides you through the complex strategic decisions, and helps you structure your value proposition so clearly that your customers can't look away.
>
> We are officially onboarding our **First 500 Founders** today. 
>
> Your place on the waiting list was the first step. Now it’s time to move. We’ve designed a brand-new, friction-free login pathway that puts you in front of the strategy board in under 30 seconds.
>
> Your positioning won't build itself, and your competitors aren't waiting around. Let's do this together.
>
> **[Enter the Sahara Workspace Now]** *(Dynamic link)*
>
> Vision is nothing without execution. Let's execute.
>
> **Fred Cary**
> Founder & Active Guide, Sahara

---

### Option C: The High-Urgency / FOMO Approach
*Best for: Re-activating stagnant pre-registrants as the 500 spot threshold fills up.*

> **Subject:** Closing the gate: Sahara First 500 Founders list filling fast.
> **Preview Text:** Only a few private workspaces remain in our launch cohort.
>
> Founder,
>
> I'm keeping this brief because we are actively provisioning workspaces for our launch cohort, and space is limited.
>
> The waiting list has officially surpassed our available capacity, but because you pre-registered, your slot is locked in for the next 48 hours. 
>
> Once our **First 500 Founders** are onboarded, we are closing the gate to focus entirely on guiding this cohort's positioning, competitive mapping, and go-to-market strategies.
>
> We've made the signup process incredibly fast:
> 1. Click the link below.
> 2. Confirm your email.
> 3. Your workspace is live.
>
> No credit card. No filler. Just pure strategic momentum.
>
> **[Claim Your Spot in the Launch Cohort]** *(Dynamic link)*
>
> Don't let your slot fall back into the general pool. Let's get to work.
>
> **Fred Cary**
> Founder & Active Guide, Sahara

---

## Part 2: Technical & Trigger Integration Spec (William Hood)

To ensure this campaign is fully automated and hands-off, the technical integration must connect user sign-up events on the landing page directly to the automated email delivery system.

### 1. Architectural Flow Chart (Conceptual)

```
[User landing page] 
      │
      ├── (User enters email -> Clicks Get Started [2 clicks])
      ▼
[Sahara Next.js API / Supabase Auth]
      │
      ├── (Upsert user to 'profiles' with status='waiting_list')
      ▼
[Trigger Event (e.g. Supabase DB Trigger or Next.js route handler)]
      │
      ├── (HTTP POST Payload to Email service via webhook)
      ▼
[Email Delivery Platform (Resend / saharamembers.com)]
      │
      └── (Fires Option A, B, or C automated email with magic link)
```

### 2. Recommended Infrastructure Specifications

- **Sending Domain:** `saharamembers.com`
  - *Reasoning:* Isolates list engagement and magic-link transactional delivery from `joinsahara.com` marketing reputation. High volume outbound campaigns on new lists can sometimes trigger spam filter scrutiny; isolating this on the member domain protects the corporate brand.
- **DNS Configurations Required (saharamembers.com):**
  - **SPF:** `v=spf1 include:amazonses.com ~all` (if using AWS SES) or `v=spf1 include:spf.resend.com ~all` (if using Resend).
  - **DKIM:** 3 CNAME records provided by the sending platform.
  - **DMARC:** `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@saharamembers.com` (highly recommended to prevent spoofing).

### 3. Trigger Webhook Schema (Event: `user.pre_registered`)

When a user signs up on the new landing page, the frontend or backend should fire an event to the trigger system with this JSON schema:

```json
{
  "event": "user.pre_registered",
  "timestamp": "2026-06-20T08:30:00Z",
  "data": {
    "email": "founder@example.com",
    "cohort": "first_500",
    "magic_signup_url": "https://saharamembers.com/auth/confirm?token=xyz123abc&email=founder@example.com",
    "metadata": {
      "source": "waiting_list_lp",
      "utm_source": "newsletter",
      "utm_medium": "email"
    }
  }
}
```

### 4. Sending Platform Integration (Resend Example - Node.js)

Since Resend is the fleet's standardized transactional mailer, William's platform can initiate the trigger with a simple API call:

```javascript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function triggerWaitingListEmail(recipientEmail, magicUrl) {
  try {
    const data = await resend.emails.send({
      from: 'Fred Cary <fred@saharamembers.com>',
      to: [recipientEmail],
      subject: 'Your spot in the Sahara First 500 is ready.',
      html: `
        <p>Founder,</p>
        <p>When we started designing Sahara, we had one simple obsession: taking the friction out of building a legendary company.</p>
        <p>Right now, you are sitting on the waiting list. But the doors to the <strong>First 500 Founders</strong> are open, and your workspace is fully initialized.</p>
        <p>We have stripped down the entry barrier. It takes exactly two clicks to start co-engineering your roadmap with me.</p>
        <p><a href="${magicUrl}" style="background-color:#000;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">Claim Your Workspace & Join the First 500</a></p>
        <br/>
        <p>Fred Cary<br/>Founder & Active Guide, Sahara</p>
      `,
    });
    return { success: true, id: data.id };
  } catch (error) {
    console.error("Failed to trigger waiting list email:", error);
    return { success: false, error };
  }
}
```

---

## Part 3: Next Actions for Closeout

1. **Fred Cary:** Review and select copy option (A, B, or C). Provide minor modifications if desired.
2. **William Hood:** Confirm the platform sending engine (Resend vs other) and configure the domain keys on `saharamembers.com` in the chosen mailer account.
3. **Trigger Implementation:** Wire the "Get Started" landing page submission button to execute the `triggerWaitingListEmail` route handler autonomously.
