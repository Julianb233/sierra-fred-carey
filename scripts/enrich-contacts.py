#!/usr/bin/env python3
"""
Enrich contacts table with Gmail interaction data and iMessage history.
Pulls from both personal and business Gmail accounts, matches to contacts,
calculates interaction scores, and updates Supabase.
"""

import json
import subprocess
import sys
import time
import re
import os
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from email.utils import parseaddr

# ── Config ──
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://ggiywhpgzjdjeeldjdnp.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
BATCH_SIZE = 50  # For Supabase updates
GMAIL_BATCH = 500  # Messages per Gmail query
DELAY_BETWEEN_REQUESTS = 0.3  # Rate limiting

def run_cmd(cmd, env=None):
    """Run a shell command and return output."""
    merged_env = os.environ.copy()
    if env:
        merged_env.update(env)
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, env=merged_env)
    return result.stdout.strip(), result.stderr.strip()

def gws_gmail(params_json, account="personal"):
    """Call gws gmail with optional workspace account."""
    cmd = f"gws gmail users messages list --params '{params_json}'"
    env = {}
    if account == "business":
        env["GOOGLE_WORKSPACE_CLI_CONFIG_DIR"] = os.path.expanduser("~/.config/gws/profiles/workspace")
    out, err = run_cmd(cmd, env)
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        print(f"  [WARN] Failed to parse Gmail response: {err[:200]}")
        return {"messages": []}

def gws_gmail_get(msg_id, account="personal"):
    """Get a single message's metadata."""
    params = json.dumps({
        "userId": "me",
        "id": msg_id,
        "format": "full"
    })
    cmd = f"gws gmail users messages get --params '{params}'"
    env = {}
    if account == "business":
        env["GOOGLE_WORKSPACE_CLI_CONFIG_DIR"] = os.path.expanduser("~/.config/gws/profiles/workspace")
    out, err = run_cmd(cmd, env)
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        return None

def extract_email_from_header(header_value):
    """Extract email address from header like 'Name <email@example.com>'."""
    if not header_value:
        return None
    _, email = parseaddr(header_value)
    return email.lower() if email else None

def extract_all_emails_from_header(header_value):
    """Extract all email addresses from a comma-separated header."""
    if not header_value:
        return []
    emails = []
    for part in header_value.split(","):
        _, email = parseaddr(part.strip())
        if email:
            emails.append(email.lower())
    return emails

def get_header(msg, name):
    """Get a header value from a Gmail message."""
    headers = msg.get("payload", {}).get("headers", [])
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""

def fetch_gmail_interactions(account="personal"):
    """Fetch recent emails and extract interaction data per email address."""
    print(f"\n{'='*60}")
    print(f"  Fetching Gmail interactions for {account} account...")
    print(f"{'='*60}")

    interactions = defaultdict(lambda: {
        "count": 0,
        "last_date": None,
        "last_subject": None,
        "sent_count": 0,
        "received_count": 0,
        "threads": set()
    })

    # Phase 1: Get recent sent messages
    print(f"  Fetching sent messages...")
    sent_data = gws_gmail(json.dumps({
        "userId": "me",
        "q": "is:sent",
        "maxResults": GMAIL_BATCH
    }), account)
    sent_msgs = sent_data.get("messages", [])
    print(f"  Got {len(sent_msgs)} sent message IDs")

    # Phase 2: Get recent received messages
    print(f"  Fetching received messages...")
    recv_data = gws_gmail(json.dumps({
        "userId": "me",
        "q": "in:inbox",
        "maxResults": GMAIL_BATCH
    }), account)
    recv_msgs = recv_data.get("messages", [])
    print(f"  Got {len(recv_msgs)} received message IDs")

    # Phase 3: Get metadata for all messages (deduplicated)
    all_msg_ids = {}
    for m in sent_msgs:
        all_msg_ids[m["id"]] = "sent"
    for m in recv_msgs:
        if m["id"] not in all_msg_ids:
            all_msg_ids[m["id"]] = "received"

    print(f"  Fetching metadata for {len(all_msg_ids)} unique messages...")
    processed = 0
    for msg_id, direction in all_msg_ids.items():
        msg = gws_gmail_get(msg_id, account)
        if not msg:
            continue

        from_email = extract_email_from_header(get_header(msg, "From"))
        to_emails = extract_all_emails_from_header(get_header(msg, "To"))
        subject = get_header(msg, "Subject")
        date_str = get_header(msg, "Date")
        thread_id = msg.get("threadId", "")

        # Parse date
        msg_date = None
        if date_str:
            try:
                # Try common date formats
                for fmt in [
                    "%a, %d %b %Y %H:%M:%S %z",
                    "%d %b %Y %H:%M:%S %z",
                    "%a, %d %b %Y %H:%M:%S %Z",
                ]:
                    try:
                        msg_date = datetime.strptime(date_str.strip().rsplit(" (", 1)[0].strip(), fmt)
                        break
                    except ValueError:
                        continue
                if not msg_date:
                    # Fallback: use internalDate from message
                    internal_date = msg.get("internalDate")
                    if internal_date:
                        msg_date = datetime.fromtimestamp(int(internal_date) / 1000, tz=timezone.utc)
            except Exception:
                pass

        # Track interactions
        if direction == "sent":
            for email in to_emails:
                entry = interactions[email]
                entry["count"] += 1
                entry["sent_count"] += 1
                if thread_id:
                    entry["threads"].add(thread_id)
                if msg_date and (entry["last_date"] is None or msg_date > entry["last_date"]):
                    entry["last_date"] = msg_date
                    entry["last_subject"] = subject
        else:
            if from_email:
                entry = interactions[from_email]
                entry["count"] += 1
                entry["received_count"] += 1
                if thread_id:
                    entry["threads"].add(thread_id)
                if msg_date and (entry["last_date"] is None or msg_date > entry["last_date"]):
                    entry["last_date"] = msg_date
                    entry["last_subject"] = subject

        processed += 1
        if processed % 50 == 0:
            print(f"    Processed {processed}/{len(all_msg_ids)} messages...")
            time.sleep(DELAY_BETWEEN_REQUESTS)
        else:
            time.sleep(0.1)  # Small delay for rate limiting

    print(f"  Done. Found interactions with {len(interactions)} unique email addresses.")
    return interactions

