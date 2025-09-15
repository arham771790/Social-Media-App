Here are two drop-in README files—one for the backend and one for the frontend—tailored to the code you shared (Prisma + PostgreSQL, Socket.IO presence/typing, REST endpoints, Next.js client with Zustand + Axios). Copy them into:

* `backend/README.md`
* `frontend/README.md`

---

# Backend README (`backend/README.md`)

# Social Media App – Backend (Node.js + Express + Prisma + Socket.IO)

Instagram-style backend featuring auth, posts, messaging, notifications, and real-time presence/typing with Socket.IO. This README focuses on the **messaging** stack you shared.

## Tech Stack

* Node.js, Express
* PostgreSQL + Prisma ORM
* Socket.IO (presence, typing, WebRTC signaling)
* JWT auth middleware
* Multer / uploads (route present)
* Swagger (optional)

## Features (Messaging)

* Threads sidebar with last message + unread counters
* Fetch & paginate messages
* Read receipts
* Real-time new message broadcast
* Real-time typing indicators (Socket + REST fallbacks)
* Online/offline presence per user
* WebRTC signaling endpoints (offer/answer/candidate/end) for audio/video
* Group & direct chats

---

## Getting Started

### Prerequisites

* Node.js 18+
* PostgreSQL 13+
* Yarn or npm

### 1) Install

```bash
# from backend/
npm install
# or
yarn
```

### 2) Environment

Create `.env` in `backend/`:

```ini
# Database (PostgreSQL)
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/social_media?schema=public"

# JWT
JWT_SECRET="super-secret-change-me"

# CORS (NOTE: current code defaults to localhost:3000)
# In production, update allowed origins in app.js and server.js
CORS_ORIGINS="http://localhost:3000"

# Optional: Redis URL if you enable the Socket.IO Redis adapter
# REDIS_URL="redis://localhost:6379"

# Port
PORT=4000
```

### 3) Prisma & DB

```bash
npx prisma generate
npx prisma migrate dev --name init
# (optional) npx prisma db seed
```

Ensure `src/utils/db.js` points to Prisma client.

### 4) Run

```bash
npm run dev
# or
npm start
```

Server starts on `http://localhost:4000`.

---

## Project Structure (key parts)

```
backend/
  src/
    app.js
    server.js
    middlewares/auth.js
    utils/db.js
    routes/
      messageRoutes.js
      ...other route files
    controllers/
      messageController.js     # threads, search, messages, typing, presence, calls
      notificationController.js
  prisma/
    schema.prisma
```

---

## CORS & Base URLs

* Backend serves API under `/api/...` (see `app.js`).
* Default CORS origin is `http://localhost:3000` (update for production in both `app.js` and `server.js` if needed).

---

## Auth

All messaging routes are behind `auth` middleware (`req.userId` is set from JWT). The Socket.IO handshake also expects a token.

**Socket auth (client):**

```js
io(SERVER_URL, { auth: { token: "<JWT>" }, withCredentials: true });
```

---

## Messaging API (important routes)

Base path: `/api`

### Threads & Unread

* `GET /messages/threads` → `{ threads, totalUnread }`
* `GET /messages/unread-count` → `{ total }`

### User Search & Create

* `GET /messages/users?search=<query>` → searchable public users (excludes self)
* `POST /messages/direct` body: `{ targetUserId }`
* `POST /messages/group` body: `{ name, description?, memberIds, imageUrl? }`

### Messages

* `GET /messages/:chatGroupId?limit=50&before=<ISO>` → paginated ASC list
* `POST /messages/:chatGroupId` body: `{ content?, mediaUrl?, clientTempId? }`
* `PUT /messages/:chatGroupId/read` → mark others’ messages as read

### Typing & Presence

* `POST /messages/:chatGroupId/typing/start` body: `{ chatGroupId, username }`
* `POST /messages/:chatGroupId/typing/stop`  body: `{ chatGroupId }`
* `GET  /messages/:chatGroupId/presence` → `{ users: [{ id, username, avatar, online }] }`

### Call Signaling (WebRTC)

* `POST /messages/:chatGroupId/call/offer` body: `{ sdp, fromUser? }`
* `POST /messages/:chatGroupId/call/answer` body: `{ sdp, fromUser? }`
* `POST /messages/:chatGroupId/call/candidate` body: `{ candidate, fromUser? }`
* `POST /messages/:chatGroupId/call/end` body: `{ reason? }`

