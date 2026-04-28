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
      return ctx.reply('❌ Invalid code format. Please send a valid movie code.');
    }

    // Limit code length
    if (text.length > 50) {
      return ctx.reply('❌ Code is too long. Please check and try again.');
    }

    try {
      const movie = await getMovieByCode(text);

      if (!movie) {
        return ctx.reply(
          '🔍 *Movie not found*\n\nNo movie matches the code `' + text + '`. Please check the code and try again.',
          { parse_mode: 'Markdown' }
        );
      }

      // Send movie with title caption
      const caption = movie.title ? `🎬 *${movie.title}*\n\n📌 Code: \`${movie.code}\`` : `📌 Code: \`${movie.code}\``;

      await ctx.replyWithVideo(movie.file_id, {
        caption,
        parse_mode: 'Markdown',
      });
    } catch (err) {
      console.error('Movie fetch error:', err.message);

      // Handle specific Telegram errors
      if (err.message.includes('wrong file_id')) {
        return ctx.reply('⚠️ This movie file is no longer available. Please contact an admin.');
      }

      return ctx.reply('⚠️ An error occurred while fetching the movie. Please try again later.');
    }
  });
}

module.exports = { registerMovieHandler };
