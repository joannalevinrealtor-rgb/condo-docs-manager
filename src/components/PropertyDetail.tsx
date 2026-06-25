"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DOCS, emptyFiles, type AnalysisResult, type FileRec, type Property, type PropertyFiles } from "@/lib/types";
import { countReceived, daysSince, fileExt, fileSize, today } from "@/lib/format";
import { coverEmail, missingEmail } from "@/lib/email";
import { loadFiles, saveFiles } from "@/lib/store";
import { buildPackage, downloadBlob, packageFileName } from "@/lib/zip";
import { openCoaSummary } from "@/lib/coaSummary";
import type { CoaDetails } from "@/lib/types";

const BADGE: Record<string, string> = {
  active: "badge-active", complete: "badge-complete", urgent: "badge-urgent", pending: "badge-pending",
};

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function fid(): string {
  return "f" + Date.now() + Math.random().toString(36).slice(2, 6);
}

export function PropertyDetail({
  property,
  onSave,
  onEdit,
  onBack,
}: {
  property: Property;
  onSave: (p: Property) => Promise<void>;
  onEdit: () => void;
  onBack: () => void;
}) {
  const p = property;
  const [tab, setTab] = useState(0);
  const [files, setFilesState] = useState<PropertyFiles>(emptyFiles());
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    let alive = true;
    loadFiles(p.id).then((f) => {
      if (alive) setFilesState(f);
    });
    return () => {
      alive = false;
    };
  }, [p.id]);

  // Persist files + update in-memory state together.
  const persistFiles = useCallback(
    async (next: PropertyFiles) => {
      setFilesState(next);
      await saveFiles(p.id, next);
    },
    [p.id]
  );

  // Update the property: append a log line, bump lastUpdated, persist.
  const mutate = useCallback(
    async (changes: Partial<Property>, logMsg?: string) => {
      const next: Property = { ...p, ...changes, lastUpdated: today() };
      if (logMsg) next.log = [{ date: today(), msg: logMsg }, ...(p.log || [])];
      await onSave(next);
    },
    [p, onSave]
  );

  const rec = countReceived(p);
  const fileCount =
    files.regular.length + files.minutes.length + files.misc.reduce((n, s) => n + s.files.length, 0);

  const meta = [
    p.condo, p.buyer ? "Buyer: " + p.buyer : "", p.closing ? "Closing: " + p.closing : "",
    p.agent ? "Agent: " + p.agent : "", p.hoaName ? "HOA: " + p.hoaName : "",
  ].filter(Boolean).join(" · ");

  async function toggleDoc(did: string) {
    const received = { ...p.received };
    const recDates = { ...p.recDates };
    received[did] = !received[did];
    if (received[did]) recDates[did] = today();
    else delete recDates[did];
    const doc = DOCS.find((d) => d.id === did)!;
    await mutate({ received, recDates }, (received[did] ? "Received: " : "Unmarked: ") + doc.name);
  }

  async function archive() {
    if (!confirm("Archive this property? It will be hidden from the dashboard.")) return;
    await mutate({ archived: true }, "Property archived");
    onBack();
  }

  return (
    <div>
      <button className="back" onClick={onBack}>← Back to dashboard</button>
      <div className="prop-header">
        <div>
          <div className="prop-header-title">{p.addr}</div>
          <div className="prop-header-meta">{meta || "No details yet"}</div>
        </div>
        <div className="gap">
          <span className={`badge ${BADGE[p.status] || "badge-active"}`}>{p.status}</span>
          <button className="btn btn-sm" onClick={onEdit}>Edit</button>
          <button className="btn btn-sm btn-danger" onClick={archive}>Archive</button>
        </div>
      </div>

      <div className="quick-actions">
        <span className="quick-actions-label">Quick:</span>
        <button className="btn btn-sm btn-email-quick" onClick={() => setTab(2)}>✉️ Generate Buyer Email</button>
        <button className="btn btn-sm btn-email-quick" onClick={() => setTab(2)}>📋 Generate Missing Docs Email</button>
        <button className="btn btn-sm" onClick={() => setTab(6)}>📄 COA Summary</button>
        <button className="btn btn-sm btn-share" onClick={() => setShowShare(true)}>📦 Package for Next Party</button>
      </div>

      <div className="mini-stats">
        <div className="mini-stat"><div className="mini-stat-num" style={{ color: "#2E7D32" }}>{rec}</div><div className="mini-stat-label">Docs checked off</div></div>
        <div className="mini-stat"><div className="mini-stat-num" style={{ color: "#185FA5" }}>{fileCount}</div><div className="mini-stat-label">Files uploaded</div></div>
        <div className="mini-stat"><div className="mini-stat-num">{Math.round((rec / DOCS.length) * 100)}%</div><div className="mini-stat-label">Complete</div></div>
      </div>

      <div className="tabs">
        {["Checklist", "Upload Docs", "✉️ Emails", "📝 Notes", "🤖 AI Analysis", "Activity Log", "📄 COA Summary"].map((label, i) => (
          <button key={i} className={`tab ${tab === i ? "active" : ""}`} onClick={() => setTab(i)}>{label}</button>
        ))}
      </div>

      {tab === 0 && <ChecklistTab p={p} files={files} onToggle={toggleDoc} onGoEmails={() => setTab(2)} />}
      {tab === 1 && <UploadTab p={p} files={files} persistFiles={persistFiles} mutate={mutate} />}
      {tab === 2 && <EmailsTab p={p} onLog={(m) => mutate({}, m)} />}
      {tab === 3 && <NotesTab p={p} onSave={onSave} onShare={() => setShowShare(true)} />}
      {tab === 4 && <AnalysisTab p={p} files={files} onSave={onSave} />}
      {tab === 5 && <LogTab p={p} onSave={onSave} />}
      {tab === 6 && <CoaSummaryTab p={p} onSave={onSave} />}

      {showShare && <ShareModal p={p} files={files} onClose={() => setShowShare(false)} onLog={(m) => mutate({}, m)} />}
    </div>
  );
}

