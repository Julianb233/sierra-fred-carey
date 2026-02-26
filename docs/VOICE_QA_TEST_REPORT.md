# Voice Integration QA Test Report

## End-to-End Testing Across Devices & Browsers

**Linear:** AI-906
**Date:** 2026-02-25
**Source:** Sahara Founders Meeting (53:00 timestamp)
**Priority:** P2
**Status:** Manual QA plan with code-level findings

---

## 1. Architecture Overview

The Sahara voice integration consists of three layers:

| Layer | Component | Technology | Files |
|-------|-----------|------------|-------|
| **Voice Input (STT)** | Whisper Flow | MediaRecorder API + OpenAI Whisper | `lib/hooks/use-whisper-flow.ts`, `app/api/fred/whisper/route.ts` |
| **Voice Input (Legacy)** | Browser Speech Recognition | Web Speech API (SpeechRecognition) | `lib/hooks/use-voice-input.ts` |
| **Voice Output (TTS)** | Text-to-Speech | Web Speech Synthesis API | `lib/tts.ts`, `components/chat/tts-button.tsx`, `components/settings/voice-settings.tsx` |
| **Live Voice Agent** | LiveKit Voice Agent | LiveKit + OpenAI | `lib/voice-agent.ts`, `app/api/livekit/token/route.ts` |

**Primary flow (Whisper Flow):** User taps mic → MediaRecorder captures audio (webm/mp4/ogg/wav) → blob sent to `/api/fred/whisper` → OpenAI Whisper transcription → text injected into chat input → sent to Fred AI.

**UI entry points:**
- `ChatInput` component — inline mic button (when `showVoiceInput=true`)
- `VoiceChatOverlay` — full-screen immersive recording overlay (from floating chat widget)

---

## 2. Test Cases

### TC-01: Voice Input on Chrome Desktop

| # | Step | Expected Result | Status |
|---|------|-----------------|--------|
| 1 | Open Sahara chat on Chrome Desktop (v120+) | Chat interface loads with mic button visible | |
| 2 | Click mic button | Browser prompts for microphone permission | |
| 3 | Grant microphone permission | Recording starts; red pulsing indicator + waveform visualization appears; duration counter ticks up | |
| 4 | Speak a clear sentence ("I need help with my pitch deck") | Audio level bars react to voice volume in real-time | |
| 5 | Click stop button (Square icon) | Recording stops; "Transcribing with Whisper..." indicator appears | |
| 6 | Wait for transcription | Transcribed text appears in chat textarea; focus moves to textarea | |
| 7 | Press Enter or click Send | Message sent to Fred; Fred responds | |

**Code-level notes:**
- Chrome supports `audio/webm;codecs=opus` (first preference in `MIME_TYPES` array)
- `MediaRecorder` is well-supported on Chrome Desktop
- Audio constraints: `echoCancellation: true`, `noiseSuppression: true`, `autoGainControl: true`, `sampleRate: 16000`
- Data collected every 1000ms (`recorder.start(1000)`)

**Potential issues to verify:**
- [ ] Mic button only renders when `showVoiceInput={true}` — confirm this prop is passed in all chat entry points
- [ ] Verify `isSupported` check passes (requires `MediaRecorder`, `getUserMedia`, and a supported MIME type)

---

### TC-02: Voice Input on Safari Mobile (iOS)

| # | Step | Expected Result | Status |
|---|------|-----------------|--------|
| 1 | Open Sahara on Safari iOS (16+) | Chat loads; mic button visible with 44x44px touch target | |
| 2 | Tap mic button | iOS permission dialog appears | |
| 3 | Allow microphone access | Recording starts; visual feedback visible | |
| 4 | Speak a sentence | Audio level visualization responds | |
| 5 | Tap stop | Transcription begins | |
| 6 | Review transcribed text | Text appears correctly | |
| 7 | Tap Send to Fred | Message sent successfully | |

