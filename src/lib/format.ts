// ── Date & display helpers (ported from the prototype) ──────────────────────

import type { Property } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Human date like "Apr 15, 2025". */
export function today(): string {
  const d = new Date();
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Timestamp like "Apr 15, 2025, 3:04 PM". */
export function nowTs(): string {
  return new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function daysSince(str?: string): number {
  if (!str) return 999;
  const t = new Date(str).getTime();
  if (isNaN(t)) return 999;
  return Math.floor((Date.now() - t) / 86400000);
}

export function isStale(p: Property): boolean {
  return daysSince(p.lastUpdated) > 3;
}

export function staleText(str?: string): string {
  const n = daysSince(str);
  if (n === 0) return "Updated today";
  if (n === 1) return "Updated yesterday";
  return `Updated ${n}d ago`;
}

export function fileSize(bytes: number): string {
  return bytes < 1048576 ? `${Math.round(bytes / 1024)}KB` : `${(bytes / 1048576).toFixed(1)}MB`;
}

export function fileExt(name: string): string {
  return (name.split(".").pop() || "FILE").toUpperCase().slice(0, 4);
}

export function countReceived(p: Property): number {
  let n = 0;
  for (const k in p.received) if (p.received[k]) n++;
  return n;
}

export function uid(): string {
  return "p" + Date.now() + Math.random().toString(36).slice(2, 5);
}
