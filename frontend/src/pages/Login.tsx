import React, { useState } from "react";
import { login, register } from "../api/auth";

export default function Login({ onToken }: { onToken: (t: string) => void }) {
  const [username, setUsername] = useState("alice");
  const [password, setPassword] = useState("password");
  const [err, setErr] = useState("");

  const doLogin = async () => {
    setErr("");
    try {
      const res = await login(username, password);
      onToken(res.access_token);
    } catch (e: any) {
      setErr(e.message || "Login error");
    }
  };

  const doRegister = async () => {
    setErr("");
    try {
      const res = await register(username, password);
      onToken(res.access_token);
    } catch (e: any) {
      setErr(e.message || "Register error");
    }
  };

  return (
    <div className="container">
      <h1>Real-Time Chat</h1>

      <div className="card">
        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} />

        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

        <div className="row">
          <button onClick={doLogin}>Login</button>
          <button onClick={doRegister} className="secondary">Register</button>
        </div>

        {err && <p className="error">{err}</p>}
      </div>
      <p className="hint">По умолчанию: alice / password (можешь сменить)</p>
    </div>
  );
}
