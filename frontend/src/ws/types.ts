export type WSIn =
  | { type: "subscribe"; chat_id: number }
  | { type: "unsubscribe"; chat_id: number }
  | { type: "message"; chat_id: number; content: string }
  | { type: "ping" };

export type WSOut =
  | { type: "subscribed"; chat_id: number }
  | { type: "unsubscribed"; chat_id: number }
  | { type: "message"; chat_id: number; sender_id: number; content: string; message_id: number; created_at: string }
  | { type: "presence"; user_id: number; online: boolean }
  | { type: "pong" }
  | { type: "error"; error: string };
