/**
 * Server-side HTML + text renderer for the Founder Progress Report (AI-7489).
 *
 * Produces a self-contained HTML document with inline CSS so the exact same
 * markup can be dropped into a Resend email body OR served from
 * /progress-report/[id]. Visual treatment mirrors the founder readiness report
 * (Sahara orange) for brand consistency.
 */

import type {
  FounderProgressSnapshot,
  ProgressReportPayload,
} from "./types";
import { TIER_LABEL, TIER_PRICE_CENTS } from "./types";

interface RenderOptions {
  appUrl?: string;
  reportId?: string;
  generatedAt?: Date;
}

const SECTION_PILL: Record<string, { className: string; label: string }> = {
  ahead: { className: "green", label: "Ahead" },
  on_track: { className: "blue", label: "On Track" },
  stalled: { className: "amber", label: "Stalled" },
  not_started: { className: "gray", label: "Not Started" },
};

const STAGE_PILL: Record<string, { className: string; label: string }> = {
  completed: { className: "green", label: "Done" },
  current: { className: "blue", label: "Current" },
  locked: { className: "gray", label: "Locked" },
};

const STYLES = `
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #fafafa; color: #1a1a1a; margin: 0; padding: 0; }
  .page { max-width: 720px; margin: 32px auto; background: #ffffff; border: 1px solid #ececec; border-radius: 12px; overflow: hidden; }
  .header { background: linear-gradient(135deg, #ff6a1a 0%, #ff8c42 100%); color: #fff; padding: 32px 36px; }
  .header .brand { font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.9; }
  .header h1 { margin: 6px 0 4px; font-size: 26px; font-weight: 700; letter-spacing: -0.01em; }
  .header .meta { font-size: 13px; opacity: 0.92; }
  .body { padding: 32px 36px; }
  .pill { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
  .pill.green { background: #e8f7ee; color: #137333; }
  .pill.blue { background: #e7f0ff; color: #1456c4; }
  .pill.amber { background: #fff4e0; color: #a05a00; }
  .pill.gray { background: #eef0f2; color: #555; }
  h2 { font-size: 18px; margin: 28px 0 8px; letter-spacing: -0.005em; color: #1a1a1a; }
  p, li { font-size: 14.5px; line-height: 1.55; color: #2c2c2c; }
  .grade { display: flex; align-items: center; gap: 18px; padding: 18px 20px; border: 1px solid #eee; border-radius: 10px; margin: 6px 0 18px; background: #fafafa; }
  .grade .score { font-size: 40px; font-weight: 700; color: #ff6a1a; line-height: 1; }
  .grade .label { font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #666; }
  .grade .verdict { font-size: 15px; color: #1a1a1a; font-weight: 600; }
  .grade .sub { font-size: 13px; color: #666; margin-top: 2px; }
  .bar { height: 10px; background: #eef0f2; border-radius: 999px; overflow: hidden; margin: 4px 0 18px; }
  .bar > span { display: block; height: 100%; background: linear-gradient(90deg, #ff6a1a, #ff8c42); }
  .stages { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin: 8px 0 22px; }
  .stage { border: 1px solid #eee; border-radius: 10px; padding: 12px 14px; }
  .stage .name { font-weight: 700; font-size: 13.5px; margin-bottom: 4px; }
  .stage .count { font-size: 12.5px; color: #666; }
  .section { border: 1px solid #eee; border-radius: 10px; padding: 18px 20px; margin: 14px 0; }
  .section .head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .section .title { font-weight: 700; font-size: 15px; }
  .actions { background: #fafafa; border-left: 3px solid #ff6a1a; padding: 14px 18px; border-radius: 6px; margin: 18px 0; }
  .actions ol { margin: 6px 0 0; padding-left: 20px; }
  .actions li { font-size: 14px; padding: 3px 0; }
  .next { background: linear-gradient(135deg, #1a1a1a 0%, #2c2c2c 100%); color: #fff; padding: 28px 30px; border-radius: 12px; margin-top: 28px; }
  .next h2 { color: #ff8c42; margin-top: 0; }
  .next p { color: #d8d8d8; font-size: 14.5px; }
  .cta { display: inline-block; background: #ff6a1a; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 12px; }
  .footer { background: #1a1a1a; color: #888; text-align: center; padding: 18px 30px; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; }
`;

