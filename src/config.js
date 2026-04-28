require('dotenv').config();

const config = {
  botToken: process.env.BOT_TOKEN,
  databaseUrl: process.env.DATABASE_URL,
  movieChannelId: process.env.MOVIE_CHANNEL_ID,
  superAdminId: parseInt(process.env.SUPER_ADMIN_ID, 10),

  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 5,
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 10000,
  },
};

// Validate required config
const required = ['botToken', 'databaseUrl', 'movieChannelId', 'superAdminId'];
for (const key of required) {
  if (!config[key]) {
    console.error(`❌ Missing required env variable for: ${key}`);
    process.exit(1);
  }
}

module.exports = config;