**Code-level notes & risks:**
- **Safari MIME type compatibility:** Safari does NOT support `audio/webm`. The hook falls through to `audio/mp4` or `audio/wav`. Verify `getSupportedMimeType()` returns a valid type on Safari.
- **Touch targets:** Buttons are 44x44px minimum (`min-h-[44px] min-w-[44px]`), meeting Apple HIG requirements.
- **AudioContext restriction:** Safari requires user gesture to create `AudioContext`. The `startAudioLevelMonitoring` function creates one — verify it doesn't throw on iOS. The code has a `try/catch` that fails silently, so audio visualization may not work but recording should still function.
- **Auto-start in overlay:** `VoiceChatOverlay` auto-starts recording after 300ms delay. On iOS, `getUserMedia` may require direct user gesture — this auto-start may fail. The overlay should gracefully show the "Tap the microphone to start" state instead.

**Critical Safari-specific checks:**
- [ ] `MediaRecorder` is available (Safari 14.5+ on iOS)
- [ ] Audio format accepted by Whisper API (mp4/wav fallback works)
- [ ] File extension matches actual content type sent to `/api/fred/whisper`
- [ ] Recording works after screen lock/unlock
- [ ] Voice overlay works in both portrait and landscape

---

### TC-03: Transcription Accuracy

| # | Test Phrase | Expected Transcription | Notes |
|---|-------------|----------------------|-------|
| 1 | "I need help with my startup pitch deck" | Exact or near-exact match | Basic English |
| 2 | "My company's ARR is two point five million dollars" | Number formatting correct | Numbers + abbreviations |
| 3 | "How do I set up a Series A fundraising round?" | Business jargon accuracy | Startup terminology |
| 4 | "Fred, what would you recommend for product-market fit?" | Proper nouns + compound terms | Named entity + hyphenated term |
| 5 | "I'm based in San Diego and targeting the healthcare vertical" | Geographic + industry terms | Proper nouns |
| 6 | (Background noise: coffee shop ambient) | Reasonable transcription despite noise | Noise robustness |
| 7 | (Accented English: non-native speaker) | Intelligible transcription | Accent handling |
| 8 | (Whispered/quiet speech) | Detects speech or returns empty gracefully | Edge case |

**Code-level notes:**
- Using OpenAI `whisper-1` model with `language: "en"` and `response_format: "verbose_json"`
- The API returns `text`, `duration`, and `language` fields
- Empty recordings (< 100 bytes) return `{ text: "", duration: 0 }` without hitting Whisper — good optimization
- Max file size enforced: 25 MB (matches OpenAI limit)

**Accuracy verification method:**
1. Record 10 test phrases across quiet + noisy environments
2. Compare Whisper output to ground truth
3. Calculate Word Error Rate (WER)
4. Target: < 10% WER for clear speech, < 20% for noisy environments

---

### TC-04: Latency — Voice-to-Response

| Segment | Measurement Point | Target | Method |
|---------|-------------------|--------|--------|
| **Recording start** | Mic button tap → visual feedback | < 500ms | Timestamp in devtools |
| **Recording stop** | Stop button → "Transcribing..." indicator | < 200ms | UI state transition |
| **Transcription** | Audio blob sent → Whisper response received | < 3s (for 10s clip) | Network tab timing |
| **Text injection** | Whisper response → text appears in textarea | < 100ms | React state update |
| **Fred response** | Message sent → first token of Fred's reply | Depends on LLM | Separate from voice pipeline |

**End-to-end target:** Tap mic → speak 5 seconds → tap stop → transcribed text in textarea: **< 5 seconds total processing time**

**Code-level analysis:**
- `MediaRecorder.start(1000)` collects data every 1s — on stop, all chunks are combined into a single blob
- Blob is sent as `FormData` to `/api/fred/whisper` (server-side)
- Server creates OpenAI client and calls `openai.audio.transcriptions.create()` — this is the bottleneck
- No streaming transcription — entire audio is processed at once
- 120-second max recording = potentially large files; verify latency doesn't degrade for long recordings

