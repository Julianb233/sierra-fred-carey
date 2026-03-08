"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon } from "lucide-react"
import { PreRegistrationForm } from "@/components/admin/pre-registration-form"
import { toast } from "sonner"
import type { PreRegistration } from "@/lib/feedback/pre-registration-shared"

export default function NewExperimentPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(data: {
    name: string
    description: string
    variants: Array<{ variantName: string; trafficPercentage: number }>
    preRegistration: PreRegistration
  }) {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/admin/ab-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          variants: data.variants,
          preRegistration: data.preRegistration,
        }),
      })

      if (response.ok) {
        toast.success("Experiment created successfully")
        router.push("/admin/ab-tests")
      } else {
        const errorData = await response.json()
        const errorMsg =
          errorData.errors?.join(", ") ||
          errorData.error ||
          "Failed to create experiment"
        toast.error(errorMsg)
      }
    } catch (error) {
      console.error("Error creating experiment:", error)
      toast.error("Failed to create experiment")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/ab-tests")}
          className="mb-4"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to A/B Tests
        </Button>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Register New Experiment
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Define your hypothesis and metrics before starting the test
        </p>
      </div>

      <PreRegistrationForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  )
}
