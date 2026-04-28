# 🎬 Telegram Movie Bot

A production-ready Telegram bot that serves movies via numeric codes with mandatory channel subscription, admin panel, and broadcast system.

## Features

- 🎬 **Movie by Code** — Users send a code, bot returns the movie instantly
- 🔐 **Mandatory Subscription** — Users must join specified channels before accessing the bot
- 👑 **Role System** — Super Admin, Admin, and User roles with granular permissions
- 📡 **Broadcast** — Send messages to all users with batched delivery (respects Telegram rate limits)
- ⚡ **Rate Limiting** — Prevents spam with sliding window rate limiter
- 🤖 **Auto-Extraction** — Bot automatically reads movie uploads from a private channel and extracts code + file_id
- 📊 **Statistics** — Track total users, movies, and channels

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js (≥18 LTS) | Runtime |
| Telegraf 4.x | Telegram Bot Framework |
| PostgreSQL | Database |
| dotenv | Environment configuration |

---

## Project Structure

```
src/
├── bot.js                  # Entry point — wires everything together
├── config.js               # Environment validation & config
├── db/
│   ├── pool.js             # PostgreSQL connection pool
│   └── init.js             # Database schema initialization
├── handlers/
│   ├── startHandler.js     # /start command & subscription check callback
│   ├── movieHandler.js     # Movie code → video handler
│   ├── channelHandler.js   # Auto-extract movies from channel posts
│   └── adminHandler.js     # All admin commands
├── middlewares/
│   ├── rateLimit.js        # Sliding window rate limiter
│   ├── subscription.js     # Mandatory channel subscription gate
│   └── auth.js             # Role-based access control
└── services/
    ├── userService.js       # User CRUD & role management
    ├── movieService.js      # Movie CRUD
    └── channelService.js    # Channel management & subscription check
```

---

## Setup Guide

### 1. Prerequisites

- Node.js 18+ installed
- PostgreSQL database running
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

### 2. Clone & Install

```bash
git clone <your-repo-url>
cd mybot
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
BOT_TOKEN=your_bot_token_here
DATABASE_URL=postgresql://user:password@localhost:5432/moviebot
MOVIE_CHANNEL_ID=-1001234567890
SUPER_ADMIN_ID=123456789
RATE_LIMIT_MAX=5
RATE_LIMIT_WINDOW_MS=10000
```

#### How to get each value:

| Variable | How to get it |
|---|---|
| `BOT_TOKEN` | Create a bot with [@BotFather](https://t.me/BotFather) on Telegram |
| `DATABASE_URL` | Your PostgreSQL connection string |
| `MOVIE_CHANNEL_ID` | Create a private channel, add the bot as admin, forward a message to [@userinfobot](https://t.me/userinfobot) |
| `SUPER_ADMIN_ID` | Send `/start` to [@userinfobot](https://t.me/userinfobot) to get your numeric Telegram ID |

### 4. Initialize Database

```bash
npm run db:init
```

### 5. Start the Bot

```bash
# Production
npm start

# Development (auto-restart on changes)
npm run dev
```

---

## How It Works

### Movie Upload Flow

1. Add the bot as **admin** to your private movie channel
2. Upload a video to the channel with this caption format:

```
Code: 765
Title: Inception (2010)
```

3. The bot automatically extracts the code, title, and `file_id`
4. The movie is saved to the database

**Supported caption formats:**
- `Code: 765` (case-insensitive)
- `code= 765`
- `#765` (hashtag style)

### User Flow

1. User sends `/start`
2. Bot checks if user has joined all mandatory channels
3. If not → shows "Join Channel" buttons + "Check Subscription" button
4. Once subscribed → user sends a movie code (e.g., `765`)
5. Bot looks up the code → sends the movie video

---

## Admin Commands

### Super Admin

| Command | Description |
|---|---|
| `/admin` | Show admin help panel |
| `/add_channel <id> <link>` | Add mandatory subscription channel |
| `/remove_channel <id>` | Remove a channel |
| `/channels` | List all mandatory channels |
| `/stats` | Show bot statistics |
| `/add_admin <telegram_id>` | Promote user to admin |
| `/remove_admin <telegram_id>` | Demote admin to user |
| `/broadcast <message>` | Send message to all users |

### Admin

| Command | Description |
|---|---|
| `/admin` | Show admin help panel |
| `/broadcast <message>` | Send message to all users |

---

## Deployment

### Railway

1. Create a new project on [Railway](https://railway.app)
2. Add a PostgreSQL service
3. Connect your GitHub repo
4. Set environment variables in Railway dashboard
5. Railway auto-deploys on push

**Procfile (create in root):**
```
web: node src/bot.js
```

### Render

1. Create a new **Background Worker** on [Render](https://render.com)
2. Connect your repository
3. Set build command: `npm install`
4. Set start command: `node src/bot.js`
5. Add environment variables
6. Add a PostgreSQL database from Render dashboard

### VPS (Ubuntu)

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Clone and setup
git clone <your-repo> /opt/moviebot
cd /opt/moviebot
npm install
cp .env.example .env
# Edit .env with your values

# Initialize database
npm run db:init

# Start with PM2
pm2 start src/bot.js --name moviebot
pm2 save
pm2 startup
```

---

## Performance Notes

- **Connection Pool**: 20 max connections (handles 10k+ concurrent users)
- **Rate Limiting**: Sliding window, 5 requests per 10 seconds per user
- **Broadcast**: Batched at 25 messages per 1.5 seconds (respects Telegram's 30/sec limit)
- **Slow Query Logging**: Queries exceeding 1 second are logged as warnings
- **Graceful Shutdown**: Properly closes DB pool and clears rate limiter on SIGINT/SIGTERM

---

## License

MIT