def fetch_imessage_interactions():
    """Fetch iMessage interaction data from Mac Mini."""
    print(f"\n{'='*60}")
    print(f"  Fetching iMessage interactions from Mac Mini...")
    print(f"{'='*60}")

    cmd = """mac exec 'sqlite3 ~/Library/Messages/chat.db "SELECT h.id, COUNT(*) as msg_count, MAX(m.date) as last_date FROM message m JOIN handle h ON m.handle_id = h.ROWID GROUP BY h.id ORDER BY msg_count DESC LIMIT 200"'"""
    out, err = run_cmd(cmd)

    interactions = {}
    if out:
        for line in out.strip().split("\n"):
            # Skip the ">> Mac Mini:" prefix line
            if line.startswith(">>") or not "|" in line:
                continue
            parts = line.split("|")
            if len(parts) >= 3:
                handle_id = parts[0].strip()
                msg_count = int(parts[1].strip())
                last_date_raw = parts[2].strip()

                # iMessage dates are in CoreData timestamp (seconds since 2001-01-01) * 1e9
                try:
                    if last_date_raw and int(last_date_raw) > 0:
                        # CoreData nanoseconds since 2001-01-01
                        core_data_epoch = datetime(2001, 1, 1, tzinfo=timezone.utc)
                        last_date = core_data_epoch + timedelta(seconds=int(last_date_raw) / 1e9)
                    else:
                        last_date = None
                except (ValueError, OverflowError):
                    last_date = None

                interactions[handle_id] = {
                    "count": msg_count,
                    "last_date": last_date,
                    "source": "imessage"
                }

    print(f"  Found {len(interactions)} iMessage contacts")
    return interactions

def load_contacts():
    """Load all contacts with email addresses from Supabase."""
    print(f"\n{'='*60}")
    print(f"  Loading contacts from Supabase...")
    print(f"{'='*60}")

    contacts = []
    offset = 0
    page_size = 1000

    while True:
        cmd = f'''curl -s "{SUPABASE_URL}/rest/v1/contacts?select=id,display_name,email_addresses,phone_numbers,source_account&order=id&offset={offset}&limit={page_size}" \
          -H "apikey: {SUPABASE_KEY}" \
          -H "Authorization: Bearer {SUPABASE_KEY}"'''
        out, _ = run_cmd(cmd)
        try:
            batch = json.loads(out)
            if not batch:
                break
            contacts.extend(batch)
            offset += page_size
            if len(batch) < page_size:
                break
        except json.JSONDecodeError:
            print(f"  [ERROR] Failed to parse contacts response")
            break

    print(f"  Loaded {len(contacts)} contacts")

    # Build email->contact lookup
    email_lookup = {}
    phone_lookup = {}
    for c in contacts:
        emails = c.get("email_addresses", []) or []
        for e in emails:
            val = e.get("value", "").lower().strip()
            if val:
                email_lookup[val] = c

        phones = c.get("phone_numbers", []) or []
        for p in phones:
            val = p.get("value", "").strip()
            # Normalize phone: strip everything except digits, keep last 10
            digits = re.sub(r'\D', '', val)
            if len(digits) >= 10:
                phone_lookup[digits[-10:]] = c

    print(f"  Built lookup: {len(email_lookup)} email addresses, {len(phone_lookup)} phone numbers")
    return contacts, email_lookup, phone_lookup

