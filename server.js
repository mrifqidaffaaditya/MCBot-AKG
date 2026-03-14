const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

// Anti-crash
process.on("uncaughtException", (err) => {
  if (
    err.message.includes("unknown chat format code") ||
    err.message.includes("login codec")
  )
    return;
  console.error("⚠️ Uncaught exception:", err.message);
});

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.argv[2] || process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    path: "/socket.io",
    cors: { origin: "*" },
  });

  // BotManager is a globalThis singleton, set when Next.js API routes import it.
  // We access it lazily here.
  let botManagerRef = null;

  function getBotManager() {
    if (botManagerRef) return botManagerRef;
    if (globalThis.botManager) {
      botManagerRef = globalThis.botManager;
      return botManagerRef;
    }
    return null;
  }

  // Socket.IO handler
  io.on("connection", (socket) => {
    console.log("🌐 Client connected:", socket.id);

    socket.on("join_bot", (sessionId) => {
      socket.join(`bot:${sessionId}`);
      console.log(`🔗 Client ${socket.id} joined bot:${sessionId}`);
    });

    socket.on("leave_bot", (sessionId) => {
      socket.leave(`bot:${sessionId}`);
    });

    socket.on("bot_chat", ({ sessionId, message }) => {
      const mgr = getBotManager();
      if (!mgr) return;
      const bot = mgr.getBot(sessionId);
      if (bot) {
        bot.sendChat(message);
      }
    });

    socket.on("bot_control", ({ sessionId, action, state }) => {
      const mgr = getBotManager();
      if (!mgr) return;
      const bot = mgr.getBot(sessionId);
      if (bot && bot.getStatus() === "online") {
        bot.setControl(action, state);
      }
    });

    socket.on("disconnect", () => {
      console.log("🔌 Client disconnected:", socket.id);
    });
  });

  // Set up BotManager event routing to Socket.IO
  function setupBotManagerEvents(mgr) {
    mgr.onEvent((sessionId, event) => {
      io.to(`bot:${sessionId}`).emit("bot_event", event);
    });

    mgr.onStatusChange((sessionId, status) => {
      io.to(`bot:${sessionId}`).emit("bot_status", { sessionId, status });
    });
  }

  // Poll for botManager availability
  const checkInterval = setInterval(() => {
    const mgr = getBotManager();
    if (mgr) {
      setupBotManagerEvents(mgr);
      clearInterval(checkInterval);
      console.log("✅ BotManager connected to Socket.IO");
    }
  }, 1000);

  // Make io available globally for potential use
  globalThis.__socketIO = io;

  server.listen(port, hostname, () => {
    console.log(`🚀 AiKei Panel ready at http://${hostname}:${port}`);
    console.log(`   Environment: ${dev ? "development" : "production"}`);
  });
});
