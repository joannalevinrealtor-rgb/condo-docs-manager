"use client";

import { DOCS, type Property } from "@/lib/types";
import { countReceived, isStale } from "@/lib/format";

const DOT: Record<string, string> = {
  active: "dot-active",
  complete: "dot-complete",
  urgent: "dot-urgent",
  pending: "dot-pending",
};

export function Sidebar({
  properties,
  currentId,
  onDashboard,
  onOpen,
  onNew,
  onSignOut,
}: {
  properties: Property[];
  currentId: string | null;
  onDashboard: () => void;
  onOpen: (id: string) => void;
  onNew: () => void;
  onSignOut?: () => void;
}) {
  const active = properties.filter((p) => !p.archived);
  active.sort((a, b) => (a.status === "urgent" ? -1 : b.status === "urgent" ? 1 : 0));

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h1>Condo Docs</h1>
        <p>Seller Disclosure Manager</p>
      </div>
      <div className="sidebar-nav">
        <div className="sidebar-label">Navigation</div>
        <button
          className={`nav-btn ${currentId === null ? "active" : ""}`}
          onClick={onDashboard}
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
          Dashboard
        </button>
        <div className="sidebar-label" style={{ marginTop: 6 }}>Properties</div>
        <div>
          {active.length === 0 ? (
            <div style={{ padding: "6px 10px", fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
              No properties yet
            </div>
          ) : (
            active.map((p) => {
              const pct = Math.round((countReceived(p) / DOCS.length) * 100);
              const stale = isStale(p);
              const shortAddr = p.addr.split(",")[0];
              return (
                <button
                  key={p.id}
                  className={`nav-btn ${currentId === p.id ? "active" : ""}`}
                  onClick={() => onOpen(p.id)}
                >
                  <div className={`nav-dot ${DOT[p.status] || "dot-active"}`} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {shortAddr}
                  </span>
                  {stale ? <span className="nav-stale">!</span> : <span className="nav-pct">{pct}%</span>}
                </button>
              );
            })
          )}
        </div>
      </div>
      <div className="sidebar-bottom">
        <button className="btn btn-new" onClick={onNew}>+ New Property</button>
      </div>
      <div className="sidebar-note">
        <span>Cloud-synced</span>
        {onSignOut && <button onClick={onSignOut}>Sign out</button>}
      </div>
    </div>
  );
}
