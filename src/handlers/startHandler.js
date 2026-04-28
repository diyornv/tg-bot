const { checkUserSubscription } = require('../services/channelService');

/**
 * Register the /start command and subscription check callback.
 */
function registerStartHandler(bot) {
  bot.start(async (ctx) => {
    const firstName = ctx.from.first_name || 'there';
    await ctx.reply(
      `🎬 *Welcome, ${firstName}!*\n\n` +
      `Send me a movie code (e.g., \`765\`) and I'll send you the movie.\n\n` +
      `📌 *How it works:*\n` +
      `1️⃣ Find a movie code from our channel\n` +
      `2️⃣ Send the code here\n` +
      `3️⃣ Get the movie instantly!`,
      { parse_mode: 'Markdown' }
    );
  });

  // Handle "Check Subscription" callback
  bot.action('check_subscription', async (ctx) => {
    try {
      await ctx.answerCbQuery();

      const { subscribed } = await checkUserSubscription(bot, ctx.from.id);

      if (subscribed) {
        await ctx.editMessageText(
          '✅ *Subscription verified!*\n\nYou now have full access. Send /start to begin.',
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.answerCbQuery('❌ You haven\'t joined all required channels yet.', {
          show_alert: true,
        });
      }
    } catch (err) {
      console.error('Subscription check error:', err.message);
      await ctx.answerCbQuery('An error occurred. Please try again.', {
        show_alert: true,
      });
    }
  });
}

module.exports = { registerStartHandler };
