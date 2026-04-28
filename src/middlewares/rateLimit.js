const config = require('../config');

/**
 * In-memory rate limiter using a sliding window per user.
 */
class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();

    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  isAllowed(userId) {
    const now = Date.now();
    const userKey = String(userId);

    if (!this.requests.has(userKey)) {
      this.requests.set(userKey, [now]);
      return true;
    }

    const timestamps = this.requests.get(userKey);
    const windowStart = now - this.windowMs;

    const valid = timestamps.filter((t) => t > windowStart);
    valid.push(now);
    this.requests.set(userKey, valid);

    return valid.length <= this.maxRequests;
  }

  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, timestamps] of this.requests.entries()) {
      const valid = timestamps.filter((t) => t > windowStart);
      if (valid.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, valid);
      }
    }
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.requests.clear();
  }
}

const limiter = new RateLimiter(config.rateLimit.max, config.rateLimit.windowMs);

function rateLimitMiddleware() {
  return async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return next();

    if (!limiter.isAllowed(userId)) {
      return ctx.reply('⏳ Juda ko\'p so\'rov. Iltimos, bir oz kutib turing.');
    }

    return next();
  };
}

module.exports = { rateLimitMiddleware, limiter };
