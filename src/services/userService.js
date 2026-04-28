const { query } = require('../db/pool');
const config = require('../config');

/**
 * Upsert a user into the database.
 * Updates username/first_name on subsequent visits.
 */
async function upsertUser(telegramId, username, firstName) {
  const result = await query(
    `INSERT INTO users (telegram_id, username, first_name, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (telegram_id)
     DO UPDATE SET username = EXCLUDED.username, first_name = EXCLUDED.first_name
     RETURNING *`,
    [
      telegramId,
      username || null,
      firstName || null,
      telegramId === config.superAdminId ? 'superadmin' : 'user',
    ]
  );
  return result.rows[0];
}

/**
 * Get user by Telegram ID.
 */
async function getUserByTelegramId(telegramId) {
  const result = await query(
    'SELECT * FROM users WHERE telegram_id = $1',
    [telegramId]
  );
  return result.rows[0] || null;
}

/**
 * Get total user count.
 */
async function getUserCount() {
  const result = await query('SELECT COUNT(*) AS count FROM users');
  return parseInt(result.rows[0].count, 10);
}

/**
 * Get all user Telegram IDs for broadcasting.
 * Returns a cursor-friendly stream for large user bases.
 */
async function getAllUserIds() {
  const result = await query('SELECT telegram_id FROM users');
  return result.rows.map((r) => r.telegram_id);
}

/**
 * Set user role.
 */
async function setUserRole(telegramId, role) {
  const result = await query(
    'UPDATE users SET role = $1 WHERE telegram_id = $2 RETURNING *',
    [role, telegramId]
  );
  return result.rows[0] || null;
}

/**
 * Check if user has a specific role or higher.
 */
function hasRole(user, requiredRole) {
  if (!user) return false;
  const hierarchy = { user: 0, admin: 1, superadmin: 2 };
  return (hierarchy[user.role] || 0) >= (hierarchy[requiredRole] || 0);
}

module.exports = {
  upsertUser,
  getUserByTelegramId,
  getUserCount,
  getAllUserIds,
  setUserRole,
  hasRole,
};
