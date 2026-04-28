const config = require('../config');
const { upsertMovie } = require('../services/movieService');

/**
 * Register the channel post handler.
 * Automatically extracts movie code and file_id from videos posted in the movie channel.
 *
 * Expected caption format:
 *   Code: 765
 *   Title: Movie Name (optional)
 *
 * Also supports:
 *   code: 765
 *   CODE: 765
 *   #765
 */
function registerChannelHandler(bot) {
  bot.on('channel_post', async (ctx) => {
    try {
      const post = ctx.channelPost;

      // Only process posts from the movie channel
      if (String(post.chat.id) !== String(config.movieChannelId)) return;

      // Get file_id from video or document
      let fileId = null;
      if (post.video) {
        fileId = post.video.file_id;
      } else if (post.document) {
        fileId = post.document.file_id;
      } else if (post.animation) {
        fileId = post.animation.file_id;
      }

      if (!fileId) return; // Not a media post, ignore

      const caption = post.caption || '';

      // Extract code from caption
      let code = null;
      let title = null;

      // Pattern 1: "Code: 765" or "code: 765" (case-insensitive)
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

      if (!code) {
        console.warn('⚠️ Channel post has no code in caption:', caption.substring(0, 100));
        return;
      }

      // Extract title (optional)
      const titleMatch = caption.match(/title\s*[:=]\s*(.+)/i);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }

      // Save to DB
      const movie = await upsertMovie(code, fileId, title);
      console.log(`🎬 Movie saved: code=${movie.code}, title=${movie.title || 'N/A'}`);
    } catch (err) {
      console.error('❌ Channel post processing error:', err.message);
    }
  });
}

module.exports = { registerChannelHandler };
