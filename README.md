# 🎮 Family Game Hub

A real-time multiplayer party game platform built for families and friends. No accounts, no downloads — share a room code and play instantly from any device on the same network.

![Tech Stack](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Tech Stack](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![Tech Stack](https://img.shields.io/badge/Socket.io-4.x-010101?logo=socket.io&logoColor=white)
![Tech Stack](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## ✨ Features

- **Instant play** — Create a room, share the code, and start in seconds. No sign-up required.
- **LAN-friendly** — Works across devices on the same Wi-Fi network, perfect for in-person family nights.
- **Real-time** — All game state synced live via Socket.io with sub-second latency.
- **Host controls** — The host manages game type, configuration, starting, restarting, and ending games.
- **Role privacy** — Roles and secret words are sent privately; only your screen shows your information.
- **Game variety** — Multiple games with more planned. Easy to contribute new ones.

---

## 🕹️ Games

### 🔪 Wink Murder
A classic social deduction game. One or more **Killers** secretly wink at other players to eliminate them. A **Detective** watches carefully and gets one accusation to catch the killer. Everyone else tries to survive and identify the threat.

- Configurable killer and detective counts
- Detective catches the killer if winked at directly
- Real-time elimination feed

### 🕵️ Imposter
A word-based deception game. The **Word Setter** chooses two similar words — one for the group and a slightly different one for the **Imposter**. Players discuss their word without saying it. The group votes to identify who has the odd word out.

- Word Setter picks words and secretly chooses the imposter
- Manual or random imposter selection
- 60-second timed voting with live vote tracking
- Full vote breakdown revealed at the end (who voted for whom)
- Tie detection — if votes are split, the imposter escapes

---

## 🗂️ Project Structure

```
family-game-hub/
├── backend/                  # Node.js + Express API + Socket.io server
│   ├── controllers/          # HTTP route handlers
│   ├── middlewares/          # Auth, rate limiting, error handling
│   ├── routes/               # REST API routes
│   ├── sockets/              # Socket.io namespaces per game
│   │   ├── index.js
│   │   ├── lobbySocket.js
│   │   ├── winkMurderSocket.js
│   │   └── imposterSocket.js
│   ├── utils/                # Room manager, role assigner, validators
│   └── server.js
│
└── frontend/                 # React + Vite SPA
    └── src/
        ├── components/       # Shared UI + game-specific components
        ├── contexts/         # SessionContext (global player/room state)
        ├── pages/            # One page per route
        ├── routes/           # Route guards
        └── utils/            # Toast helpers, misc
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later

### 1. Clone the repository

```bash
git clone https://github.com/HammadAli132/family-game-hub.git
cd family-game-hub
```

### 2. Set up the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
PORT=3002
NODE_ENV=development
SESSION_SECRET=replace_this_with_a_long_random_string_min_32_chars
CORS_ORIGIN=http://localhost:5173
```

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

The backend will run at `http://localhost:3002`.

### 3. Set up the frontend

```bash
cd ../frontend
```

Create a `.env` file:

```env
VITE_SOCKET_URL=http://localhost:3002
```

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

The frontend will run at `http://localhost:5173`.

### 4. Play

Open `http://localhost:5173` in your browser. Other devices on the same network can join by visiting `http://<your-local-ip>:5173`.

---

## 🏗️ Architecture Overview

```
Browser (React SPA)
    │
    ├── REST API  ──────────────▶  Express routes  ──▶  Controllers
    │   (room create/join,                               (roomController,
    │    player list, session)                            playerController)
    │
    └── WebSocket  ─────────────▶  Socket.io namespaces
        (all game events)           /lobby          ──▶  lobbySocket.js
                                    /wink-murder    ──▶  winkMurderSocket.js
                                    /imposter       ──▶  imposterSocket.js
```

**Key design decisions:**

- **Game state is server-authoritative.** All role assignments, eliminations, and vote tallies live in in-memory Maps (`wmGameStates`, `impGameStates`) on the server. Clients are display-only.
- **Roles are assigned before navigation.** `lobby:start_game` assigns and stores all roles server-side before emitting `lobby:game_starting`. This prevents race conditions when players connect to the game socket.
- **Socket auth via handshake.** Each socket passes `auth: { playerId, roomCode }` so sessions are tied to specific players and rooms without relying on cookies across tabs.
- **Namespaced sockets.** Each game lives in its own Socket.io namespace (`/wink-murder`, `/imposter`). The lobby uses `/lobby`. This isolates event handling and prevents cross-game leakage.

---

## 🔌 Socket.io Event Reference

### `/lobby` namespace

| Event (client → server) | Payload | Description |
|---|---|---|
| `lobby:update_config` | `config` object | Host updates game settings |
| `lobby:change_game_type` | `{ gameType }` | Host switches game |
| `lobby:start_game` | — | Host starts the game |
| `lobby:rename` | `{ newName }` | Player renames themselves |

| Event (server → client) | Payload | Description |
|---|---|---|
| `lobby:player_joined` | `{ player }` | New player joined |
| `lobby:player_left` | `{ playerName }` | Player disconnected |
| `lobby:config_updated` | `{ config }` | Config change confirmed |
| `lobby:game_type_changed` | `{ gameType, config }` | Game type switched |
| `lobby:game_starting` | `{ gameType }` | Game is about to start |
| `lobby:error` | `{ code, message }` | Validation or permission error |

### `/wink-murder` namespace

| Event (client → server) | Description |
|---|---|
| `wm:ready` | Player confirms they've seen their role |
| `wm:wink` | Killer winks at a target |
| `wm:accuse` | Detective formally accuses a player |
| `wm:end_game` | Host ends the game (sends all to lobby) |
| `wm:restart_game` | Host restarts (re-shuffles roles, sends all to lobby) |

| Event (server → client) | Description |
|---|---|
| `wm:roles_dealt` | Delivers this player's role |
| `wm:all_ready` | All players ready — game begins |
| `wm:player_winked` | A civilian was eliminated |
| `wm:killer_caught` | Killer tried to wink the detective and was caught |
| `wm:accusation_result` | Result of a detective accusation |
| `wm:game_over` | Game ended — includes winner and role reveal |
| `wm:game_restarted` | Restart confirmed — navigate to lobby |
| `wm:host_left` | Host left after game ended — countdown to home |

### `/imposter` namespace

| Event (client → server) | Description |
|---|---|
| `imp:submit_words` | Word setter submits words and imposter choice |
| `imp:open_voting` | Host opens the voting phase |
| `imp:vote` | Player casts their vote |
| `imp:end_game` | Host ends the game |
| `imp:restart_game` | Host restarts |

| Event (server → client) | Description |
|---|---|
| `imp:roles_dealt` | Delivers role + `isWordSetter` flag |
| `imp:words_set` | Delivers this player's word + final role |
| `imp:words_distributed` | Broadcast: all words sent (fallback trigger) |
| `imp:voting_open` | Voting phase begins, includes player list + duration |
| `imp:vote_update` | Live list of who has voted |
| `imp:game_over` | Game ended — includes winner, words, vote breakdown |
| `imp:game_restarted` | Restart confirmed — navigate to lobby |
| `imp:host_left` | Host left after game ended — countdown to home |

---

## 🤝 Contributing

Contributions are welcome! Here's how to get involved:

### Reporting bugs

Open an issue and include:
- What you did
- What you expected
- What actually happened
- Browser + OS

### Suggesting a new game

Open a discussion or issue with:
- Game name and a brief description of the rules
- Rough idea of roles and win conditions
- Any edge cases you can think of

### Submitting a pull request

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes, following the patterns already in the codebase
4. Test locally with at least two browser tabs in the same room
5. Open a PR with a clear description of what changed and why

### Adding a new game

The codebase is designed to make adding games straightforward:

1. **Backend**: Add a new socket file in `backend/sockets/` (model it after `winkMurderSocket.js`). Register the namespace in `backend/sockets/index.js`. Add role assignment logic in `backend/utils/roleAssigner.js` if needed.

2. **Frontend**: Add a new page in `frontend/src/pages/`. Register the route in `frontend/src/App.jsx`. Add the game type to the selector in `frontend/src/pages/LobbyPage.jsx` and `ImposterConfig`/config pattern.

3. **Lobby integration**: Add your game type to the `GAME_TYPES` array in `lobbySocket.js` and the frontend game type selector.

### Code style

- Backend: CommonJS (`require`/`module.exports`), no TypeScript
- Frontend: ES Modules, React functional components, Tailwind CSS v4 utility classes
- No comments unless the *why* is non-obvious
- Keep socket handlers thin — validate, mutate state, emit

---

## 📄 License

MIT © [HammadAli132](https://github.com/HammadAli132)
