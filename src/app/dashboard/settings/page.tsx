"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [allowReg, setAllowReg] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }

    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setAllowReg(data.allow_registration !== "false");
      });
  }, [authStatus, session, router]);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "allow_registration",
        value: allowReg ? "true" : "false",
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (authStatus === "loading") {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{ color: "var(--text-secondary)" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <nav style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--glass)",
        backdropFilter: "blur(20px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => router.push("/dashboard")}
          >
            ← Back
          </button>
          <span style={{
            fontSize: 18,
            fontWeight: 800,
            background: "linear-gradient(135deg, #00e5ff, #80deea)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            Settings
          </span>
        </div>
      </nav>

      <div className="page-container" style={{ maxWidth: 600 }}>
        <div className="glass-card animate-fade-in" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: "var(--primary)" }}>
            ⚙️ Admin Settings
          </h2>

          <div style={{
            padding: 16,
            background: "var(--bg-root)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            marginBottom: 20,
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Public Registration</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  Izinkan user baru untuk mendaftar akun
                </div>
              </div>
              <label style={{
                position: "relative",
                display: "inline-block",
                width: 52,
                height: 28,
                cursor: "pointer",
              }}>
                <input
                  type="checkbox"
                  checked={allowReg}
                  onChange={(e) => setAllowReg(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: "absolute",
                  inset: 0,
                  background: allowReg ? "var(--primary)" : "var(--bg-card)",
                  borderRadius: 14,
                  transition: "var(--transition)",
                  border: `1px solid ${allowReg ? "var(--primary)" : "var(--border)"}`,
                }}>
                  <span style={{
                    position: "absolute",
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: allowReg ? "#000" : "var(--text-muted)",
                    top: 2,
                    left: allowReg ? 27 : 2,
                    transition: "var(--transition)",
                  }} />
                </span>
              </label>
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ width: "100%" }}
          >
            {saving ? "Menyimpan..." : "Simpan Settings"}
          </button>

          {saved && (
            <div className="animate-fade-in" style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(0,230,118,0.1)",
              border: "1px solid rgba(0,230,118,0.3)",
              color: "var(--success)",
              fontSize: 13,
              textAlign: "center",
            }}>
              ✅ Settings berhasil disimpan
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
