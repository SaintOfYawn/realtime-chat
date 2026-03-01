// frontend/src/pages/Chats.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { WSClient } from "../ws/client";
import type { WSOut } from "../ws/types";

const API_BASE = "http://localhost:8000";

type Chat = {
  id: number;
  name?: string;
  title?: string;
};

type Msg = {
  chat_id: number;
  sender_id: number;
  content: string;
  message_id?: number;
  created_at?: string;
};

function chatLabel(c: Chat): string {
  return c.name ?? c.title ?? `Chat ${c.id}`;
}

async function api<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }

  // some endpoints may return empty response
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return (undefined as unknown) as T;
  return (await res.json()) as T;
}

export default function ChatsPage() {
  const token = localStorage.getItem("token") || "";

  const ws = useMemo(() => new WSClient(), []);
  const subscribedChatIdRef = useRef<number | null>(null);

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [messagesByChat, setMessagesByChat] = useState<Record<number, Msg[]>>(
    {}
  );

  const [text, setText] = useState("");
  const [newChatName, setNewChatName] = useState("General");
  const [joinId, setJoinId] = useState("1");

  // Load chats
  useEffect(() => {
    if (!token) return;

    api<Chat[]>("/api/chats", token)
      .then((list) => {
        setChats(list);
        if (list.length && activeChatId === null) {
          setActiveChatId(list[0].id);
        }
      })
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Connect WS once per token
  useEffect(() => {
    if (!token) return;

    ws.connect(token, (m: WSOut) => {
      if ((m as any).type === "message") {
        const chatId = Number((m as any).chat_id);

        const msg: Msg = {
          chat_id: chatId,
          sender_id: Number((m as any).sender_id ?? 0),
          content: String((m as any).content ?? ""),
          message_id: (m as any).message_id,
          created_at: (m as any).created_at,
        };

        setMessagesByChat((prev) => {
          const arr = prev[chatId] ? [...prev[chatId]] : [];
          arr.push(msg);
          return { ...prev, [chatId]: arr };
        });
      }
    });

    return () => ws.close();
  }, [ws, token]);

  // Load history + subscribe when active chat changes
  useEffect(() => {
    if (!token || !activeChatId) return;

    api<Msg[]>(`/api/chats/${activeChatId}/messages?limit=50`, token)
      .then((history) => {
        setMessagesByChat((prev) => ({ ...prev, [activeChatId]: history }));
      })
      .catch(console.error);

    if (subscribedChatIdRef.current !== activeChatId) {
      ws.send({ type: "subscribe", chat_id: activeChatId });
      subscribedChatIdRef.current = activeChatId;
    }
  }, [ws, token, activeChatId]);

  const activeMessages = activeChatId ? messagesByChat[activeChatId] || [] : [];

  async function onCreateChat() {
    if (!newChatName.trim()) return;

    // backend expects {name: "..."}
    const chat = await api<Chat>("/api/chats", token, {
      method: "POST",
      body: JSON.stringify({ name: newChatName.trim() }),
    });

    setChats((prev) => [chat, ...prev]);
    setActiveChatId(chat.id);
  }

  async function onJoinChat() {
    const id = Number(joinId);
    if (!id) return;

    await api(`/api/chats/${id}/join`, token, { method: "POST" });

    const list = await api<Chat[]>("/api/chats", token);
    setChats(list);
    setActiveChatId(id);

    ws.send({ type: "subscribe", chat_id: id });
    subscribedChatIdRef.current = id;

    const history = await api<Msg[]>(`/api/chats/${id}/messages?limit=50`, token);
    setMessagesByChat((prev) => ({ ...prev, [id]: history }));
  }

  async function onSend() {
    if (!activeChatId) return;
    const content = text.trim();
    if (!content) return;

    setText("");

    // IMPORTANT: send via REST
    await api(`/api/chats/${activeChatId}/messages`, token, {
      method: "POST",
      body: JSON.stringify({ content }),
    });

    // refresh history to guarantee it appears even if WS didn't deliver
    const history = await api<Msg[]>(
      `/api/chats/${activeChatId}/messages?limit=50`,
      token
    );
    setMessagesByChat((prev) => ({ ...prev, [activeChatId]: history }));
  }

  function onLogout() {
    ws.close();
    localStorage.removeItem("token");
    window.location.reload();
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside style={{ width: 320, borderRight: "1px solid #333", padding: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <h3 style={{ margin: 0 }}>Чаты</h3>
          <button onClick={onLogout}>Logout</button>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <input
            value={newChatName}
            onChange={(e) => setNewChatName(e.target.value)}
            placeholder="Новый чат"
            style={{ flex: 1 }}
          />
          <button onClick={onCreateChat}>Create</button>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <input
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            placeholder="Join по ID"
            style={{ flex: 1 }}
          />
          <button onClick={onJoinChat}>Join</button>
        </div>

        <div style={{ overflow: "auto", height: "calc(100vh - 190px)" }}>
          {chats.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveChatId(c.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: 10,
                marginBottom: 6,
                border: c.id === activeChatId ? "2px solid #4b7cff" : "1px solid #333",
                borderRadius: 10,
                background: c.id === activeChatId ? "rgba(75,124,255,0.12)" : "transparent",
                color: "inherit",
              }}
            >
              <div style={{ fontWeight: 700 }}>{chatLabel(c)}</div>
              <div style={{ fontSize: 12, opacity: 0.65 }}>#{c.id}</div>
            </button>
          ))}
        </div>
      </aside>

      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, padding: 12, overflow: "auto" }}>
          {activeChatId ? (
            activeMessages.map((m, i) => (
              <div key={(m.message_id ?? i) + "-" + i} style={{ marginBottom: 10 }}>
                <b>{m.sender_id === -1 ? "Me" : `User ${m.sender_id}`}</b>: {m.content}
              </div>
            ))
          ) : (
            <div style={{ opacity: 0.7 }}>Выбери чат слева</div>
          )}
        </div>

        <div
          style={{
            borderTop: "1px solid #333",
            padding: 10,
            display: "flex",
            gap: 6,
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Напиши сообщение..."
            style={{ flex: 1 }}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSend();
            }}
          />
          <button onClick={onSend}>Send</button>
        </div>
      </main>
    </div>
  );
}