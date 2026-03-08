"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PlusIcon, XIcon } from "lucide-react"
import type { PreRegistration, PreRegistrationMetric } from "@/lib/feedback/pre-registration"
import { PRESET_METRICS, validatePreRegistration } from "@/lib/feedback/pre-registration"

interface PreRegistrationFormProps {
  onSubmit: (data: {
    name: string
    description: string
    variants: Array<{ variantName: string; trafficPercentage: number }>
    preRegistration: PreRegistration
  }) => void
  isSubmitting: boolean
}

const DURATION_OPTIONS = [
  { label: "1 week", value: "1 week", days: 7 },
  { label: "2 weeks", value: "2 weeks", days: 14 },
  { label: "1 month", value: "1 month", days: 30 },
  { label: "Custom", value: "custom", days: 0 },
]

const METRIC_KEYS = Object.keys(PRESET_METRICS) as Array<keyof typeof PRESET_METRICS>

export function PreRegistrationForm({ onSubmit, isSubmitting }: PreRegistrationFormProps) {
  // Experiment basics
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  // Variants
  const [variants, setVariants] = useState([
    { variantName: "control", trafficPercentage: 50 },
    { variantName: "treatment", trafficPercentage: 50 },
  ])

  // Pre-registration
  const [hypothesis, setHypothesis] = useState("")
  const [primaryMetricKey, setPrimaryMetricKey] = useState<string>("thumbsUpRatio")
  const [secondaryMetricKeys, setSecondaryMetricKeys] = useState<string[]>([])
  const [minimumSampleSize, setMinimumSampleSize] = useState(500)
  const [durationOption, setDurationOption] = useState("2 weeks")
  const [customDays, setCustomDays] = useState(14)
  const [rationale, setRationale] = useState("")

  // Validation
  const [errors, setErrors] = useState<string[]>([])

  function addVariant() {
    const totalTraffic = variants.reduce((sum, v) => sum + v.trafficPercentage, 0)
    const remaining = 100 - totalTraffic
    setVariants([
      ...variants,
      { variantName: `variant-${variants.length}`, trafficPercentage: Math.max(0, remaining) },
    ])
  }

  function removeVariant(index: number) {
    if (variants.length <= 2) return
    setVariants(variants.filter((_, i) => i !== index))
  }

  function updateVariant(index: number, field: "variantName" | "trafficPercentage", value: string | number) {
    const updated = [...variants]
    if (field === "trafficPercentage") {
      updated[index] = { ...updated[index], trafficPercentage: Number(value) }
    } else {
      updated[index] = { ...updated[index], variantName: String(value) }
    }
    setVariants(updated)
  }

  function toggleSecondaryMetric(key: string) {
    if (key === primaryMetricKey) return
    setSecondaryMetricKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const selectedDuration = DURATION_OPTIONS.find((d) => d.value === durationOption)
    const days = durationOption === "custom" ? customDays : selectedDuration?.days || 14

    const primaryMetric: PreRegistrationMetric = PRESET_METRICS[primaryMetricKey] || PRESET_METRICS.thumbsUpRatio
    const secondaryMetrics: PreRegistrationMetric[] = secondaryMetricKeys
      .map((key) => PRESET_METRICS[key])
      .filter(Boolean)

    const preRegistration: Partial<PreRegistration> = {
      hypothesis,
      primaryMetric,
      secondaryMetrics,
      minimumSampleSize,
      expectedDuration: durationOption === "custom" ? `${customDays} days` : durationOption,
      expectedDurationDays: days,
      rationale,
    }

    const validation = validatePreRegistration(preRegistration)
    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }

    // Check variant traffic sums to 100
    const totalTraffic = variants.reduce((sum, v) => sum + v.trafficPercentage, 0)
    if (totalTraffic !== 100) {
      setErrors([`Traffic percentages must sum to 100 (currently ${totalTraffic})`])
      return
    }

    if (!name.trim()) {
      setErrors(["Experiment name is required"])
      return
    }

    setErrors([])
    onSubmit({
      name,
      description,
      variants,
      preRegistration: preRegistration as PreRegistration,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Experiment basics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Experiment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., empathetic-coaching-tone"
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this experiment tests"
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Variants */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Variants</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addVariant}
            >
              <PlusIcon className="mr-1 h-3 w-3" />
              Add Variant
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {variants.map((variant, index) => (
            <div key={index} className="flex items-center gap-3">
              <input
                type="text"
                value={variant.variantName}
                onChange={(e) => updateVariant(index, "variantName", e.target.value)}
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                placeholder="Variant name"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={variant.trafficPercentage}
                  onChange={(e) => updateVariant(index, "trafficPercentage", e.target.value)}
                  className="w-20 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-right"
                  min={0}
                  max={100}
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
              {variants.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeVariant(index)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <p className="text-xs text-gray-500">
            Total: {variants.reduce((sum, v) => sum + v.trafficPercentage, 0)}%
            {variants.reduce((sum, v) => sum + v.trafficPercentage, 0) !== 100 && (
              <span className="text-amber-600 ml-1">(must equal 100%)</span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Pre-registration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pre-Registration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Hypothesis *
            </label>
            <textarea
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              placeholder="e.g., Changing FRED's coaching tone to be more empathetic will increase thumbs-up ratio by 10%"
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              rows={3}
              required
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 20 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Primary Metric *
            </label>
            <select
              value={primaryMetricKey}
              onChange={(e) => setPrimaryMetricKey(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            >
              {METRIC_KEYS.map((key) => (
                <option key={key} value={key}>
                  {PRESET_METRICS[key].name} ({PRESET_METRICS[key].type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Secondary Metrics
            </label>
            <div className="flex flex-wrap gap-2">
              {METRIC_KEYS.filter((key) => key !== primaryMetricKey).map((key) => (
                <Badge
                  key={key}
                  variant={secondaryMetricKeys.includes(key) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleSecondaryMetric(key)}
                >
                  {PRESET_METRICS[key].name}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Sample Size (per variant)
              </label>
              <input
                type="number"
                value={minimumSampleSize}
                onChange={(e) => setMinimumSampleSize(Number(e.target.value))}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                min={100}
              />
              {minimumSampleSize < 500 && (
                <p className="text-xs text-amber-600 mt-1">
                  Recommended: 500 or more for reliable results
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expected Duration
              </label>
              <select
                value={durationOption}
                onChange={(e) => setDurationOption(e.target.value)}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {durationOption === "custom" && (
                <input
                  type="number"
                  value={customDays}
                  onChange={(e) => setCustomDays(Number(e.target.value))}
                  className="w-full mt-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  placeholder="Days"
                  min={1}
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Rationale
            </label>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Why does this experiment matter? What insight are you seeking?"
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3">
          <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-400">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        variant="orange"
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? "Creating..." : "Register & Start Experiment"}
      </Button>
    </form>
  )
}
