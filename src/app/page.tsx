"use client";

import { useState } from "react";
import { useStore } from "@/components/StoreProvider";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { PropertyForm } from "@/components/PropertyForm";
import { PropertyDetail } from "@/components/PropertyDetail";
import type { Property } from "@/lib/types";

type View =
  | { name: "dash" }
  | { name: "form"; editing: Property | null }
  | { name: "prop"; id: string };

export default function Home() {
  const { loaded, properties, saveProp } = useStore();
  const [view, setView] = useState<View>({ name: "dash" });

  const currentId = view.name === "prop" ? view.id : null;
  const current = currentId ? properties.find((p) => p.id === currentId) || null : null;

  async function handleFormSave(p: Property) {
    await saveProp(p);
    setView({ name: "prop", id: p.id });
  }

  return (
    <div className="layout">
      <Sidebar
        properties={properties}
        currentId={currentId}
        onDashboard={() => setView({ name: "dash" })}
        onOpen={(id) => setView({ name: "prop", id })}
        onNew={() => setView({ name: "form", editing: null })}
      />
      <div className="main">
        <div className="main-wrap">
          {!loaded ? (
            <div className="muted" style={{ padding: 40 }}>Loading…</div>
          ) : view.name === "dash" ? (
            <Dashboard
              properties={properties}
              onOpen={(id) => setView({ name: "prop", id })}
              onNew={() => setView({ name: "form", editing: null })}
            />
          ) : view.name === "form" ? (
            <PropertyForm
              editing={view.editing}
              onSave={handleFormSave}
              onCancel={() => setView({ name: "dash" })}
            />
          ) : current ? (
            <PropertyDetail
              property={current}
              onSave={saveProp}
              onEdit={() => setView({ name: "form", editing: current })}
              onBack={() => setView({ name: "dash" })}
            />
          ) : (
            <div className="muted" style={{ padding: 40 }}>Property not found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
