"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Volume2, Play, Square, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// ============================================================================
// Types & Constants
// ============================================================================

const STORAGE_KEY = "sahara-tts-settings";

const FRED_SAMPLE_QUOTES = [
  "Every great company starts with a founder who refuses to accept the status quo.",
  "The best time to find product-market fit was yesterday. The second best time is today.",
  "Your runway isn't just about money -- it's about the decisions you make with the time you have.",
  "Data tells you what happened. Intuition tells you what to do about it.",
  "The founder's job isn't to have all the answers. It's to ask the right questions.",
] as const;

interface TTSSettings {
  voiceURI: string;
  rate: number;
  pitch: number;
}

const DEFAULT_SETTINGS: TTSSettings = {
  voiceURI: "",
  rate: 0.9,
  pitch: 1.0,
};

// ============================================================================
// Component
// ============================================================================

export function VoiceSettings() {
  const [settings, setSettings] = useState<TTSSettings>(DEFAULT_SETTINGS);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const hasLoadedRef = useRef(false);

  // Check browser support & load voices
  useEffect(() => {
    if (typeof window === "undefined") return;

    const supported =
      "speechSynthesis" in window &&
      typeof SpeechSynthesisUtterance !== "undefined";
    setIsSupported(supported);

    if (!supported) return;

    function loadVoices() {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        // Filter to English voices for better UX, then fall back to all
        const englishVoices = available.filter((v) => v.lang.startsWith("en"));
        setVoices(englishVoices.length > 0 ? englishVoices : available);
      }
    }

    // Voices may load async (Chrome)
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Load saved settings from localStorage on mount
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<TTSSettings>;
        setSettings((prev) => ({
          voiceURI: parsed.voiceURI ?? prev.voiceURI,
          rate: parsed.rate ?? prev.rate,
          pitch: parsed.pitch ?? prev.pitch,
        }));
      }
    } catch {
      // Corrupted localStorage data; use defaults
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: TTSSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      toast.success("Voice settings saved");
    } catch {
      toast.error("Failed to save voice settings");
    }
  }, []);

  // Update a single setting field
  const updateSetting = useCallback(
    <K extends keyof TTSSettings>(key: K, value: TTSSettings[K]) => {
      const updated = { ...settings, [key]: value };
      saveSettings(updated);
    },
    [settings, saveSettings]
  );

  // Test voice with a random Fred Cary quote
  const handleTestVoice = useCallback(() => {
    if (!isSupported) return;

    // Stop if already speaking
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const quote =
      FRED_SAMPLE_QUOTES[Math.floor(Math.random() * FRED_SAMPLE_QUOTES.length)];
    const utterance = new SpeechSynthesisUtterance(quote);

    // Apply settings
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;

    // Find the selected voice
    if (settings.voiceURI) {
      const selectedVoice = window.speechSynthesis
        .getVoices()
        .find((v) => v.voiceURI === settings.voiceURI);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [isSupported, isSpeaking, settings]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
  }, [saveSettings]);

  if (!isSupported) {
    return (
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <Volume2 className="h-4 w-4" />
          <p className="text-sm font-medium">Text-to-Speech Not Available</p>
        </div>
        <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
          Your browser does not support the Web Speech API. Try Chrome, Edge, or Safari.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Voice Selection */}
      <div className="space-y-2">
        <Label htmlFor="voice-select" className="text-sm font-medium">
          Voice
        </Label>
        <Select
          value={settings.voiceURI || "default"}
          onValueChange={(val) =>
            updateSetting("voiceURI", val === "default" ? "" : val)
          }
        >
          <SelectTrigger id="voice-select" className="h-9">
            <SelectValue placeholder="System default" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">System Default</SelectItem>
            {voices.map((voice) => (
              <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          Select the voice FRED uses for text-to-speech playback.
        </p>
      </div>

      {/* Speech Rate */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="speech-rate" className="text-sm font-medium">
            Speech Rate
          </Label>
          <span className="text-xs text-gray-500 font-mono tabular-nums">
            {settings.rate.toFixed(1)}x
          </span>
        </div>
        <input
          id="speech-rate"
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={settings.rate}
          onChange={(e) => updateSetting("rate", parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#ff6a1a]"
        />
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>0.5x (Slow)</span>
          <span>1.0x</span>
          <span>2.0x (Fast)</span>
        </div>
      </div>

      {/* Pitch */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="speech-pitch" className="text-sm font-medium">
            Pitch
          </Label>
          <span className="text-xs text-gray-500 font-mono tabular-nums">
            {settings.pitch.toFixed(1)}
          </span>
        </div>
        <input
          id="speech-pitch"
          type="range"
          min="0.5"
          max="1.5"
          step="0.1"
          value={settings.pitch}
          onChange={(e) => updateSetting("pitch", parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#ff6a1a]"
        />
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>0.5 (Low)</span>
          <span>1.0</span>
          <span>1.5 (High)</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          onClick={handleTestVoice}
          className="bg-[#ff6a1a] hover:bg-[#ff6a1a]/90 text-white"
          size="sm"
        >
          {isSpeaking ? (
            <>
              <Square className="h-3.5 w-3.5 mr-1.5" />
              Stop
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Test Voice
            </>
          )}
        </Button>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Reset Defaults
        </Button>
      </div>
    </div>
  );
}
