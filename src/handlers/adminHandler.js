const { requireRole } = require('../middlewares/auth');
const { addChannel, removeChannel, getAllChannels } = require('../services/channelService');
const { getUserCount, getAllUserIds, setUserRole, getUserByTelegramId } = require('../services/userService');
const { getMovieCount } = require('../services/movieService');

/**
 * Register all admin commands.
 */
function registerAdminHandler(bot) {
  // ============================================================
  // SUPER ADMIN COMMANDS
  // ============================================================

  /**
   * /add_channel - Majburiy obuna kanalini qo'shish
   * Usage: /add_channel <channel_id> <invite_link>
   */
  bot.command('add_channel', requireRole('superadmin'), async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length < 2) {
      return ctx.reply(
        '📝 *Foydalanish:* `/add_channel <kanal_id> <havola>`\n\n' +
        '*Misol:*\n`/add_channel -1001234567890 https://t.me/+AbCdEfG`\n\n' +
        '💡 *Kanal ID ni qanday olish:*\n' +
        '1. @userinfobot ni kanalga qo\'shing\n' +
        '2. Kanaldan xabarni @userinfobot ga forward qiling\n' +
        '3. Raqamli ID ni ko\'chiring (-100 bilan boshlanadi)',
        { parse_mode: 'Markdown' }
      );
    }

    const channelId = parseInt(args[0], 10);
    const inviteLink = args[1];

    if (isNaN(channelId)) {
      return ctx.reply('❌ Noto\'g\'ri kanal ID. Raqam bo\'lishi kerak (masalan, -1001234567890).');
    }

    if (!inviteLink.startsWith('https://t.me/')) {
      return ctx.reply('❌ Noto\'g\'ri havola. https://t.me/ bilan boshlanishi kerak.');
    }

    try {
      let channelTitle = null;
      try {
        const chatInfo = await bot.telegram.getChat(channelId);
        channelTitle = chatInfo.title;
      } catch {
        // Bot kanalda admin bo'lmasligi mumkin
      }

      const channel = await addChannel(channelId, inviteLink, channelTitle);
      await ctx.reply(
        `✅ *Kanal muvaffaqiyatli qo'shildi!*\n\n` +
        `📢 ${channel.channel_title || 'Noma\'lum'}\n` +
        `🆔 \`${channel.channel_id}\`\n` +
        `🔗 ${channel.invite_link}`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error('Kanal qo\'shish xatosi:', err.message);
      await ctx.reply('❌ Kanalni qo\'shib bo\'lmadi. Qaytadan urinib ko\'ring.');
    }
  });

  /**
   * /remove_channel - Majburiy obuna kanalini o'chirish
   */
  bot.command('remove_channel', requireRole('superadmin'), async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length < 1) {
      const channels = await getAllChannels();
      if (channels.length === 0) {
        return ctx.reply('📋 Majburiy kanallar yo\'q.');
      }

      const list = channels
        .map((ch, i) => `${i + 1}. ${ch.channel_title || 'Noma\'lum'} — \`${ch.channel_id}\``)
        .join('\n');

      return ctx.reply(
        `📋 *Hozirgi kanallar:*\n\n${list}\n\n` +
        `*Foydalanish:* \`/remove_channel <kanal_id>\``,
        { parse_mode: 'Markdown' }
      );
    }

    const channelId = parseInt(args[0], 10);

    if (isNaN(channelId)) {
      return ctx.reply('❌ Noto\'g\'ri kanal ID.');
    }

    const removed = await removeChannel(channelId);

    if (removed) {
      await ctx.reply(`✅ Kanal \`${channelId}\` muvaffaqiyatli o'chirildi.`, { parse_mode: 'Markdown' });
    } else {
      await ctx.reply('❌ Kanal topilmadi.');
    }
  });

  /**
   * /channels - Barcha majburiy kanallar ro'yxati
   */
  bot.command('channels', requireRole('superadmin'), async (ctx) => {
    const channels = await getAllChannels();

    if (channels.length === 0) {
      return ctx.reply('📋 Majburiy kanallar yo\'q.\n\nQo\'shish uchun /add_channel buyrug\'ini ishlating.');
    }

    const list = channels
      .map((ch, i) =>
        `${i + 1}. ${ch.channel_title || 'Noma\'lum'}\n   🆔 \`${ch.channel_id}\`\n   🔗 ${ch.invite_link}`
      )
      .join('\n\n');

    await ctx.reply(`📋 *Majburiy kanallar (${channels.length}):*\n\n${list}`, {
      parse_mode: 'Markdown',
    });
  });

  /**
   * /stats - Bot statistikasi (admin va superadmin uchun)
   */
  bot.command('stats', requireRole('admin'), async (ctx) => {
    try {
      const [userCount, movieCount, channels] = await Promise.all([
        getUserCount(),
        getMovieCount(),
        getAllChannels(),
      ]);

      await ctx.reply(
        `📊 *Bot Statistikasi*\n\n` +
        `👥 Jami foydalanuvchilar: *${userCount.toLocaleString()}*\n` +
        `🎬 Jami kinolar: *${movieCount.toLocaleString()}*\n` +
        `📢 Majburiy kanallar: *${channels.length}*`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error('Statistika xatosi:', err.message);
      await ctx.reply('❌ Statistikani olishda xatolik yuz berdi.');
    }
  });

  /**
   * /add_admin - Foydalanuvchini admin qilish
   */
  bot.command('add_admin', requireRole('superadmin'), async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length < 1) {
      return ctx.reply(
        '📝 *Foydalanish:* `/add_admin <telegram_id>`\n\n' +
        '💡 Foydalanuvchi ID sini @userinfobot orqali bilib olish mumkin',
        { parse_mode: 'Markdown' }
      );
    }

    const targetId = parseInt(args[0], 10);

    if (isNaN(targetId)) {
      return ctx.reply('❌ Noto\'g\'ri Telegram ID.');
    }

    const user = await getUserByTelegramId(targetId);

    if (!user) {
      return ctx.reply('❌ Foydalanuvchi topilmadi. U avval botni ishga tushirishi kerak (/start).');
    }

    if (user.role === 'superadmin') {
      return ctx.reply('⚠️ Super admin rolini o\'zgartirish mumkin emas.');
    }

    if (user.role === 'admin') {
      return ctx.reply('ℹ️ Bu foydalanuvchi allaqachon admin.');
    }

    const updated = await setUserRole(targetId, 'admin');
    await ctx.reply(
      `✅ *Admin qo'shildi!*\n\n` +
      `👤 ${updated.first_name || updated.username || targetId}\n` +
      `🆔 \`${updated.telegram_id}\`\n` +
      `🔑 Roli: *admin*`,
      { parse_mode: 'Markdown' }
    );
  });

  /**
   * /remove_admin - Adminni oddiy foydalanuvchiga aylantirish
   */
  bot.command('remove_admin', requireRole('superadmin'), async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length < 1) {
      return ctx.reply('📝 *Foydalanish:* `/remove_admin <telegram_id>`', { parse_mode: 'Markdown' });
    }

    const targetId = parseInt(args[0], 10);

    if (isNaN(targetId)) {
      return ctx.reply('❌ Noto\'g\'ri Telegram ID.');
    }

    const user = await getUserByTelegramId(targetId);

    if (!user) {
      return ctx.reply('❌ Foydalanuvchi topilmadi.');
    }

    if (user.role === 'superadmin') {
      return ctx.reply('⚠️ Super adminni tushirish mumkin emas.');
    }

    if (user.role === 'user') {
      return ctx.reply('ℹ️ Bu foydalanuvchi admin emas.');
    }

    const updated = await setUserRole(targetId, 'user');
    await ctx.reply(
      `✅ Admin o'chirildi.\n\n` +
      `👤 ${updated.first_name || updated.username || targetId}\n` +
      `🆔 \`${updated.telegram_id}\`\n` +
      `🔑 Roli: *foydalanuvchi*`,
      { parse_mode: 'Markdown' }
    );
  });

  // ============================================================
  // ADMIN + SUPER ADMIN COMMANDS
  // ============================================================

  /**
   * /broadcast - Barcha foydalanuvchilarga xabar yuborish
   */
  bot.command('broadcast', requireRole('admin'), async (ctx) => {
    const message = ctx.message.text.replace(/^\/broadcast\s*/, '').trim();

    if (!message) {
      return ctx.reply(
        '📝 *Foydalanish:* `/broadcast Sizning xabaringiz`\n\n' +
        '⚠️ Bu xabar BARCHA bot foydalanuvchilariga yuboriladi.',
        { parse_mode: 'Markdown' }
      );
    }

    await ctx.reply('📡 Xabar yuborilmoqda... Bu biroz vaqt olishi mumkin.');

    try {
      const userIds = await getAllUserIds();
      let sent = 0;
      let failed = 0;

      const BATCH_SIZE = 25;
      const BATCH_DELAY = 1500;

      for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        const batch = userIds.slice(i, i + BATCH_SIZE);

        const results = await Promise.allSettled(
          batch.map((userId) =>
            bot.telegram.sendMessage(userId, `📢 *E'lon*\n\n${message}`, {
              parse_mode: 'Markdown',
            })
          )
        );

        for (const result of results) {
          if (result.status === 'fulfilled') {
            sent++;
          } else {
            failed++;
          }
        }

        if (i + BATCH_SIZE < userIds.length) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
        }
      }

      await ctx.reply(
        `📊 *Xabar yuborish yakunlandi*\n\n` +
        `✅ Yuborildi: *${sent}*\n` +
        `❌ Xatolik: *${failed}*\n` +
        `📨 Jami: *${userIds.length}*`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error('Broadcast xatosi:', err.message);
      await ctx.reply('❌ Xabar yuborishda xatolik. Loglarni tekshiring.');
    }
  });

  /**
   * /admin - Admin panel ko'rsatish
   */
  bot.command('admin', requireRole('admin'), async (ctx) => {
    const user = ctx.state.user;
    const isSuperAdmin = user.role === 'superadmin';

    let helpText = '🤖 *Admin Panel*\n\n';

    if (isSuperAdmin) {
      helpText +=
        '*Super Admin buyruqlari:*\n' +
        '├ /add\\_channel — Majburiy kanal qo\'shish\n' +
        '├ /remove\\_channel — Kanalni o\'chirish\n' +
        '├ /channels — Barcha kanallar ro\'yxati\n' +
        '├ /stats — Bot statistikasi\n' +
        '├ /add\\_admin — Admin qo\'shish\n' +
        '├ /remove\\_admin — Adminni o\'chirish\n' +
        '└ /broadcast — Hammaga xabar yuborish\n';
    } else {
      helpText +=
        '*Admin buyruqlari:*\n' +
        '├ /stats — Bot statistikasi\n' +
        '└ /broadcast — Hammaga xabar yuborish\n';
    }

    await ctx.reply(helpText, { parse_mode: 'Markdown' });
  });
}

module.exports = { registerAdminHandler };
