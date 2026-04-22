"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

/**
 * Loom video ID for the "How To Use Sahara" walkthrough.
 * Set NEXT_PUBLIC_LOOM_WALKTHROUGH_ID in Vercel env vars once the recording exists.
 * When unset, the modal renders a friendly "coming soon" placeholder.
 */
const LOOM_VIDEO_ID = process.env.NEXT_PUBLIC_LOOM_WALKTHROUGH_ID || "placeholder"
const LOOM_EMBED_URL = `https://www.loom.com/embed/${LOOM_VIDEO_ID}`

interface HowToUseSaharaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HowToUseSaharaModal({
  open,
  onOpenChange,
}: HowToUseSaharaModalProps) {
  const isPlaceholder = LOOM_VIDEO_ID === "placeholder"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>How To Use Sahara</DialogTitle>
          <DialogDescription>
            Watch this walkthrough to learn how to get the most out of Sahara.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6">
          {isPlaceholder ? (
            <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex flex-col items-center justify-center text-center p-8 gap-3">
              <div className="text-4xl">🎬</div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Walkthrough video coming soon
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md">
                We&apos;re recording a comprehensive guide to help you navigate
                Sahara. In the meantime, try chatting with your AI Mentor — just
                click &quot;Chat with Mentor&quot; in the sidebar!
              </p>
            </div>
          ) : (
            <div className="aspect-video rounded-lg overflow-hidden">
              <iframe
                src={LOOM_EMBED_URL}
                title="How To Use Sahara — Walkthrough"
                frameBorder="0"
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture"
                className="w-full h-full"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
