const { getMovieByCode } = require('../services/movieService');

/**
 * Register the movie code handler.
 * Listens for text messages that look like movie codes.
 */
function registerMovieHandler(bot) {
  bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();

    // Skip if it's a command
    if (text.startsWith('/')) return;

    // Validate: must be alphanumeric code (letters, numbers, hyphens)
    if (!/^[a-zA-Z0-9\-_]+$/.test(text)) {
      return ctx.reply('❌ Noto\'g\'ri kod formati. Iltimos, to\'g\'ri kino kodini yuboring.');
    }

    // Limit code length
    if (text.length > 50) {
      return ctx.reply('❌ Kod juda uzun. Iltimos, tekshirib qaytadan yuboring.');
    }

    try {
      const movie = await getMovieByCode(text);

      if (!movie) {
        return ctx.reply(
          '🔍 *Kino topilmadi*\n\n`' + text + '` kodiga mos kino topilmadi. Iltimos, kodni tekshirib qaytadan yuboring.',
          { parse_mode: 'Markdown' }
        );
      }

      // Send movie with title caption
      const caption = movie.title
        ? `🎬 *${movie.title}*\n\n📌 Kod: \`${movie.code}\``
        : `📌 Kod: \`${movie.code}\``;

      await ctx.replyWithVideo(movie.file_id, {
        caption,
        parse_mode: 'Markdown',
      });
    } catch (err) {
      console.error('Kino olish xatosi:', err.message);

      if (err.message.includes('wrong file_id')) {
        return ctx.reply('⚠️ Bu kino fayli endi mavjud emas. Iltimos, adminga murojaat qiling.');
      }

      return ctx.reply('⚠️ Kinoni olishda xatolik yuz berdi. Keyinroq qaytadan urinib ko\'ring.');
    }
  });
}

module.exports = { registerMovieHandler };
