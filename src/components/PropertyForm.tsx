"use client";

import { useState } from "react";
import type { Property, PropertyStatus } from "@/lib/types";
import { today, uid } from "@/lib/format";

const BLANK = {
  addr: "", condo: "", buyer: "", buyeremail: "", closing: "", agent: "", va: "",
  hoaName: "", hoaContact: "", hoaPhone: "", hoaEmail: "", hoaAddr: "",
  status: "active" as PropertyStatus,
};

export function PropertyForm({
  editing,
  onSave,
  onCancel,
}: {
  editing: Property | null;
  onSave: (p: Property) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState(() =>
    editing
      ? {
          addr: editing.addr, condo: editing.condo, buyer: editing.buyer,
          buyeremail: editing.buyeremail, closing: editing.closing, agent: editing.agent,
          va: editing.va, hoaName: editing.hoaName, hoaContact: editing.hoaContact,
          hoaPhone: editing.hoaPhone, hoaEmail: editing.hoaEmail, hoaAddr: editing.hoaAddr,
          status: editing.status,
        }
      : { ...BLANK }
  );

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  function handleSave() {
    const addr = f.addr.trim();
    if (!addr) {
      alert("Please enter a property address.");
      return;
    }
    const base: Property = editing
      ? { ...editing }
      : {
          id: uid(), received: {}, recDates: {}, log: [], notes: [],
          archived: false, created: today(), lastUpdated: today(),
          analysis: null,
          // placeholders overwritten below:
          addr: "", condo: "", buyer: "", buyeremail: "", closing: "", agent: "", va: "",
          hoaName: "", hoaContact: "", hoaPhone: "", hoaEmail: "", hoaAddr: "", status: "active",
        };
    const p: Property = {
      ...base,
      addr,
      condo: f.condo.trim(),
      buyer: f.buyer.trim(),
      buyeremail: f.buyeremail.trim(),
      closing: f.closing.trim(),
      agent: f.agent.trim(),
      va: f.va.trim(),
      hoaName: f.hoaName.trim(),
      hoaContact: f.hoaContact.trim(),
      hoaPhone: f.hoaPhone.trim(),
      hoaEmail: f.hoaEmail.trim(),
      hoaAddr: f.hoaAddr.trim(),
      status: f.status as PropertyStatus,
      lastUpdated: today(),
    };
    const msg = editing ? "Property info updated" : "Property created";
    p.log = [{ date: today(), msg }, ...(p.log || [])];
    onSave(p);
  }

  return (
    <div>
      <button className="back" onClick={onCancel}>← Back to dashboard</button>
      <div className="page-title">{editing ? "Edit Property" : "Add New Property"}</div>
      <div className="page-sub">Enter the transaction details below</div>
      <div className="card">
        <div className="form-row">
          <div className="field"><label>Property Address</label><input value={f.addr} onChange={set("addr")} placeholder="123 Ocean Dr, Miami FL 33139" /></div>
          <div className="field"><label>Condo / HOA Name</label><input value={f.condo} onChange={set("condo")} placeholder="Ocean View Condominiums" /></div>
        </div>
        <div className="form-row">
          <div className="field"><label>Buyer Name(s)</label><input value={f.buyer} onChange={set("buyer")} placeholder="Robert Johnson" /></div>
          <div className="field"><label>Buyer Agent / Attorney Email</label><input type="email" value={f.buyeremail} onChange={set("buyeremail")} placeholder="buyeragent@email.com" /></div>
        </div>
        <div className="form-row">
          <div className="field"><label>Closing Date</label><input value={f.closing} onChange={set("closing")} placeholder="04/15/2025" /></div>
          <div className="field"><label>Listing Agent Name</label><input value={f.agent} onChange={set("agent")} placeholder="Jane R." /></div>
        </div>
        <div className="form-row">
          <div className="field"><label>VA / Assistant Name</label><input value={f.va} onChange={set("va")} placeholder="Sarah M." /></div>
          <div className="field"><label>Status</label>
            <select value={f.status} onChange={set("status")}>
              <option value="active">Active</option>
              <option value="pending">Pending docs</option>
              <option value="urgent">Urgent</option>
              <option value="complete">Complete</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 6, marginBottom: 14, paddingTop: 14, borderTop: "1px solid #E5E7EB" }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", marginBottom: 12 }}>
            HOA / Management Company Contact
          </div>
          <div className="form-row">
            <div className="field"><label>HOA / Management Company Name</label><input value={f.hoaName} onChange={set("hoaName")} placeholder="Ocean View HOA Management LLC" /></div>
            <div className="field"><label>Contact Person Name</label><input value={f.hoaContact} onChange={set("hoaContact")} placeholder="Maria Gonzalez" /></div>
          </div>
          <div className="form-row">
            <div className="field"><label>Phone Number</label><input value={f.hoaPhone} onChange={set("hoaPhone")} placeholder="(305) 555-0100" /></div>
            <div className="field"><label>Email Address</label><input type="email" value={f.hoaEmail} onChange={set("hoaEmail")} placeholder="management@oceanhoa.com" /></div>
          </div>
          <div className="form-row">
            <div className="field"><label>Mailing Address</label><input value={f.hoaAddr} onChange={set("hoaAddr")} placeholder="100 HOA Blvd, Miami FL 33139" /></div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button className="btn btn-primary" onClick={handleSave}>Save Property</button>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