**Latency test matrix:**

| Recording Length | Expected Transcription Time | Verify |
|-----------------|---------------------------|--------|
| 3 seconds | < 2s | |
| 10 seconds | < 3s | |
| 30 seconds | < 5s | |
| 60 seconds | < 8s | |
| 120 seconds (max) | < 15s | |

---

### TC-05: Fallback to Text if Voice Fails

| # | Failure Scenario | Expected Behavior | Code Reference |
|---|-----------------|-------------------|----------------|
| 1 | Microphone permission denied | Error: "Microphone permission denied. Please allow microphone access and try again." Toast appears; text input remains functional | `startRecording` catch block — `NotAllowedError` |
| 2 | No microphone hardware | Error: "Could not access microphone. Please check your device settings." Text input works | `startRecording` catch block — generic error |
| 3 | `MediaRecorder` not supported (old browser) | Mic button does not render (`isSupported` = false); text-only input available | `getSupportedMimeType()` returns null |
| 4 | `getUserMedia` not available (HTTP, not HTTPS) | `isSupported` = false; mic button hidden; text input works | `navigator?.mediaDevices?.getUserMedia` check |
| 5 | Whisper API key not configured | Server returns 503: "Voice transcription is not configured"; error toast shown | `POST /api/fred/whisper` — no `OPENAI_API_KEY` |
| 6 | Whisper API rate limited | Error: "Too many requests. Please try again in a moment." User can retry or type | `OpenAI.APIError` status 429 handling |
| 7 | Whisper API failure (500) | Error: "Failed to transcribe audio"; error toast; text input remains usable | Generic catch in API route |
| 8 | Network disconnection mid-transcription | Fetch fails; error caught in `transcribeAudio`; error message shown | `useWhisperFlow` try/catch |
| 9 | Recording too short (empty blob) | Blob < 100 bytes → server returns empty text; no error shown | Size check in API route |
| 10 | Recording exceeds max duration (120s) | Auto-stops recording at 120s; transcription proceeds normally | `useEffect` with `duration >= maxDuration` |

**Key fallback design principle:** The text input (`<textarea>`) is always available and never disabled by voice failures. Voice is an enhancement, not a replacement.

---

## 3. Browser Compatibility Matrix

| Browser | Voice Input (Whisper Flow) | Voice Input (Legacy SR) | TTS Output | LiveKit Voice | Notes |
|---------|--------------------------|------------------------|------------|---------------|-------|
| Chrome Desktop 120+ | Supported (webm/opus) | Supported | Supported | Supported | Primary target |
| Chrome Android 120+ | Supported (webm/opus) | Supported | Supported | Supported | |
| Safari Desktop 17+ | Supported (mp4/wav) | Supported (webkit prefix) | Supported | Supported | webm unsupported |
| Safari iOS 16+ | Supported (mp4/wav) | Supported (webkit prefix) | Supported | Supported | AudioContext needs gesture |
| Firefox Desktop 120+ | Supported (webm/opus) | NOT supported | Supported | Supported | No SpeechRecognition API |
| Edge Desktop 120+ | Supported (webm/opus) | Supported | Supported | Supported | Chromium-based |
| Samsung Internet | Likely supported | Likely supported | Supported | Unknown | Needs testing |

---

## 4. Component-Level Test Inventory

### 4.1 `useWhisperFlow` Hook (lib/hooks/use-whisper-flow.ts)

**Unit tests needed:**

