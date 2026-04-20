"use client"

/**
 * Phase 165 SITE-01: Step-by-step microsite creation wizard with live preview
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Check, ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { TemplateSelector } from "./template-selector"
import { BrandingEditor } from "./branding-editor"
import { ContentEditor } from "./content-editor"
import { MicrositePreview } from "./microsite-preview"
import {
  WIZARD_STEPS,
  TEMPLATES,
  DEFAULT_BRANDING,
  DEFAULT_CONTENT,
} from "@/lib/microsite/types"
import type { WizardStepId, MicrositeBranding, MicrositeContent } from "@/lib/microsite/types"

interface CreationWizardProps {
  onCancel: () => void
}

export function CreationWizard({ onCancel }: CreationWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [saving, setSaving] = useState(false)

  // Wizard state
  const [title, setTitle] = useState("")
  const [template, setTemplate] = useState("modern")
  const [branding, setBranding] = useState<MicrositeBranding>({ ...DEFAULT_BRANDING })
  const [content, setContent] = useState<MicrositeContent>({ ...DEFAULT_CONTENT })

  const step = WIZARD_STEPS[currentStep]

  const handleTemplateChange = (templateId: string) => {
    setTemplate(templateId)
    const tmpl = TEMPLATES.find((t) => t.id === templateId)
    if (tmpl?.defaultBranding) {
      setBranding((prev) => ({ ...prev, ...tmpl.defaultBranding }))
    }
  }

  const canProceed = () => {
    if (currentStep === 0) return title.trim().length > 0
    return true
  }

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep((s) => s + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1)
    }
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/microsite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), template, branding, content }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to create microsite")
        return
      }
      toast.success("Microsite created!")
      router.push(`/dashboard/microsite/${data.microsite.id}`)
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-between">
        {WIZARD_STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  i < currentStep
                    ? "bg-[#ff6a1a] text-white"
                    : i === currentStep
                    ? "bg-[#ff6a1a]/10 text-[#ff6a1a] border-2 border-[#ff6a1a]"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                )}
              >
                {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className="text-xs mt-1 hidden sm:block text-gray-500">
                {s.label}
              </span>
            </div>
            {i < WIZARD_STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2",
                  i < currentStep ? "bg-[#ff6a1a]" : "bg-gray-200 dark:bg-gray-800"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Main content area: editor + preview side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Editor */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-1">{step.label}</h2>
            <p className="text-sm text-gray-500 mb-4">{step.description}</p>

            {/* Step: Template */}
            {step.id === "template" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="site-title">Site Title</Label>
                  <Input
                    id="site-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="My Startup Site"
                    className="text-lg"
                  />
                </div>
                <TemplateSelector selected={template} onSelect={handleTemplateChange} />
              </div>
            )}

            {/* Step: Branding */}
            {step.id === "branding" && (
              <BrandingEditor branding={branding} onChange={setBranding} />
            )}

            {/* Step: Content */}
            {step.id === "content" && (
              <ContentEditor content={content} onChange={setContent} />
            )}

            {/* Step: Review */}
            {step.id === "review" && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-green-600" />
                    <h3 className="font-medium text-green-800 dark:text-green-300">
                      Ready to Create
                    </h3>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Your microsite &ldquo;{title}&rdquo; will be created as a draft.
                    You can publish it anytime from the editor.
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-gray-500">Title</span>
                    <span className="font-medium">{title}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-gray-500">Template</span>
                    <span className="font-medium capitalize">{template}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-gray-500">Services</span>
                    <span className="font-medium">{content.services.length}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-gray-500">Testimonials</span>
                    <span className="font-medium">{content.testimonials.length}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Live Preview */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-500">Live Preview</h3>
          <MicrositePreview
            template={template}
            branding={branding}
            content={content}
            className="h-[500px] overflow-y-auto"
            scale={0.45}
          />
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <div>
          {currentStep === 0 ? (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          ) : (
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
        </div>
        <div>
          {currentStep < WIZARD_STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={saving || !canProceed()}
              className="bg-[#ff6a1a] hover:bg-[#ea580c] text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" /> Create Microsite
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
