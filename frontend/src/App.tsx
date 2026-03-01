import React, { useMemo, useState } from "react";
import Login from "./pages/Login";
import Chats from "./pages/Chats";
import { WSClient } from "./ws/client";

export default function App() {
  const [token, setToken] = useState<string>(() => localStorage.getItem("token") || "");
  const ws = useMemo(() => new WSClient(), []);

  const logout = () => {
    ws.close();
    setToken("");
    localStorage.removeItem("token");
  };

  if (!token) return <Login onToken={(t) => { setToken(t); localStorage.setItem("token", t); }} />;

  return <Chats token={token} ws={ws} onLogout={logout} />;
}