```
- [ ] Returns isSupported=true when MediaRecorder + getUserMedia available
- [ ] Returns isSupported=false in unsupported environments
- [ ] startRecording requests microphone with correct constraints
- [ ] stopRecording stops MediaRecorder and triggers transcription
- [ ] toggleRecording starts when not recording
- [ ] toggleRecording stops when recording
- [ ] duration increments every 500ms during recording
- [ ] audioLevel updates from AnalyserNode frequency data
- [ ] Auto-stops at maxDuration (default 120s)
- [ ] Calls onTranscript callback with text on success
- [ ] Calls onError callback on failure
- [ ] Sets error state on permission denial (NotAllowedError)
- [ ] Sets error state on generic microphone failure
- [ ] reset() clears transcript, error, duration, audioLevel
- [ ] Cleanup stops all tracks and timers on unmount
- [ ] Empty recording (< 100 bytes) doesn't call transcribeAudio
- [ ] Handles 429 rate limit from Whisper API
```

### 4.2 `VoiceChatButton` Component (components/chat/voice-chat-button.tsx)

```
- [ ] Renders mic icon in idle state
- [ ] Renders square (stop) icon when recording
- [ ] Renders spinner when transcribing
- [ ] Shows pulsing rings when recording
- [ ] Shows duration label when recording
- [ ] Shows "Transcribing..." label when transcribing
- [ ] Disabled state (opacity + cursor)
- [ ] Disabled when isTranscribing=true
- [ ] "inline" variant: 44x44px size
- [ ] "prominent" variant: 64x64px size
- [ ] Correct aria-labels for all states
- [ ] onClick fires on tap/click
```

### 4.3 `VoiceChatOverlay` Component (components/chat/voice-chat-overlay.tsx)

```
- [ ] Auto-starts recording on open (300ms delay)
- [ ] Shows "Talk to Fred" title in idle state
- [ ] Shows "Listening..." when recording
- [ ] Shows "Transcribing..." during transcription
- [ ] Shows "Ready to send" when transcript available
- [ ] Displays transcribed text in preview box
- [ ] "Stop & Send" button stops recording and auto-sends on transcript
- [ ] "Record More" resets and starts new recording
- [ ] "Send to Fred" sends transcribed text and closes overlay
- [ ] Close button stops recording if active and closes
- [ ] Clicking backdrop closes overlay (only when not recording)
- [ ] Handles unsupported browser gracefully
```

### 4.4 `ChatInput` Voice Integration (components/chat/chat-input.tsx)

```
- [ ] Mic button renders when showVoiceInput=true && isSupported
- [ ] Mic button hidden when showVoiceInput=false
- [ ] Recording indicator banner appears during recording
- [ ] "Transcribing with Whisper..." banner during transcription
- [ ] Transcribed text appended to textarea content
- [ ] Textarea disabled during recording
- [ ] Textarea placeholder changes to "Listening..." during recording
- [ ] Mic button disabled during loading (isLoading=true)
- [ ] Mic button disabled during transcription
- [ ] Error toast shown on voice error
- [ ] Focus returns to textarea after transcription completes
```

### 4.5 Whisper API Route (app/api/fred/whisper/route.ts)

```
- [ ] Returns 503 if OPENAI_API_KEY not set
- [ ] Returns 400 if no audio file in form data
- [ ] Returns 413 if audio file > 25 MB
- [ ] Returns { text: "", duration: 0 } for files < 100 bytes
- [ ] Returns transcription for valid webm audio
- [ ] Returns transcription for valid mp4 audio
- [ ] Returns transcription for valid wav audio
- [ ] Returns 429 on OpenAI rate limit
- [ ] Returns 500 on generic OpenAI error
- [ ] Response includes text, duration, language fields
```

### 4.6 LiveKit Token Route (app/api/livekit/token/route.ts)

```
- [ ] Returns 401 if not authenticated
- [ ] Returns 403 if user tier < Studio
- [ ] Returns 400 if roomName or participantName missing
- [ ] Returns 400 for invalid roomName characters
- [ ] Scopes room name with userId prefix
- [ ] Returns valid JWT token
- [ ] Token includes correct room grants
- [ ] Recording permission only when enableRecording=true
```