def calculate_score(interaction_count, last_date):
    """Calculate interaction score: (count * 0.4) + (recency * 0.6)"""
    now = datetime.now(timezone.utc)

    # Recency score
    if last_date is None:
        recency = 0.1
    else:
        if last_date.tzinfo is None:
            last_date = last_date.replace(tzinfo=timezone.utc)
        days_ago = (now - last_date).days
        if days_ago <= 7:
            recency = 1.0
        elif days_ago <= 30:
            recency = 0.8
        elif days_ago <= 90:
            recency = 0.5
        else:
            recency = 0.2

    # Normalize count to 0-1 range (cap at 50 interactions)
    count_score = min(interaction_count / 50.0, 1.0)

    score = (count_score * 0.4) + (recency * 0.6)
    return round(score, 3)

def classify_relationship(score, interaction_count):
    """Classify relationship type based on score and count."""
    if interaction_count == 0:
        return None
    if score >= 0.7:
        return "frequent"
    elif score >= 0.4:
        return "occasional"
    elif score >= 0.15:
        return "dormant"
    else:
        return "new"

def update_supabase_batch(updates):
    """Update contacts in Supabase using individual PATCH requests in batches."""
    print(f"\n  Updating {len(updates)} contacts in Supabase...")
    success = 0
    failed = 0

    for i, (contact_id, data) in enumerate(updates.items()):
        payload = json.dumps(data)
        cmd = f'''curl -s -o /dev/null -w "%{{http_code}}" -X PATCH \
          "{SUPABASE_URL}/rest/v1/contacts?id=eq.{contact_id}" \
          -H "apikey: {SUPABASE_KEY}" \
          -H "Authorization: Bearer {SUPABASE_KEY}" \
          -H "Content-Type: application/json" \
          -H "Prefer: return=minimal" \
          -d '{payload}' '''
        out, _ = run_cmd(cmd)
        if out.strip() in ("200", "204"):
            success += 1
        else:
            failed += 1
            if failed <= 3:
                print(f"    [WARN] Failed to update {contact_id}: HTTP {out}")

        if (i + 1) % 50 == 0:
            print(f"    Updated {i+1}/{len(updates)} contacts ({success} ok, {failed} failed)")
            time.sleep(0.2)

    print(f"  Done: {success} updated, {failed} failed")
    return success, failed