---

## Socket.IO Events (server)

* Presence:

  * `presence:online` `{ userId }`
  * `presence:offline` `{ userId }`

* Room management:

  * `room:join` `{ chatGroupId }` (ACK with membership guard)
  * `room:leave` `{ chatGroupId }`

* Messaging:

  * `message:new` `{ chatGroupId, message, clientTempId }`
  * `messages:read` `{ chatGroupId, userId, messageIds }`

* Typing:

  * `typing:start` `{ chatGroupId, userId, username }`
  * `typing:stop`  `{ chatGroupId, userId }`

* Calls (broadcast within room):

  * `call:offer` `{ sdp, fromUser }`
  * `call:answer` `{ sdp, fromUser }`
  * `call:candidate` `{ candidate, fromUser }`
  * `call:end` `{ reason }`

---

## Quick cURL Examples

```bash
# Threads
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/messages/threads

# Search users
curl -H "Authorization: Bearer $TOKEN" "http://localhost:4000/api/messages/users?search=an"

# Create DM
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"targetUserId":"USER_ID"}' http://localhost:4000/api/messages/direct

# Send message
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"content":"Hello"}' http://localhost:4000/api/messages/GROUP_ID
```

---

## Production Notes

* Update allowed CORS origins in `app.js` and `server.js`.
* Consider enabling the Socket.IO Redis adapter for multi-instance scaling (code scaffolded in `server.js`).
* Run migrations on deploy: `npx prisma migrate deploy`.
* Set `NODE_ENV=production`, `PORT`, and `JWT_SECRET`.

---

## License

MIT

---

# Frontend README (`frontend/README.md`)

# Social Media App – Frontend (Next.js + Zustand + Socket.IO + Tailwind)

Next.js client featuring threads list, chat view, real-time typing/presence, optimistic sends, and dialogs for creating DMs/groups.

## Tech Stack

* Next.js (App Router or Pages; components are Client Components)
* Zustand (auth/message stores)
* Axios (with auth header)
* Socket.IO client
* Tailwind CSS + shadcn/ui + lucide-react
* date-fns

## Features (Messaging UI)

* **ConversationList** with unread badges, live **online indicators**
* **ChatHeader** with **audio/video** call buttons (WebRTC signaling compatible)
* **ChatContainer** shows messages + **real-time typing indicator** (avatars + dots)
* **Composer** with file upload preview, **typing start/stop** debounce, optimistic sends
* **NewMessageDialog**: unified Direct/Group creation, debounced **search**, selectable users
* **NewGroupDialog**: (matches NewMessageDialog style if you adopt the updated version)
* Mobile-friendly (sidebar drawer, back button), responsive components
* Loading skeletons where helpful

---

## Getting Started

### 1) Install

```bash
# from frontend/
npm install
# or
yarn
```

### 2) Environment

Create `.env.local` in `frontend/`:

```ini
# Backend root (no trailing /api here; axios adds /api)
NEXT_PUBLIC_API_URL="http://localhost:4000"

# Optional: tweak for dialogs API prefix if you customized
# NEXT_PUBLIC_API_PREFIX="/api"
```

> The Axios instance uses:
>
> * **baseURL** = `${NEXT_PUBLIC_API_URL}/api`
> * It automatically attaches `Authorization: Bearer <token>` from `localStorage`.

### 3) Run

```bash
npm run dev
# http://localhost:3000
```

Login to get a JWT stored as `token` in localStorage (per your auth flow), then open `/messages`.

---

## Project Structure (key parts)

```
frontend/
  src/
    app/ or pages/...
    components/messages/
      ConversationList.jsx
      ChatHeader.jsx
      ChatContainer.jsx
      MessageList.jsx         # (not shown above but expected)
      Composer.jsx
      dialogs/
        NewMessageDialog.jsx
        NewGroupDialog.jsx
        GroupCreationForm.jsx
        UserSearchResults.jsx
      call/CallPanel.jsx      # WebRTC UI wrapper using signaling
    lib/
      axios.js                # Axios with base URL + auth header
      socket.js               # io() + helpers (connectSocket, emitTyping, join/leave)
    store/
      authStore.js
      messageStore.js         # Presence, typing, threads, messages, send, search
      uploadStore.js          # Must provide uploadFile()
    styles/...
```

