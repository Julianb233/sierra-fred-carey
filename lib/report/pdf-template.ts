/**
 * Branded Sahara PDF Template for Founder Journey Reports
 *
 * Builds a multi-page React-PDF document using React.createElement (no JSX).
 * Follows the pattern from app/api/dashboard/export/route.ts.
 *
 * Pages:
 *   1. Cover — brand header, founder/company name, date
 *   2. Executive Summary — orange-accented summary block
 *   3-5. Report Sections — synthesized narratives + highlights
 *   Final. FRED Sign-off — mentor closing message
 */

import React from "react"
import path from "path"
import {
  Document,
  Page,
  Text,
  View,
  Font,
  StyleSheet,
} from "@react-pdf/renderer"
import type { ReportData } from "@/types/report"

// ============================================================================
// Font Registration (module-level — CRITICAL: not inside any function)
// Use path.join to resolve font files at runtime so webpack doesn't try to
// parse .woff binaries as JS modules.
// ============================================================================

const fontDir = path.join(
  process.cwd(),
  "node_modules/@fontsource/geist-sans/files"
)

Font.register({
  family: "Geist",
  fonts: [
    {
      src: path.join(fontDir, "geist-sans-latin-400-normal.woff"),
      fontWeight: 400,
    },
    {
      src: path.join(fontDir, "geist-sans-latin-600-normal.woff"),
      fontWeight: 600,
    },
    {
      src: path.join(fontDir, "geist-sans-latin-700-normal.woff"),
      fontWeight: 700,
    },
  ],
})

// ============================================================================
// Color Palette
// ============================================================================

const colors = {
  primaryOrange: "#ff6a1a",
  headingText: "#1a1a1a",
  bodyText: "#333333",
  subtleText: "#666666",
  borders: "#e5e7eb",
  backgroundAccent: "#fff7ed",
  signoffText: "#555555",
  footerText: "#999999",
} as const

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  // Cover page
  coverPage: {
    padding: 0,
    fontFamily: "Geist",
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  coverHeaderBar: {
    backgroundColor: colors.primaryOrange,
    height: 8,
    width: "100%",
  },
  coverContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 60,
  },
  coverTitle: {
    fontSize: 28,
    fontFamily: "Geist",
    fontWeight: 700,
    color: colors.headingText,
    textAlign: "center",
    marginBottom: 16,
  },
  coverFounderName: {
    fontSize: 18,
    fontFamily: "Geist",
    fontWeight: 600,
    color: colors.headingText,
    textAlign: "center",
    marginBottom: 8,
  },
  coverCompanyName: {
    fontSize: 14,
    fontFamily: "Geist",
    fontWeight: 400,
    color: colors.subtleText,
    textAlign: "center",
    marginBottom: 24,
  },
  coverDate: {
    fontSize: 12,
    fontFamily: "Geist",
    fontWeight: 400,
    color: colors.subtleText,
    textAlign: "center",
  },
  coverFooter: {
    paddingBottom: 40,
    alignItems: "center",
  },
  coverBranding: {
    fontSize: 10,
    fontFamily: "Geist",
    fontWeight: 600,
    color: colors.primaryOrange,
    textAlign: "center",
  },

  // Content pages
  contentPage: {
    padding: 50,
    fontFamily: "Geist",
    fontSize: 11,
    lineHeight: 1.6,
    color: colors.bodyText,
    position: "relative",
  },
  sectionHeading: {
    fontSize: 16,
    fontFamily: "Geist",
    fontWeight: 700,
    color: colors.headingText,
    marginBottom: 12,
  },
  subSectionHeading: {
    fontSize: 14,
    fontFamily: "Geist",
    fontWeight: 700,
    color: colors.headingText,
    marginBottom: 10,
    marginTop: 16,
  },
  bodyText: {
    fontSize: 11,
    fontFamily: "Geist",
    fontWeight: 400,
    lineHeight: 1.6,
    color: colors.bodyText,
    marginBottom: 8,
  },

  // Executive summary accent block
  summaryBlock: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryOrange,
    paddingLeft: 16,
    paddingVertical: 8,
    marginBottom: 16,
    backgroundColor: colors.backgroundAccent,
    borderRadius: 2,
  },

  // Section items
  highlightItem: {
    fontSize: 11,
    fontFamily: "Geist",
    fontWeight: 400,
    lineHeight: 1.6,
    color: colors.bodyText,
    marginBottom: 4,
    paddingLeft: 8,
  },
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borders,
    marginVertical: 16,
  },

  // Sign-off
  signoffText: {
    fontSize: 11,
    fontFamily: "Geist",
    fontWeight: 400,
    fontStyle: "italic",
    lineHeight: 1.6,
    color: colors.signoffText,
    marginTop: 12,
  },

  // Page footer (fixed on every content page)
  pageFooter: {
    position: "absolute",
    bottom: 25,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerBranding: {
    fontSize: 8,
    fontFamily: "Geist",
    fontWeight: 400,
    color: colors.footerText,
  },
  footerPageNumber: {
    fontSize: 8,
    fontFamily: "Geist",
    fontWeight: 400,
    color: colors.footerText,
  },
})