def main():
    if not SUPABASE_KEY:
        print("ERROR: Set SUPABASE_KEY environment variable")
        sys.exit(1)

    # Step 1: Load contacts
    contacts, email_lookup, phone_lookup = load_contacts()

    # Step 2: Fetch Gmail interactions from both accounts
    personal_interactions = fetch_gmail_interactions("personal")
    business_interactions = fetch_gmail_interactions("business")

    # Merge interactions
    merged = defaultdict(lambda: {
        "count": 0,
        "last_date": None,
        "last_subject": None,
        "sent_count": 0,
        "received_count": 0,
        "threads": set(),
        "sources": []
    })

    for source_name, interactions in [("personal_gmail", personal_interactions), ("business_gmail", business_interactions)]:
        for email, data in interactions.items():
            m = merged[email]
            m["count"] += data["count"]
            m["sent_count"] += data.get("sent_count", 0)
            m["received_count"] += data.get("received_count", 0)
            m["threads"].update(data.get("threads", set()))
            if source_name not in m["sources"]:
                m["sources"].append(source_name)
            if data["last_date"]:
                if m["last_date"] is None or data["last_date"] > m["last_date"]:
                    m["last_date"] = data["last_date"]
                    m["last_subject"] = data.get("last_subject")

    print(f"\n  Merged interactions: {len(merged)} unique email addresses across both accounts")

    # Step 3: Fetch iMessage interactions
    imessage_interactions = fetch_imessage_interactions()

    # Step 4: Match interactions to contacts and build updates
    updates = {}
    matched_email = 0
    matched_imessage = 0

    # Match email interactions
    for email, data in merged.items():
        if email in email_lookup:
            contact = email_lookup[email]
            cid = contact["id"]
            matched_email += 1

            score = calculate_score(data["count"], data["last_date"])
            rel_type = classify_relationship(score, data["count"])

            last_interaction_str = None
            if data["last_date"]:
                if data["last_date"].tzinfo is None:
                    data["last_date"] = data["last_date"].replace(tzinfo=timezone.utc)
                last_interaction_str = data["last_date"].isoformat()

            enrichment = {
                "gmail_sent_count": data["sent_count"],
                "gmail_received_count": data["received_count"],
                "gmail_sources": data["sources"],
                "enriched_at": datetime.now(timezone.utc).isoformat()
            }

            if cid in updates:
                # Merge with existing
                updates[cid]["interaction_count"] += data["count"]
                updates[cid]["email_threads_count"] += len(data["threads"])
                existing_enrichment = updates[cid].get("enrichment_data", {})
                existing_enrichment.update(enrichment)
                updates[cid]["enrichment_data"] = existing_enrichment
            else:
                updates[cid] = {
                    "interaction_count": data["count"],
                    "last_interaction_at": last_interaction_str,
                    "interaction_score": score,
                    "relationship_type": rel_type,
                    "email_threads_count": len(data["threads"]),
                    "last_email_subject": (data["last_subject"] or "")[:500],
                    "enrichment_data": enrichment
                }

    # Match iMessage interactions
    for handle_id, data in imessage_interactions.items():
        # handle_id could be phone number or email
        contact = None
        normalized = re.sub(r'\D', '', handle_id)
        if len(normalized) >= 10:
            contact = phone_lookup.get(normalized[-10:])
        if not contact and "@" in handle_id:
            contact = email_lookup.get(handle_id.lower())

        if contact:
            cid = contact["id"]
            matched_imessage += 1

            imsg_enrichment = {
                "imessage_count": data["count"],
                "imessage_last_date": data["last_date"].isoformat() if data["last_date"] else None,
                "enriched_at": datetime.now(timezone.utc).isoformat()
            }

            if cid in updates:
                updates[cid]["interaction_count"] += data["count"]
                existing_enrichment = updates[cid].get("enrichment_data", {})
                existing_enrichment.update(imsg_enrichment)
                updates[cid]["enrichment_data"] = existing_enrichment
                # Recalculate score
                total_count = updates[cid]["interaction_count"]
                last_date = None
                if updates[cid].get("last_interaction_at"):
                    last_date = datetime.fromisoformat(updates[cid]["last_interaction_at"])
                if data["last_date"] and (last_date is None or data["last_date"] > last_date):
                    last_date = data["last_date"]
                    if last_date.tzinfo is None:
                        last_date = last_date.replace(tzinfo=timezone.utc)
                    updates[cid]["last_interaction_at"] = last_date.isoformat()
                updates[cid]["interaction_score"] = calculate_score(total_count, last_date)
                updates[cid]["relationship_type"] = classify_relationship(
                    updates[cid]["interaction_score"], total_count
                )
            else:
                last_date = data.get("last_date")
                score = calculate_score(data["count"], last_date)
                updates[cid] = {
                    "interaction_count": data["count"],
                    "last_interaction_at": last_date.isoformat() if last_date else None,
                    "interaction_score": score,
                    "relationship_type": classify_relationship(score, data["count"]),
                    "email_threads_count": 0,
                    "last_email_subject": None,
                    "enrichment_data": imsg_enrichment
                }

    print(f"\n{'='*60}")
    print(f"  MATCHING SUMMARY")
    print(f"{'='*60}")
    print(f"  Email interactions matched to contacts: {matched_email}")
    print(f"  iMessage interactions matched to contacts: {matched_imessage}")
    print(f"  Total contacts to update: {len(updates)}")

    # Step 5: Update Supabase
    if updates:
        # Convert enrichment_data to JSON string for API
        for cid in updates:
            if isinstance(updates[cid].get("enrichment_data"), dict):
                updates[cid]["enrichment_data"] = json.dumps(updates[cid]["enrichment_data"])
        success, failed = update_supabase_batch(updates)
    else:
        print("  No updates to apply.")
        success = 0

    # Step 6: Print summary stats
    print(f"\n{'='*60}")
    print(f"  ENRICHMENT COMPLETE")
    print(f"{'='*60}")

    # Count by relationship type
    type_counts = defaultdict(int)
    for cid, data in updates.items():
        rt = data.get("relationship_type")
        type_counts[rt or "none"] += 1

    print(f"  Total contacts enriched: {len(updates)}")
    print(f"  Relationship types:")
    for rt, count in sorted(type_counts.items()):
        print(f"    {rt}: {count}")

    return len(updates), success

if __name__ == "__main__":
    main()
