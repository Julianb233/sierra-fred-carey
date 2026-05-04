"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoIntroStepProps {
  onNext: () => void;
  onSkip: () => void;
}

/**
 * Onboarding video intro step.
 * Plays Fred Cary's welcome video explaining how to use Sahara.
 * Uses a Mux playback ID when available, falls back to a poster/placeholder.
 *
 * The Mux playback ID is configured via NEXT_PUBLIC_ONBOARDING_VIDEO_PLAYBACK_ID.
 * When not set, shows a branded placeholder with a CTA to continue.
 */
export function VideoIntroStep({ onNext, onSkip }: VideoIntroStepProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasWatched, setHasWatched] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const playbackId = process.env.NEXT_PUBLIC_ONBOARDING_VIDEO_PLAYBACK_ID;
  const hasVideo = !!playbackId;

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
      setShowControls(false);
    } else {
      video.pause();
      setIsPlaying(false);
      setShowControls(true);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const pct = (video.currentTime / video.duration) * 100;
    if (pct >= 80) {
      setHasWatched(true);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setHasWatched(true);
    setShowControls(true);
  }, []);

  const handleReplay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play();
    setIsPlaying(true);
    setShowControls(false);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center max-w-3xl mx-auto"
    >
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3"
      >
        Welcome to Sahara
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-lg text-gray-600 dark:text-gray-400 mb-8"
      >
        Watch this quick intro to see how Fred and Sahara can accelerate your founder journey.
      </motion.p>

      {/* Video player */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-video mb-8 shadow-2xl shadow-[#ff6a1a]/10"
        onClick={hasVideo ? togglePlay : undefined}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        {hasVideo ? (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              src={`https://stream.mux.com/${playbackId}.m3u8`}
              poster={`https://image.mux.com/${playbackId}/thumbnail.webp?time=2`}
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
            />

            {/* Play/Pause overlay */}
            {showControls && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/30 flex items-center justify-center cursor-pointer"
              >
                {hasWatched && !isPlaying ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleReplay(); }}
                    className="flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
                  >
                    <RotateCcw className="h-5 w-5" />
                    <span className="font-medium">Replay</span>
                  </button>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#ff6a1a] flex items-center justify-center shadow-lg shadow-[#ff6a1a]/40">
                    {isPlaying ? (
                      <Pause className="h-7 w-7 text-white" />
                    ) : (
                      <Play className="h-7 w-7 text-white ml-1" />
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </>
        ) : (
          /* Placeholder when no video is configured */
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#ff6a1a] to-orange-400 flex items-center justify-center mb-6 shadow-2xl shadow-[#ff6a1a]/30">
              <Play className="h-8 w-8 text-white ml-1" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Your Intro Video Is Coming Soon
            </h3>
            <p className="text-gray-400 max-w-md">
              Fred is recording a personal welcome video to walk you through
              everything Sahara can do for your startup.
            </p>
          </div>
        )}
      </motion.div>

      {/* Key takeaways */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8"
      >
        {[
          { label: "AI-Powered Coaching", desc: "Get real-time guidance from Fred" },
          { label: "Investor Readiness", desc: "Score and improve your pitch" },
          { label: "Virtual Team", desc: "AI agents that do the work" },
        ].map((item) => (
          <div
            key={item.label}
            className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-left"
          >
            <h4 className="font-medium text-sm text-gray-900 dark:text-white">
              {item.label}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {item.desc}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-3"
      >
        <Button
          size="lg"
          onClick={onNext}
          className="w-full sm:w-auto bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
        >
          {hasWatched ? "Continue" : "Continue"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button
          size="lg"
          variant="ghost"
          onClick={onSkip}
          className="w-full sm:w-auto text-gray-500"
        >
          Skip for now
        </Button>
      </motion.div>
    </motion.div>
  );
}