---

## Configuration

### Axios

`src/lib/axios.js`:

* `BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"`
* `baseURL: ${BASE_URL}/api`
* Sends JWT from `localStorage.getItem("token")` in `Authorization` header

### Socket.IO

`connectSocket(token)` should be implemented to:

```js
import { io } from "socket.io-client";

let socket;
export function connectSocket(token) {
  if (socket) return socket;
  socket = io(process.env.NEXT_PUBLIC_API_URL, {
    auth: { token }, withCredentials: true,
  });
  return socket;
}
```

`joinRoom`, `leaveRoom`, `emitTyping` forward to server events:

* `room:join` / `room:leave`
* `typing:start` / `typing:stop`

### Message Store (Zustand)

Key responsibilities in `useMessageStore`:

* **bindSocket**: wire all Socket.IO listeners
* **threads**: loaded by `fetchThreads` (`GET /messages/threads`)
* **messagesByGroup** + **pagination**: `fetchMessages`, `loadOlder`
* **setActiveChat**: joins room, fetches messages, marks read
* **sendMessage**: optimistic append + POST with `clientTempId`
* **typing start/stop**: uses `emitTyping`
* **searchUsers / createDirect / createGroup**: uses REST routes

---

## Messaging Flow

1. **Threads**
   `GET /messages/threads` → render list with unread counts + last message.

2. **Open chat**
   `setActiveChat(id)` → joins room (`room:join`), fetches messages, marks read, stores in `localStorage`.

3. **Send message**

   * Optimistic append (temporary id)
   * POST `/messages/:chatGroupId` with `clientTempId`
   * Server broadcasts `message:new` to room (store replaces optimistic copy)

4. **Typing**

   * On input change/focus, `startTyping(chatGroupId)`; debounce to `stopTyping`
   * Others receive `typing:start/stop` and UI shows avatars + animated dots

5. **Presence**

   * Server emits `presence:online/offline` on connect/disconnect
   * List shows a green dot on the other party (direct) or any online member (group)

6. **Calls (optional)**

   * Buttons in `ChatHeader` open `CallPanel` and start WebRTC flow
   * Uses Socket events and REST fallbacks:

     * `/messages/:chatGroupId/call/offer|answer|candidate|end`

---

## Dialogs & Search

### NewMessageDialog

* Unified UI for **Direct** and **Group** modes (toggle)
* Debounced search: `GET /messages/users?search=...`
* DM creation: `POST /messages/direct` → `onCreated(chatId)`
* Group creation: `POST /messages/group` with `{ name, memberIds }`

> **Tip:** We filter out current user (`me.id`) from search results before listing.

### NewGroupDialog

* If you want **identical UI** to `NewMessageDialog`, keep:

  * same colors / rounded cards / border accents
  * debounced search
  * selected chips with remove (×)
  * primary CTA “Create Group (N)”

---

## Environment Contracts

* **Backend URL**: `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:4000`)
* Axios auto-adds `/api`.
* **Auth**: JWT saved as `localStorage.setItem('token', '...')` and `localStorage.setItem('user', JSON.stringify(user))`.

---

## Scripts

Common Next.js scripts:

```json
{
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint"
  }
}
```

---

## Troubleshooting

* **401 Unauthorized**: Ensure `token` is in localStorage and valid; backend `JWT_SECRET` matches issuer.
* **CORS errors**: Update allowed origins in backend `app.js` & `server.js`. Default is `http://localhost:3000`.
* **Socket not connecting**: Check `connectSocket` URL & `auth.token`. Look at browser DevTools → Network → WS.
* **No presence / typing**: Confirm client is joining rooms (`setActiveChat` calls `joinRoom`) and that events are bound via `bindSocket()` after login.
* **Uploads**: Implement `uploadStore.uploadFile()` to return `{ optimizedUrl?, originalUrl }`.

---

## Production

* Host frontend (e.g., Vercel) and set `NEXT_PUBLIC_API_URL` to your API domain.
* Make sure backend CORS allows your frontend domain(s).
* Use HTTPS in production for WebRTC and media permissions.

---

## License

MIT

---
