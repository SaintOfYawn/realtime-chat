import React, { useEffect, useRef, useState } from "react";
import type { Chat } from "../api/chats";
import type { WSOut } from "../ws/types";

export default function ChatWindow({
  chat,
  messages,
  onSend
}: {
  chat: Chat;
  messages: Extract<WSOut, { type: "message" }>[];
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };

  return (
    <div className="chatWindow">
      <div className="chatTop">
        <h2>{chat.title} <span className="muted">#{chat.id}</span></h2>
      </div>

      <div className="chatMessages">
        {messages.map((m) => (
          <div key={m.message_id} className="msg">
            <div className="meta">
              <span className="sender">User {m.sender_id}</span>
              <span className="time">{new Date(m.created_at).toLocaleString()}</span>
            </div>
            <div className="bubble">{m.content}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="chatInput">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Напиши сообщение..."
          onKeyDown={(e) => e.key === "Enter" ? send() : null}
        />
        <button onClick={send}>Send</button>
      </div>
    </div>
  );
}
