// ── Builds the downloadable ZIP package for the next party ──────────────────

import JSZip from "jszip";
import { DOCS, type Property, type PropertyFiles, type FileRec } from "./types";
import { today } from "./format";

/** Returns the raw bytes of a stored file, whether held as a data URL
 *  (browser version) or a remote URL (cloud version). */
async function fileBytes(f: FileRec): Promise<Uint8Array | null> {
  if (f.dataUrl) {
    const comma = f.dataUrl.indexOf(",");
    const b64 = f.dataUrl.slice(comma + 1);
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }
  if (f.url) {
    try {
      const res = await fetch(f.url);
      return new Uint8Array(await res.arrayBuffer());
    } catch {
      return null;
    }
  }
  return null;
}

function safeName(addr: string): string {
  return (addr || "Property").split(",")[0].replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
}

export async function buildPackage(p: Property, files: PropertyFiles): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder(safeName(p.addr))!;

  // Regular files — named by assigned document when known.
  for (const f of files.regular) {
    const bytes = await fileBytes(f);
    if (!bytes) continue;
    const ext = f.name.split(".").pop() || "pdf";
    let fname = f.name;
    if (f.assignedDocId) {
      const doc = DOCS.find((d) => d.id === f.assignedDocId);
      if (doc) fname = doc.name.replace(/[^a-zA-Z0-9 &]/g, "").trim() + "." + ext;
    }
    folder.file(fname, bytes);
  }

  // Meeting minutes in their own subfolder.
  const minFolder = folder.folder("Meeting Minutes")!;
  for (const m of files.minutes) {
    const bytes = await fileBytes(m);
    if (bytes) minFolder.file(m.name, bytes);
  }

  // Miscellaneous slots, prefixed by their label.
  for (let s = 0; s < files.misc.length; s++) {
    const slot = files.misc[s];
    if (!slot || !slot.files.length) continue;
    const label = (slot.label || "Misc " + (s + 1)).replace(/[^a-zA-Z0-9 &_-]/g, "").trim();
    for (const mf of slot.files) {
      const bytes = await fileBytes(mf);
      if (bytes) folder.file(label + "_" + mf.name, bytes);
    }
  }

  // A plain-text summary of the checklist + notes.
  const rec = p.received || {};
  const notes = p.notes || [];
  let txt = `Condo Disclosure Documents\n${p.addr}\nGenerated: ${today()}\nBuyer: ${p.buyer || "—"}\nClosing: ${p.closing || "—"}\n\nCHECKLIST:\n`;
  for (const d of DOCS) txt += (rec[d.id] ? "[X] " : "[ ] ") + d.name + "\n";
  if (notes.length) {
    txt += "\nNOTES:\n";
    for (const n of notes) txt += n.date + "\n" + n.text + "\n\n";
  }
  folder.file("_Checklist_and_Notes.txt", txt);

  return zip.generateAsync({ type: "blob" });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function packageFileName(p: Property): string {
  return "CondoDocs_" + safeName(p.addr) + ".zip";
}
