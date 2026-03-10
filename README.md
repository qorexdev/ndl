# Nerfed DemonList (NDL)

**NDL** is an open-source community platform for ranking nerfed Geometry Dash demon levels. It features a curated list, player leaderboards, record submissions with moderation, and full account management — served as a lightweight vanilla Node.js application with no frameworks.

🌐 **Live site:** [ndlist.space](https://ndlist.space)

---

## Screenshots

| Home | Level List |
|------|-----------|
| ![Home](screenshots/01-home.png) | ![List](screenshots/02-list.png) |

| Level Page | Submit Record |
|-----------|--------------|
| ![Level](screenshots/03-level-page.png) | ![Submit](screenshots/07-submit.png) |

---

## Features

- **Ranked demon list** — levels sorted by difficulty with point values, creator info and video proof
- **Player leaderboard** — global rankings based on completed records across all listed levels
- **Record submissions** — users submit video proof, moderators review and accept/reject
- **Accounts** — registration, login, avatar upload, 2FA (TOTP), profile pages
- **Moderation panel** — full submission queue, level CRUD, user management for staff
- **Bilingual UI** — English and Russian, toggled per-user and saved in `localStorage`
- **Dark / Light theme** — system-aware toggle, no flash on navigation
- **API** — public REST endpoints for levels, records and leaderboard data

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (no framework — raw `http` module) |
| Database | PostgreSQL (via `pg`) |
| Frontend | Vanilla JS ES modules, no bundler |
| Auth | Session tokens + TOTP 2FA |
| Styles | Plain CSS with custom properties (dark/light themes) |
| Deploy | systemd service + nginx reverse proxy + Let's Encrypt SSL |

---

## Project Structure

```
ndl/
├── server.js              # HTTP server entry point & router
├── server/
│   ├── auth.js            # Sessions, password hashing, TOTP
│   ├── db.js              # PostgreSQL connection pool
│   ├── model.js           # Business logic (levels, records, users)
│   ├── schema.sql         # Database schema
│   ├── store.js           # Legacy JSON store helpers
│   ├── countries.js       # Country code list
│   └── utils.js           # Shared helpers
├── public/
│   ├── scripts/
│   │   ├── app.js         # Main frontend logic & routing
│   │   └── layout.js      # Shell, i18n strings, theme system
│   ├── styles/
│   │   └── main.css       # All styles (dark + light theme)
│   ├── assets/
│   │   └── favicon.svg
│   └── *.html             # One HTML file per page (SPA-like)
└── screenshots/           # UI screenshots for docs
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Installation

```bash
git clone https://github.com/qorexdev/ndl.git
cd ndl
npm install
```

### Database Setup

```bash
# Create database and user
psql -U postgres -c "CREATE USER ndl WITH PASSWORD 'your_password'"
psql -U postgres -c "CREATE DATABASE ndl OWNER ndl"

# Apply schema
DB_PASSWORD=your_password node server/migrate.js
```

### Running

```bash
DB_PASSWORD=your_password npm start
```

The server listens on `http://localhost:3000` by default. You can override the port with the `PORT` environment variable.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `3000` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | PostgreSQL user | `ndl` |
| `DB_NAME` | Database name | `ndl` |
| `DB_PASSWORD` | PostgreSQL password | *(required)* |

---

## API

Public REST API is documented at [ndlist.space/api](https://ndlist.space/api).

Key endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/levels` | Full level list with records |
| `GET` | `/api/leaderboard` | Global player rankings |
| `GET` | `/api/levels/:id` | Single level details |
| `GET` | `/api/records` | All accepted records |

---

## Contributing

Pull requests are welcome. For significant changes, open an issue first to discuss the approach.

---

## License

MIT
