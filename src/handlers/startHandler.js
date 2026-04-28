const { checkUserSubscription } = require('../services/channelService');
const { getUserByTelegramId } = require('../services/userService');
const { superAdminKeyboard, adminKeyboard, userKeyboard } = require('../keyboards');

async function sendWelcome(ctx, bot) {
  const firstName = ctx.from.first_name || 'do\'stim';
  const user = await getUserByTelegramId(ctx.from.id);
  
  let keyboard = userKeyboard;
  if (user) {
    if (user.role === 'superadmin') keyboard = superAdminKeyboard;
    else if (user.role === 'admin') keyboard = adminKeyboard;
  }

  await ctx.reply(
    `🎬 *Assalomu alaykum, ${firstName}!*\n\n` +
    `Menga kino kodini yuboring (masalan, \`330\`) va men sizga kinoni yuboraman.\n\n` +
    `📌 *Qanday ishlaydi:*\n` +
    `1️⃣ Kanaldan kino kodini toping\n` +
    `2️⃣ Shu kodni menga yuboring\n` +
    `3️⃣ Kinoni bir zumda oling!`,
    { 
      parse_mode: 'Markdown',
      reply_markup: keyboard.reply_markup
    }
  );
}

function registerStartHandler(bot) {
  bot.start(async (ctx) => {
    await sendWelcome(ctx, bot);
  });

  bot.action('check_subscription', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const { subscribed } = await checkUserSubscription(bot, ctx.from.id);

      if (subscribed) {
        await ctx.deleteMessage().catch(() => {});
        await sendWelcome(ctx, bot);
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
