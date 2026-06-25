// ── Builds the printable COA Summary document ───────────────────────────────
// Opens a clean, print-ready page; the browser's "Save as PDF" produces the file.

import { DOCS, type AnalysisTopic, type Property } from "./types";
import { today } from "./format";

/** Flattens an AI analysis topic into summary + bulleted details. */
function aiTopicText(t?: AnalysisTopic): string {
  if (!t) return "";
  let s = (t.summary || "").trim();
  const det = (t.key_details || []).filter(Boolean);
  if (det.length) s += (s ? "\n" : "") + det.map((d) => "• " + d).join("\n");
  return s.trim();
}

function esc(s: string | undefined): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function val(s: string | undefined): string {
  const t = (s || "").trim();
  return t ? esc(t) : '<span style="color:#9CA3AF;">unknown</span>';
}

function yesNo(v: string | undefined): string {
  if (v === "yes") return "Yes";
  if (v === "no") return "No";
  return '<span style="color:#9CA3AF;">unknown</span>';
}

/** Two-column table of label/value rows. */
function rows(pairs: [string, string][]): string {
  return (
    '<table style="width:100%;border-collapse:collapse;font-size:13px;">' +
    pairs
      .map(
        ([k, v]) =>
          `<tr><td style="color:#6B7280;padding:4px 12px 4px 0;width:230px;vertical-align:top;">${esc(k)}</td>` +
          `<td style="color:#1a1a1a;padding:4px 0;vertical-align:top;">${v}</td></tr>`
      )
      .join("") +
    "</table>"
  );
}

function section(title: string, body: string): string {
  return (
    `<div style="margin-bottom:22px;">` +
    `<div style="font-size:12px;font-weight:700;color:#0F2644;text-transform:uppercase;letter-spacing:0.06em;border-bottom:2px solid #E5E7EB;padding-bottom:5px;margin-bottom:10px;">${esc(title)}</div>` +
    body +
    `</div>`
  );
}

