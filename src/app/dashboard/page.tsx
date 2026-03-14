"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

interface BotSession {
  id: string;
  name: string;
  host: string;
  port: number;
  botUsername: string;
  version: string;
  autoLogin: boolean;
  loginPassword?: string | null;
  autoReconnect: boolean;
  webhookUrl?: string | null;
  status?: string;
  _count?: { chatLogs: number };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bots, setBots] = useState<BotSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [botStatuses, setBotStatuses] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Form state
  const [form, setForm] = useState({
    name: "",
    host: "",
    port: 25565,
    botUsername: "",
    version: "1.21.4",
    autoLogin: false,
    loginPassword: "",
    autoReconnect: true,
    webhookUrl: "",
  });

  const fetchBots = useCallback(async () => {
    const res = await fetch("/api/bots");
    if (res.ok) {
      const data = await res.json();
      setBots(data);
      // Fetch statuses
      const statuses: Record<string, string> = {};
      for (const bot of data) {
        const sres = await fetch(`/api/bots/${bot.id}/status`);
        if (sres.ok) {
          const sdata = await sres.json();
          statuses[bot.id] = sdata.status;
        }
      }
      setBotStatuses(statuses);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchBots();
      // Poll statuses
      const interval = setInterval(async () => {
        for (const bot of bots) {
          const res = await fetch(`/api/bots/${bot.id}/status`);
          if (res.ok) {
            const data = await res.json();
            setBotStatuses((prev) => ({ ...prev, [bot.id]: data.status }));
          }
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [status, router, fetchBots, bots]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/bots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        loginPassword: form.loginPassword || null,
        webhookUrl: form.webhookUrl || null,
      }),
    });

    if (res.ok) {
      setShowCreate(false);
      setForm({
        name: "",
        host: "",
        port: 25565,
        botUsername: "",
        version: "1.21.4",
        autoLogin: false,
        loginPassword: "",
        autoReconnect: true,
        webhookUrl: "",
      });
      fetchBots();
    }
  };

  const handleStartStop = async (id: string, currentStatus: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    const action = currentStatus === "online" || currentStatus === "connecting" ? "stop" : "start";
    const res = await fetch(`/api/bots/${id}/${action}`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setBotStatuses((prev) => ({ ...prev, [id]: data.status }));
    }
    setActionLoading((prev) => ({ ...prev, [id]: false }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus bot session ini?")) return;
    const res = await fetch(`/api/bots/${id}`, { method: "DELETE" });
    if (res.ok) {
      setBots((prev) => prev.filter((b) => b.id !== id));
    }
  };

  if (status === "loading" || loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{ fontSize: 16, color: "var(--text-secondary)" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Navbar */}
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
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>⛏️</span>
            <span style={{
              fontSize: 18,
              fontWeight: 800,
              background: "linear-gradient(135deg, #00e5ff, #80deea)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              AiKei Panel
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {session?.user?.role === "ADMIN" && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => router.push("/dashboard/settings")}
              >
                ⚙️ Settings
              </button>
            )}
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {session?.user?.name}
              {session?.user?.role === "ADMIN" && (
                <span style={{
                  marginLeft: 6,
                  padding: "2px 8px",
                  borderRadius: 10,
                  background: "rgba(0,229,255,0.1)",
                  color: "var(--primary)",
                  fontSize: 11,
                  fontWeight: 600,
                }}>ADMIN</span>
              )}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => signOut()}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Bot Sessions</h1>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + Buat Bot Baru
          </button>
        </div>

        {bots.length === 0 ? (
          <div className="glass-card animate-fade-in" style={{
            padding: 60,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
            <h3 style={{ color: "var(--text-primary)", marginBottom: 8 }}>Belum ada bot</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 20 }}>
              Buat bot session pertamamu untuk mulai
            </p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              + Buat Bot Baru
            </button>
          </div>
        ) : (
          <div className="card-grid">
            {bots.map((bot, i) => {
              const botStatus = botStatuses[bot.id] || "offline";
              const isOnline = botStatus === "online";
              const isConnecting = botStatus === "connecting" || botStatus === "reconnecting";

              return (
                <div
                  key={bot.id}
                  className="glass-card animate-fade-in-up"
                  style={{
                    padding: 24,
                    animationDelay: `${i * 0.05}s`,
                    opacity: 0,
                    cursor: "pointer",
                    transition: "var(--transition)",
                    borderColor: isOnline ? "rgba(0,230,118,0.2)" : "var(--glass-border)",
                  }}
                  onClick={() => router.push(`/dashboard/bot/${bot.id}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--primary)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = isOnline ? "rgba(0,230,118,0.2)" : "var(--glass-border)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div>
                      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{bot.name}</h3>
                      <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        {bot.host}:{bot.port}
                      </p>
                    </div>
                    <span className={`status-badge status-${botStatus}`}>
                      {botStatus}
                    </span>
                  </div>

                  <div style={{
                    display: "flex",
                    gap: 16,
                    marginBottom: 16,
                    fontSize: 13,
                    color: "var(--text-secondary)",
                  }}>
                    <span>👤 {bot.botUsername}</span>
                    <span>📦 {bot.version}</span>
                    {bot.autoReconnect && <span>🔄 Auto</span>}
                  </div>

                  <div style={{ display: "flex", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      className={`btn btn-sm ${isOnline || isConnecting ? "btn-danger" : "btn-primary"}`}
                      onClick={() => handleStartStop(bot.id, botStatus)}
                      disabled={actionLoading[bot.id]}
                      style={{ flex: 1 }}
                    >
                      {actionLoading[bot.id]
                        ? "..."
                        : isOnline || isConnecting
                        ? "⏹ Stop"
                        : "▶ Start"}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDelete(bot.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Buat Bot Baru</h2>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="input-group">
                <label>Nama Session</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="My Bot"
                  required
                />
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div className="input-group" style={{ flex: 2 }}>
                  <label>Host Server</label>
                  <input
                    className="input"
                    value={form.host}
                    onChange={(e) => setForm({ ...form, host: e.target.value })}
                    placeholder="play.server.net"
                    required
                  />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Port</label>
                  <input
                    className="input"
                    type="number"
                    value={form.port}
                    onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 25565 })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Username Bot</label>
                  <input
                    className="input"
                    value={form.botUsername}
                    onChange={(e) => setForm({ ...form, botUsername: e.target.value })}
                    placeholder="BotName"
                    required
                  />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Version</label>
                  <input
                    className="input"
                    value={form.version}
                    onChange={(e) => setForm({ ...form, version: e.target.value })}
                    placeholder="1.21.4"
                  />
                </div>
              </div>

              <div style={{
                display: "flex",
                gap: 20,
                padding: "12px 0",
              }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.autoLogin}
                    onChange={(e) => setForm({ ...form, autoLogin: e.target.checked })}
                    style={{ accentColor: "var(--primary)" }}
                  />
                  Auto Login
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.autoReconnect}
                    onChange={(e) => setForm({ ...form, autoReconnect: e.target.checked })}
                    style={{ accentColor: "var(--primary)" }}
                  />
                  Auto Reconnect
                </label>
              </div>

              {form.autoLogin && (
                <div className="input-group">
                  <label>Login Password (in-game)</label>
                  <input
                    className="input"
                    type="password"
                    value={form.loginPassword}
                    onChange={(e) => setForm({ ...form, loginPassword: e.target.value })}
                    placeholder="Password untuk /login"
                  />
                </div>
              )}

              <div className="input-group">
                <label>Webhook URL (opsional)</label>
                <input
                  className="input"
                  value={form.webhookUrl}
                  onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Buat Bot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
