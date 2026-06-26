"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">Condo Docs Manager</div>
        <div className="login-sub">Florida Seller Disclosure Tracker</div>

        <form onSubmit={handleLogin}>
          <div className="field" style={{ marginBottom: "14px" }}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              disabled={loading}
              required
            />
          </div>

          <div className="field" style={{ marginBottom: "14px" }}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              disabled={loading}
              required
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p
          style={{
            fontSize: "12px",
            color: "#6B7280",
            marginTop: "16px",
            textAlign: "center",
            lineHeight: "1.5",
          }}
        >
          Your team uses one shared login to access all properties and documents.
        </p>
      </div>
    </div>
  );
}
