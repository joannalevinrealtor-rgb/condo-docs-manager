// ── Data layer ──────────────────────────────────────────────────────────────
// Every screen talks through this module. Now backed by Supabase.
// Same function signatures — screens don't change.

import { emptyFiles, type Property, type PropertyFiles } from "./types";
import { supabase } from "./supabaseClient";

export async function loadProperties(): Promise<Property[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("data")
    .eq("archived", false);

  if (error) {
    console.error("Failed to load properties:", error);
    return [];
  }

  return (data || [])
    .map((row) => row.data)
    .filter((p) => p && typeof p === "object") as Property[];
}

export async function saveProperty(p: Property): Promise<void> {
  const { error } = await supabase
    .from("properties")
    .upsert({ id: p.id, data: p, archived: p.archived })
    .eq("id", p.id);

  if (error) {
    console.error("Failed to save property:", error);
    throw error;
  }
}

export async function loadFiles(propId: string): Promise<PropertyFiles> {
  const { data, error } = await supabase
    .from("property_files")
    .select("data")
    .eq("property_id", propId)
    .single();

  if (error?.code === "PGRST116") {
    // Not found — return empty structure.
    return emptyFiles();
  }

  if (error) {
    console.error("Failed to load files:", error);
    return emptyFiles();
  }

  const f = data?.data || emptyFiles();
  // Defensive: ensure the misc array always has 3 slots.
  while (f.misc.length < 3) f.misc.push({ label: "", files: [] });
  return f;
}

export async function saveFiles(propId: string, files: PropertyFiles): Promise<void> {
  const { error } = await supabase
    .from("property_files")
    .upsert({ property_id: propId, data: files })
    .eq("property_id", propId);

  if (error) {
    console.error("Failed to save files:", error);
    throw error;
  }
}
