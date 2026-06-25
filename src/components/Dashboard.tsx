"use client";

import { useState } from "react";
import { DOCS, type Property } from "@/lib/types";
import { countReceived, daysSince, isStale, staleText } from "@/lib/format";

const BADGE: Record<string, string> = {
  active: "badge-active",
  complete: "badge-complete",
  urgent: "badge-urgent",
  pending: "badge-pending",
};

export function Dashboard({
  properties,
  onOpen,
  onNew,
}: {
  properties: Property[];
  onOpen: (id: string) => void;
  onNew: () => void;
}) {
  const [showArchived, setShowArchived] = useState(false);

  const all = properties.filter((p) => showArchived || !p.archived);
  const nonArc = properties.filter((p) => !p.archived);
  const active = nonArc.filter((p) => p.status !== "complete").length;
  const urgent = nonArc.filter((p) => p.status === "urgent").length;
  const staleN = nonArc.filter((p) => isStale(p)).length;

  const sorted = [...all].sort((a, b) => {
    if (a.status === "urgent" && b.status !== "urgent") return -1;
    if (b.status === "urgent" && a.status !== "urgent") return 1;
    return daysSince(a.lastUpdated) - daysSince(b.lastUpdated);
  });

  return (
    <div>
      <div className="page-title">Dashboard</div>
      <div className="page-sub">Florida seller condo disclosure tracker</div>
      <div className="stats-grid">
        <div className="stat-box"><div className="stat-num">{nonArc.length}</div><div className="stat-label">Properties</div></div>
        <div className="stat-box"><div className="stat-num" style={{ color: "#185FA5" }}>{active}</div><div className="stat-label">In progress</div></div>
        <div className="stat-box"><div className="stat-num" style={{ color: "#C62828" }}>{urgent}</div><div className="stat-label">Urgent</div></div>
        <div className="stat-box"><div className="stat-num" style={{ color: "#D97706" }}>{staleN}</div><div className="stat-label">Needs check-in</div></div>
      </div>
      <div className="row mb12">
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280" }}>Properties</div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6B7280", cursor: "pointer" }}>
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived
        </label>
      </div>

      {all.length === 0 ? (
        <div className="empty">
          <h3>No properties yet</h3>
          <p>Click New Property in the sidebar to get started</p>
          <button className="btn btn-primary" onClick={onNew}>+ New Property</button>
        </div>
      ) : (
        <div className="prop-grid">
          {sorted.map((p) => {
            const rec = countReceived(p);
            const pct = Math.round((rec / DOCS.length) * 100);
            const stale = isStale(p) && !p.archived;
            const meta = [p.condo, p.closing ? "Closing: " + p.closing : ""].filter(Boolean).join(" · ");
            const noteCount = (p.notes || []).length;
            return (
              <div key={p.id} className={`prop-card ${stale ? "stale" : ""}`} onClick={() => onOpen(p.id)}>
                <div className="row mb8">
                  <div className="prop-name">
                    {p.addr.split(",")[0]}
                    {p.archived && <span style={{ fontSize: 10, color: "#9CA3AF" }}> (archived)</span>}
                  </div>
                  <span className={`badge ${BADGE[p.status] || "badge-active"}`}>{p.status}</span>
                </div>
                <div className="prop-meta">{meta || "No details"}</div>
                <div className="pbar"><div className="pbar-fill" style={{ width: pct + "%" }} /></div>
                <div className="pbar-row mb8"><span>{rec} of {DOCS.length} docs</span><span>{pct}%</span></div>
                <div className="row">
                  <span className={stale ? "stale-label" : "muted sm"}>{staleText(p.lastUpdated)}</span>
                  {noteCount > 0 && <span className="note-chip">📝 {noteCount} note{noteCount !== 1 ? "s" : ""}</span>}
                  {stale && <span className="stale-chip">Check in needed</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
