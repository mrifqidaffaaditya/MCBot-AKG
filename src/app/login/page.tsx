"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Username atau password salah");
    } else {
      router.push("/dashboard");
    }
  };

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
      {/* Decorative orbs */}
      <div style={{
        position: "absolute",
        width: 400,
        height: 400,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 70%)",
        top: -100,
        right: -100,
      }} />
      <div style={{
        position: "absolute",
        width: 300,
        height: 300,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,184,212,0.06) 0%, transparent 70%)",
        bottom: -50,
        left: -50,
      }} />

      <div className="glass-card animate-fade-in-up" style={{
        padding: 40,
        width: "100%",
        maxWidth: 420,
        margin: "0 20px",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            fontSize: 40,
            marginBottom: 8,
          }}>⛏️</div>
          <h1 style={{
            fontSize: 28,
            fontWeight: 800,
            background: "linear-gradient(135deg, #00e5ff, #80deea)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            AiKei Panel
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
            Minecraft Bot Management
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
              placeholder="Masukkan username"
              required
              autoComplete="username"
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              required
              autoComplete="current-password"
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
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div style={{
          textAlign: "center",
          marginTop: 20,
          fontSize: 13,
          color: "var(--text-muted)",
        }}>
          Belum punya akun?{" "}
          <a
            href="/register"
            style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 500 }}
          >
            Daftar
          </a>
        </div>
      </div>
    </div>
  );
}
