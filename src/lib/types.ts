// ── Core data types for the Condo Docs Manager ──────────────────────────────

export type PropertyStatus = "active" | "pending" | "urgent" | "complete";

export interface LogEntry {
  date: string;
  msg: string;
}

export interface NoteEntry {
  id: number;
  text: string;
  date: string;
}

export interface AnalysisTopic {
  status: "restricted" | "allowed" | "unclear" | "not_found";
  summary: string;
  key_details: string[];
  concern: boolean;
  concern_note: string;
}

export interface AnalysisResult {
  rental?: AnalysisTopic;
  pet?: AnalysisTopic;
  fror?: AnalysisTopic;
  income?: AnalysisTopic;
  generatedAt: string;
  docNames: string[];
}

export interface Property {
  id: string;
  addr: string;
  condo: string;
  buyer: string;
  buyeremail: string;
  closing: string;
  agent: string;
  va: string;
  hoaName: string;
  hoaContact: string;
  hoaPhone: string;
  hoaEmail: string;
  hoaAddr: string;
  hoaFax?: string;
  status: PropertyStatus;
  received: Record<string, boolean>;
  recDates: Record<string, string>;
  log: LogEntry[];
  notes: NoteEntry[];
  archived: boolean;
  created: string;
  lastUpdated: string;
  analysis?: AnalysisResult | null;
  // ── COA Summary fields (filled in the COA Summary tab) ──
  coa?: CoaDetails;
}

// Extra details for the exportable COA (Condominium Owners Association) Summary.
// All optional — the VA fills what they know; blanks render as "unknown".
export interface CoaDetails {
  allDocsReceived?: "" | "yes" | "no";
  pendingDocs?: string;
  masterAssoc?: "" | "yes" | "no";
  masterAssocContact?: string;
  approvalRequired?: "" | "yes" | "no";
  rightOfFirstRefusal?: string;
  maintenanceFee?: string;
  maintenanceFreq?: string;
  landLeaseFee?: string;
  recLeaseFee?: string;
  litigation?: string;
  sprinklerRetrofit?: string;
  milestoneStatus?: string;
  turnoverStatus?: string;
  sirsStatus?: string;
  rentalRestrictions?: string;
  petRestrictions?: string;
  incomeCreditRestrictions?: string;
  rulesSummary?: string;
}

// A stored file. `dataUrl` holds the file contents in the browser-storage
// version; the cloud version will populate `url` with a download link instead.
export interface FileRec {
  id: string;
  name: string;
  size: number;
  dataUrl?: string;
  url?: string;
  assignedDocId?: string;
  uploaded: string;
}

export interface MiscSlot {
  label: string;
  files: FileRec[];
}

export interface PropertyFiles {
  regular: FileRec[];
  minutes: FileRec[];
  misc: MiscSlot[]; // always length 3
}

export function emptyFiles(): PropertyFiles {
  return {
    regular: [],
    minutes: [],
    misc: [
      { label: "", files: [] },
      { label: "", files: [] },
      { label: "", files: [] },
    ],
  };
}

// ── The required-document checklist ─────────────────────────────────────────
export interface DocDef {
  id: string;
  name: string;
  hint: string;
  multi?: boolean;
}

export const DOCS: DocDef[] = [
  { id: "d0", name: "Purchaser Application", hint: "Required for buyer approval" },
  { id: "d1", name: "Rules and Regulations", hint: "Analyze for rental, pet & FROR" },
  { id: "d2", name: "Declaration of Condominium", hint: "Primary legal governing document" },
  { id: "d3", name: "Articles of Incorporation", hint: "Association formation document" },
  { id: "d4", name: "Bylaws and Rules", hint: "Operational rules" },
  { id: "d5", name: "Most Recent Annual Financial Statement", hint: "Financial health" },
  { id: "d6", name: "Annual Budget", hint: "Current year budget" },
  { id: "d7", name: "Frequently Asked Questions and Answers", hint: "Community FAQ" },
  { id: "d8", name: "Preceding 12 Months Meeting Minutes & Agendas", hint: "All 12 months required — check recency", multi: true },
  { id: "d9", name: "Insurance Declaration Pages", hint: "Coverage verification" },
  { id: "d10", name: "Milestone Inspection Report", hint: "Required under Florida SB 4D" },
  { id: "d11", name: "Structural Integrity Reserve Study", hint: "Required under Florida SB 4D" },
  { id: "d12", name: "40 Year Certification", hint: "Required for buildings 40+ years old in Miami-Dade & Broward" },
];
