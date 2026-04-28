#!/bin/bash
# =============================================
# Telegram Movie Bot - Server Deploy Script
# Run on server: bash deploy.sh
# =============================================

set -e

echo "🚀 Starting deployment..."

# 1. Create PostgreSQL database and user
echo "📦 Setting up PostgreSQL..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='moviebot'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER moviebot WITH PASSWORD 'M0v1eB0t_Secur3';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='moviebot'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE moviebot OWNER moviebot;"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE moviebot TO moviebot;" 2>/dev/null || true
echo "✅ PostgreSQL ready"

# 2. Clone or pull repo
echo "📥 Getting code..."
if [ -d "/opt/moviebot" ]; then
  cd /opt/moviebot
  git pull origin main
else
  git clone https://github.com/diyornv/tg-bot.git /opt/moviebot
  cd /opt/moviebot
fi

# 3. Install dependencies
echo "📦 Installing npm packages..."
npm install --production

# 4. Create .env file
echo "⚙️ Creating .env..."
cat > /opt/moviebot/.env << 'ENVFILE'
BOT_TOKEN=your_bot_token_here
DATABASE_URL=postgresql://moviebot:M0v1eB0t_Secur3@localhost:5432/moviebot
MOVIE_CHANNEL_ID=-1001234567890
SUPER_ADMIN_ID=123456789
RATE_LIMIT_MAX=5
RATE_LIMIT_WINDOW_MS=10000
ENVFILE

echo "⚠️  IMPORTANT: Edit /opt/moviebot/.env with your actual BOT_TOKEN, MOVIE_CHANNEL_ID, and SUPER_ADMIN_ID"

# 5. Initialize database tables
echo "🔧 Initializing database..."
node src/db/init.js

# 6. Setup PM2
echo "🔄 Setting up PM2..."
pm2 delete moviebot 2>/dev/null || true
pm2 start src/bot.js --name moviebot
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo ""
echo "✅ ======================================"
echo "   Deployment complete!"
echo "   Bot is running with PM2"
echo "   Logs: pm2 logs moviebot"
echo "   Status: pm2 status"
echo "✅ ======================================"
