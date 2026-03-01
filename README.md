# Real-Time Chat

Full-stack real-time messaging system with scalable architecture.

## Tech Stack

Backend:
- FastAPI
- WebSockets
- Redis (Pub/Sub)
- PostgreSQL
- JWT Authentication

Frontend:
- React
- TypeScript
- Vite

Infrastructure:
- Docker

---

## Features

- JWT authentication
- Single WebSocket connection per user
- Real-time messaging
- Multiple chat subscriptions
- Message history
- Online / offline status
- Redis Pub/Sub for event broadcasting
- Full-stack architecture
- Docker deployment

---

## Architecture

- FastAPI handles HTTP + WebSockets
- Redis distributes messages between instances
- PostgreSQL stores users and messages
- React client communicates via REST + WebSockets

---

## Run Locally

### 1. Clone repository


git clone https://github.com/SaintOfYawn/realtime-chat.git

cd realtime-chat


### 2. Start with Docker


docker-compose up --build


Frontend:

http://localhost:5173


Backend:

http://localhost:8000/docs


---

## Project Structure


backend/
frontend/
docker-compose.yml


---

## Author

Danil Sazonov  
Junior Python Backend / Full-Stack Developer
