"use client"

/**
 * Phase 165 SITE-01/02: Live microsite preview with graceful fallbacks
 */

import { cn } from "@/lib/utils"
import { Globe, Mail, Phone, MapPin, Quote } from "lucide-react"
import type { MicrositeBranding, MicrositeContent } from "@/lib/microsite/types"

interface MicrositePreviewProps {
  template: string
  branding: MicrositeBranding
  content: MicrositeContent
  className?: string
  scale?: number
}

export function MicrositePreview({
  branding,
  content,
  className,
  scale = 0.5,
}: MicrositePreviewProps) {
  const { hero, about, services, testimonials, contact } = content
  const primaryColor = branding.primary_color || "#ff6a1a"
  const secondaryColor = branding.secondary_color || "#1a1a2e"

  return (
    <div
      className={cn("relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white", className)}
    >
      {/* Scale wrapper */}
      <div
        className="origin-top-left"
        style={{
          transform: `scale(${scale})`,
          width: `${100 / scale}%`,
          height: `${100 / scale}%`,
        }}
      >
        {/* Hero Section */}
        <div
          className="relative px-8 py-16 text-center"
          style={{ backgroundColor: secondaryColor }}
        >
          {branding.logo_url && (
            <img
              src={branding.logo_url}
              alt="Logo"
              className="h-10 mx-auto mb-6 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
            />
          )}
          <h1
            className="text-3xl font-bold text-white mb-3"
            style={{ fontFamily: branding.font_heading }}
          >
            {hero.headline || "Your Headline"}
          </h1>
          <p
            className="text-lg text-white/80 max-w-2xl mx-auto mb-6"
            style={{ fontFamily: branding.font_body }}
          >
            {hero.subheadline || "Your subheadline goes here"}
          </p>
          {hero.cta_text && (
            <span
              className="inline-block px-6 py-3 rounded-lg text-white font-medium text-sm"
              style={{ backgroundColor: primaryColor }}
            >
              {hero.cta_text}
            </span>
          )}
        </div>

        {/* About Section */}
        {about.text && (
          <div className="px-8 py-12">
            <h2
              className="text-2xl font-bold mb-4"
              style={{ color: secondaryColor, fontFamily: branding.font_heading }}
            >
              About Us
            </h2>
            <div className="flex gap-6 items-start">
              <p
                className="text-gray-600 flex-1 leading-relaxed"
                style={{ fontFamily: branding.font_body }}
              >
                {about.text}
              </p>
              {about.image_url && (
                <img
                  src={about.image_url}
                  alt="About"
                  className="w-48 h-32 object-cover rounded-lg shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                />
              )}
            </div>
          </div>
        )}

        {/* Services Section */}
        {services.length > 0 && (
          <div className="px-8 py-12 bg-gray-50">
            <h2
              className="text-2xl font-bold mb-6 text-center"
              style={{ color: secondaryColor, fontFamily: branding.font_heading }}
            >
              Our Services
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {services.map((service, i) => (
                <div
                  key={i}
                  className="bg-white p-5 rounded-lg shadow-sm border border-gray-100"
                >
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-sm font-bold mb-3"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {i + 1}
                  </div>
                  <h3
                    className="font-semibold text-sm mb-1"
                    style={{ fontFamily: branding.font_heading }}
                  >
                    {service.title || `Service ${i + 1}`}
                  </h3>
                  <p
                    className="text-xs text-gray-500"
                    style={{ fontFamily: branding.font_body }}
                  >
                    {service.description || "Description"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Testimonials Section */}
        {testimonials.length > 0 && (
          <div className="px-8 py-12">
            <h2
              className="text-2xl font-bold mb-6 text-center"
              style={{ color: secondaryColor, fontFamily: branding.font_heading }}
            >
              What People Say
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {testimonials.map((t, i) => (
                <div key={i} className="bg-gray-50 p-5 rounded-lg">
                  <Quote
                    className="h-5 w-5 mb-2"
                    style={{ color: primaryColor }}
                  />
                  <p
                    className="text-sm text-gray-700 italic mb-3"
                    style={{ fontFamily: branding.font_body }}
                  >
                    &ldquo;{t.quote || "Testimonial"}&rdquo;
                  </p>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {(t.author || "?")[0]}
                    </div>
                    <div>
                      <p className="text-xs font-medium">{t.author || "Author"}</p>
                      {t.role && (
                        <p className="text-xs text-gray-500">{t.role}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Section */}
        <div
          className="px-8 py-12 text-center"
          style={{ backgroundColor: secondaryColor }}
        >
          <h2
            className="text-2xl font-bold text-white mb-4"
            style={{ fontFamily: branding.font_heading }}
          >
            Get In Touch
          </h2>
          <div className="flex flex-wrap justify-center gap-6 text-white/80 text-sm">
            {contact.email && (
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> {contact.email}
              </span>
            )}
            {contact.phone && (
              <span className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> {contact.phone}
              </span>
            )}
            {contact.address && (
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> {contact.address}
              </span>
            )}
            {!contact.email && !contact.phone && !contact.address && (
              <span className="flex items-center gap-2">
                <Globe className="h-4 w-4" /> Add your contact details
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
