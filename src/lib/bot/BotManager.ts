import { BotInstance, BotConfig, BotStatus, BotEvent } from "./BotInstance";

class BotManager {
  private bots: Map<string, BotInstance> = new Map();
  private eventCallback: ((sessionId: string, event: BotEvent) => void) | null = null;
  private statusCallback: ((sessionId: string, status: BotStatus) => void) | null = null;

  onEvent(callback: (sessionId: string, event: BotEvent) => void) {
    this.eventCallback = callback;
  }

  onStatusChange(callback: (sessionId: string, status: BotStatus) => void) {
    this.statusCallback = callback;
  }

  startBot(config: BotConfig): BotInstance {
    // Stop existing bot for this session if any
    const existing = this.bots.get(config.sessionId);
    if (existing) {
      existing.disconnect();
      this.bots.delete(config.sessionId);
    }

    const instance = new BotInstance(config);

    instance.on("botEvent", (event: BotEvent) => {
      if (this.eventCallback) {
        this.eventCallback(config.sessionId, event);
      }
    });

    instance.on("statusChange", (status: BotStatus) => {
      if (this.statusCallback) {
        this.statusCallback(config.sessionId, status);
      }
    });

    this.bots.set(config.sessionId, instance);
    instance.connect();

    return instance;
  }

  stopBot(sessionId: string): boolean {
    const instance = this.bots.get(sessionId);
    if (!instance) return false;

    instance.disconnect();
    this.bots.delete(sessionId);
    return true;
  }

  getBot(sessionId: string): BotInstance | undefined {
    return this.bots.get(sessionId);
  }

  getBotStatus(sessionId: string): BotStatus {
    const instance = this.bots.get(sessionId);
    return instance ? instance.getStatus() : "offline";
  }

  getAllStatuses(): Record<string, BotStatus> {
    const statuses: Record<string, BotStatus> = {};
    for (const [id, bot] of this.bots) {
      statuses[id] = bot.getStatus();
    }
    return statuses;
  }

  stopAll() {
    for (const [, bot] of this.bots) {
      bot.disconnect();
    }
    this.bots.clear();
  }
}

// Singleton
const globalForBotManager = globalThis as unknown as {
  botManager: BotManager | undefined;
};

export const botManager =
  globalForBotManager.botManager ?? new BotManager();

if (process.env.NODE_ENV !== "production") {
  globalForBotManager.botManager = botManager;
}

export { BotManager };
export type { BotConfig, BotStatus, BotEvent };
