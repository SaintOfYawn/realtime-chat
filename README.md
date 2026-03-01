# Real-Time Chat (Full-Stack)

Система обмена сообщениями в реальном времени с масштабируемой архитектурой.

**Stack:** FastAPI • WebSockets • Redis Pub/Sub • PostgreSQL • React • TypeScript • Vite • Docker

## Возможности

- JWT-аутентификация
- Одно WebSocket-соединение на пользователя (старое соединение закрывается)
- Подписка на несколько чатов (subscribe/unsubscribe)
- Мгновенная отправка и получение сообщений
- История сообщений (PostgreSQL)
- Online/Offline (presence + heartbeat)
- Redis Pub/Sub для рассылки событий (подходит для нескольких инстансов backend)
- Full-stack архитектура
- Docker-развёртывание

---

## Запуск через Docker

В корне проекта:

```bash
docker compose up --build
```

Открой:
- Frontend: http://localhost:5173
- Backend: http://localhost:8000

---

## Как пользоваться

1) На странице логина зарегистрируй пользователя (например `alice / password`).
2) Создай чат (например `General`).
3) Открой второй браузер/инкогнито → зарегистрируй `bob / password`.
4) Bob может **join** по ID чата (в списке видно `#id`), либо создай второй чат.
5) Выбери чат — загрузится история (последние 50) и пойдёт realtime.

---

## WebSocket протокол

Подключение:
```
ws://localhost:8000/ws?token=ACCESS_TOKEN
```

Входящие сообщения (client -> server):
- subscribe: `{ "type": "subscribe", "chat_id": 1 }`
- unsubscribe: `{ "type": "unsubscribe", "chat_id": 1 }`
- message: `{ "type": "message", "chat_id": 1, "content": "hello" }`
- ping: `{ "type": "ping" }`

Исходящие (server -> client):
- message: `{ "type":"message", "chat_id":1, "sender_id":2, "content":"...", "message_id":10, "created_at":"..." }`
- subscribed / unsubscribed
- presence (минимально)
- pong / error

---

## Масштабирование

- Сообщение сохраняется в PostgreSQL (история).
- Затем публикуется в Redis Pub/Sub канал `chat_events:<chat_id>`.
- Каждый backend-инстанс слушает Redis для чатов, на которые есть подписанные пользователи, и фан-аутит в локальные WS.

---

## Улучшения (по желанию)

- Refresh tokens
- Глобальный presence broadcast (всем участникам чата)
- Индексация/поиск по сообщениям
- Typing indicator, read receipts
- Роли в чате, приглашения
- Поддержка вложений
