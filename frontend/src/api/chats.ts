import { http } from "./http";

export type Chat = { id: number; title: string };
export type Message = {
  id: number;
  chat_id: number;
  sender_id: number;
  content: string;
  created_at: string;
};

export async function listChats(token: string) {
  return http<Chat[]>("/api/chats", { headers: { Authorization: `Bearer ${token}` } });
}

export async function createChat(token: string, title: string) {
  return http<Chat>("/api/chats", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title })
  });
}

export async function joinChat(token: string, chatId: number) {
  return http<Chat>(`/api/chats/${chatId}/join`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function history(token: string, chatId: number, limit = 50) {
  return http<Message[]>(`/api/chats/${chatId}/messages?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}
