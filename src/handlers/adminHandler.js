const { Markup } = require('telegraf');
const { requireRole } = require('../middlewares/auth');
const { addChannel, removeChannel, getAllChannels } = require('../services/channelService');
const { getUserCount, getAllUserIds, setUserRole, getUserByTelegramId } = require('../services/userService');
const { getMovieCount, deleteMovieByCode } = require('../services/movieService');
const { setAdminState, getAdminState, clearAdminState } = require('../adminStates');

const CANCEL_KEYBOARD = Markup.inlineKeyboard([
  Markup.button.callback('❌ Bekor qilish', 'cancel_action')
]);

function registerAdminHandler(bot) {

  // Action cancel handler
  bot.action('cancel_action', async (ctx) => {
    clearAdminState(ctx.from.id);
    await ctx.deleteMessage().catch(() => {});
    await ctx.reply('❌ Amal bekor qilindi.');
  });

  // Handle generic inputs based on active admin states
  bot.use(async (ctx, next) => {
    if (!ctx.message) return next();
    
    // Check if user has an active state
    const userId = ctx.from.id;
    const state = getAdminState(userId);
    if (!state) return next(); // Not in state, pass to other handlers
    
    const kbText = ctx.message.text || '';
    const knownKeys = ['📢 Post', '📊 Statistika', '➕ Admin qo\'shish', '➖ Admin o\'chirish', '➕ Kanal qo\'shish', '➖ Kanal o\'chirish', '🗑 Kino o\'chirish'];
    if (knownKeys.includes(kbText)) return next(); // Ignore if it's a menu button

    clearAdminState(userId); // Consume state
    const text = kbText.trim();

    try {
      if (state.type === 'WAITING_BROADCAST') {
        const userIds = await getAllUserIds();
        await ctx.reply(`📡 Xabar ${userIds.length} foydalanuvchiga yuborilmoqda...`);
        let sent = 0, failed = 0;
        const BATCH_SIZE = 25, BATCH_DELAY = 1500;
        
        // Asynchronous broadcast so bot is not blocked
        (async () => {
          for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
            const batch = userIds.slice(i, i + BATCH_SIZE);
            const results = await Promise.allSettled(
              batch.map((uid) => bot.telegram.copyMessage(uid, ctx.chat.id, ctx.message.message_id))
            );
            for (const res of results) { if (res.status === 'fulfilled') sent++; else failed++; }
            if (i + BATCH_SIZE < userIds.length) await new Promise(r => setTimeout(r, BATCH_DELAY));
          }
          await ctx.reply(`📊 *Xabar yuborish yakunlandi*\n\n✅ Yuborildi: *${sent}*\n❌ Xatolik: *${failed}*`, { parse_mode: 'Markdown' });
        })();
        return;
      }

      if (state.type === 'WAITING_ADD_ADMIN') {
        const targetId = parseInt(text, 10);
        if (isNaN(targetId)) return ctx.reply('❌ Noto\'g\'ri ID. Raqam bo\'lishi kerak.');
        const user = await getUserByTelegramId(targetId);
        if (!user) return ctx.reply('❌ Foydalanuvchi topilmadi. U avval botni ishga tushirishi kerak (/start).');
        if (user.role === 'superadmin') return ctx.reply('⚠️ Super admin rolini o\'zgartirish mumkin emas.');
        
        await setUserRole(targetId, 'admin');
        return ctx.reply(`✅ *Admin qo'shildi!*\nID: \`${targetId}\``, { parse_mode: 'Markdown' });
      }

      if (state.type === 'WAITING_DEL_ADMIN') {
        const targetId = parseInt(text, 10);
        if (isNaN(targetId)) return ctx.reply('❌ Noto\'g\'ri ID. Raqam bo\'lishi kerak.');
        const user = await getUserByTelegramId(targetId);
        if (!user) return ctx.reply('❌ Foydalanuvchi topilmadi.');
        if (user.role === 'superadmin') return ctx.reply('⚠️ Super adminni o\'chirish mumkin emas.');
        
        await setUserRole(targetId, 'user');
        return ctx.reply(`✅ Admin o'chirildi.\nID: \`${targetId}\``, { parse_mode: 'Markdown' });
      }

      if (state.type === 'WAITING_ADD_CHANNEL') {
        // Expected format: <channel_id> <invite_link>
        const args = text.split(' ');
        if (args.length < 2) return ctx.reply('❌ Noto\'g\'ri format. Qaytadan /add_channel kabi bosing.');
        const channelId = parseInt(args[0], 10);
        const inviteLink = args[1];
        if (isNaN(channelId) || !inviteLink.startsWith('https://t.me/')) {
          return ctx.reply('❌ ID yoki havola noto\'g\'ri.');
        }

        let channelTitle = null;
        try {
          const chatInfo = await bot.telegram.getChat(channelId);
          channelTitle = chatInfo.title;
        } catch(e) {}

        const channel = await addChannel(channelId, inviteLink, channelTitle);
        return ctx.reply(`✅ *Kanal qo'shildi!*\n📢 ${channel.channel_title || 'Noma\'lum'}\n🆔 \`${channel.channel_id}\`\n🔗 ${channel.invite_link}`, { parse_mode: 'Markdown' });
      }

      if (state.type === 'WAITING_DEL_CHANNEL') {
        const channelId = parseInt(text, 10);
        if (isNaN(channelId)) return ctx.reply('❌ Noto\'g\'ri kanal ID.');
        const removed = await removeChannel(channelId);
        if (removed) return ctx.reply(`✅ Kanal \`${channelId}\` o'chirildi.`, { parse_mode: 'Markdown' });
        return ctx.reply('❌ Kanal topilmadi.');
      }

      if (state.type === 'WAITING_DEL_MOVIE') {
        const code = text;
        const removed = await deleteMovieByCode(code);
        if (removed) return ctx.reply(`✅ \`${code}\` kodli kino bazadan o'chirildi. Endi foydalanuvchilarga topilmadi deydi.`, { parse_mode: 'Markdown' });
        return ctx.reply('❌ Kino topilmadi.');
      }

    } catch (err) {
      console.error('State handling error:', err.message);
      return ctx.reply('❌ Xatolik yuz berdi.');
    }
  });

  // Buttons matching
  bot.hears('📊 Statistika', requireRole('admin'), async (ctx) => {
    try {
      const [userCount, movieCount, channels] = await Promise.all([
        getUserCount(), getMovieCount(), getAllChannels()
      ]);
      await ctx.reply(
        `📊 *Bot Statistikasi*\n\n` +
        `👥 Foydalanuvchilar: *${userCount.toLocaleString()}*\n` +
        `🎬 Kinolar: *${movieCount.toLocaleString()}*\n` +
        `📢 Majburiy kanallar: *${channels.length}*`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      await ctx.reply('❌ Xatolik yuz berdi.');
    }
  });

  bot.hears('📢 Post', requireRole('admin'), async (ctx) => {
    setAdminState(ctx.from.id, { type: 'WAITING_BROADCAST' });
    await ctx.reply('📝 Yubormoqchi bo\'lgan xabaringizni yozing yoki postni forward qiling:', CANCEL_KEYBOARD);
  });

  bot.hears('➕ Admin qo\'shish', requireRole('superadmin'), async (ctx) => {
    setAdminState(ctx.from.id, { type: 'WAITING_ADD_ADMIN' });
    await ctx.reply('📝 Yangi adminning Telegram ID sini yuboring:', CANCEL_KEYBOARD);
  });

  bot.hears('➖ Admin o\'chirish', requireRole('superadmin'), async (ctx) => {
    setAdminState(ctx.from.id, { type: 'WAITING_DEL_ADMIN' });
    await ctx.reply('📝 O\'chiriladigan adminning Telegram ID sini yuboring:', CANCEL_KEYBOARD);
  });

  bot.hears('➕ Kanal qo\'shish', requireRole('superadmin'), async (ctx) => {
    setAdminState(ctx.from.id, { type: 'WAITING_ADD_CHANNEL' });
    await ctx.reply('📝 Kanal ID va havolasini probel bilan yuboring:\nMasalan: `-100123 https://t.me/kanal`', CANCEL_KEYBOARD);
  });

  bot.hears('➖ Kanal o\'chirish', requireRole('superadmin'), async (ctx) => {
    setAdminState(ctx.from.id, { type: 'WAITING_DEL_CHANNEL' });
    const channels = await getAllChannels();
    let text = 'O\'chiriladigan kanal ID sini yuboring.\n\n*Kanallar:*\n';
    channels.forEach(ch => { text += `• ${ch.channel_title || 'Noma\'lum'} -> \`${ch.channel_id}\`\n`; });
    await ctx.reply(text, { parse_mode: 'Markdown', ...CANCEL_KEYBOARD });
  });

  bot.hears('🗑 Kino o\'chirish', requireRole('superadmin'), async (ctx) => {
    setAdminState(ctx.from.id, { type: 'WAITING_DEL_MOVIE' });
    await ctx.reply('🗑 O\'chiriladigan kinoning kodini yuboring (masalan, 330):', CANCEL_KEYBOARD);
  });

}

module.exports = { registerAdminHandler };