export function renderProgressReportHtml(
  snapshot: FounderProgressSnapshot,
  payload: ProgressReportPayload,
  opts: RenderOptions = {}
): string {
  const appUrl = (opts.appUrl ?? "https://joinsahara.com").replace(/\/$/, "");
  const generatedAt = opts.generatedAt ?? new Date();
  const dateStr = generatedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const tier = payload.recommendedTier;
  const priceDollars = (TIER_PRICE_CENTS[tier] / 100).toFixed(0);

  const stageCards = snapshot.stages
    .map((s) => {
      const pill = STAGE_PILL[s.status] ?? STAGE_PILL.locked;
      return `<div class="stage">
        <div class="name">${esc(s.name)}</div>
        <div class="count">${s.stepsCompleted}/${s.stepsTotal} steps</div>
        <div style="margin-top:6px"><span class="pill ${pill.className}">${pill.label}</span></div>
      </div>`;
    })
    .join("");

  const sectionsHtml = payload.sections
    .map((sec) => {
      const pill = sec.status ? SECTION_PILL[sec.status] : undefined;
      const pillHtml = pill
        ? `<span class="pill ${pill.className}">${pill.label}</span>`
        : "";
      return `<div class="section">
        <div class="head">${pillHtml}<span class="title">${esc(sec.title)}</span></div>
        ${paragraphs(sec.body)}
      </div>`;
    })
    .join("");

  const actionsHtml =
    payload.nextActions.length > 0
      ? `<div class="actions">
          <strong>Your next moves</strong>
          <ol>${payload.nextActions.map((a) => `<li>${esc(a)}</li>`).join("")}</ol>
        </div>`
      : "";

  const reportUrl = opts.reportId
    ? `${appUrl}/progress-report/${opts.reportId}`
    : `${appUrl}/dashboard`;

  const venture = snapshot.companyName ? ` · ${esc(snapshot.companyName)}` : "";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your Founder Progress Report</title>
<style>${STYLES}</style></head>
<body><div class="page">
  <div class="header">
    <div class="brand">Sahara · Founder Progress Report</div>
    <h1>${esc(snapshot.founderName)}${venture}</h1>
    <div class="meta">${dateStr} · ${esc(snapshot.currentStageName)} stage</div>
  </div>
  <div class="body">
    <div class="grade">
      <div>
        <div class="score">${payload.overallPercentage}%</div>
        <div class="label">Program Complete</div>
      </div>
      <div style="border-left:1px solid #eee; padding-left:18px;">
        <div class="verdict">${esc(payload.headline)}</div>
        <div class="sub">${esc(payload.subline)}</div>
      </div>
    </div>
    <div class="bar"><span style="width:${payload.overallPercentage}%"></span></div>

    ${paragraphs(payload.executiveSummary)}

    <h2>Where you are in the program</h2>
    <div class="stages">${stageCards}</div>

    <h2>Your progress, stage by stage</h2>
    ${sectionsHtml}

    ${actionsHtml}

    <div class="next">
      <h2>Keep your momentum</h2>
      <p>${esc(payload.upgradePitch)}</p>
      <p style="margin-top:4px;font-size:13px;opacity:0.85;">Recommended: <strong>${esc(TIER_LABEL[tier])}</strong> — $${priceDollars}</p>
      <a class="cta" href="${esc(reportUrl)}">Open your dashboard</a>
    </div>
  </div>
  <div class="footer">Sahara · Your AI Founder OS · Powered by FRED</div>
</div></body></html>`;
}

export function renderProgressReportText(
  snapshot: FounderProgressSnapshot,
  payload: ProgressReportPayload
): string {
  const lines: string[] = [];
  lines.push(`SAHARA — FOUNDER PROGRESS REPORT`);
  lines.push(`${snapshot.founderName}${snapshot.companyName ? ` · ${snapshot.companyName}` : ""}`);
  lines.push(`${payload.overallPercentage}% complete — ${payload.headline}`);
  lines.push(payload.subline);
  lines.push("");
  lines.push(payload.executiveSummary);
  lines.push("");
  lines.push("WHERE YOU ARE:");
  for (const s of snapshot.stages) {
    lines.push(`- ${s.name} (${s.status}): ${s.stepsCompleted}/${s.stepsTotal}`);
  }
  lines.push("");
  for (const sec of payload.sections) {
    lines.push(`## ${sec.title}${sec.status ? ` [${sec.status}]` : ""}`);
    lines.push(stripTags(sec.body));
    lines.push("");
  }
  if (payload.nextActions.length > 0) {
    lines.push("YOUR NEXT MOVES:");
    payload.nextActions.forEach((a, i) => lines.push(`${i + 1}. ${a}`));
    lines.push("");
  }
  lines.push(payload.upgradePitch);
  lines.push("");
  lines.push("Sahara · Your AI Founder OS · Powered by FRED");
  return lines.join("\n");
}

// --- helpers ---------------------------------------------------------------

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Split a multi-paragraph string (on blank lines) into escaped <p> blocks. */
function paragraphs(body: string): string {
  return String(body)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join("");
}

function stripTags(s: string): string {
  return String(s).replace(/<[^>]+>/g, "");
}
