# AlertConfig Component - Visual Guide

## Component Location
**Path:** `/components/monitoring/AlertConfig.tsx`
**Dashboard:** `/dashboard/monitoring` → Settings Tab

---

## Component Sections

### 1. Alert Thresholds Card
```
┌─────────────────────────────────────────────────────────┐
│ ⚠ Alert Thresholds                                      │
│ Configure when alerts should be triggered               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ Conversion Drop  │  │ Latency Spike    │            │
│  │ [    10     ] %  │  │ [    500    ] ms │            │
│  │ Alert when...    │  │ Alert when...    │            │
│  └──────────────────┘  └──────────────────┘            │
│                                                          │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ Error Rate       │  │ Min Sample Size  │            │
│  │ [     5     ] %  │  │ [    100    ]    │            │
│  │ Alert when...    │  │ Minimum before.. │            │
│  └──────────────────┘  └──────────────────┘            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 2. Notification Channels Card
```
┌─────────────────────────────────────────────────────────┐
│ 🔔 Notification Channels                                │
│ Configure how and where you receive alerts              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Slack Notifications              [ OFF / ON  ]         │
│  Send alerts to your Slack workspace                    │
│                                                          │
│  ├─ Alert Severity Levels                               │
│  │  [ ✓ Critical ]  [ ✓ Warning ]  [   Info   ]        │
│  └─ [ 🚀 Send Test Alert ]                              │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│                                                          │
│  PagerDuty Alerts                 [ OFF / ON  ]         │
│  Create incidents in PagerDuty                          │
│                                                          │
│  ├─ Alert Severity Levels                               │
│  │  [ ✓ Critical ]  [   Warning ]  [   Info   ]        │
│  └─ [ 🚀 Send Test Alert ]                              │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│                                                          │
│  Email Notifications              [ OFF / ON  ]         │
│  Receive alerts via email                               │
│                                                          │
│  ├─ Alert Severity Levels                               │
│  │  [ ✓ Critical ]  [ ✓ Warning ]  [ ✓ Info   ]        │
│  └─ [ 🚀 Send Test Alert ]                              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 3. Action Buttons
```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│  [ Reset Changes ]           [ ✓ Save Settings ]        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## User Interactions

### Initial Load
1. Component fetches notification settings from API
2. Displays loading skeleton (3 animated cards)
3. Populates form with current configuration
4. Disables channels that aren't configured

### Threshold Configuration
1. User enters numeric values in input fields
2. Values validated (min: 0, appropriate max values)
3. Changes tracked for enable/disable Save button
4. Helper text explains each threshold

### Notification Toggle
1. Click switch to enable/disable channel
2. When enabled, severity level checkboxes appear
3. Test button becomes available
4. Disabled if channel not configured

### Severity Level Selection
1. Click checkbox to include/exclude severity level
2. Multiple selections allowed
3. At least one level should be selected
4. Visual feedback on selection

### Test Alert
1. Click "Send Test Alert" button
2. Button shows loading spinner
3. API sends test notification
4. Toast shows success/error message
5. Returns to ready state

### Save Configuration
1. Make changes to any setting
2. Save button becomes enabled
3. Click Save button
4. Button shows loading spinner
5. API updates all channels
6. Toast confirms success
7. Original state updated (disables Save/Reset)

### Reset Changes
1. Click Reset button
2. All fields revert to last saved state
3. Save/Reset buttons become disabled
4. Toast confirms reset

---

## State Transitions

```
[LOADING] → [READY]
    ↓
[EDITING] ─→ [SAVING] ─→ [READY]
    ↓
[TESTING] ─→ [READY]
    ↓
[RESETTING] → [READY]
```

---

## API Flow

### Initialization
```
GET /api/notifications/settings
  ↓
Response: { configs: [...] }
  ↓
Map to notification preferences
  ↓
Render UI
```

### Test Alert
```
Click Test Button
  ↓
POST /api/notifications/test { configId }
  ↓
Response: { success, channel, messageId }
  ↓
Show toast notification
```

### Save Settings
```
Click Save Button
  ↓
For each channel with changes:
  PATCH /api/notifications/settings {
    configId,
    enabled,
    alertLevels
  }
  ↓
All promises resolve
  ↓
Update original state
  ↓
Show success toast
```

---

## Error Handling

### Load Errors
- Network error → Toast: "Failed to load alert settings"
- 401 Unauthorized → Toast + log error
- 500 Server error → Toast + log error

### Save Errors
- Network error → Toast: "Failed to save alert settings"
- Validation error → Toast with specific error message
- Partial failure → Toast indicates which channel failed

### Test Errors
- Channel not configured → Toast: "[Channel] not configured"
- Network error → Toast: "Failed to send test notification"
- API error → Toast with error details

---

## Loading States

### Component Loading
```
┌─────────────────────────────────────┐
│ [Animated gray box]                 │
│ [Animated gray box]                 │
├─────────────────────────────────────┤
│ [Animated gray box]                 │
│ [Animated gray box]                 │
│ [Animated gray box]                 │
└─────────────────────────────────────┘
```

### Saving State
```
Save button: [ ⟳ Saving... ]
All inputs: Disabled
Other buttons: Disabled
```

### Testing State
```
Test button: [ ⟳ Sending... ]
Specific channel: Disabled during test
Other channels: Remain enabled
```

---

## Responsive Behavior

### Desktop (lg+)
- Thresholds: 2-column grid
- Notification channels: Single column with side-by-side elements
- Action buttons: Right-aligned with gap

### Tablet (md)
- Thresholds: 2-column grid
- Notification channels: Single column
- Action buttons: Right-aligned

### Mobile (sm)
- Thresholds: Single column
- Notification channels: Single column, stacked
- Action buttons: Full width, stacked

---

## Dark Mode Support

All components support dark mode:
- Background colors adjust automatically
- Text colors maintain contrast
- Border colors adapt to theme
- Input fields styled for dark theme
- Cards use theme-appropriate shadows

---

## Accessibility Features

- Semantic HTML structure
- Proper label associations
- Keyboard navigation support
- Focus management
- ARIA attributes via shadcn/ui
- Screen reader compatible
- High contrast color schemes
- Clear error messages

---

## Toast Notifications

### Success Messages
- "Test notification sent via [channel]"
- "Alert settings saved successfully"
- "Settings reset to last saved state"

### Error Messages
- "Failed to load alert settings"
- "Failed to save alert settings"
- "Failed to send test notification"
- "[Channel] notifications are not configured"

### Info Messages
- "Settings reset to last saved state"

---

## Next Steps for Users

1. **First Time Setup:**
   - Configure notification channels via API or admin panel
   - Enter channel-specific credentials (Slack webhook, etc.)
   - Enable channels in AlertConfig
   - Test each channel
   - Save configuration

2. **Regular Use:**
   - Adjust thresholds based on traffic patterns
   - Enable/disable channels as needed
   - Test after configuration changes
   - Monitor notification effectiveness

3. **Troubleshooting:**
   - Use test button to verify connectivity
   - Check API logs if tests fail
   - Verify channel credentials are current
   - Ensure alert levels are appropriate