### 4.7 Voice Settings (components/settings/voice-settings.tsx)

```
- [ ] Shows "Not Available" message when TTS unsupported
- [ ] Lists English voices from browser
- [ ] Voice selection persists to localStorage
- [ ] Rate slider range: 0.5x - 2.0x
- [ ] Pitch slider range: 0.5 - 1.5
- [ ] "Test Voice" plays a Fred Cary sample quote
- [ ] "Stop" button stops TTS playback
- [ ] "Reset Defaults" restores rate=0.9, pitch=1.0
- [ ] Handles corrupted localStorage gracefully
```

---

## 5. Code-Level Findings & Recommendations

### Issues Found

| # | Severity | Finding | File | Recommendation |
|---|----------|---------|------|----------------|
| 1 | **Medium** | `VoiceChatOverlay` auto-starts recording on open, which may fail on Safari iOS (requires direct user gesture for `getUserMedia`). | `voice-chat-overlay.tsx:61` | Add a try/catch around `startRecording()` in the `useEffect`, and if it fails, show the "Tap the microphone to start" state instead of silently failing. |
| 2 | **Low** | `useWhisperFlow` `stopRecording` effect dependency is missing from the auto-stop `useEffect`. | `use-whisper-flow.ts:111-112` | `// eslint-disable-line` would silence, but the dependency is intentional — no action needed, just note for future refactors. |
| 3 | **Low** | `use-voice-input.ts` (legacy hook) has no error user feedback — `onerror` silently sets `isListening = false`. | `use-voice-input.ts:59` | If this hook is still used anywhere, add an `onError` callback. If it's fully replaced by Whisper Flow, consider deprecation/removal. |
| 4 | **Info** | TTS voice settings load voices asynchronously (Chrome fires `voiceschanged` event). First render may show empty voice list. | `voice-settings.tsx:74` | Already handled correctly with `onvoiceschanged` listener. |
| 5 | **Medium** | No client-side audio format validation before sending to Whisper. A corrupted or unsupported blob would result in a 500 from OpenAI. | `use-whisper-flow.ts:149-191` | Consider adding a check that the blob has a reasonable size relative to duration (e.g., > 1KB per second of audio). |
| 6 | **Info** | `VoiceChatOverlay` `useEffect` for auto-start has an ESLint disable comment for exhaustive deps. | `voice-chat-overlay.tsx:66` | Intentional to prevent re-triggering. Document why in a code comment. |

### Positive Patterns Observed

- Touch targets meet 44x44px minimum (Apple HIG compliant)
- Comprehensive ARIA labels for all button states (`aria-label` on recording/transcribing/idle)
- Graceful degradation: mic button hidden entirely when not supported
- Error handling at every layer (client hook, API route, UI toast)
- Audio level visualization provides real-time feedback that recording is active
- 120-second max duration prevents runaway recordings
- Empty recording detection (< 100 bytes) avoids wasting API calls

---

## 6. Manual Test Execution Checklist

### Pre-conditions
- [ ] Sahara app deployed to a staging URL with HTTPS
- [ ] `OPENAI_API_KEY` configured in environment
- [ ] `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` configured (for LiveKit tests)
- [ ] Test devices available: Chrome Desktop, Safari iOS (iPhone/iPad), Chrome Android

### Test Execution

#### Round 1: Chrome Desktop (Primary)
- [ ] TC-01: Voice input full flow
- [ ] TC-03: Transcription accuracy (5 test phrases)
- [ ] TC-04: Latency measurement (3s, 10s, 30s clips)
- [ ] TC-05: Fallback scenarios (deny permission, revoke mid-recording)
- [ ] Voice overlay full flow (open → record → stop → send)
- [ ] TTS playback on Fred's response
- [ ] Voice settings: change voice, rate, pitch, test, reset

