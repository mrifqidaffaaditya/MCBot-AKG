"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [regDisabled, setRegDisabled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.allow_registration === "false") {
          setRegDisabled(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Password tidak cocok");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Registrasi gagal");
    } else {
      router.push("/login");
    }
  };

  if (regDisabled) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0a0e17 0%, #0d1520 50%, #0a1628 100%)",
      }}>
        <div className="glass-card animate-fade-in-up" style={{ padding: 40, maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚫</div>
          <h2 style={{ color: "var(--text-primary)", marginBottom: 8 }}>Registrasi Ditutup</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 20 }}>
            Pendaftaran akun baru saat ini tidak diizinkan oleh administrator.
          </p>
          <a href="/login" className="btn btn-ghost">Kembali ke Login</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0a0e17 0%, #0d1520 50%, #0a1628 100%)",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute",
        width: 400,
        height: 400,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 70%)",
        top: -100,
        left: -100,
      }} />

      <div className="glass-card animate-fade-in-up" style={{
        padding: 40,
        width: "100%",
        maxWidth: 420,
        margin: "0 20px",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⛏️</div>
          <h1 style={{
            fontSize: 28,
            fontWeight: 800,
            background: "linear-gradient(135deg, #00e5ff, #80deea)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            Daftar Akun
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
            Buat akun untuk mengelola bot
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="input-group">
            <label>Username</label>
            <input
              className="input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="3-20 karakter"
              required
              minLength={3}
              maxLength={20}
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              required
              minLength={6}
            />
          </div>

          <div className="input-group">
            <label>Konfirmasi Password</label>
            <input
              className="input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password"
              required
            />
          </div>

          {error && (
            <div style={{
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(255,82,82,0.1)",
              border: "1px solid rgba(255,82,82,0.3)",
              color: "var(--danger)",
              fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: "100%", padding: "12px", fontSize: 15, marginTop: 4 }}
          >
            {loading ? "Mendaftar..." : "Daftar"}
          </button>
        </form>

        <div style={{
          textAlign: "center",
          marginTop: 20,
          fontSize: 13,
          color: "var(--text-muted)",
        }}>
          Sudah punya akun?{" "}
          <a
            href="/login"
            style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 500 }}
          >
            Login
          </a>
        </div>
      </div>
    </div>
  );
}
