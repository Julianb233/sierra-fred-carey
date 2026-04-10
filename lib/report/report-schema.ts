/**
 * Report Data Schema — Zod schemas for AI structured output
 *
 * These schemas enforce minimum quality constraints on the AI synthesis output.
 * They match the ReportData and ReportSection interfaces from types/report.ts
 * with additional validation (min lengths, array bounds) to prevent low-quality output.
 */

import { z } from "zod"

export const reportSectionSchema = z.object({
  id: z
    .string()
    .describe(
      "Section identifier matching the section ID from step mapping"
    ),
  title: z.string().describe("Display title for this section"),
  synthesized: z
    .string()
    .min(100)
    .describe(
      "FRED's narrative synthesis of this section - 2-4 paragraphs grounded in the founder's actual answers"
    ),
  highlights: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe(
      "Key strength highlights from this section - specific to this founder, never generic"
    ),
  stepIds: z
    .array(z.string())
    .describe("Report step IDs that contributed to this section"),
})

export const reportDataSchema = z.object({
  executiveSummary: z
    .string()
    .min(150)
    .max(800)
    .describe(
      "FRED's 3-5 sentence synthesis of the entire business model - specific, grounded, celebratory but honest"
    ),
  founderName: z.string(),
  companyName: z.string(),
  generatedAt: z.string(),
  sections: z.array(reportSectionSchema).length(5),
  fredSignoff: z
    .string()
    .min(50)
    .describe(
      "FRED's personal closing message to this founder - warm, specific, forward-looking"
    ),
  bonusSteps: z
    .array(
      z.object({
        title: z.string().describe("Short action-oriented title"),
        description: z
          .string()
          .min(50)
          .describe(
            "Why this step matters for THIS specific business"
          ),
        rationale: z
          .string()
          .describe("Which answers led FRED to suggest this"),
      })
    )
    .min(1)
    .max(2)
    .describe(
      "Personalized next steps FRED recommends based on the specific gaps or opportunities in this founder's answers"
    ),
})

/** Inferred type from the Zod schema (used internally by the synthesizer) */
export type ReportDataSchemaOutput = z.infer<typeof reportDataSchema>
