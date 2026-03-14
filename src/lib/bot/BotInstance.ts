import mineflayer from "mineflayer";
import { EventEmitter } from "events";
import { parsePlayerChat } from "./chatParser";

export interface BotConfig {
  sessionId: string;
  name: string;
  host: string;
  port: number;
  botUsername: string;
  version: string;
  autoLogin: boolean;
  loginPassword?: string | null;
  autoReconnect: boolean;
  webhookUrl?: string | null;
  spawnCommands: Array<{
    command: string;
    delayMs: number;
    order: number;
    enabled: boolean;
  }>;
}

export type BotStatus = "offline" | "connecting" | "online" | "reconnecting";

export interface BotEvent {
  type: "chat" | "status" | "system";
  sender?: string;
  message: string;
  timestamp: string;
}

export class BotInstance extends EventEmitter {
  public config: BotConfig;
  public status: BotStatus = "offline";
  private bot: mineflayer.Bot | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isDestroyed = false;

  constructor(config: BotConfig) {
    super();
    this.config = config;
  }

  private emitEvent(event: BotEvent) {
    this.emit("botEvent", event);
  }

  private emitStatus() {
    this.emit("statusChange", this.status);
    this.emitEvent({
      type: "status",
      message: this.status,
      timestamp: new Date().toISOString(),
    });
  }

  connect() {
    if (this.isDestroyed) return;

    this.clearReconnectTimer();

    if (this.bot) {
      try {
        this.bot.removeAllListeners();
        this.bot.quit();
      } catch {
        /* ignore */
      }
      this.bot = null;
    }

    this.status = "connecting";
    this.emitStatus();

    this.emitEvent({
      type: "system",
      sender: "SYSTEM",
      message: `Connecting to ${this.config.host}:${this.config.port}...`,
      timestamp: new Date().toISOString(),
    });

    try {
      this.bot = mineflayer.createBot({
        host: this.config.host,
        port: this.config.port,
        username: this.config.botUsername,
        version: this.config.version,
        hideErrors: true,
        checkTimeoutInterval: 120000,
        brand: "vanilla",
      });

      this.setupListeners();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.emitEvent({
        type: "system",
        sender: "SYSTEM",
        message: `Failed to create bot: ${msg}`,
        timestamp: new Date().toISOString(),
      });
      this.status = "offline";
      this.emitStatus();
    }
  }

  private setupListeners() {
    if (!this.bot) return;

    this.bot._client.on("error", (err: Error) => {
      console.log(`[${this.config.name}] Socket error: ${err.message}`);
    });

    // Bypass Resource Pack
    this.bot._client.on("packet", (data: { uuid?: string }, meta: { name: string }) => {
      if (meta.name === "resource_pack_send" || meta.name === "add_resource_pack") {
        try {
          this.bot?._client.write("resource_pack_receive", { uuid: data.uuid, result: 3 });
          this.bot?._client.write("resource_pack_receive", { uuid: data.uuid, result: 0 });
          this.emitEvent({
            type: "system",
            sender: "SYSTEM",
            message: "Resource Pack bypassed",
            timestamp: new Date().toISOString(),
          });
        } catch {
          /* ignore */
        }
      }
    });

    this.bot.on("spawn", () => {
      this.status = "online";
      this.emitStatus();

      this.emitEvent({
        type: "system",
        sender: "SYSTEM",
        message: "Bot spawned into the world!",
        timestamp: new Date().toISOString(),
      });

      // Execute spawn commands
      this.executeSpawnCommands();
    });

    this.bot.on("message", (jsonMsg) => {
      const message = jsonMsg.toString().trim();
      if (!message) return;

      // Try to parse as player chat
      const parsed = parsePlayerChat(message);
      if (parsed) {
        this.emitEvent({
          type: "chat",
          sender: parsed.username,
          message: parsed.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        this.emitEvent({
          type: "chat",
          sender: "GAME",
          message,
          timestamp: new Date().toISOString(),
        });
      }

      // Auto Login / Register
      if (this.config.autoLogin && this.config.loginPassword) {
        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes("/login")) {
          setTimeout(() => {
            this.sendChat(`/login ${this.config.loginPassword}`);
          }, 1000);
        }
        if (lowerMsg.includes("/register")) {
          setTimeout(() => {
            this.sendChat(`/register ${this.config.loginPassword} ${this.config.loginPassword}`);
          }, 1000);
        }
      }
    });

    this.bot.on("kicked", (reason: string) => {
      this.emitEvent({
        type: "system",
        sender: "SYSTEM",
        message: `Bot kicked: ${reason}`,
        timestamp: new Date().toISOString(),
      });
    });

    this.bot.on("error", (err: Error) => {
      this.emitEvent({
        type: "system",
        sender: "SYSTEM",
        message: `Error: ${err.message}`,
        timestamp: new Date().toISOString(),
      });
    });

    this.bot.on("end", (reason: string) => {
      this.emitEvent({
        type: "system",
        sender: "SYSTEM",
        message: `Disconnected: ${reason}`,
        timestamp: new Date().toISOString(),
      });

      if (this.bot) {
        this.bot.removeAllListeners();
        this.bot = null;
      }

      if (!this.isDestroyed && this.config.autoReconnect) {
        this.status = "reconnecting";
        this.emitStatus();

        this.emitEvent({
          type: "system",
          sender: "SYSTEM",
          message: "Reconnecting in 10 seconds...",
          timestamp: new Date().toISOString(),
        });

        this.reconnectTimer = setTimeout(() => {
          if (!this.isDestroyed) {
            this.connect();
          }
        }, 10000);
      } else {
        this.status = "offline";
        this.emitStatus();
      }
    });
  }

  private async executeSpawnCommands() {
    const commands = this.config.spawnCommands
      .filter((c) => c.enabled)
      .sort((a, b) => a.order - b.order);

    if (commands.length === 0) return;

    this.emitEvent({
      type: "system",
      sender: "SYSTEM",
      message: `Executing ${commands.length} spawn command(s)...`,
      timestamp: new Date().toISOString(),
    });

    let totalDelay = 0;
    for (const cmd of commands) {
      totalDelay += cmd.delayMs;
      setTimeout(() => {
        if (this.bot && this.status === "online") {
          this.sendChat(cmd.command);
          this.emitEvent({
            type: "system",
            sender: "SYSTEM",
            message: `Executed: ${cmd.command}`,
            timestamp: new Date().toISOString(),
          });
        }
      }, totalDelay);
    }
  }

  sendChat(message: string): boolean {
    if (!this.bot || this.status !== "online") return false;
    try {
      this.bot.chat(message);
      return true;
    } catch {
      return false;
    }
  }

  setControl(action: string, state: boolean) {
    if (!this.bot || this.status !== "online") return;
    try {
      this.bot.setControlState(action as mineflayer.ControlState, state);
    } catch {
      /* ignore */
    }
  }

  clearControls() {
    if (!this.bot) return;
    try {
      this.bot.clearControlStates();
    } catch {
      /* ignore */
    }
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  disconnect() {
    this.isDestroyed = true;
    this.clearReconnectTimer();

    if (this.bot) {
      try {
        this.bot.removeAllListeners();
        this.bot.quit();
      } catch {
        /* ignore */
      }
      this.bot = null;
    }

    this.status = "offline";
    this.emitStatus();
  }

  getStatus(): BotStatus {
    return this.status;
  }
}
