const { query } = require('../db/pool');

/**
 * Add a mandatory subscription channel.
 */
async function addChannel(channelId, inviteLink, channelTitle) {
  const result = await query(
    `INSERT INTO channels (channel_id, invite_link, channel_title)
     VALUES ($1, $2, $3)
     ON CONFLICT (channel_id)
     DO UPDATE SET invite_link = EXCLUDED.invite_link, channel_title = COALESCE(EXCLUDED.channel_title, channels.channel_title)
     RETURNING *`,
    [channelId, inviteLink, channelTitle || null]
  );
  return result.rows[0];
}

/**
 * Remove a mandatory subscription channel.
 */
async function removeChannel(channelId) {
  const result = await query(
    'DELETE FROM channels WHERE channel_id = $1 RETURNING *',
    [channelId]
  );
  return result.rows[0] || null;
}

/**
 * Get all mandatory subscription channels.
 */
async function getAllChannels() {
  const result = await query('SELECT * FROM channels ORDER BY created_at ASC');
  return result.rows;
}

/**
 * Check if user is subscribed to all mandatory channels.
 * Returns { subscribed: boolean, missingChannels: Array }
 */
async function checkUserSubscription(bot, userId) {
  const channels = await getAllChannels();

  if (channels.length === 0) {
    return { subscribed: true, missingChannels: [] };
  }

  const missingChannels = [];

  for (const channel of channels) {
    try {
      const member = await bot.telegram.getChatMember(channel.channel_id, userId);
      const activeStatuses = ['creator', 'administrator', 'member'];
      if (!activeStatuses.includes(member.status)) {
        missingChannels.push(channel);
      }
    } catch (err) {
      // If bot can't check (not admin in channel, etc.), treat as not subscribed
      console.warn(`⚠️ Cannot check membership for channel ${channel.channel_id}:`, err.message);
      missingChannels.push(channel);
    }
  }

  return {
    subscribed: missingChannels.length === 0,
    missingChannels,
  };
}

module.exports = {
  addChannel,
  removeChannel,
  getAllChannels,
  checkUserSubscription,
};
