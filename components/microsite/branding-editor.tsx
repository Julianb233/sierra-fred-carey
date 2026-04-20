"use client"

/**
 * Phase 165 SITE-03: Branding editor — logo, colors, fonts
 */

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FONT_OPTIONS } from "@/lib/microsite/types"
import type { MicrositeBranding } from "@/lib/microsite/types"

interface BrandingEditorProps {
  branding: MicrositeBranding
  onChange: (branding: MicrositeBranding) => void
}

export function BrandingEditor({ branding, onChange }: BrandingEditorProps) {
  const update = (field: keyof MicrositeBranding, value: string) => {
    onChange({ ...branding, [field]: value })
  }

  return (
    <div className="space-y-6">
      {/* Logo URL */}
      <div className="space-y-2">
        <Label htmlFor="logo_url">Logo URL</Label>
        <Input
          id="logo_url"
          type="url"
          placeholder="https://example.com/logo.png"
          value={branding.logo_url || ""}
          onChange={(e) => update("logo_url", e.target.value)}
        />
        <p className="text-xs text-gray-500">
          Enter a URL for your company logo (PNG, SVG, or WebP recommended)
        </p>
      </div>

      {/* Colors */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Brand Colors</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primary_color">Primary</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="primary_color"
                value={branding.primary_color}
                onChange={(e) => update("primary_color", e.target.value)}
                className="h-9 w-12 rounded border border-gray-200 dark:border-gray-700 cursor-pointer"
              />
              <Input
                value={branding.primary_color}
                onChange={(e) => update("primary_color", e.target.value)}
                className="font-mono text-sm"
                maxLength={7}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondary_color">Secondary</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="secondary_color"
                value={branding.secondary_color}
                onChange={(e) => update("secondary_color", e.target.value)}
                className="h-9 w-12 rounded border border-gray-200 dark:border-gray-700 cursor-pointer"
              />
              <Input
                value={branding.secondary_color}
                onChange={(e) => update("secondary_color", e.target.value)}
                className="font-mono text-sm"
                maxLength={7}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="accent_color">Accent</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="accent_color"
                value={branding.accent_color}
                onChange={(e) => update("accent_color", e.target.value)}
                className="h-9 w-12 rounded border border-gray-200 dark:border-gray-700 cursor-pointer"
              />
              <Input
                value={branding.accent_color}
                onChange={(e) => update("accent_color", e.target.value)}
                className="font-mono text-sm"
                maxLength={7}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Color Preview */}
      <div className="flex gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
        <div
          className="h-10 flex-1 rounded"
          style={{ backgroundColor: branding.primary_color }}
        />
        <div
          className="h-10 flex-1 rounded"
          style={{ backgroundColor: branding.secondary_color }}
        />
        <div
          className="h-10 flex-1 rounded"
          style={{ backgroundColor: branding.accent_color }}
        />
      </div>

      {/* Fonts */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Typography</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Heading Font</Label>
            <Select
              value={branding.font_heading}
              onValueChange={(v) => update("font_heading", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((font) => (
                  <SelectItem key={font} value={font}>
                    {font}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Body Font</Label>
            <Select
              value={branding.font_body}
              onValueChange={(v) => update("font_body", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((font) => (
                  <SelectItem key={font} value={font}>
                    {font}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}
