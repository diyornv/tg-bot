const config = require('../config');
const { upsertMovie } = require('../services/movieService');

/**
 * Register the channel post handler.
 * Automatically extracts movie code and file_id from videos posted in the movie channel.
 *
 * Supported caption formats:
 *   Code: 765
 *   code= 765
 *   #765
 *   765          (plain number)
 *   Title: Movie Name (optional)
 */
function registerChannelHandler(bot) {
  bot.on('channel_post', async (ctx) => {
    try {
      const post = ctx.channelPost;

      // Only process posts from the movie channel
      if (String(post.chat.id) !== String(config.movieChannelId)) return;

      // Get file_id from video, document, or animation
      let fileId = null;
      if (post.video) {
        fileId = post.video.file_id;
      } else if (post.document) {
        fileId = post.document.file_id;
      } else if (post.animation) {
        fileId = post.animation.file_id;
      }

      if (!fileId) return; // Not a media post, ignore

      const caption = (post.caption || '').trim();

      if (!caption) {
        console.warn('⚠️ Kanalda caption bo\'sh post bor, o\'tkazib yuborildi');
        return;
      }

      let code = null;
      let title = null;

      // Pattern 1: "Code: 765" or "code: 765" or "code=765" (case-insensitive)
      const codeMatch = caption.match(/code\s*[:=]\s*([a-zA-Z0-9\-_]+)/i);
      if (codeMatch) {
        code = codeMatch[1];
      }

      // Pattern 2: "#765" (hashtag style)
      if (!code) {
        const hashMatch = caption.match(/#([a-zA-Z0-9\-_]+)/);
        if (hashMatch) {
          code = hashMatch[1];
        }
      }

      // Pattern 3: Plain number/text on first line (e.g., "330" or "330\nTitle: ...")
      if (!code) {
        const firstLine = caption.split('\n')[0].trim();
        if (/^[a-zA-Z0-9\-_]+$/.test(firstLine) && firstLine.length <= 50) {
          code = firstLine;
        }
      }

      if (!code) {
        console.warn('⚠️ Kanalda kodsi yo\'q post:', caption.substring(0, 100));
        return;
      }

      // Extract title (optional) - "Title: Movie Name" or second line
      const titleMatch = caption.match(/title\s*[:=]\s*(.+)/i);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }

      // Save to DB
      const movie = await upsertMovie(code, fileId, title);
      console.log(`🎬 Kino saqlandi: code=${movie.code}, title=${movie.title || 'Nomsiz'}`);
    } catch (err) {
      console.error('❌ Kanal post qayta ishlash xatosi:', err.message);
    }
  });
}

module.exports = { registerChannelHandler };
