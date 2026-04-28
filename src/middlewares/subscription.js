const { checkUserSubscription } = require('../services/channelService');
const { upsertUser } = require('../services/userService');

/**
 * Middleware that ensures the user exists in DB and is subscribed to all mandatory channels.
 * Runs on every user interaction.
 */
function subscriptionMiddleware(bot) {
  return async (ctx, next) => {
    // Skip for channel posts (movie uploads)
    if (!ctx.from) return next();

    const userId = ctx.from.id;
    const username = ctx.from.username;
    const firstName = ctx.from.first_name;

    // Upsert user in DB on every interaction
    await upsertUser(userId, username, firstName);

    // Check subscription
    const { subscribed, missingChannels } = await checkUserSubscription(bot, userId);

    if (!subscribed) {
      const buttons = missingChannels.map((ch, i) => [
        {
          text: `📢 Join ${ch.channel_title || `Channel ${i + 1}`}`,
          url: ch.invite_link,
        },
      ]);

      // Add "Check Subscription" button
      buttons.push([
        {
          text: '✅ Check Subscription',
          callback_data: 'check_subscription',
        },
      ]);

      await ctx.reply(
        '🔒 *Access Restricted*\n\nYou must join the following channels to use this bot:',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: buttons,
          },
        }
      );
      return; // Block further processing
    }

    return next();
  };
}

module.exports = { subscriptionMiddleware };
