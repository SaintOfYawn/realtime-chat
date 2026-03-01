// frontend/src/ws/client.ts
import type { WSIn, WSOut } from "./types";

function getWsBase(): string {
  const env = ((import.meta as any).env?.VITE_WS_URL as string) || "";
  if (env.trim().length > 0) return env.trim();

  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://localhost:8000`;
}

const WS_URL = getWsBase();

export class WSClient {
  private ws: WebSocket | null = null;
  private onMsg?: (m: WSOut) => void;

  private pingTimer: number | null = null;
  private currentToken: string | null = null;
  private isConnecting = false;

  connect(token: string, onMsg: (m: WSOut) => void) {
    this.onMsg = onMsg;

    // already connected with same token
    if (
      this.ws &&
      this.ws.readyState === WebSocket.OPEN &&
      this.currentToken === token
    ) {
      return;
    }

    // already connecting with same token
    if (this.isConnecting && this.currentToken === token) return;

    this.currentToken = token;
    this.isConnecting = true;

    // close previous connection if any
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    const ws = new WebSocket(`${WS_URL}/ws?token=${encodeURIComponent(token)}`);
    this.ws = ws;

    ws.onopen = () => {
      this.isConnecting = false;

      if (this.pingTimer) window.clearInterval(this.pingTimer);
      this.pingTimer = window.setInterval(() => {
        this.send({ type: "ping" });
      }, 25000);
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as WSOut;
        this.onMsg?.(msg);
      } catch {}
    };

    ws.onclose = () => {
      this.isConnecting = false;

      if (this.pingTimer) window.clearInterval(this.pingTimer);
      this.pingTimer = null;

      if (this.ws === ws) this.ws = null;
    };
  }

  send(msg: WSIn) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(msg));
  }

  close() {
    this.currentToken = null;
    this.isConnecting = false;

    if (this.pingTimer) window.clearInterval(this.pingTimer);
    this.pingTimer = null;

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
    }
    this.ws = null;
  }
}