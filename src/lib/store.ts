// ── Data layer ──────────────────────────────────────────────────────────────
// Every screen talks to the app through this module. Today it persists to the
// browser (localStorage). In the cloud step, only this file changes: the same
// function signatures will read/write Supabase instead. No screen needs editing.

import { emptyFiles, type Property, type PropertyFiles } from "./types";

const DB_KEY = "cdm_db";
const FILES_KEY = "cdm_files";

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // localStorage has a ~5MB cap; surfacing this matters for the upload feature.
    console.error("Could not save — browser storage may be full.", e);
    throw e;
  }
}

// Properties are stored as a map { id: Property }.
function readDB(): Record<string, Property> {
  return readJSON<Record<string, Property>>(DB_KEY, {});
}

// Files are stored as a map { propId: PropertyFiles }.
function readAllFiles(): Record<string, PropertyFiles> {
  return readJSON<Record<string, PropertyFiles>>(FILES_KEY, {});
}

export async function loadProperties(): Promise<Property[]> {
  const db = readDB();
  return Object.values(db);
}

export async function saveProperty(p: Property): Promise<void> {
  const db = readDB();
  db[p.id] = p;
  writeJSON(DB_KEY, db);
}

export async function loadFiles(propId: string): Promise<PropertyFiles> {
  const all = readAllFiles();
  const f = all[propId];
  if (!f) return emptyFiles();
  // Defensive: ensure the misc array always has 3 slots.
  while (f.misc.length < 3) f.misc.push({ label: "", files: [] });
  return f;
}

export async function saveFiles(propId: string, files: PropertyFiles): Promise<void> {
  const all = readAllFiles();
  all[propId] = files;
  writeJSON(FILES_KEY, all);
}
