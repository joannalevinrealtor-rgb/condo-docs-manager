// ── Email generators (wording ported verbatim from the prototype) ───────────

import { DOCS, type Property } from "./types";

export function coverEmail(p: Property): string {
  const notes = p.notes || [];
  const recDocs: string[] = [];
  const missDocs: string[] = [];
  for (const d of DOCS) {
    if (p.received && p.received[d.id]) recDocs.push(d.name);
    else missDocs.push(d.name);
  }
  const recList = recDocs.map((n) => "  • " + n).join("\n");
  const missList = missDocs.map((n) => "  • " + n).join("\n");
  const buyerFirst = (p.buyer || "there").split(" ")[0];

  let hoaSection = "";
  if (p.hoaName || p.hoaContact || p.hoaPhone || p.hoaEmail || p.hoaAddr) {
    hoaSection += "\n\nHOA / MANAGEMENT COMPANY CONTACT\n";
    if (p.hoaName) hoaSection += "  Company:  " + p.hoaName + "\n";
    if (p.hoaContact) hoaSection += "  Contact:  " + p.hoaContact + "\n";
    if (p.hoaPhone) hoaSection += "  Phone:    " + p.hoaPhone + "\n";
    if (p.hoaEmail) hoaSection += "  Email:    " + p.hoaEmail + "\n";
    if (p.hoaAddr) hoaSection += "  Address:  " + p.hoaAddr + "\n";
  }

  let notesSection = "";
  if (notes.length) {
    notesSection += "\n\nADDITIONAL NOTES\n";
    for (const n of notes) notesSection += "  • " + n.text + "\n";
  }

  return (
    "Subject: Your Condo Documents Are Ready – " + (p.addr || "[Address]") + "\n\n" +
    "Hi " + buyerFirst + ",\n\n" +
    "Hope you're having a great day! We've been busy pulling together all of your required condominium disclosure documents for " + (p.addr || "[Address]") + (p.condo ? " (" + p.condo + ")" : "") + " and I'm happy to share what we have so far.\n\n" +
    "As required under Florida Statute §718.503, please find the following documents enclosed:\n\n" +
    (recList || "  [No documents checked off yet — update checklist first]") +
    (missDocs.length > 0
      ? "\n\nWe're still tracking down the following " + missDocs.length + " document" + (missDocs.length > 1 ? "s" : "") + " and will get those over to you as soon as they come in:\n\n" + missList
      : "\n\nGreat news — that's everything! All required documents are included.") +
    hoaSection +
    notesSection +
    "\n\nJust a quick reminder that under Florida law, you have 3 business days to review these and let us know if you have any concerns." +
    "\n\nAs always, don't hesitate to reach out if you have any questions. I'm here to help make this as smooth as possible for you!\n\n" +
    "Warm regards,\n" + (p.agent || p.va || "[Agent Name]")
  );
}

export function missingEmail(p: Property): string {
  const missDocs: string[] = [];
  for (const d of DOCS) {
    if (!(p.received && p.received[d.id])) missDocs.push(d.name);
  }
  const missList = missDocs.map((n) => "  • " + n).join("\n");

  if (missDocs.length === 0) {
    return "All required documents have been received!\n\nNo follow-up needed at this time.";
  }
  return (
    "Subject: A Few Documents Still Needed – " + (p.addr || "[Address]") + "\n\n" +
    "Hi there,\n\n" +
    "Hope your day is going well! I just wanted to touch base on the condominium disclosure documents for " + (p.addr || "[Address]") + (p.condo ? " (" + p.condo + ")" : "") + ".\n\n" +
    "We've received most of what we need — thank you so much for that! We're still missing the following " + missDocs.length + " document" + (missDocs.length > 1 ? "s" : "") + ":\n\n" +
    missList +
    "\n\nThese are required under Florida Statute §718.503 before we can close" +
    (p.closing ? ", and we’re currently targeting " + p.closing + " as our closing date" : "") +
    ", so the sooner we can get these the better!\n\n" +
    "If you need help getting any of these from your HOA or management company, just let me know and I'm happy to assist.\n\n" +
    "Thank you so much for your help — really appreciate it.\n\n" +
    "Warm regards,\n" + (p.agent || p.va || "[Agent Name]")
  );
}
