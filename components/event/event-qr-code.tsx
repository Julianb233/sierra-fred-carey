"use client"

/**
 * Event QR Code Component
 * Phase 88: Event Launch Kit
 *
 * Renders a branded QR code linking to the event landing page.
 * Uses qrcode.react for reliable QR generation.
 */

import { QRCodeSVG } from "qrcode.react"
import type { EventConfig } from "@/lib/event/config"

interface EventQRCodeProps {
  config: EventConfig
  /** Base URL for the site (defaults to joinsahara.com) */
  baseUrl?: string
  /** QR code size in pixels */
  size?: number
}

export function EventQRCode({
  config,
  baseUrl = "https://joinsahara.com",
  size = 256,
}: EventQRCodeProps) {
  const url = `${baseUrl}${config.landingPath}`

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="p-4 bg-white rounded-2xl shadow-lg">
        <QRCodeSVG
          value={url}
          size={size}
          level="M"
          bgColor="#ffffff"
          fgColor="#0a0a0a"
          includeMargin={false}
        />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-gray-300">
          Scan to get started
        </p>
        <p className="text-xs text-gray-500 mt-1">{url}</p>
      </div>
    </div>
  )
}
