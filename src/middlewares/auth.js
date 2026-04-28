const { getUserByTelegramId, hasRole } = require('../services/userService');

/**
 * Middleware factory for role-gated commands.
 * @param {string} requiredRole - 'admin' or 'superadmin'
 */
function requireRole(requiredRole) {
  return async (ctx, next) => {
    const user = await getUserByTelegramId(ctx.from.id);

    if (!hasRole(user, requiredRole)) {
      return ctx.reply('⛔ Sizda bu buyruqni ishlatish huquqi yo\'q.');
    }

    // Attach user to context for downstream handlers
    ctx.state.user = user;
    return next();
  };
}

module.exports = { requireRole };