export function buildCoaSummaryHtml(p: Property): string {
  const c = p.coa || {};
  const haveApp = p.received?.["d0"] ? "Yes" : "No";

  // Pull AI findings where the VA hasn't typed their own value.
  const a = p.analysis;
  const frorFromAI = a?.fror?.summary;
  const fror = c.rightOfFirstRefusal?.trim() || frorFromAI || "";

  // Management contact block, assembled from the HOA fields.
  const mgmtLines: string[] = [];
  if (p.hoaContact) mgmtLines.push(esc(p.hoaContact));
  if (p.hoaName) mgmtLines.push(esc(p.hoaName));
  if (p.hoaAddr) mgmtLines.push(esc(p.hoaAddr));
  if (p.hoaEmail) mgmtLines.push(esc(p.hoaEmail));
  if (p.hoaPhone) mgmtLines.push("Phone: " + esc(p.hoaPhone));
  if (p.hoaFax) mgmtLines.push("Fax: " + esc(p.hoaFax));
  const mgmtBlock = mgmtLines.length
    ? mgmtLines.join("<br>")
    : '<span style="color:#9CA3AF;">unknown</span>';

  // Restriction sections: prefer the VA's typed text, else fall back to AI findings.
  const rental = c.rentalRestrictions?.trim() || aiTopicText(a?.rental);
  const pet = c.petRestrictions?.trim() || aiTopicText(a?.pet);
  const income = c.incomeCreditRestrictions?.trim() || aiTopicText(a?.income);
  const otherRules = c.rulesSummary?.trim() || "";

  // A labeled block of free-text within the Rules section.
  const ruleBlock = (label: string, text: string) =>
    `<div style="margin-bottom:13px;">` +
    `<div style="font-size:13px;font-weight:600;color:#0F2644;margin-bottom:3px;">${esc(label)}</div>` +
    `<div style="font-size:13px;line-height:1.6;white-space:pre-wrap;">${val(text)}</div>` +
    `</div>`;

  const body =
    section(
      "COA Documents",
      rows([
        ["Notes", val(p.notes?.[0]?.text)],
        ["All Documents Received", yesNo(c.allDocsReceived)],
        ["Pending Documents", val(c.pendingDocs)],
      ])
    ) +
    section(
      "Association Information",
      rows([
        ["Community Name", val(p.condo)],
        ["Management Company", val(p.hoaName)],
        ["Management Company Contact", mgmtBlock],
        ["Master / Additional Associations", yesNo(c.masterAssoc)],
        ["Additional Association Contact", val(c.masterAssocContact)],
      ])
    ) +
    section(
      "Association Approval",
      rows([
        ["Approval Required for Purchaser", yesNo(c.approvalRequired)],
        ["We have the Purchaser Application", haveApp],
      ])
    ) +
    section("Right of First Refusal", `<div style="font-size:13px;line-height:1.6;">${val(fror)}</div>`) +
    section(
      "Fees / Assessments / Litigation",
      rows([
        ["Maintenance Fee", val(c.maintenanceFee)],
        ["Maintenance Fee Frequency", val(c.maintenanceFreq)],
        ["Land Lease Fee", val(c.landLeaseFee)],
        ["Rec Lease Fee", val(c.recLeaseFee)],
        ["Any pending or anticipated litigation", val(c.litigation)],
      ])
    ) +
    section("Sprinkler System Retrofit", `<div style="font-size:13px;line-height:1.6;">${val(c.sprinklerRetrofit)}</div>`) +
    section(
      "Milestone / Turnover / SIRS",
      rows([
        ["Milestone Inspection", val(c.milestoneStatus)],
        ["Turnover Inspection Report", val(c.turnoverStatus)],
        ["SIRS (Structural Integrity Reserve Study)", val(c.sirsStatus)],
      ])
    ) +
    section(
      "Rules & Regulations",
      ruleBlock("Rental Restrictions", rental) +
        ruleBlock("Pet Restrictions", pet) +
        ruleBlock("Income / Credit Restrictions", income) +
        (otherRules ? ruleBlock("Other Restrictions", otherRules) : "")
    );

  // Document checklist appendix.
  const checklist =
    '<table style="width:100%;border-collapse:collapse;font-size:13px;">' +
    DOCS.map(
      (d) =>
        `<tr><td style="padding:3px 8px 3px 0;width:24px;">${p.received?.[d.id] ? "☑" : "☐"}</td>` +
        `<td style="padding:3px 0;color:${p.received?.[d.id] ? "#166534" : "#6B7280"};">${esc(d.name)}</td></tr>`
    ).join("") +
    "</table>";

  return (
    "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>COA Summary – " +
    esc(p.addr) +
    "</title>" +
    "<style>@page{margin:18mm;}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;margin:0;padding:0;color:#1a1a1a;}@media print{.noprint{display:none;}}</style>" +
    "</head><body><div style='max-width:760px;margin:0 auto;padding:32px 28px;'>" +
    "<div class='noprint' style='background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:10px 14px;margin-bottom:20px;font-size:13px;color:#1E40AF;'>" +
    "To save as a PDF: press <strong>⌘P</strong> (or Ctrl+P), then choose <strong>Save as PDF</strong> as the destination." +
    "</div>" +
    "<div style='border-bottom:3px solid #0F2644;padding-bottom:14px;margin-bottom:22px;'>" +
    "<div style='font-size:22px;font-weight:700;color:#0F2644;'>COA Summary</div>" +
    "<div style='font-size:14px;color:#374151;margin-top:3px;'>" + esc(p.addr) + "</div>" +
    (p.buyer ? "<div style='font-size:13px;color:#6B7280;margin-top:2px;'>Buyer: " + esc(p.buyer) + (p.closing ? " · Closing: " + esc(p.closing) : "") + "</div>" : "") +
    "<div style='font-size:12px;color:#9CA3AF;margin-top:4px;'>Generated " + today() + (p.agent ? " · " + esc(p.agent) : "") + "</div>" +
    "</div>" +
    body +
    section("Document Checklist", checklist) +
    "<div style='margin-top:28px;padding-top:14px;border-top:1px solid #E5E7EB;font-size:11px;color:#9CA3AF;text-align:center;'>Generated by Condo Docs Manager · " + today() + "</div>" +
    "</div></body></html>"
  );
}

export function openCoaSummary(p: Property): void {
  const html = buildCoaSummaryHtml(p);
  const win = window.open("", "_blank");
  if (!win) {
    alert("Please allow pop-ups for this site to generate the summary, then try again.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
}