// ── Checklist tab ───────────────────────────────────────────────────────────
function ChecklistTab({
  p, files, onToggle, onGoEmails,
}: {
  p: Property; files: PropertyFiles; onToggle: (id: string) => void; onGoEmails: () => void;
}) {
  const rec = p.received || {};
  const dates = p.recDates || {};
  const allDone = DOCS.every((d) => rec[d.id]);

  return (
    <div>
      <div className="row mb12">
        <span className="muted sm">Check off each document as it is gathered for the buyer</span>
        <button className="btn btn-sm btn-email-quick" onClick={onGoEmails}>✉️ Generate Emails</button>
      </div>
      {allDone && <div className="all-done">✓ All {DOCS.length} documents gathered — ready to package for buyer!</div>}
      <div className="checklist">
        {DOCS.map((d) => {
          const isRec = !!rec[d.id];
          const dstr = dates[d.id] || "";
          const staleDoc = isRec && d.id === "d8" && daysSince(dstr) > 30;
          return (
            <div className="doc-row" key={d.id}>
              <div className={`chk ${isRec ? "on" : ""}`} onClick={() => onToggle(d.id)} />
              <div className="doc-info">
                <div className={`doc-name ${isRec ? "done" : ""}`}>{d.name}</div>
                <div className="doc-hint">{d.hint}</div>
                {isRec && dstr && (
                  <div className="doc-date">Received {dstr}{staleDoc ? "  ⚠ May need updating" : ""}</div>
                )}
              </div>
              {staleDoc ? (
                <span className="doc-tag tag-stale">Check recency</span>
              ) : (
                <span className={`doc-tag ${isRec ? "tag-ok" : "tag-miss"}`}>{isRec ? "Received" : "Missing"}</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="card" style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#0F2644" }}>Meeting Minutes &amp; Agendas</div>
        <div style={{ fontSize: 11, marginTop: 2, color: files.minutes.length >= 12 ? "#2E7D32" : "#D97706" }}>
          {files.minutes.length > 0 ? `${files.minutes.length} of 12 months uploaded` : "0 of 12 months — upload in the Upload Docs tab"}
        </div>
      </div>
    </div>
  );
}

// ── Upload tab ──────────────────────────────────────────────────────────────
function UploadTab({
  p, files, persistFiles, mutate,
}: {
  p: Property;
  files: PropertyFiles;
  persistFiles: (f: PropertyFiles) => Promise<void>;
  mutate: (changes: Partial<Property>, logMsg?: string) => Promise<void>;
}) {
  const mainInput = useRef<HTMLInputElement>(null);
  const minInput = useRef<HTMLInputElement>(null);
  const miscInputs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  async function addRegular(list: FileList | null) {
    if (!list || !list.length) return;
    const recs: FileRec[] = [];
    for (const f of Array.from(list)) {
      recs.push({ id: fid(), name: f.name, size: f.size, dataUrl: await readAsDataURL(f), assignedDocId: "", uploaded: today() });
    }
    await persistFiles({ ...files, regular: [...files.regular, ...recs] });
    await mutate({}, `Uploaded ${recs.length} file(s)`);
  }

  async function addMinutes(list: FileList | null) {
    if (!list || !list.length) return;
    const recs: FileRec[] = [];
    for (const f of Array.from(list)) {
      recs.push({ id: fid(), name: f.name, size: f.size, dataUrl: await readAsDataURL(f), uploaded: today() });
    }
    await persistFiles({ ...files, minutes: [...files.minutes, ...recs] });
    // Auto-check the minutes checklist item if not already.
    if (!p.received["d8"]) {
      await mutate(
        { received: { ...p.received, d8: true }, recDates: { ...p.recDates, d8: today() } },
        `Uploaded ${recs.length} minute file(s) — checklist updated`
      );
    } else {
      await mutate({}, `Uploaded ${recs.length} minute file(s)`);
    }
  }

  async function addMisc(slot: number, list: FileList | null) {
    if (!list || !list.length) return;
    const recs: FileRec[] = [];
    for (const f of Array.from(list)) {
      recs.push({ id: fid(), name: f.name, size: f.size, dataUrl: await readAsDataURL(f), uploaded: today() });
    }
    const misc = files.misc.map((s, i) => (i === slot ? { ...s, files: [...s.files, ...recs] } : s));
    await persistFiles({ ...files, misc });
    await mutate({}, `Uploaded ${recs.length} misc file(s)`);
  }

  async function assign(fileId: string, docId: string) {
    const regular = files.regular.map((f) => (f.id === fileId ? { ...f, assignedDocId: docId } : f));
    await persistFiles({ ...files, regular });
    if (docId && !p.received[docId]) {
      const doc = DOCS.find((d) => d.id === docId)!;
      await mutate(
        { received: { ...p.received, [docId]: true }, recDates: { ...p.recDates, [docId]: today() } },
        "Auto-checked via upload: " + doc.name
      );
    }
  }

  async function removeRegular(fileId: string) {
    if (!confirm("Remove this file?")) return;
    await persistFiles({ ...files, regular: files.regular.filter((f) => f.id !== fileId) });
  }
  async function removeMinute(fileId: string) {
    if (!confirm("Remove this file?")) return;
    await persistFiles({ ...files, minutes: files.minutes.filter((f) => f.id !== fileId) });
  }
  async function removeMisc(slot: number, fileId: string) {
    if (!confirm("Remove this file?")) return;
    const misc = files.misc.map((s, i) => (i === slot ? { ...s, files: s.files.filter((f) => f.id !== fileId) } : s));
    await persistFiles({ ...files, misc });
  }
  async function setLabel(slot: number, label: string) {
    const misc = files.misc.map((s, i) => (i === slot ? { ...s, label } : s));
    await persistFiles({ ...files, misc });
  }

  return (
    <div>
      <div className="card mb14">
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", marginBottom: 8 }}>
          Upload Document Files
        </div>
        <p className="sm muted mb12">
          Upload files from the HOA and assign each one to the correct document using the dropdown. Assigning a file auto-checks it on the checklist.
        </p>
        <div className="upload-zone" onClick={() => mainInput.current?.click()}>
          <input ref={mainInput} type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: "none" }}
            onChange={(e) => { addRegular(e.target.files); e.target.value = ""; }} />
          <div style={{ fontSize: 13, fontWeight: 500, color: "#4B5563", marginBottom: 3 }}>Click to upload files</div>
          <div style={{ fontSize: 12, color: "#9CA3AF" }}>PDF, DOC, JPG — multiple files OK</div>
        </div>
      </div>

      {files.regular.map((f) => (
        <div className="upload-file" key={f.id}>
          <div className="upload-file-top">
            <div className="file-icon">{fileExt(f.name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="file-name">{f.name}</div>
              <div className="file-meta">Uploaded {f.uploaded} · {fileSize(f.size)}</div>
            </div>
            <button className="btn btn-sm btn-danger" onClick={() => removeRegular(f.id)}>✕</button>
          </div>
          <div className="file-assign">
            <select value={f.assignedDocId || ""} onChange={(e) => assign(f.id, e.target.value)}>
              <option value="">— Assign to document —</option>
              {DOCS.filter((d) => d.id !== "d8").map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
      ))}

      {/* Meeting minutes */}
      <div className="card">
        <div className="row mb12">
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0F2644" }}>Meeting Minutes &amp; Agendas</div>
            <div style={{ fontSize: 11, marginTop: 2, color: files.minutes.length >= 12 ? "#2E7D32" : "#9CA3AF" }}>
              Preceding 12 months required — {files.minutes.length} of 12 months uploaded
            </div>
          </div>
          <button className="btn btn-sm" onClick={() => minInput.current?.click()}>+ Upload Minutes</button>
          <input ref={minInput} type="file" multiple accept=".pdf,.doc,.docx" style={{ display: "none" }}
            onChange={(e) => { addMinutes(e.target.files); e.target.value = ""; }} />
        </div>
        {files.minutes.length === 0 ? (
          <div style={{ padding: 10, textAlign: "center", fontSize: 12, color: "#9CA3AF", background: "#F9FAFB", borderRadius: 6 }}>
            No minutes uploaded yet
          </div>
        ) : (
          files.minutes.map((m) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "#F9FAFB", borderRadius: 6, marginBottom: 4 }}>
              <div className="file-icon" style={{ width: 28, height: 28 }}>{fileExt(m.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="file-name" style={{ fontSize: 12 }}>{m.name}</div>
                <div className="file-meta" style={{ fontSize: 10 }}>{m.uploaded} · {fileSize(m.size)}</div>
              </div>
              <button className="btn btn-sm btn-danger" onClick={() => removeMinute(m.id)}>✕</button>
            </div>
          ))
        )}
      </div>

      {/* Miscellaneous slots */}
      <div style={{ marginTop: 14, marginBottom: 8, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280" }}>
        Additional / Miscellaneous Documents
      </div>
      {files.misc.map((slot, s) => (
        <div className="card" key={s}>
          <div className="row mb12" style={{ gap: 8 }}>
            <input
              type="text" placeholder="Label this slot (e.g. HOA Welcome Letter)" defaultValue={slot.label}
              onBlur={(e) => setLabel(s, e.target.value)}
              style={{ flex: 1, border: "1px solid #D1D5DB", borderRadius: 6, padding: "6px 10px", fontSize: 13, fontFamily: "inherit" }}
            />
            <button className="btn btn-sm" onClick={() => miscInputs[s].current?.click()}>+ Upload</button>
            <input ref={miscInputs[s]} type="file" multiple accept=".pdf,.doc,.docx,.jpg,.png" style={{ display: "none" }}
              onChange={(e) => { addMisc(s, e.target.files); e.target.value = ""; }} />
          </div>
          {slot.files.length === 0 ? (
            <div style={{ padding: 8, textAlign: "center", fontSize: 12, color: "#9CA3AF", background: "#F9FAFB", borderRadius: 6 }}>
              No files uploaded
            </div>
          ) : (
            slot.files.map((mf) => (
              <div key={mf.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "#F9FAFB", borderRadius: 6, marginBottom: 4 }}>
                <div className="file-icon" style={{ width: 28, height: 28, background: "#EDE9FE", color: "#5B21B6" }}>{fileExt(mf.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="file-name" style={{ fontSize: 12 }}>{mf.name}</div>
                  <div className="file-meta" style={{ fontSize: 10 }}>{mf.uploaded} · {fileSize(mf.size)}</div>
                </div>
                <button className="btn btn-sm btn-danger" onClick={() => removeMisc(s, mf.id)}>✕</button>
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  );
}

// ── Emails tab ──────────────────────────────────────────────────────────────
function EmailsTab({ p, onLog }: { p: Property; onLog: (m: string) => void }) {
  const [which, setWhich] = useState<"cover" | "missing">("cover");
  const [copied, setCopied] = useState(false);
  const text = which === "cover" ? coverEmail(p) : missingEmail(p);

  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div>
      <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#166534" }}>
        ✉️ <strong>Two emails are ready below</strong> — one for the <strong>buyer</strong> with gathered documents, and one to request <strong>missing docs</strong> from the seller/HOA. Both auto-update as you check off documents.
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className={`focus-btn ${which === "cover" ? "active" : ""}`} onClick={() => setWhich("cover")}>Cover Email to Buyer</button>
        <button className={`focus-btn ${which === "missing" ? "active" : ""}`} onClick={() => setWhich("missing")}>Missing Docs Request to Seller</button>
      </div>
      <div className="card">
        <div className="row mb12">
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280" }}>
            {which === "cover" ? "Cover Email — Agent to Buyer" : "Missing Documents Request — Agent to Seller / HOA"}
          </div>
          <div className="gap">
            <button className="btn btn-sm btn-primary" onClick={copy}>{copied ? "Copied!" : "Copy Email"}</button>
            <button className="btn btn-sm btn-ghost" onClick={() => onLog(which === "cover" ? "Cover email sent to buyer" : "Missing docs request sent to seller/HOA")}>Mark Sent</button>
          </div>
        </div>
        <div className="email-preview">{text}</div>
        <p className="sm muted mt12">Auto-updates as you check off documents.</p>
      </div>
    </div>
  );
}

// ── Notes tab ───────────────────────────────────────────────────────────────
function NotesTab({ p, onSave, onShare }: { p: Property; onSave: (p: Property) => Promise<void>; onShare: () => void }) {
  const [text, setText] = useState("");
  const notes = p.notes || [];

  async function add() {
    const t = text.trim();
    if (!t) return;
    const next: Property = {
      ...p,
      notes: [{ id: Date.now(), text: t, date: new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) }, ...notes],
      lastUpdated: today(),
      log: [{ date: today(), msg: "Note added" }, ...(p.log || [])],
    };
    await onSave(next);
    setText("");
  }

  async function del(id: number) {
    if (!confirm("Delete this note?")) return;
    await onSave({ ...p, notes: notes.filter((n) => n.id !== id) });
  }

  return (
    <div>
      <div className="notes-card">
        <div className="notes-header">
          <div className="notes-title"><div className="notes-icon">📝</div>Transaction Notes</div>
          <span className="muted sm">{notes.length} note{notes.length !== 1 ? "s" : ""}</span>
        </div>
        <div style={{ marginBottom: 16 }}>
          {notes.length === 0 ? (
            <div className="notes-empty">📝 No notes yet — add your first note below</div>
          ) : (
            notes.map((n) => (
              <div className="note-entry" key={n.id}>
                <button className="note-entry-del" onClick={() => del(n.id)}>✕</button>
                <div className="note-entry-text">{n.text}</div>
                <div className="note-entry-meta">{n.date}</div>
              </div>
            ))
          )}
        </div>
        <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", marginBottom: 8 }}>Add Note</div>
          <div className="notes-compose">
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your note here — e.g. 'Called HOA 3/15, waiting on financial docs. Follow up Thursday.'" />
            <div className="notes-compose-row">
              <span className="sm muted">Notes are included when you package this property for the next party.</span>
              <button className="btn btn-primary btn-sm" onClick={add}>Add Note</button>
            </div>
          </div>
        </div>
      </div>
      <div style={{ background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#5B21B6", marginBottom: 2 }}>🔗 Ready to hand off to the next party?</div>
          <div style={{ fontSize: 12, color: "#7C3AED" }}>Download a self-contained package with HOA info, checklist, documents, and notes.</div>
        </div>
        <button className="btn btn-share" onClick={onShare}>Share Package</button>
      </div>
    </div>
  );
}

// ── Activity log tab ────────────────────────────────────────────────────────
function LogTab({ p, onSave }: { p: Property; onSave: (p: Property) => Promise<void> }) {
  const [text, setText] = useState("");
  const log = p.log || [];

  async function add() {
    const t = text.trim();
    if (!t) return;
    await onSave({ ...p, lastUpdated: today(), log: [{ date: today(), msg: "Note: " + t }, ...log] });
    setText("");
  }

  return (
    <div>
      <div className="log-list mb12">
        {log.length === 0 ? (
          <div className="log-row muted">No activity yet</div>
        ) : (
          log.map((l, i) => (
            <div className="log-row" key={i}><span>{l.msg}</span><span className="log-date">{l.date}</span></div>
          ))
        )}
      </div>
      <div className="note-row">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a quick log entry..." onKeyDown={(e) => e.key === "Enter" && add()} />
        <button className="btn btn-sm btn-primary" onClick={add}>Add</button>
      </div>
    </div>
  );
}

// ── AI analysis tab ─────────────────────────────────────────────────────────
const FOCUS_LABELS: Record<string, string> = {
  all: "All", rental: "Rental only", pet: "Pets only", fror: "First Right of Refusal only", income: "Income / Credit only",
};
const TOPIC_LABELS: Record<string, string> = {
  rental: "Rental Restrictions", pet: "Pet Restrictions", fror: "First Right of Refusal", income: "Income / Credit Restrictions",
};
const STATUS_LABELS: Record<string, string> = {
  restricted: "Restricted", allowed: "Allowed", unclear: "Unclear — Review Needed", not_found: "Not Found",
};

function AnalysisTab({ p, files, onSave }: { p: Property; files: PropertyFiles; onSave: (p: Property) => Promise<void> }) {
  const [focus, setFocus] = useState<"all" | "rental" | "pet" | "fror" | "income">("all");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const result = p.analysis || null;

  // Build the list of pickable files (regular + minutes + misc).
  const pickable: { id: string; label: string; rec: FileRec }[] = [];
  for (const f of files.regular) {
    const doc = f.assignedDocId ? DOCS.find((d) => d.id === f.assignedDocId) : null;
    pickable.push({ id: f.id, label: doc ? doc.name : f.name, rec: f });
  }
  for (const m of files.minutes) pickable.push({ id: m.id, label: "Minutes — " + m.name, rec: m });
  files.misc.forEach((slot, s) => slot.files.forEach((mf) => pickable.push({ id: mf.id, label: (slot.label || "Misc " + (s + 1)) + " — " + mf.name, rec: mf })));

  async function run() {
    const chosen = pickable.filter((x) => selected[x.id]);
    if (!chosen.length) {
      alert("Please select at least one uploaded document to analyze.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const docs = chosen.map((x) => ({ name: x.label, dataUrl: x.rec.dataUrl, url: x.rec.url }));
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focus, docs }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Analysis failed (status ${res.status}).`);
      }
      const data = (await res.json()) as AnalysisResult;
      await onSave({
        ...p,
        analysis: { ...data, generatedAt: today(), docNames: chosen.map((x) => x.label) },
        lastUpdated: today(),
        log: [{ date: today(), msg: "AI analysis run" }, ...(p.log || [])],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="tip-box">
        <strong>One-click analysis.</strong> Select the Rules &amp; Regulations / Declaration documents you uploaded, choose what to look for, and click Analyze. Claude reads the documents and flags rental, pet, and approval restrictions.
      </div>

      {pickable.length === 0 ? (
        <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 8, padding: "12px 14px", fontSize: 13, color: "#92400E" }}>
          No files uploaded yet — go to the <strong>Upload Docs</strong> tab to add the governing documents first, then come back here to analyze them.
        </div>
      ) : (
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", marginBottom: 10 }}>Documents to analyze</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
            {pickable.map((x) => (
              <label key={x.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: `1.5px solid ${selected[x.id] ? "#185FA5" : "#E5E7EB"}`, borderRadius: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={!!selected[x.id]} onChange={(e) => setSelected((s) => ({ ...s, [x.id]: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "#185FA5" }} />
                <div style={{ fontSize: 13, fontWeight: 500 }}>{x.label}</div>
              </label>
            ))}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", marginBottom: 8 }}>What to look for</div>
          <div className="focus-row mb14">
            {(Object.keys(FOCUS_LABELS) as (keyof typeof FOCUS_LABELS)[]).map((k) => (
              <button key={k} className={`focus-btn ${focus === k ? "active" : ""}`} onClick={() => setFocus(k as typeof focus)}>{FOCUS_LABELS[k]}</button>
            ))}
          </div>
          {error && <div className="login-error" style={{ marginBottom: 12 }}>{error}</div>}
          <button className="btn btn-primary" onClick={run} disabled={loading}>
            {loading ? "Analyzing…" : "🤖 Run AI Analysis"}
          </button>
          {loading && (
            <div className="loading-row"><div className="spinner" /> Reading the documents — this can take 20–40 seconds…</div>
          )}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 16 }}>
          <div className="row mb12">
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F2644" }}>Analysis Results</div>
            <span className="muted sm">Generated {result.generatedAt}</span>
          </div>
          {(["rental", "pet", "fror", "income"] as const).map((t) => {
            const d = result[t];
            if (!d) return null;
            return (
              <div className={`ablock ${d.status === "restricted" ? "ablock-danger" : d.status === "allowed" ? "ablock-ok" : "ablock-warn"}`} key={t}>
                <div className="ablock-title">
                  {TOPIC_LABELS[t]}
                  <span className={`pill pill-${d.status}`}>{STATUS_LABELS[d.status]}</span>
                </div>
                <div className="ablock-body">{d.summary}</div>
                {d.key_details?.length > 0 && (
                  <ul className="ablock-list">{d.key_details.map((x, i) => <li key={i}>{x}</li>)}</ul>
                )}
                {d.concern && <div className="concern-flag">⚠ Buyer concern: {d.concern_note}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── COA Summary tab ─────────────────────────────────────────────────────────
const STATUS_OPTIONS = ["", "Is Required", "Is Required and Completed", "Is Not Required", "Unknown"];

function CoaSummaryTab({ p, onSave }: { p: Property; onSave: (p: Property) => Promise<void> }) {
  const [c, setC] = useState<CoaDetails>(p.coa || {});
  const [fax, setFax] = useState(p.hoaFax || "");
  const [saved, setSaved] = useState(false);

  async function persist() {
    await onSave({ ...p, coa: c, hoaFax: fax, lastUpdated: today() });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function generate() {
    await persist();
    openCoaSummary({ ...p, coa: c, hoaFax: fax });
  }

  const setField = (k: keyof CoaDetails) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setC((prev) => ({ ...prev, [k]: e.target.value }));

  const a = p.analysis;
  const frorHint = a?.fror?.summary;
  const rentalHint = a?.rental?.summary;
  const petHint = a?.pet?.summary;
  const incomeHint = a?.income?.summary;

  return (
    <div>
      <div className="tip-box">
        <strong>COA Summary.</strong> Fill in what you know below, then click <strong>Generate PDF</strong> at the bottom.
        Items you leave blank print as &ldquo;unknown.&rdquo; Some rows are pulled from the property details and the AI analysis automatically.
      </div>

      <div className="card">
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", marginBottom: 12 }}>COA Documents</div>
        <div className="form-row">
          <div className="field"><label>All Documents Received</label>
            <select value={c.allDocsReceived || ""} onChange={setField("allDocsReceived")} onBlur={persist}>
              <option value="">— Select —</option><option value="yes">Yes</option><option value="no">No</option>
            </select>
          </div>
          <div className="field"><label>Management Company Fax</label><input value={fax} onChange={(e) => setFax(e.target.value)} onBlur={persist} placeholder="(954) 753-1210" /></div>
        </div>
        <div className="field" style={{ marginBottom: 14 }}><label>Pending Documents</label>
          <input value={c.pendingDocs || ""} onChange={setField("pendingDocs")} onBlur={persist} placeholder="e.g. Clarification if SIRS is required or not" />
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", marginBottom: 12 }}>Master / Additional Association</div>
        <div className="form-row">
          <div className="field"><label>Master / Additional Associations?</label>
            <select value={c.masterAssoc || ""} onChange={setField("masterAssoc")} onBlur={persist}>
              <option value="">— Select —</option><option value="yes">Yes</option><option value="no">No</option>
            </select>
          </div>
          <div className="field"><label>Additional Association Contact</label><input value={c.masterAssocContact || ""} onChange={setField("masterAssocContact")} onBlur={persist} placeholder="Township Community Master Association (954) 973-8094" /></div>
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", marginBottom: 12 }}>Approval &amp; Right of First Refusal</div>
        <div className="form-row">
          <div className="field"><label>Approval Required for Purchaser?</label>
            <select value={c.approvalRequired || ""} onChange={setField("approvalRequired")} onBlur={persist}>
              <option value="">— Select —</option><option value="yes">Yes</option><option value="no">No</option>
            </select>
          </div>
          <div className="field"><label>We have the Purchaser Application</label>
            <input value={p.received?.["d0"] ? "Yes (from checklist)" : "No (not yet checked off)"} disabled style={{ background: "#F9FAFB", color: "#6B7280" }} />
          </div>
        </div>
        <div className="field"><label>Right of First Refusal</label>
          <textarea value={c.rightOfFirstRefusal || ""} onChange={setField("rightOfFirstRefusal")} onBlur={persist} style={{ minHeight: 70 }}
            placeholder={frorHint ? "AI found: " + frorHint : "e.g. Association has first right of refusal; 30-day notice required."} />
          {frorHint && !c.rightOfFirstRefusal && <div className="sm muted mt10">💡 If left blank, the AI analysis summary will be used.</div>}
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", marginBottom: 12 }}>Fees / Assessments / Litigation</div>
        <div className="form-row">
          <div className="field"><label>Maintenance Fee</label><input value={c.maintenanceFee || ""} onChange={setField("maintenanceFee")} onBlur={persist} placeholder="$708" /></div>
          <div className="field"><label>Frequency</label>
            <select value={c.maintenanceFreq || ""} onChange={setField("maintenanceFreq")} onBlur={persist}>
              <option value="">— Select —</option><option>Monthly</option><option>Quarterly</option><option>Semi-Annually</option><option>Annually</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="field"><label>Land Lease Fee</label><input value={c.landLeaseFee || ""} onChange={setField("landLeaseFee")} onBlur={persist} placeholder="n/a" /></div>
          <div className="field"><label>Rec Lease Fee</label><input value={c.recLeaseFee || ""} onChange={setField("recLeaseFee")} onBlur={persist} placeholder="n/a" /></div>
        </div>
        <div className="field"><label>Pending or Anticipated Litigation</label>
          <input value={c.litigation || ""} onChange={setField("litigation")} onBlur={persist} placeholder="e.g. unknown per association's FAQs" />
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", marginBottom: 12 }}>Inspections &amp; Reserves</div>
        <div className="field" style={{ marginBottom: 14 }}><label>Sprinkler System Retrofit</label>
          <input value={c.sprinklerRetrofit || ""} onChange={setField("sprinklerRetrofit")} onBlur={persist} placeholder="e.g. unknown / not required" />
        </div>
        <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div className="field"><label>Milestone Inspection</label>
            <select value={c.milestoneStatus || ""} onChange={setField("milestoneStatus")} onBlur={persist}>
              {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o || "— Select —"}</option>)}
            </select>
          </div>
          <div className="field"><label>Turnover Inspection</label>
            <select value={c.turnoverStatus || ""} onChange={setField("turnoverStatus")} onBlur={persist}>
              {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o || "— Select —"}</option>)}
            </select>
          </div>
          <div className="field"><label>SIRS</label>
            <select value={c.sirsStatus || ""} onChange={setField("sirsStatus")} onBlur={persist}>
              {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o || "— Select —"}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", marginBottom: 12 }}>Rules &amp; Regulations</div>
        <div className="field" style={{ marginBottom: 14 }}><label>Rental Restrictions</label>
          <textarea value={c.rentalRestrictions || ""} onChange={setField("rentalRestrictions")} onBlur={persist} style={{ minHeight: 70 }}
            placeholder={rentalHint ? "AI found: " + rentalHint : "e.g. 1-year minimum lease; no rentals in first 2 years of ownership; cap on number of rentals."} />
          {rentalHint && !c.rentalRestrictions && <div className="sm muted mt10">💡 If left blank, the AI rental summary will be used.</div>}
        </div>
        <div className="field" style={{ marginBottom: 14 }}><label>Pet Restrictions</label>
          <textarea value={c.petRestrictions || ""} onChange={setField("petRestrictions")} onBlur={persist} style={{ minHeight: 70 }}
            placeholder={petHint ? "AI found: " + petHint : "e.g. 2 pets max; 25 lb weight limit; no aggressive breeds."} />
          {petHint && !c.petRestrictions && <div className="sm muted mt10">💡 If left blank, the AI pet summary will be used.</div>}
        </div>
        <div className="field" style={{ marginBottom: 14 }}><label>Income / Credit Restrictions</label>
          <textarea value={c.incomeCreditRestrictions || ""} onChange={setField("incomeCreditRestrictions")} onBlur={persist} style={{ minHeight: 70 }}
            placeholder={incomeHint ? "AI found: " + incomeHint : "e.g. minimum credit score 700; income/debt-to-income requirement; proof of funds."} />
          {incomeHint && !c.incomeCreditRestrictions && <div className="sm muted mt10">💡 If left blank, the AI income/credit summary will be used.</div>}
        </div>
        <div className="field"><label>Other Restrictions (optional)</label>
          <textarea value={c.rulesSummary || ""} onChange={setField("rulesSummary")} onBlur={persist} style={{ minHeight: 60 }}
            placeholder="Any other notable rules or restrictions." />
        </div>
      </div>

      <div className="row">
        <span className="sm muted">{saved ? "✓ Saved" : "Changes save automatically as you move between fields."}</span>
        <button className="btn btn-primary" onClick={generate}>📄 Generate PDF</button>
      </div>
    </div>
  );
}

// ── Share / package modal ───────────────────────────────────────────────────
function ShareModal({
  p, files, onClose, onLog,
}: {
  p: Property; files: PropertyFiles; onClose: () => void; onLog: (m: string) => void;
}) {
  const [building, setBuilding] = useState(false);
  const recCount = countReceived(p);
  const notes = p.notes || [];
  const fileCount = files.regular.length + files.minutes.length + files.misc.reduce((n, s) => n + s.files.length, 0);

  async function download() {
    setBuilding(true);
    try {
      const blob = await buildPackage(p, files);
      downloadBlob(blob, packageFileName(p));
      onLog("Document package ZIP downloaded");
      onClose();
    } catch (e) {
      alert("Error building ZIP: " + (e instanceof Error ? e.message : "unknown"));
    } finally {
      setBuilding(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title"><span>📦</span> Download Package for Next Party</div>
        <div className="modal-sub">Downloads a single ZIP file containing all documents, a summary with the checklist and your notes. Just email it as an attachment.</div>
        <div className="share-checklist">
          <div className="share-check-row"><span className="share-icon">🏠</span><span><strong>{p.addr}</strong>{p.condo ? " — " + p.condo : ""}</span></div>
          {p.hoaName && <div className="share-check-row"><span className="share-icon">🏢</span><span>{p.hoaName}</span></div>}
          <div className="share-check-row"><span className="share-icon">✅</span><span>{recCount} of {DOCS.length} documents checked off</span></div>
          <div className="share-check-row"><span className="share-icon">📄</span><span>{fileCount} file{fileCount !== 1 ? "s" : ""} will be zipped for attachment</span></div>
          {notes.length > 0 && <div className="share-check-row"><span className="share-icon">📝</span><span>{notes.length} note{notes.length !== 1 ? "s" : ""} included</span></div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={download} disabled={building}>{building ? "Building…" : "📦 Download ZIP"}</button>
        </div>
      </div>
    </div>
  );
}
