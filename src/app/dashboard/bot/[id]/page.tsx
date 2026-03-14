"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface ChatMessage {
  type: "chat" | "status" | "system";
  sender?: string;
  message: string;
  timestamp: string;
}

interface SpawnCommand {
  id: string;
  command: string;
  delayMs: number;
  order: number;
  enabled: boolean;
}

interface BotSessionData {
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
  commands: SpawnCommand[];
}

export default function BotPanelPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const botId = params.id as string;

  const [botData, setBotData] = useState<BotSessionData | null>(null);
  const [botStatus, setBotStatus] = useState<string>("offline");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [commands, setCommands] = useState<SpawnCommand[]>([]);
  const [showAddCmd, setShowAddCmd] = useState(false);
  const [newCmd, setNewCmd] = useState({ command: "", delayMs: 1000 });
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState({
    name: "", host: "", port: 25565, botUsername: "", version: "1.21.4",
    autoLogin: false, loginPassword: "", autoReconnect: true, webhookUrl: "",
  });
  const [configSaving, setConfigSaving] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);

  const chatBoxRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Active controls tracking
  const activeControls = useRef<Set<string>>(new Set());

  const fetchBot = useCallback(async () => {
    const res = await fetch(`/api/bots/${botId}`);
    if (res.ok) {
      const data = await res.json();
      setBotData(data);
      setBotStatus(data.status || "offline");
      setCommands(data.commands || []);
      setEditForm({
        name: data.name || "",
        host: data.host || "",
        port: data.port || 25565,
        botUsername: data.botUsername || "",
        version: data.version || "1.21.4",
        autoLogin: data.autoLogin || false,
        loginPassword: data.loginPassword || "",
        autoReconnect: data.autoReconnect !== false,
        webhookUrl: data.webhookUrl || "",
      });
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  }, [botId, router]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") {
      fetchBot();
    }
  }, [authStatus, router, fetchBot]);

  // Socket.IO connection
  useEffect(() => {
    if (!botId) return;

    const socket = io({ path: "/socket.io" });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_bot", botId);
    });

    socket.on("bot_event", (event: ChatMessage) => {
      setMessages((prev) => {
        const updated = [...prev, event];
        // Keep last 500 messages
        return updated.slice(-500);
      });
    });

    socket.on("bot_status", (data: { sessionId: string; status: string }) => {
      if (data.sessionId === botId) {
        setBotStatus(data.status);
      }
    });

    return () => {
      socket.emit("leave_bot", botId);
      socket.disconnect();
    };
  }, [botId]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const sendChat = () => {
    if (!chatInput.trim()) return;
    socketRef.current?.emit("bot_chat", { sessionId: botId, message: chatInput });
    setMessages((prev) => [
      ...prev,
      {
        type: "chat",
        sender: "YOU",
        message: chatInput,
        timestamp: new Date().toISOString(),
      },
    ]);
    setChatInput("");
  };

  const handleControl = (action: string, state: boolean) => {
    socketRef.current?.emit("bot_control", { sessionId: botId, action, state });
    if (state) {
      activeControls.current.add(action);
    } else {
      activeControls.current.delete(action);
    }
  };

  const handleStartStop = async () => {
    const action = botStatus === "online" || botStatus === "connecting" ? "stop" : "start";
    const res = await fetch(`/api/bots/${botId}/${action}`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setBotStatus(data.status);
    }
  };

  const addCommand = async () => {
    if (!newCmd.command.trim()) return;
    const res = await fetch(`/api/bots/${botId}/commands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCmd),
    });
    if (res.ok) {
      const cmd = await res.json();
      setCommands((prev) => [...prev, cmd]);
      setNewCmd({ command: "", delayMs: 1000 });
      setShowAddCmd(false);
    }
  };

  const deleteCommand = async (cmdId: string) => {
    const res = await fetch(`/api/bots/${botId}/commands`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commandId: cmdId }),
    });
    if (res.ok) {
      setCommands((prev) => prev.filter((c) => c.id !== cmdId));
    }
  };

  const toggleCommand = async (cmdId: string, enabled: boolean) => {
    const res = await fetch(`/api/bots/${botId}/commands`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commandId: cmdId, enabled }),
    });
    if (res.ok) {
      setCommands((prev) =>
        prev.map((c) => (c.id === cmdId ? { ...c, enabled } : c))
      );
    }
  };

  const saveConfig = async () => {
    setConfigSaving(true);
    setConfigSaved(false);
    const res = await fetch(`/api/bots/${botId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editForm,
        loginPassword: editForm.loginPassword || null,
        webhookUrl: editForm.webhookUrl || null,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setBotData({ ...botData!, ...updated });
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 2000);
    }
    setConfigSaving(false);
  };

  if (authStatus === "loading" || loading) {
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

  if (!botData) return null;

  const isOnline = botStatus === "online";
  const isConnecting = botStatus === "connecting" || botStatus === "reconnecting";

  const controlButtons = [
    { label: "W", action: "forward", gridArea: "1 / 2" },
    { label: "A", action: "left", gridArea: "2 / 1" },
    { label: "S", action: "back", gridArea: "2 / 2" },
    { label: "D", action: "right", gridArea: "2 / 3" },
  ];

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Top bar */}
      <nav style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--glass)",
        backdropFilter: "blur(20px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <div style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "10px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => router.push("/dashboard")}
              style={{ padding: "6px 10px" }}
            >
              ← Back
            </button>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{botData.name}</span>
            <span className={`status-badge status-${botStatus}`}>{botStatus}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowConfig(!showConfig)}
            >
              ⚙️ Config
            </button>
            <button
              className={`btn btn-sm ${isOnline || isConnecting ? "btn-danger" : "btn-primary"}`}
              onClick={handleStartStop}
            >
              {isOnline || isConnecting ? "⏹ Stop" : "▶ Start"}
            </button>
          </div>
        </div>
      </nav>

      <div style={{
        maxWidth: 1400,
        margin: "0 auto",
        padding: 24,
        display: "grid",
        gridTemplateColumns: showConfig ? "1fr 320px" : "1fr",
        gap: 24,
      }}>
        {/* Main panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Chat + Controls row */}
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {/* Chat */}
            <div className="glass-card" style={{
              flex: "2 1 400px",
              display: "flex",
              flexDirection: "column",
              height: 500,
              padding: 20,
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12 }}>
                💬 Chat Log
              </h3>
              <div
                ref={chatBoxRef}
                style={{
                  flex: 1,
                  overflowY: "auto",
                  background: "var(--bg-root)",
                  borderRadius: "var(--radius-sm)",
                  padding: 12,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  fontSize: 13,
                  lineHeight: 1.6,
                  border: "1px solid var(--border)",
                }}
              >
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: 2,
                      color:
                        msg.sender === "SYSTEM"
                          ? "var(--warning)"
                          : msg.sender === "GAME"
                          ? "var(--text-muted)"
                          : msg.sender === "YOU"
                          ? "var(--primary)"
                          : "var(--text-primary)",
                    }}
                  >
                    <span style={{
                      color: "var(--text-muted)",
                      fontSize: 11,
                      marginRight: 8,
                    }}>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                    {msg.sender && (
                      <span style={{ fontWeight: 600 }}>[{msg.sender}] </span>
                    )}
                    {msg.message}
                  </div>
                ))}
                {messages.length === 0 && (
                  <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>
                    Chat log akan muncul di sini saat bot aktif...
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input
                  className="input"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  placeholder="Ketik pesan atau command..."
                  disabled={!isOnline}
                />
                <button
                  className="btn btn-primary"
                  onClick={sendChat}
                  disabled={!isOnline}
                  style={{ whiteSpace: "nowrap" }}
                >
                  Kirim
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="glass-card" style={{
              flex: "1 1 200px",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>
                🎮 Controls
              </h3>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 60px)",
                gridTemplateRows: "repeat(2, 60px)",
                gap: 8,
              }}>
                {controlButtons.map((btn) => (
                  <button
                    key={btn.action}
                    className="btn btn-ghost"
                    style={{
                      gridArea: btn.gridArea,
                      width: 60,
                      height: 60,
                      fontSize: 18,
                      fontWeight: 800,
                      padding: 0,
                    }}
                    disabled={!isOnline}
                    onMouseDown={() => handleControl(btn.action, true)}
                    onMouseUp={() => handleControl(btn.action, false)}
                    onMouseLeave={() => handleControl(btn.action, false)}
                    onTouchStart={(e) => { e.preventDefault(); handleControl(btn.action, true); }}
                    onTouchEnd={() => handleControl(btn.action, false)}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              <button
                className="btn btn-primary"
                style={{ width: "100%", maxWidth: 196 }}
                disabled={!isOnline}
                onMouseDown={() => handleControl("jump", true)}
                onMouseUp={() => handleControl("jump", false)}
                onMouseLeave={() => handleControl("jump", false)}
                onTouchStart={(e) => { e.preventDefault(); handleControl("jump", true); }}
                onTouchEnd={() => handleControl("jump", false)}
              >
                ⬆ JUMP
              </button>

              <button
                className="btn btn-ghost btn-sm"
                style={{ width: "100%", maxWidth: 196 }}
                disabled={!isOnline}
                onMouseDown={() => handleControl("sneak", true)}
                onMouseUp={() => handleControl("sneak", false)}
                onMouseLeave={() => handleControl("sneak", false)}
                onTouchStart={(e) => { e.preventDefault(); handleControl("sneak", true); }}
                onTouchEnd={() => handleControl("sneak", false)}
              >
                ⬇ SNEAK
              </button>

              {/* Bot info */}
              <div style={{
                width: "100%",
                padding: 12,
                background: "var(--bg-root)",
                borderRadius: "var(--radius-sm)",
                fontSize: 12,
                color: "var(--text-secondary)",
              }}>
                <div style={{ marginBottom: 4 }}>👤 {botData.botUsername}</div>
                <div style={{ marginBottom: 4 }}>🌐 {botData.host}:{botData.port}</div>
                <div>📦 {botData.version}</div>
              </div>
            </div>
          </div>

          {/* Spawn Commands */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>
                ⚡ Spawn Commands
              </h3>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddCmd(true)}>
                + Tambah
              </button>
            </div>

            {commands.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: 24,
                color: "var(--text-muted)",
                fontSize: 13,
              }}>
                Belum ada spawn command. Tambahkan command yang akan dijalankan saat bot masuk server.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {commands.map((cmd, i) => (
                  <div
                    key={cmd.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      background: "var(--bg-root)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                      opacity: cmd.enabled ? 1 : 0.5,
                    }}
                  >
                    <span style={{
                      width: 24,
                      height: 24,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "50%",
                      background: "var(--bg-card)",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    <code style={{
                      flex: 1,
                      fontSize: 13,
                      fontFamily: "monospace",
                      color: "var(--primary)",
                    }}>
                      {cmd.command}
                    </code>
                    <span style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      whiteSpace: "nowrap",
                    }}>
                      ⏱ {cmd.delayMs}ms
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => toggleCommand(cmd.id, !cmd.enabled)}
                      style={{ padding: "4px 8px", fontSize: 12 }}
                    >
                      {cmd.enabled ? "✅" : "❌"}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => deleteCommand(cmd.id)}
                      style={{ padding: "4px 8px", fontSize: 12 }}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add command form */}
            {showAddCmd && (
              <div style={{
                marginTop: 12,
                padding: 16,
                background: "var(--bg-card)",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                gap: 10,
                alignItems: "flex-end",
                flexWrap: "wrap",
              }}>
                <div className="input-group" style={{ flex: "2 1 200px" }}>
                  <label>Command</label>
                  <input
                    className="input"
                    value={newCmd.command}
                    onChange={(e) => setNewCmd({ ...newCmd, command: e.target.value })}
                    placeholder="/login password123"
                    onKeyDown={(e) => e.key === "Enter" && addCommand()}
                  />
                </div>
                <div className="input-group" style={{ flex: "1 1 100px" }}>
                  <label>Delay (ms)</label>
                  <input
                    className="input"
                    type="number"
                    value={newCmd.delayMs}
                    onChange={(e) => setNewCmd({ ...newCmd, delayMs: parseInt(e.target.value) || 0 })}
                    min={0}
                    step={500}
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={addCommand}>Simpan</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowAddCmd(false)}>Batal</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Config sidebar - Editable */}
        {showConfig && (
          <div className="glass-card animate-fade-in" style={{
            padding: 20,
            height: "fit-content",
            position: "sticky",
            top: 80,
            maxHeight: "calc(100vh - 100px)",
            overflowY: "auto",
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 16 }}>
              ⚙️ Edit Configuration
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="input-group">
                <label>Nama Session</label>
                <input className="input" value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Host Server</label>
                <input className="input" value={editForm.host}
                  onChange={(e) => setEditForm({ ...editForm, host: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Port</label>
                <input className="input" type="number" value={editForm.port}
                  onChange={(e) => setEditForm({ ...editForm, port: parseInt(e.target.value) || 25565 })} />
              </div>
              <div className="input-group">
                <label>Username Bot</label>
                <input className="input" value={editForm.botUsername}
                  onChange={(e) => setEditForm({ ...editForm, botUsername: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Version</label>
                <input className="input" value={editForm.version}
                  onChange={(e) => setEditForm({ ...editForm, version: e.target.value })} />
              </div>

              <div style={{ display: "flex", gap: 16, padding: "4px 0" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={editForm.autoLogin}
                    onChange={(e) => setEditForm({ ...editForm, autoLogin: e.target.checked })}
                    style={{ accentColor: "var(--primary)" }} />
                  Auto Login
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={editForm.autoReconnect}
                    onChange={(e) => setEditForm({ ...editForm, autoReconnect: e.target.checked })}
                    style={{ accentColor: "var(--primary)" }} />
                  Auto Reconnect
                </label>
              </div>

              {editForm.autoLogin && (
                <div className="input-group">
                  <label>Login Password</label>
                  <input className="input" type="password" value={editForm.loginPassword}
                    onChange={(e) => setEditForm({ ...editForm, loginPassword: e.target.value })}
                    placeholder="Password /login" />
                </div>
              )}

              <div className="input-group">
                <label>Webhook URL</label>
                <input className="input" value={editForm.webhookUrl}
                  onChange={(e) => setEditForm({ ...editForm, webhookUrl: e.target.value })}
                  placeholder="https://..." />
              </div>

              <button className="btn btn-primary" onClick={saveConfig}
                disabled={configSaving} style={{ width: "100%", marginTop: 4 }}>
                {configSaving ? "Menyimpan..." : "💾 Simpan Config"}
              </button>

              {configSaved && (
                <div className="animate-fade-in" style={{
                  padding: "8px 12px", borderRadius: "var(--radius-sm)",
                  background: "rgba(0,230,118,0.1)", border: "1px solid rgba(0,230,118,0.3)",
                  color: "var(--success)", fontSize: 12, textAlign: "center",
                }}>
                  ✅ Config tersimpan
                </div>
              )}

              <div style={{
                fontSize: 11, color: "var(--text-muted)", padding: "8px 0",
                borderTop: "1px solid var(--border)", marginTop: 4,
              }}>
                ⚠️ Perubahan config berlaku saat bot di-restart
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