#### Round 2: Safari Mobile (iOS)
- [ ] TC-02: Voice input full flow
- [ ] TC-03: Transcription accuracy (3 test phrases)
- [ ] TC-04: Latency measurement (3s, 10s clips)
- [ ] TC-05: Permission denial fallback
- [ ] Voice overlay auto-start behavior (may require manual tap)
- [ ] Landscape vs portrait orientation
- [ ] Screen lock → unlock → resume recording
- [ ] Low battery / low power mode impact

#### Round 3: Chrome Android
- [ ] Voice input full flow
- [ ] Transcription accuracy (3 test phrases)
- [ ] Touch target accessibility (44x44px verification)
- [ ] Fallback on permission denial

#### Round 4: Edge Cases
- [ ] Record in noisy environment (coffee shop, street)
- [ ] Record very quietly (whisper)
- [ ] Switch tabs while recording → return
- [ ] Slow network (3G simulation) — transcription latency
- [ ] Offline → voice button behavior
- [ ] Multiple rapid tap mic on/off/on/off
- [ ] Send empty recording (tap mic → immediately tap stop)
- [ ] Max duration recording (120 seconds)

---

## 7. Automated Test Recommendations

### Unit Tests (Vitest)

Priority tests to write for the voice pipeline:

```typescript
// tests/hooks/use-whisper-flow.test.ts
describe('useWhisperFlow', () => {
  it('reports isSupported=false when MediaRecorder unavailable');
  it('requests mic with echoCancellation, noiseSuppression, autoGainControl');
  it('sends audio blob to /api/fred/whisper');
  it('calls onTranscript with returned text');
  it('calls onError on permission denial');
  it('auto-stops at maxDuration');
  it('resets state on reset()');
});

// tests/api/whisper.test.ts
describe('POST /api/fred/whisper', () => {
  it('returns 503 without OPENAI_API_KEY');
  it('returns 400 without audio file');
  it('returns 413 for oversized file');
  it('returns empty text for tiny file');
  it('returns transcription for valid audio');
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/voice-chat.spec.ts
test('voice input records and transcribes', async ({ page, context }) => {
  // Grant microphone permission
  await context.grantPermissions(['microphone']);
  await page.goto('/chat');

  // Click mic button
  await page.click('[aria-label="Voice input (Whisper)"]');

  // Verify recording state
  await expect(page.locator('text=Recording')).toBeVisible();

  // Wait and stop
  await page.waitForTimeout(3000);
  await page.click('[aria-label="Stop recording"]');

  // Verify transcription state
  await expect(page.locator('text=Transcribing')).toBeVisible();
});
```

---

## 8. Summary

### What Works Well
- **Architecture is solid**: Whisper Flow (server-side transcription) is the right choice over browser SpeechRecognition for production accuracy
- **Error handling is comprehensive**: Every failure mode has a user-facing message and graceful fallback to text
- **Mobile-first touch targets**: 44x44px buttons meet accessibility guidelines
- **ARIA labels**: Full accessibility coverage for screen readers
- **Audio format fallback**: Tries webm → mp4 → ogg → wav to maximize browser compatibility

### Risk Areas
1. **Safari iOS auto-start**: The overlay's auto-record may not work without direct user gesture — needs manual testing
2. **Long recording latency**: 120-second recordings could create large blobs with slow transcription — needs latency benchmarking
3. **No offline indicator**: If the user records while offline, they'll only see the error after stopping — could add a network check before recording
4. **Legacy `useVoiceInput` hook**: Still exists but appears unused in primary flows — should be deprecated or removed to reduce confusion

### Recommended Next Steps
1. Execute manual test checklist (Section 6) on Chrome Desktop + Safari iOS
2. Write unit tests for `useWhisperFlow` hook and Whisper API route
3. Address the Safari auto-start issue (Finding #1)
4. Benchmark latency for recordings of various lengths
5. Add client-side network check before starting transcription

---

*Report generated: 2026-02-25*
*Linear: AI-906*
