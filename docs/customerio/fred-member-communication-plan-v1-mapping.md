# Fred Cary member communication plan v1 — implementation map

Source: `Sahara_Automated_Member_Communication_Plan_v1.pdf`, shared by Fred
Cary in the official Sahara Founders Google Chat space on July 23, 2026.

This file maps the approved source document to implementation. It does not
duplicate the confidential message library.

## Authority and boundaries

- Firebase project `sahara-6800a` is the member system of record, and its
  permanent UID is the Customer.io profile ID.
- Supabase is not read or written by this member-lifecycle integration.
- Customer.io owns lifecycle evaluation and future delivery. Resend and Twilio
  remain authoritative until a reviewed cutover avoids duplicate sends.
- Email is for explanation, education, and progress reporting. SMS is for
  urgency, accountability, milestones, and human connection.
- Daily motivation has separate consent and is not a promotional channel.
- All journeys stay Draft/Stopped until sender, consent, suppression,
  allowlisted delivery, and readback gates pass.

## Journey map

| Fred v1 journey | Customer.io draft | Entry | Required exit / suppression |
| --- | --- | --- | --- |
| 1. New-member welcome | Welcome & Onboarding | `account_created` | `onboarding_completed`; SMS consent branch |
| 2. Onboarding completion | Welcome & Onboarding | `onboarding_completed` | first action delivered |
| 3. First value | First-Value Journey (new draft) | `onboarding_completed` | `recommended_action_completed` |
| 4. Recommended-action reminders | Recommended-Action Reminders (new draft) | `recommendation_created` | action completed, irrelevant, or blocked |
| 5. Milestone celebration | Founder Milestones | `milestone_reached` or `recommended_action_completed` | one celebration per milestone |
| 6. Inactivity rescue | Inactivity Re-engagement | `member_became_inactive` | any meaningful Sahara activity |
| 7. Free-to-paid conversion | Conversion & Upgrade | approved high-intent segment | frustration, support, payment issue, or conversion |
| 8. Upgrade abandonment | Conversion & Upgrade | `upgrade_started` without `upgrade_completed` | conversion or final 72-hour touch |
| 9. Paid-member onboarding | Paid-Member Onboarding (new draft) | `upgrade_completed` | 30-day report delivered |
| 10. Payment failure and cancellation | Payment Recovery + Cancellation Lifecycle | `payment_failed` or `subscription_cancelled` | recovered payment or reason-segmented cancellation |

Daily Motivation is a separate draft program entered only by
`daily_motivation_opt_in`, with the member's frequency, local send time, and
time zone.

## First-six build order

Fred's document explicitly prioritizes journeys 1 through 6 before revenue and
retention expansion:

1. Welcome, incomplete onboarding, and onboarding completion.
2. First value within 48 hours.
3. Recommended-action reminders with due-date and overdue branches.
4. Milestone celebration.
5. Inactivity rescue at 3, 7, 14, and 30 days.
6. Daily-motivation enrollment and delivery after separate opt-in.

## Safeguards

- Quiet hours: approximately 8:00 p.m. to 8:00 a.m. in the member's time zone.
- No more than one promotional or motivational SMS per day.
- Do not send daily motivation and inactivity SMS within the same several-hour
  window.
- Stop reminder sequences immediately when the desired action completes.
- Suppress upgrade messages after frustration, payment issues, or support
  requests.
- One principal call to action per message.
- Honor STOP and preference changes immediately.
- Store SMS consent disclosure, timestamp, and source.
- Keep message bodies, recipients, email addresses, and phone numbers out of
  reporting-webhook evidence.

## Current implementation truth

- The exact 31-event Fred v1 vocabulary is exported as
  `FRED_V1_CUSTOMERIO_EVENT_NAMES`.
- Existing event names remain append-only aliases. Core entry events now emit
  Fred v1 aliases for account creation, milestone reached, member inactivity,
  upgrade completion, and subscription cancellation.
- Events without a proven product-state emitter remain defined but are not
  fabricated by unrelated routes.
- The Customer.io dashboard contains eleven named Sahara Draft automations plus
  Fred's preserved Untitled draft. First Value, Recommended-Action Reminders,
  Paid-Member Onboarding, and Daily Motivation have Fred-aligned entry triggers;
  message, delay, branch, goal, and exit nodes must still be built from this
  map and verified with allowlisted synthetic profiles before activation.
- The verified 2026-07-29 baseline synchronized 202 Firebase Auth identities
  and merged 195 Firestore profiles into Customer.io with zero failures and
  zero baseline lifecycle events.
