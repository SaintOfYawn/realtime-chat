import { http } from "./http";

export type TokenOut = { access_token: string; token_type: string };

export async function register(username: string, password: string) {
  return http<TokenOut>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
}

export async function login(username: string, password: string) {
  return http<TokenOut>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
}
