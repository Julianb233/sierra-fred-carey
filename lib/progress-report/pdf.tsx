/**
 * Downloadable PDF renderer for the Founder Progress Report (AI-7369).
 *
 * AI-7489 shipped the webpage + email delivery for the 19-step founder
 * program progress report. AI-7369 additionally requires a downloadable PDF.
 * This module renders the SAME structured data (FounderProgressSnapshot +
 * ProgressReportPayload that is stored on founder_progress_reports) into a
 * branded PDF via @react-pdf/renderer — no headless browser needed, so it runs
 * inside a normal Node serverless route.
 *
 * Brand treatment mirrors renderer.ts (Sahara orange) for consistency with the
 * web + email versions.
 */

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import React from "react";
import type {
  FounderProgressSnapshot,
  ProgressReportPayload,
} from "./types";
import { TIER_LABEL, TIER_PRICE_CENTS } from "./types";

const ORANGE = "#ff6a1a";
const INK = "#1a1a1a";
const MUTED = "#666666";

const SECTION_PILL: Record<string, { bg: string; color: string; label: string }> = {
  ahead: { bg: "#e8f7ee", color: "#137333", label: "AHEAD" },
  on_track: { bg: "#e7f0ff", color: "#1456c4", label: "ON TRACK" },
  stalled: { bg: "#fff4e0", color: "#a05a00", label: "STALLED" },
  not_started: { bg: "#eef0f2", color: "#555555", label: "NOT STARTED" },
};

const STAGE_PILL: Record<string, { bg: string; color: string; label: string }> = {
  completed: { bg: "#e8f7ee", color: "#137333", label: "DONE" },
  current: { bg: "#e7f0ff", color: "#1456c4", label: "CURRENT" },
  locked: { bg: "#eef0f2", color: "#555555", label: "LOCKED" },
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 56,
    fontSize: 10.5,
    color: INK,
    fontFamily: "Helvetica",
    lineHeight: 1.5,
  },
  header: { backgroundColor: ORANGE, color: "#ffffff", padding: 28 },
  brand: {
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    opacity: 0.92,
    marginBottom: 4,
  },
  h1: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  headerMeta: { fontSize: 9.5, opacity: 0.92 },
  body: { paddingHorizontal: 28, paddingTop: 22 },
  gradeRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eeeeee",
    borderRadius: 8,
    backgroundColor: "#fafafa",
    padding: 16,
    marginBottom: 14,
  },
  score: { fontSize: 34, fontFamily: "Helvetica-Bold", color: ORANGE },
  scoreLabel: {
    fontSize: 7.5,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: MUTED,
    marginTop: 2,
  },
  verdictWrap: {
    marginLeft: 18,
    paddingLeft: 18,
    borderLeftWidth: 1,
    borderLeftColor: "#eeeeee",
    flexShrink: 1,
  },
  verdict: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  sub: { fontSize: 9.5, color: MUTED, marginTop: 2 },
  bar: {
    height: 8,
    backgroundColor: "#eef0f2",
    borderRadius: 999,
    marginBottom: 16,
  },
  barFill: { height: 8, backgroundColor: ORANGE, borderRadius: 999 },
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 7 },
  para: { fontSize: 10.5, marginBottom: 7, color: "#2c2c2c" },
  stagesWrap: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  stageCard: {
    width: "31%",
    margin: "1%",
    borderWidth: 1,
    borderColor: "#eeeeee",
    borderRadius: 8,
    padding: 9,
  },
  stageName: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  stageCount: { fontSize: 8.5, color: MUTED, marginBottom: 5 },
  section: {
    borderWidth: 1,
    borderColor: "#eeeeee",
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  sectionHead: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  pill: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 999,
    marginRight: 8,
  },
  actions: {
    backgroundColor: "#fafafa",
    borderLeftWidth: 3,
    borderLeftColor: ORANGE,
    padding: 12,
    borderRadius: 4,
    marginTop: 12,
    marginBottom: 6,
  },
  actionsTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  actionItem: { fontSize: 10, marginBottom: 3 },
  next: {
    backgroundColor: INK,
    color: "#ffffff",
    padding: 18,
    borderRadius: 8,
    marginTop: 16,
  },
  nextTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#ff8c42", marginBottom: 5 },
  nextBody: { fontSize: 10.5, color: "#d8d8d8" },
  nextTier: { fontSize: 9.5, color: "#bdbdbd", marginTop: 5 },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 28,
    right: 28,
    textAlign: "center",
    fontSize: 7.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#999999",
  },
});

/** Split a multi-paragraph string (on blank lines) into <Text> blocks. */
function splitParagraphs(body: string): string[] {
  return String(body)
    .split(/\n\s*\n/)
    .map((p) => p.trim().replace(/<[^>]+>/g, ""))
    .filter(Boolean);
}

