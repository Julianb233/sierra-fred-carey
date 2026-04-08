"use client"

/**
 * Phase 165 SITE-01/04: Content editor for microsite sections
 */

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, GripVertical } from "lucide-react"
import type { MicrositeContent, Service, Testimonial } from "@/lib/microsite/types"

interface ContentEditorProps {
  content: MicrositeContent
  onChange: (content: MicrositeContent) => void
}

export function ContentEditor({ content, onChange }: ContentEditorProps) {
  const [activeSection, setActiveSection] = useState<string>("hero")

  const updateHero = (field: string, value: string) => {
    onChange({ ...content, hero: { ...content.hero, [field]: value } })
  }

  const updateAbout = (field: string, value: string) => {
    onChange({ ...content, about: { ...content.about, [field]: value } })
  }

  const updateService = (index: number, field: keyof Service, value: string) => {
    const services = [...content.services]
    services[index] = { ...services[index], [field]: value }
    onChange({ ...content, services })
  }

  const addService = () => {
    onChange({
      ...content,
      services: [...content.services, { title: "", description: "" }],
    })
  }

  const removeService = (index: number) => {
    onChange({
      ...content,
      services: content.services.filter((_, i) => i !== index),
    })
  }

  const updateTestimonial = (index: number, field: keyof Testimonial, value: string) => {
    const testimonials = [...content.testimonials]
    testimonials[index] = { ...testimonials[index], [field]: value }
    onChange({ ...content, testimonials })
  }

  const addTestimonial = () => {
    onChange({
      ...content,
      testimonials: [...content.testimonials, { quote: "", author: "" }],
    })
  }

  const removeTestimonial = (index: number) => {
    onChange({
      ...content,
      testimonials: content.testimonials.filter((_, i) => i !== index),
    })
  }

  const updateContact = (field: string, value: string | boolean) => {
    onChange({ ...content, contact: { ...content.contact, [field]: value } })
  }

  const sections = [
    { id: "hero", label: "Hero" },
    { id: "about", label: "About" },
    { id: "services", label: "Services" },
    { id: "testimonials", label: "Testimonials" },
    { id: "contact", label: "Contact" },
  ]

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Section nav */}
      <div className="flex sm:flex-col gap-1 sm:w-40 shrink-0">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActiveSection(section.id)}
            className={`px-3 py-2 rounded-lg text-sm text-left transition-colors ${
              activeSection === section.id
                ? "bg-[#ff6a1a]/10 text-[#ff6a1a] font-medium"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      <div className="flex-1 min-w-0">
        {activeSection === "hero" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Headline</Label>
              <Input
                value={content.hero.headline}
                onChange={(e) => updateHero("headline", e.target.value)}
                placeholder="Your main headline"
              />
            </div>
            <div className="space-y-2">
              <Label>Subheadline</Label>
              <Textarea
                value={content.hero.subheadline}
                onChange={(e) => updateHero("subheadline", e.target.value)}
                placeholder="A brief description"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CTA Button Text</Label>
                <Input
                  value={content.hero.cta_text}
                  onChange={(e) => updateHero("cta_text", e.target.value)}
                  placeholder="Get Started"
                />
              </div>
              <div className="space-y-2">
                <Label>CTA Link</Label>
                <Input
                  value={content.hero.cta_url}
                  onChange={(e) => updateHero("cta_url", e.target.value)}
                  placeholder="#contact"
                />
              </div>
            </div>
          </div>
        )}

        {activeSection === "about" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>About Text</Label>
              <Textarea
                value={content.about.text}
                onChange={(e) => updateAbout("text", e.target.value)}
                placeholder="Tell your story..."
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <Label>Image URL (optional)</Label>
              <Input
                value={content.about.image_url || ""}
                onChange={(e) => updateAbout("image_url", e.target.value)}
                placeholder="https://example.com/photo.jpg"
              />
            </div>
          </div>
        )}

        {activeSection === "services" && (
          <div className="space-y-4">
            {content.services.map((service, i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-gray-400" />
                      <CardTitle className="text-sm">Service {i + 1}</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeService(i)}
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    value={service.title}
                    onChange={(e) => updateService(i, "title", e.target.value)}
                    placeholder="Service title"
                  />
                  <Textarea
                    value={service.description}
                    onChange={(e) => updateService(i, "description", e.target.value)}
                    placeholder="Describe this service..."
                    rows={2}
                  />
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" onClick={addService} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Add Service
            </Button>
          </div>
        )}

        {activeSection === "testimonials" && (
          <div className="space-y-4">
            {content.testimonials.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-6">
                No testimonials yet. Add one to build trust with visitors.
              </p>
            )}
            {content.testimonials.map((testimonial, i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Testimonial {i + 1}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTestimonial(i)}
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={testimonial.quote}
                    onChange={(e) => updateTestimonial(i, "quote", e.target.value)}
                    placeholder="What they said..."
                    rows={2}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      value={testimonial.author}
                      onChange={(e) => updateTestimonial(i, "author", e.target.value)}
                      placeholder="Name"
                    />
                    <Input
                      value={testimonial.role || ""}
                      onChange={(e) => updateTestimonial(i, "role", e.target.value)}
                      placeholder="Role / Company"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" onClick={addTestimonial} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Add Testimonial
            </Button>
          </div>
        )}

        {activeSection === "contact" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={content.contact.email || ""}
                onChange={(e) => updateContact("email", e.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={content.contact.phone || ""}
                onChange={(e) => updateContact("phone", e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea
                value={content.contact.address || ""}
                onChange={(e) => updateContact("address", e.target.value)}
                placeholder="123 Main St, City, State"
                rows={2}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
