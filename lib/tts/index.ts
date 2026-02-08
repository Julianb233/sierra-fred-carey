/**
 * TTS (Text-to-Speech) Controller
 *
 * Browser-native Web Speech API wrapper for FRED voice playback.
 * No external API keys needed -- uses SpeechSynthesis built into
 * modern browsers (Chrome, Edge, Safari, Firefox).
 */

// ============================================================================
// Types
// ============================================================================

export interface TTSOptions {
  /** Speech rate (0.1 - 10). Default 0.9 for natural pacing. */
  rate?: number;
  /** Pitch (0 - 2). Default 1.0. */
  pitch?: number;
  /** Volume (0 - 1). Default 1.0. */
  volume?: number;
  /** Callback when speech starts. */
  onStart?: () => void;
  /** Callback when speech ends naturally. */
  onEnd?: () => void;
  /** Callback on error. */
  onError?: (error: SpeechSynthesisErrorEvent) => void;
}

// ============================================================================
// TTS Controller (singleton)
// ============================================================================

class TTSController {
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  /**
   * Whether the browser supports SpeechSynthesis.
   */
  isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof SpeechSynthesisUtterance !== "undefined"
    );
  }

  /**
   * Whether speech is currently playing.
   */
  isSpeaking(): boolean {
    if (!this.isSupported()) return false;
    return window.speechSynthesis.speaking;
  }

  /**
   * Select the best English voice available.
   * Prefers "Google US English", then any en-US, then any en- voice, then default.
   */
  private pickVoice(): SpeechSynthesisVoice | null {
    if (!this.isSupported()) return null;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    // Priority list
    const googleUS = voices.find((v) => v.name === "Google US English");
    if (googleUS) return googleUS;

    const enUS = voices.find((v) => v.lang === "en-US");
    if (enUS) return enUS;

    const anyEn = voices.find((v) => v.lang.startsWith("en"));
    if (anyEn) return anyEn;

    return voices[0];
  }

  /**
   * Speak the given text. Stops any currently playing speech first.
   */
  speak(text: string, options: TTSOptions = {}): void {
    if (!this.isSupported()) return;

    // Stop previous speech
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);

    // Configure voice
    const voice = this.pickVoice();
    if (voice) {
      utterance.voice = voice;
    }

    // Configure parameters
    utterance.rate = options.rate ?? 0.9;
    utterance.pitch = options.pitch ?? 1.0;
    utterance.volume = options.volume ?? 1.0;

    // Wire up callbacks
    if (options.onStart) {
      utterance.onstart = options.onStart;
    }
    if (options.onEnd) {
      utterance.onend = options.onEnd;
    }
    if (options.onError) {
      utterance.onerror = options.onError;
    }

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Immediately stop any current speech.
   */
  stop(): void {
    if (!this.isSupported()) return;
    window.speechSynthesis.cancel();
    this.currentUtterance = null;
  }
}

/** Singleton TTS controller instance. */
export const tts = new TTSController();