interface PdfOptions {
  generatedAt?: Date;
}

function ProgressReportDocument({
  snapshot,
  payload,
  opts,
}: {
  snapshot: FounderProgressSnapshot;
  payload: ProgressReportPayload;
  opts: PdfOptions;
}) {
  const generatedAt = opts.generatedAt ?? new Date();
  const dateStr = generatedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const tier = payload.recommendedTier;
  const priceDollars = (TIER_PRICE_CENTS[tier] / 100).toFixed(0);
  const venture = snapshot.companyName ? ` · ${snapshot.companyName}` : "";
  const pct = Math.max(0, Math.min(100, payload.overallPercentage));

  return (
    <Document
      title="Sahara Founder Progress Report"
      author="Sahara"
      subject={`${snapshot.founderName} — Founder Progress Report`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Sahara · Founder Progress Report</Text>
          <Text style={styles.h1}>
            {snapshot.founderName}
            {venture}
          </Text>
          <Text style={styles.headerMeta}>
            {dateStr} · {snapshot.currentStageName} stage
          </Text>
        </View>

        <View style={styles.body}>
          <View style={styles.gradeRow}>
            <View>
              <Text style={styles.score}>{pct}%</Text>
              <Text style={styles.scoreLabel}>Program Complete</Text>
            </View>
            <View style={styles.verdictWrap}>
              <Text style={styles.verdict}>{payload.headline}</Text>
              <Text style={styles.sub}>{payload.subline}</Text>
            </View>
          </View>

          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${pct}%` }]} />
          </View>

          {splitParagraphs(payload.executiveSummary).map((p, i) => (
            <Text key={`exec-${i}`} style={styles.para}>
              {p}
            </Text>
          ))}

          <Text style={styles.h2}>Where you are in the program</Text>
          <View style={styles.stagesWrap}>
            {snapshot.stages.map((s, i) => {
              const pill = STAGE_PILL[s.status] ?? STAGE_PILL.locked;
              return (
                <View key={`stage-${i}`} style={styles.stageCard}>
                  <Text style={styles.stageName}>{s.name}</Text>
                  <Text style={styles.stageCount}>
                    {s.stepsCompleted}/{s.stepsTotal} steps
                  </Text>
                  <Text>
                    <Text style={[styles.pill, { backgroundColor: pill.bg, color: pill.color }]}>
                      {" "}
                      {pill.label}{" "}
                    </Text>
                  </Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.h2}>Your progress, stage by stage</Text>
          {payload.sections.map((sec, i) => {
            const pill = sec.status ? SECTION_PILL[sec.status] : undefined;
            return (
              <View key={`sec-${i}`} style={styles.section} wrap={false}>
                <View style={styles.sectionHead}>
                  {pill ? (
                    <Text style={[styles.pill, { backgroundColor: pill.bg, color: pill.color }]}>
                      {" "}
                      {pill.label}{" "}
                    </Text>
                  ) : null}
                  <Text style={styles.sectionTitle}>{sec.title}</Text>
                </View>
                {splitParagraphs(sec.body).map((p, j) => (
                  <Text key={`sec-${i}-p-${j}`} style={styles.para}>
                    {p}
                  </Text>
                ))}
              </View>
            );
          })}

          {payload.nextActions.length > 0 ? (
            <View style={styles.actions}>
              <Text style={styles.actionsTitle}>Your next moves</Text>
              {payload.nextActions.map((a, i) => (
                <Text key={`act-${i}`} style={styles.actionItem}>
                  {i + 1}. {a}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={styles.next}>
            <Text style={styles.nextTitle}>Keep your momentum</Text>
            <Text style={styles.nextBody}>{payload.upgradePitch}</Text>
            <Text style={styles.nextTier}>
              Recommended: {TIER_LABEL[tier]} — ${priceDollars}
            </Text>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          Sahara · Your AI Founder OS · Powered by FRED
        </Text>
      </Page>
    </Document>
  );
}

/**
 * Render the founder progress report to a PDF Buffer.
 * Pure function of the stored snapshot + narrated payload — safe to call from a
 * Node serverless route.
 */
export async function renderProgressReportPdf(
  snapshot: FounderProgressSnapshot,
  payload: ProgressReportPayload,
  opts: PdfOptions = {}
): Promise<Buffer> {
  return renderToBuffer(
    <ProgressReportDocument snapshot={snapshot} payload={payload} opts={opts} />
  );
}

/** Build a safe download filename for a report. */
export function progressReportFilename(
  snapshot: Pick<FounderProgressSnapshot, "founderName">,
  generatedAt: Date = new Date()
): string {
  const name = String(snapshot.founderName || "founder")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "founder";
  const d = generatedAt.toISOString().slice(0, 10);
  return `sahara-progress-report-${name}-${d}.pdf`;
}
