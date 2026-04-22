/**
 * Server-side HTML renderer for the founder report.
 *
 * Produces a self-contained HTML document with inline CSS so it can be
 * dropped into a Resend email body OR served directly from /reports/[id].
 * Mirrors the visual treatment of the approved Apr 20 sample reports.
 */

import {
  TIER_LABEL,
  TIER_PRICE_CENTS,
  type ReportPayload,
  type StepStatus,
} from "./types";

interface RenderOptions {
  founderName: string;
  companyName?: string | null;
  stage?: string | null;
  generatedAt?: Date;
  appUrl?: string;
  reportId?: string;
  expertCalendlyUrl?: string;
}

const STATUS_PILL: Record<StepStatus, { className: string; label: string }> = {
  validated: { className: "green", label: "Validated" },
  tightening: { className: "amber", label: "Tightening Needed" },
  blocking: { className: "red", label: "Blocking" },
  not_started: { className: "gray", label: "Not Started" },
};

const STYLES = `
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #fafafa; color: #1a1a1a; margin: 0; padding: 0; }
  .page { max-width: 720px; margin: 32px auto; background: #ffffff; border: 1px solid #ececec; border-radius: 12px; overflow: hidden; }
  .header { background: linear-gradient(135deg, #ff6a1a 0%, #ff8c42 100%); color: #fff; padding: 32px 36px; }
  .header .brand { font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.9; }
  .header h1 { margin: 6px 0 4px; font-size: 28px; font-weight: 700; letter-spacing: -0.01em; }
  .header .meta { font-size: 13px; opacity: 0.9; }
  .body { padding: 32px 36px; }
  .pill { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
  .pill.green { background: #e8f7ee; color: #137333; }
  .pill.amber { background: #fff4e0; color: #a05a00; }
  .pill.red { background: #fde8e8; color: #b3261e; }
  .pill.gray { background: #eef0f2; color: #555; }
  h2 { font-size: 18px; margin: 28px 0 8px; letter-spacing: -0.005em; color: #1a1a1a; }
  p, li { font-size: 14.5px; line-height: 1.55; color: #2c2c2c; }
  .toc { background: #fafafa; border-left: 3px solid #ff6a1a; padding: 14px 18px; border-radius: 6px; margin: 18px 0 24px; }
  .toc ol { margin: 4px 0 0; padding-left: 20px; }
  .toc li { font-size: 13.5px; color: #444; padding: 2px 0; }
  .grade { display: flex; align-items: center; gap: 14px; padding: 16px 18px; border: 1px solid #eee; border-radius: 10px; margin: 18px 0 6px; background: #fafafa; }
  .grade .score { font-size: 36px; font-weight: 700; color: #ff6a1a; line-height: 1; }
  .grade .label { font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #666; }
  .grade .verdict { font-size: 14.5px; color: #1a1a1a; font-weight: 600; }
  .grade-divider { border-left: 1px solid #eee; padding-left: 18px; }
  .step { border: 1px solid #eee; border-radius: 10px; padding: 18px 20px; margin: 14px 0; }
  .step .head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .step .num { background: #1a1a1a; color: #fff; font-weight: 700; font-size: 12px; padding: 4px 8px; border-radius: 6px; }
  .step .name { font-weight: 700; font-size: 15px; }
  .step .answer { font-size: 13.5px; color: #555; margin-top: 8px; padding: 10px 12px; background: #fafafa; border-radius: 6px; border-left: 3px solid #ddd; }
  .step .verdict { font-size: 13.5px; line-height: 1.55; margin-top: 10px; }
  .killbox { background: #fff8f0; border: 1px solid #f5d2a8; border-radius: 8px; padding: 12px 16px; margin: 14px 0; }
  .killbox .title { font-weight: 700; color: #a05a00; font-size: 13px; margin-bottom: 4px; }
  .next { background: linear-gradient(135deg, #1a1a1a 0%, #2c2c2c 100%); color: #fff; padding: 28px 30px; border-radius: 12px; margin-top: 32px; }
  .next h2 { color: #ff8c42; margin-top: 0; }
  .next p { color: #d8d8d8; font-size: 14.5px; }
  .cta { display: inline-block; background: #ff6a1a; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 12px; margin-right: 10px; }
  .cta.outline { background: transparent; border: 1px solid #fff; color: #fff; }
  .footer { background: #1a1a1a; color: #888; text-align: center; padding: 18px 30px; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; }
`;

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export function renderReportHtml(
  payload: ReportPayload,
  opts: RenderOptions
): string {
  const generatedAt = opts.generatedAt ?? new Date();
  const dateStr = generatedAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const tierLabel = TIER_LABEL[payload.recommendedTier];
  const tierPrice = TIER_PRICE_CENTS[payload.recommendedTier];
  const upgradeUrl = `${opts.appUrl ?? ""}/upgrade?plan=${payload.recommendedTier}${
    opts.reportId ? `&ref=${opts.reportId}` : ""
  }`;
  const expertUrl =
    opts.expertCalendlyUrl ?? `${opts.appUrl ?? ""}/expert?expert=fred`;

  const stepsHtml = payload.steps
    .map((s) => {
      const pill = STATUS_PILL[s.status] ?? STATUS_PILL.not_started;
      const num = String(s.stepNumber).padStart(2, "0");
      const killbox =
        s.killboxText && (s.status === "blocking" || s.status === "tightening")
          ? `<div class="killbox"><div class="title">${
              s.status === "blocking" ? "This Step Is Blocking" : "Watch For"
            }</div>${esc(s.killboxText)}</div>`
          : "";
      return `
        <h2>${s.stepNumber}. ${esc(s.name)} <span class="pill ${pill.className}">${pill.label}</span></h2>
        <div class="step">
          <div class="head"><span class="num">${num}</span><span class="name">${esc(s.name)}</span></div>
          <div class="answer">${esc(s.answerSummary)}</div>
          <div class="verdict">${esc(s.verdict)}</div>
        </div>
        ${killbox}`;
    })
    .join("\n");

  const tocHtml = payload.steps
    .map((s) => `<li>${esc(s.name)}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Sahara Founder Report - ${esc(opts.founderName)}</title>
<style>${STYLES}</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">Sahara - Founder Operating System</div>
    <h1>${esc(opts.founderName)} - Founder Readiness Report</h1>
    <div class="meta">${esc(opts.companyName ?? "Untitled Company")}${
      opts.stage ? ` (${esc(opts.stage)})` : ""
    } - Generated ${dateStr}</div>
  </div>

  <div class="body">

    <div class="grade">
      <div>
        <div class="label">Process Score</div>
        <div class="score">${payload.score}<span style="font-size: 18px; color: #999;"> / 100</span></div>
      </div>
      <div class="grade-divider">
        <div class="verdict">${esc(payload.verdictHeadline)}</div>
        <div style="font-size: 13px; color: #666; margin-top: 4px;">${esc(payload.verdictSubline)}</div>
      </div>
    </div>

    <h2>Executive Summary</h2>
    <p>${esc(payload.executiveSummary)}</p>

    <div class="toc">
      <strong style="font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #ff6a1a;">In this report</strong>
      <ol>${tocHtml}<li>What's Next</li></ol>
    </div>

    ${stepsHtml}

    <div class="next">
      <h2>What's Next</h2>
      <p>${esc(payload.nextPitch ?? "Here are the two fastest paths forward:")}</p>
      <a href="${esc(upgradeUrl)}" class="cta">${esc(tierLabel)} - ${formatPrice(tierPrice)}/mo</a>
      <a href="${esc(expertUrl)}" class="cta outline">15 min with Fred Cary - $29</a>
      <p style="font-size: 13px; margin-top: 18px; color: #aaa;">The ${esc(tierLabel)} tier is matched to your current readiness. Built specifically for founders at your stage.</p>
    </div>

  </div>
  <div class="footer">Sahara - Founder Operating System - Built by Fred Cary</div>
</div>
</body>
</html>`;
}

/**
 * Plain-text fallback for email clients that won't render HTML.
 */
export function renderReportText(payload: ReportPayload, opts: RenderOptions): string {
  const lines: string[] = [];
  lines.push(`Sahara - Founder Readiness Report`);
  lines.push(`${opts.founderName} - ${opts.companyName ?? ""}`);
  lines.push("");
  lines.push(`Score: ${payload.score}/100 - ${payload.verdictHeadline}`);
  lines.push(payload.verdictSubline);
  lines.push("");
  lines.push("EXECUTIVE SUMMARY");
  lines.push(payload.executiveSummary);
  lines.push("");
  for (const s of payload.steps) {
    const pill = STATUS_PILL[s.status] ?? STATUS_PILL.not_started;
    lines.push(`Step ${s.stepNumber}: ${s.name} [${pill.label}]`);
    lines.push(`  Answer: ${s.answerSummary}`);
    lines.push(`  Verdict: ${s.verdict}`);
    if (s.killboxText) lines.push(`  Watch: ${s.killboxText}`);
    lines.push("");
  }
  lines.push(
    `Recommended next step: ${TIER_LABEL[payload.recommendedTier]} (${formatPrice(
      TIER_PRICE_CENTS[payload.recommendedTier]
    )}/mo) or 15 min with Fred Cary ($29).`
  );
  return lines.join("\n");
}
