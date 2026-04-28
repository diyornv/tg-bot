const { Markup } = require('telegraf');
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
   * /add_channel - Add a mandatory subscription channel
   * Usage: /add_channel <channel_id> <invite_link>
   * Example: /add_channel -1001234567890 https://t.me/+AbCdEfG
   */
  bot.command('add_channel', requireRole('superadmin'), async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length < 2) {
      return ctx.reply(
        '📝 *Usage:* `/add_channel <channel_id> <invite_link>`\n\n' +
        '*Example:*\n`/add_channel -1001234567890 https://t.me/+AbCdEfG`\n\n' +
        '💡 *How to get Channel ID:*\n' +
        '1. Add @userinfobot to the channel\n' +
        '2. Forward a message from the channel to @userinfobot\n' +
        '3. Copy the numeric ID (starts with -100)',
        { parse_mode: 'Markdown' }
      );
    }

    const channelId = parseInt(args[0], 10);
    const inviteLink = args[1];

    if (isNaN(channelId)) {
      return ctx.reply('❌ Invalid channel ID. Must be a number (e.g., -1001234567890).');
    }

    if (!inviteLink.startsWith('https://t.me/')) {
      return ctx.reply('❌ Invalid invite link. Must start with https://t.me/');
    }

    try {
      // Try to get channel info
      let channelTitle = null;
      try {
        const chatInfo = await bot.telegram.getChat(channelId);
        channelTitle = chatInfo.title;
      } catch {
        // Bot might not be admin in the channel yet
      }

      const channel = await addChannel(channelId, inviteLink, channelTitle);
      await ctx.reply(
        `✅ *Channel added successfully!*\n\n` +
        `📢 ${channel.channel_title || 'Unknown'}\n` +
        `🆔 \`${channel.channel_id}\`\n` +
        `🔗 ${channel.invite_link}`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error('Add channel error:', err.message);
      await ctx.reply('❌ Failed to add channel. Please try again.');
    }
  });

  /**
   * /remove_channel - Remove a mandatory subscription channel
   * Usage: /remove_channel <channel_id>
   */
  bot.command('remove_channel', requireRole('superadmin'), async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length < 1) {
      // Show list of current channels
      const channels = await getAllChannels();
      if (channels.length === 0) {
        return ctx.reply('📋 No mandatory channels configured.');
      }

      const list = channels
        .map((ch, i) => `${i + 1}. ${ch.channel_title || 'Unknown'} — \`${ch.channel_id}\``)
        .join('\n');

      return ctx.reply(
        `📋 *Current Channels:*\n\n${list}\n\n` +
        `*Usage:* \`/remove_channel <channel_id>\``,
        { parse_mode: 'Markdown' }
      );
    }

    const channelId = parseInt(args[0], 10);

    if (isNaN(channelId)) {
      return ctx.reply('❌ Invalid channel ID.');
    }

    const removed = await removeChannel(channelId);

    if (removed) {
      await ctx.reply(`✅ Channel \`${channelId}\` removed successfully.`, { parse_mode: 'Markdown' });
    } else {
      await ctx.reply('❌ Channel not found.');
    }
  });

  /**
   * /channels - List all mandatory channels
   */
  bot.command('channels', requireRole('superadmin'), async (ctx) => {
    const channels = await getAllChannels();

    if (channels.length === 0) {
      return ctx.reply('📋 No mandatory channels configured.\n\nUse /add_channel to add one.');
    }

    const list = channels
      .map((ch, i) =>
        `${i + 1}. ${ch.channel_title || 'Unknown'}\n   🆔 \`${ch.channel_id}\`\n   🔗 ${ch.invite_link}`
      )
      .join('\n\n');

    await ctx.reply(`📋 *Mandatory Channels (${channels.length}):*\n\n${list}`, {
      parse_mode: 'Markdown',
    });
  });

  /**
   * /stats - Show bot statistics
   */
  bot.command('stats', requireRole('superadmin'), async (ctx) => {
    try {
      const [userCount, movieCount, channels] = await Promise.all([
        getUserCount(),
        getMovieCount(),
        getAllChannels(),
      ]);

      await ctx.reply(
        `📊 *Bot Statistics*\n\n` +
        `👥 Total Users: *${userCount.toLocaleString()}*\n` +
        `🎬 Total Movies: *${movieCount.toLocaleString()}*\n` +
        `📢 Mandatory Channels: *${channels.length}*`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error('Stats error:', err.message);
      await ctx.reply('❌ Failed to fetch statistics.');
    }
  });

  /**
   * /add_admin - Promote a user to admin
   * Usage: /add_admin <telegram_id>
   */
  bot.command('add_admin', requireRole('superadmin'), async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length < 1) {
      return ctx.reply(
        '📝 *Usage:* `/add_admin <telegram_id>`\n\n' +
        '💡 Ask the user to send their ID using @userinfobot',
        { parse_mode: 'Markdown' }
      );
    }

    const targetId = parseInt(args[0], 10);

    if (isNaN(targetId)) {
      return ctx.reply('❌ Invalid Telegram ID.');
    }

    const user = await getUserByTelegramId(targetId);

    if (!user) {
      return ctx.reply('❌ User not found. They must start the bot first.');
    }

    if (user.role === 'superadmin') {
      return ctx.reply('⚠️ Cannot change superadmin role.');
    }

    if (user.role === 'admin') {
      return ctx.reply('ℹ️ User is already an admin.');
    }

    const updated = await setUserRole(targetId, 'admin');
    await ctx.reply(
      `✅ *Admin added!*\n\n` +
      `👤 ${updated.first_name || updated.username || targetId}\n` +
      `🆔 \`${updated.telegram_id}\`\n` +
      `🔑 Role: *admin*`,
      { parse_mode: 'Markdown' }
    );
  });

  /**
   * /remove_admin - Demote an admin to user
   * Usage: /remove_admin <telegram_id>
   */
  bot.command('remove_admin', requireRole('superadmin'), async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length < 1) {
      return ctx.reply('📝 *Usage:* `/remove_admin <telegram_id>`', { parse_mode: 'Markdown' });
    }

    const targetId = parseInt(args[0], 10);

    if (isNaN(targetId)) {
      return ctx.reply('❌ Invalid Telegram ID.');
    }

    const user = await getUserByTelegramId(targetId);

    if (!user) {
      return ctx.reply('❌ User not found.');
    }

    if (user.role === 'superadmin') {
      return ctx.reply('⚠️ Cannot demote a superadmin.');
    }

    if (user.role === 'user') {
      return ctx.reply('ℹ️ User is not an admin.');
    }

    const updated = await setUserRole(targetId, 'user');
    await ctx.reply(
      `✅ Admin removed.\n\n` +
      `👤 ${updated.first_name || updated.username || targetId}\n` +
      `🆔 \`${updated.telegram_id}\`\n` +
      `🔑 Role: *user*`,
      { parse_mode: 'Markdown' }
    );
  });

  // ============================================================
  // ADMIN + SUPER ADMIN COMMANDS
  // ============================================================

  /**
   * /broadcast - Send a message to all users
   * Usage: /broadcast <message>
   */
  bot.command('broadcast', requireRole('admin'), async (ctx) => {
    const message = ctx.message.text.replace(/^\/broadcast\s*/, '').trim();

    if (!message) {
      return ctx.reply(
        '📝 *Usage:* `/broadcast Your message here`\n\n' +
        '⚠️ This will send the message to ALL bot users.',
        { parse_mode: 'Markdown' }
      );
    }

    await ctx.reply('📡 Broadcasting message... This may take a while.');

    try {
      const userIds = await getAllUserIds();
      let sent = 0;
      let failed = 0;

      // Process in batches to respect Telegram rate limits (30 msgs/sec)
      const BATCH_SIZE = 25;
      const BATCH_DELAY = 1500; // 1.5 seconds between batches

      for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        const batch = userIds.slice(i, i + BATCH_SIZE);

        const results = await Promise.allSettled(
          batch.map((userId) =>
            bot.telegram.sendMessage(userId, `📢 *Broadcast*\n\n${message}`, {
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

        // Rate limit delay between batches
        if (i + BATCH_SIZE < userIds.length) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
        }
      }

      await ctx.reply(
        `📊 *Broadcast Complete*\n\n` +
        `✅ Sent: *${sent}*\n` +
        `❌ Failed: *${failed}*\n` +
        `📨 Total: *${userIds.length}*`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error('Broadcast error:', err.message);
      await ctx.reply('❌ Broadcast failed. Check logs for details.');
    }
  });

  /**
   * /admin - Show admin help
   */
  bot.command('admin', requireRole('admin'), async (ctx) => {
    const user = ctx.state.user;
    const isSuperAdmin = user.role === 'superadmin';

    let helpText = '🤖 *Admin Panel*\n\n';

    if (isSuperAdmin) {
      helpText +=
        '*Super Admin Commands:*\n' +
        '├ /add\\_channel — Add mandatory channel\n' +
        '├ /remove\\_channel — Remove channel\n' +
        '├ /channels — List all channels\n' +
        '├ /stats — Bot statistics\n' +
        '├ /add\\_admin — Promote user to admin\n' +
        '├ /remove\\_admin — Demote admin\n' +
        '└ /broadcast — Send message to all\n';
    } else {
      helpText +=
        '*Admin Commands:*\n' +
        '└ /broadcast — Send message to all users\n';
    }

    await ctx.reply(helpText, { parse_mode: 'Markdown' });
  });
}

module.exports = { registerAdminHandler };
