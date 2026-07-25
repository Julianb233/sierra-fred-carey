# Phase 91-02 Summary — Agent coordination and scoped knowledge

## Outcome

- Added a versioned integration event envelope with tenant, provider, subject,
  consent, provenance, classification, occurrence time, and correlation fields.
- Added policy outcomes for allow, deny, quarantine, and human approval.
- Added typed agent task correlation/run IDs, capability requirements, blockers,
  handoffs, verifier outcomes, and redacted evidence.
- Added a backward-compatible migration for existing `agent_tasks`.
- Added a Studio-gated task-handoff API using the new contract.
- Wrapped FRED episodic search in a tenant-scoped knowledge broker that returns
  provenance, freshness, confidence, and classification while redacting direct
  identifiers.
- Added knowledge promotion rules for duplicates, evidence minimums,
  cross-tenant denial, secret rejection, and high-risk human approval.

## Validation

- Combined integration, task, knowledge, and Customer.io suite: 52/52 passed.
- TypeScript passed.
- Tests cover cross-tenant denial, consent restrictions, approval gates,
  missing capabilities, secret/PII-shaped fields, handoffs, blockers,
  verification evidence, redaction, duplicate promotion, and high-risk review.

## Safety boundary

Credentials and direct contact/payment identifiers are structurally rejected
from integration events, task inputs/evidence, and promoted knowledge.
