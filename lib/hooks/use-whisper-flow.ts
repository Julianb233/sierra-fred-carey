"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// ============================================================================
// useWhisperFlow — Whisper-based voice-to-text hook
//
// Records audio via MediaRecorder, sends to /api/fred/whisper for
// transcription using OpenAI Whisper. Replaces browser Speech Recognition
// with production-grade accuracy.
// ============================================================================

export interface WhisperFlowState {
  /** Whether the microphone is currently recording */
  isRecording: boolean;
  /** Whether the audio is being transcribed */
  isTranscribing: boolean;
  /** Combined recording + transcribing state */
  isProcessing: boolean;
  /** Latest transcription result */
  transcript: string;
  /** Error message if something went wrong */
  error: string | null;
  /** Whether MediaRecorder is supported in this browser */
  isSupported: boolean;
  /** Recording duration in seconds (updates live) */
  duration: number;
  /** Audio level (0-1) for visualizations */
  audioLevel: number;
}

export interface UseWhisperFlowReturn extends WhisperFlowState {
  /** Start recording audio */
  startRecording: () => Promise<void>;
  /** Stop recording and begin transcription */
  stopRecording: () => void;
  /** Toggle recording on/off */
  toggleRecording: () => void;
  /** Clear transcript and error state */
  reset: () => void;
}

interface UseWhisperFlowOptions {
  /** Called when transcription completes successfully */
  onTranscript?: (text: string) => void;
  /** Called on error */
  onError?: (error: string) => void;
  /** Max recording duration in seconds (default: 120) */
  maxDuration?: number;
  /** Auto-send after recording stops (default: false) */
  autoSend?: boolean;
}

// ============================================================================
// Samsung / Android Browser Detection
// ============================================================================

/**
 * Detect Samsung Internet or Samsung Galaxy devices where audio recording
 * cuts off due to aggressive track suspension and incompatible constraints.
 */
function isSamsungDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return (
    ua.includes("samsungbrowser") ||
    ua.includes("samsung") ||
    /sm-[gasn]\d/i.test(navigator.userAgent)
  );
}

// Preferred MIME types in order of quality/compatibility
const MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/wav",
];

function getSupportedMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const type of MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}

export function useWhisperFlow(options: UseWhisperFlowOptions = {}): UseWhisperFlowReturn {
  const { onTranscript, onError, maxDuration = 120 } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const isSupported =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof navigator?.mediaDevices?.getUserMedia === "function" &&
    getSupportedMimeType() !== null;

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Auto-stop at max duration
  useEffect(() => {
    if (isRecording && duration >= maxDuration) {
      stopRecording();
    }
  }, [duration, maxDuration, isRecording]);

  const startAudioLevelMonitoring = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      function updateLevel() {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
        setAudioLevel(Math.min(avg / 128, 1));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      }

      updateLevel();
    } catch {
      // Audio level monitoring is optional — fail silently
    }
  }, []);

  const stopAudioLevelMonitoring = useCallback(() => {
    analyserRef.current = null;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const transcribeAudio = useCallback(
    async (blob: Blob) => {
      setIsTranscribing(true);
      setError(null);

      try {
        // Determine file extension from MIME type
        const ext = blob.type.includes("webm")
          ? "webm"
          : blob.type.includes("mp4")
            ? "mp4"
            : blob.type.includes("ogg")
              ? "ogg"
              : "wav";

        const formData = new FormData();
        formData.append("audio", blob, `recording.${ext}`);

        const response = await fetch("/api/fred/whisper", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `Transcription failed (${response.status})`);
        }

        const data = await response.json();
        const text = data.text?.trim() || "";

        setTranscript(text);
        if (text) {
          onTranscript?.(text);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Transcription failed";
        setError(message);
        onError?.(message);
      } finally {
        setIsTranscribing(false);
      }
    },
    [onTranscript, onError]
  );

  const startRecording = useCallback(async () => {
    setError(null);
    setTranscript("");
    setDuration(0);
    chunksRef.current = [];

    const samsung = isSamsungDevice();

    try {
      // Samsung audio HALs conflict with autoGainControl and specific sampleRates.
      // Use relaxed constraints to prevent the browser from killing the mic track.
      const audioConstraints: MediaTrackConstraints = samsung
        ? {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false,
            channelCount: 1,
          }
        : {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: { ideal: 16000 },
          };

      if (samsung) {
        console.log("[WhisperFlow] Samsung device detected, using compatible audio constraints");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      streamRef.current = stream;
      const mimeType = getSupportedMimeType();

      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        // Stop timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        stopAudioLevelMonitoring();

        // Combine chunks and transcribe
        const blob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });
        chunksRef.current = [];

        if (blob.size > 100) {
          transcribeAudio(blob);
        }
      };

      recorder.onerror = () => {
        setError("Recording failed. Please try again.");
        setIsRecording(false);
        stream.getTracks().forEach((t) => t.stop());
      };

      // Samsung Internet can silently kill the audio track without firing
      // recorder.onerror. Monitor the track's "ended" event to catch this.
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.addEventListener("ended", () => {
          // Only handle unexpected track ends (not user-initiated stops)
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            console.warn("[WhisperFlow] Audio track ended unexpectedly (Samsung suspension)");
            // Stop the recorder gracefully so whatever was captured gets transcribed
            try {
              mediaRecorderRef.current.stop();
            } catch {
              // Recorder may already be stopped
            }
            mediaRecorderRef.current = null;
            setIsRecording(false);
          }
        });

        // Samsung: watch for the track being muted (different from ended).
        // This happens when the notification drawer opens or the tab loses focus.
        if (samsung) {
          audioTrack.addEventListener("mute", () => {
            console.warn("[WhisperFlow] Samsung: audio track muted, track may recover on unmute");
          });
          audioTrack.addEventListener("unmute", () => {
            console.log("[WhisperFlow] Samsung: audio track unmuted, recording continues");
          });
        }
      }

      mediaRecorderRef.current = recorder;
      // Samsung: Use shorter timeslice (500ms) to minimize data loss if the
      // browser suspends the track mid-recording. Other browsers use 1s.
      recorder.start(samsung ? 500 : 1000);
      startTimeRef.current = Date.now();
      setIsRecording(true);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 500);

      // Resume AudioContext first on Samsung (autoplay policy can block it)
      if (samsung) {
        try {
          const ctx = new AudioContext();
          if (ctx.state === "suspended") await ctx.resume();
          await ctx.close();
        } catch {
          // Non-critical — level monitoring may not work but recording still will
        }
      }

      // Start audio level monitoring for visualizations
      startAudioLevelMonitoring(stream);
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        const msg = "Microphone permission denied. Please allow microphone access and try again.";
        setError(msg);
        onError?.(msg);
      } else {
        const msg = "Could not access microphone. Please check your device settings.";
        setError(msg);
        onError?.(msg);
      }
    }
  }, [transcribeAudio, onError, startAudioLevelMonitoring, stopAudioLevelMonitoring]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const reset = useCallback(() => {
    setTranscript("");
    setError(null);
    setDuration(0);
    setAudioLevel(0);
  }, []);

  return {
    isRecording,
    isTranscribing,
    isProcessing: isRecording || isTranscribing,
    transcript,
    error,
    isSupported,
    duration,
    audioLevel,
    startRecording,
    stopRecording,
    toggleRecording,
    reset,
  };
}
