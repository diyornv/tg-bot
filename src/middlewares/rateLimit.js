const config = require('../config');

/**
 * In-memory rate limiter using a sliding window per user.
 * For 10k+ users at scale, consider Redis-based rate limiting.
 */
class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();

    // Cleanup stale entries every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if user is rate limited.
   * @param {number} userId
   * @returns {boolean} true if request is allowed, false if rate limited
   */
  isAllowed(userId) {
    const now = Date.now();
    const userKey = String(userId);

    if (!this.requests.has(userKey)) {
      this.requests.set(userKey, [now]);
      return true;
    }

    const timestamps = this.requests.get(userKey);
    const windowStart = now - this.windowMs;

    // Remove expired timestamps
    const valid = timestamps.filter((t) => t > windowStart);
    valid.push(now);
    this.requests.set(userKey, valid);

    return valid.length <= this.maxRequests;
  }

  /**
   * Remove entries older than the window.
   */
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

/**
 * Telegraf middleware that rate-limits per user.
 */
function rateLimitMiddleware() {
  return async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return next();

    if (!limiter.isAllowed(userId)) {
      return ctx.reply('⏳ Too many requests. Please wait a moment before trying again.');
    }

    return next();
  };
}

module.exports = { rateLimitMiddleware, limiter };
