#!/usr/bin/env bash
# read-whatsapp-sahara.sh — Extract messages from "Sahara Founders" WhatsApp group
# via Mac Mini SSH + AppleScript.
#
# Usage: bash scripts/read-whatsapp-sahara.sh [group_name]
# Output: JSON array of messages to stdout
#
# Requires: SSH access to mac-mini with WhatsApp desktop app authenticated.

set -euo pipefail

GROUP_NAME="${1:-Sahara Founders}"
TIMEOUT="${2:-45}"

# AppleScript to extract visible messages from the WhatsApp desktop app
APPLESCRIPT='
on run argv
    set groupName to item 1 of argv

    tell application "WhatsApp" to activate
    delay 2

    tell application "System Events"
        tell process "WhatsApp"
            -- Find and click the group in the chat list
            set allElements to entire contents of window 1
            repeat with el in allElements
                try
                    if (role of el) is "AXButton" and (description of el) contains groupName then
                        click el
                        exit repeat
                    end if
                end try
            end repeat

            delay 2

            -- Scroll to bottom to ensure latest messages are visible
            key code 119
            delay 1

            -- Extract all static text elements from the chat area
            set messageTexts to {}
            set allItems to entire contents of window 1
            repeat with el in allItems
                try
                    set r to role of el
                    if r is "AXStaticText" then
                        set v to value of el
                        if v is not missing value and v is not "" then
                            set end of messageTexts to v
                        end if
                    end if
                end try
            end repeat

            -- Output as newline-delimited text
            set AppleScript'\''s text item delimiters to "
"
            return messageTexts as text
        end tell
    end tell
end run
'

# Run via SSH to Mac Mini
RAW_OUTPUT=$(ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no mac-mini \
    "osascript -e '${APPLESCRIPT}' '${GROUP_NAME}'" 2>/dev/null) || {
    echo '{"error": "SSH or AppleScript execution failed", "messages": []}' >&2
    exit 1
}

# Parse raw AppleScript output into JSON
# The output is newline-delimited text values from the chat
python3 -c "
import json, sys, re

raw = '''${RAW_OUTPUT}'''
lines = [l.strip() for l in raw.strip().split('\n') if l.strip()]

# WhatsApp desktop messages typically appear as:
# - Sender name (as a static text)
# - Timestamp (as static text like '10:30 AM')
# - Message body (as static text)
# We try to group them heuristically

messages = []
time_pattern = re.compile(r'^\d{1,2}:\d{2}\s*(AM|PM|am|pm)?$')

i = 0
while i < len(lines):
    line = lines[i]
    # Skip very short lines that are likely UI elements
    if len(line) < 3 or line in ('WhatsApp', 'Search', 'Chats', 'Status', 'Communities', 'Channels'):
        i += 1
        continue

    # If this looks like a timestamp, try to extract sender + message
    if time_pattern.match(line):
        timestamp = line
        sender = lines[i-1] if i > 0 else 'Unknown'
        text = lines[i+1] if i+1 < len(lines) else ''
        if text and not time_pattern.match(text) and len(text) > 2:
            messages.append({
                'sender': sender,
                'timestamp': timestamp,
                'text': text,
                'media': None
            })
        i += 2
        continue

    # If line is long enough, treat as a potential message
    if len(line) > 10:
        messages.append({
            'sender': 'Unknown',
            'timestamp': '',
            'text': line,
            'media': None
        })
    i += 1

print(json.dumps(messages, indent=2))
"