// ============================================================================
// Helper: format ISO date to "Month Day, Year"
// ============================================================================

function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } catch {
    return isoDate
  }
}

// ============================================================================
// Page builders
// ============================================================================

function buildCoverPage(reportData: ReportData): React.ReactElement {
  return React.createElement(
    Page,
    { size: "A4", style: styles.coverPage },
    // Orange header bar
    React.createElement(View, { style: styles.coverHeaderBar }),
    // Center content
    React.createElement(
      View,
      { style: styles.coverContent },
      React.createElement(
        Text,
        { style: styles.coverTitle },
        "Founder Journey Report"
      ),
      React.createElement(
        Text,
        { style: styles.coverFounderName },
        reportData.founderName
      ),
      React.createElement(
        Text,
        { style: styles.coverCompanyName },
        reportData.companyName
      ),
      React.createElement(
        Text,
        { style: styles.coverDate },
        formatDate(reportData.generatedAt)
      )
    ),
    // Footer branding
    React.createElement(
      View,
      { style: styles.coverFooter },
      React.createElement(
        Text,
        { style: styles.coverBranding },
        "Powered by FRED | Sahara"
      )
    )
  )
}

function buildExecutiveSummaryPage(
  reportData: ReportData
): React.ReactElement {
  return React.createElement(
    Page,
    { size: "A4", style: styles.contentPage, wrap: true },
    React.createElement(
      Text,
      { style: styles.sectionHeading },
      "Executive Summary"
    ),
    React.createElement(
      View,
      { style: styles.summaryBlock },
      React.createElement(
        Text,
        { style: styles.bodyText },
        reportData.executiveSummary
      )
    ),
    buildPageFooter(2)
  )
}

function buildSectionElements(
  sections: ReportData["sections"]
): React.ReactElement[] {
  const elements: React.ReactElement[] = []

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]

    // Add separator before each section except the first
    if (i > 0) {
      elements.push(
        React.createElement(View, {
          style: styles.separator,
          key: `sep-${section.id}`,
        })
      )
    }

    // Section title
    elements.push(
      React.createElement(
        Text,
        { style: styles.subSectionHeading, key: `title-${section.id}` },
        section.title
      )
    )

    // Synthesized narrative
    elements.push(
      React.createElement(
        Text,
        { style: styles.bodyText, key: `body-${section.id}` },
        section.synthesized
      )
    )

    // Highlights as bullet points
    for (let h = 0; h < section.highlights.length; h++) {
      elements.push(
        React.createElement(
          Text,
          {
            style: styles.highlightItem,
            key: `hl-${section.id}-${h}`,
          },
          `\u2022  ${section.highlights[h]}`
        )
      )
    }
  }

  return elements
}

function buildSectionsPage(
  reportData: ReportData,
  pageNumber: number
): React.ReactElement {
  return React.createElement(
    Page,
    { size: "A4", style: styles.contentPage, wrap: true },
    React.createElement(
      View,
      { key: "sections-wrapper" },
      ...buildSectionElements(reportData.sections)
    ),
    buildPageFooter(pageNumber)
  )
}

function buildSignoffPage(
  reportData: ReportData,
  pageNumber: number
): React.ReactElement {
  return React.createElement(
    Page,
    { size: "A4", style: styles.contentPage, wrap: true },
    React.createElement(View, { style: styles.separator }),
    React.createElement(
      Text,
      { style: styles.sectionHeading },
      "From Your Mentor"
    ),
    React.createElement(
      Text,
      { style: styles.signoffText },
      reportData.fredSignoff
    ),
    buildPageFooter(pageNumber)
  )
}

function buildPageFooter(pageNumber: number): React.ReactElement {
  return React.createElement(
    View,
    { style: styles.pageFooter, fixed: true },
    React.createElement(
      Text,
      { style: styles.footerBranding },
      "Founder Journey Report | FRED by Sahara"
    ),
    React.createElement(
      Text,
      { style: styles.footerPageNumber },
      `Page ${pageNumber}`
    )
  )
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Build a complete branded Founder Journey Report PDF document.
 *
 * @param reportData - The report payload (stored in founder_reports.report_data)
 * @returns A React element tree that can be passed to renderToBuffer()
 */
export function buildReportDocument(
  reportData: ReportData
): React.ReactElement {
  // Estimate page numbers: cover(1) + exec summary(2) + sections(3) + signoff(4+)
  const signoffPageNum = 4

  return React.createElement(
    Document,
    {
      title: `Founder Journey Report — ${reportData.companyName}`,
      author: "FRED by Sahara",
    },
    buildCoverPage(reportData),
    buildExecutiveSummaryPage(reportData),
    buildSectionsPage(reportData, 3),
    buildSignoffPage(reportData, signoffPageNum)
  )
}
