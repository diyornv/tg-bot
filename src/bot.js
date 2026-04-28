const { Telegraf } = require('telegraf');
const config = require('./config');
const { initDatabase } = require('./db/init');
const { rateLimitMiddleware, limiter } = require('./middlewares/rateLimit');
const { subscriptionMiddleware } = require('./middlewares/subscription');
const { registerStartHandler } = require('./handlers/startHandler');
const { registerChannelHandler } = require('./handlers/channelHandler');
const { registerAdminHandler } = require('./handlers/adminHandler');
const { registerMovieHandler } = require('./handlers/movieHandler');
const { pool } = require('./db/pool');

async function main() {
  // Initialize database tables
  await initDatabase();

  // Create bot instance
  const bot = new Telegraf(config.botToken);

  // ============================================================
  // GLOBAL MIDDLEWARES
  // ============================================================

  // Rate limiting (applied to all updates)
  bot.use(rateLimitMiddleware());

  // ============================================================
  // CHANNEL POST HANDLER (no subscription check needed)
  // Must be registered BEFORE subscription middleware
  // ============================================================
  registerChannelHandler(bot);

  // ============================================================
  // SUBSCRIPTION MIDDLEWARE
  // Applied to all user interactions (after channel handler)
  // ============================================================
  bot.use(subscriptionMiddleware(bot));

  // ============================================================
  // COMMAND & MESSAGE HANDLERS
  // ============================================================
  registerStartHandler(bot);
  registerAdminHandler(bot);

  // Movie handler must be last (catches all text messages)
  registerMovieHandler(bot);

  // ============================================================
  // ERROR HANDLING
  // ============================================================
  bot.catch((err, ctx) => {
    const updateType = ctx.updateType;
    const userId = ctx.from?.id;
    console.error(`❌ Bot error [${updateType}] user=${userId}:`, err.message);

    // Attempt to notify user
    if (ctx.chat) {
      ctx.reply('⚠️ Something went wrong. Please try again later.').catch(() => {});
    }
  });

  // ============================================================
  // GRACEFUL SHUTDOWN
  // ============================================================
  const shutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    bot.stop(signal);
    limiter.destroy();
    await pool.end();
    console.log('👋 Goodbye!');
    process.exit(0);
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

  // ============================================================
  // LAUNCH
  // ============================================================
  await bot.launch();
  console.log('');
  console.log('🚀 ====================================');
  console.log('   Telegram Movie Bot is running!');
  console.log('   Super Admin ID:', config.superAdminId);
  console.log('   Movie Channel:', config.movieChannelId);
  console.log('🚀 ====================================');
  console.log('');
}

main().catch((err) => {
  console.error('💀 Fatal error:', err);
  process.exit(1);
});
