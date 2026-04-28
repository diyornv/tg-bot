const { checkUserSubscription } = require('../services/channelService');

/**
 * Register the /start command and subscription check callback.
 */
function registerStartHandler(bot) {
  bot.start(async (ctx) => {
    const firstName = ctx.from.first_name || 'do\'stim';
    await ctx.reply(
      `🎬 *Assalomu alaykum, ${firstName}!*\n\n` +
      `Menga kino kodini yuboring (masalan, \`330\`) va men sizga kinoni yuboraman.\n\n` +
      `📌 *Qanday ishlaydi:*\n` +
      `1️⃣ Kanaldan kino kodini toping\n` +
      `2️⃣ Shu kodni menga yuboring\n` +
      `3️⃣ Kinoni bir zumda oling!`,
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
          '✅ *Obuna tasdiqlandi!*\n\nEndi botdan to\'liq foydalanishingiz mumkin. /start bosing.',
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.answerCbQuery('❌ Siz hali barcha kanallarga obuna bo\'lmagansiz.', {
          show_alert: true,
        });
      }
    } catch (err) {
      console.error('Obuna tekshirish xatosi:', err.message);
      await ctx.answerCbQuery('Xatolik yuz berdi. Qaytadan urinib ko\'ring.', {
        show_alert: true,
      });
    }
  });
}

module.exports = { registerStartHandler };
