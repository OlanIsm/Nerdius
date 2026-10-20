import type { Request, Response, NextFunction, RequestHandler } from "express";

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (request: Request, response: Response) => string;
  skip?: (request: Request, response: Response) => boolean;
}

export interface RateLimiterMiddleware extends RequestHandler {
  reset: () => void;
  getUsage: (key: string) => { count: number; resetAt: number } | undefined;
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiterMiddleware {
  const store = new Map<string, { count: number; resetAt: number }>();

  // Periodically cleanup expired entries
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now >= entry.resetAt) {
        store.delete(key);
      }
    }
  }, Math.max(options.windowMs, 60_000));
  cleanup.unref?.();

  const middleware: RequestHandler = (request: Request, response: Response, next: NextFunction): void => {
    if (options.skip?.(request, response)) {
      return next();
    }

    const key = options.keyGenerator
      ? options.keyGenerator(request, response)
      : (typeof response.locals?.userId === "string" ? response.locals.userId : (request.ip || "unknown"));

    const now = Date.now();
    let entry = store.get(key);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + options.windowMs };
      store.set(key, entry);
    }

    entry.count += 1;
    const remaining = Math.max(0, options.max - entry.count);
    const resetSeconds = Math.ceil(Math.max(0, entry.resetAt - now) / 1000);

    response.setHeader("RateLimit-Limit", options.max);
    response.setHeader("RateLimit-Remaining", remaining);
    response.setHeader("RateLimit-Reset", resetSeconds);

    if (entry.count > options.max) {
      response.setHeader("Retry-After", resetSeconds);
      response.status(429).json({
        error: options.message || "Terlalu banyak permintaan. Silakan coba beberapa saat lagi.",
      });
      return;
    }

    next();
  };

  const limiter = middleware as RateLimiterMiddleware;
  limiter.reset = () => store.clear();
  limiter.getUsage = (key: string) => store.get(key);

  return limiter;
}

/**
 * Crucial rate limiter for Gemini AI PDF Forge endpoint (POST /api/game/forge).
 * Limits PDF generation per user account to prevent excessive Gemini token / billing drain.
 * Default: 5 requests per 15 minutes per user.
 */
export const forgeRateLimiter = createRateLimiter({
  get windowMs() {
    return Number(process.env.RATE_LIMIT_FORGE_WINDOW_MS || 15 * 60 * 1000);
  },
  get max() {
    return Number(process.env.RATE_LIMIT_FORGE_MAX || 5);
  },
  message: "Terlalu banyak permintaan pembuatan soal (Gemini AI). Tunggu beberapa saat sebelum mengunggah PDF lagi.",
  keyGenerator: (_req, res) => {
    return typeof res.locals?.userId === "string" ? `forge:user:${res.locals.userId}` : "forge:anon";
  },
  skip: () => process.env.RATE_LIMIT_DISABLED === "true",
});

/**
 * General API rate limiter to protect all /api routes from denial-of-service / scraping.
 * Default: 120 requests per minute per IP / user.
 */
export const apiRateLimiter = createRateLimiter({
  get windowMs() {
    return Number(process.env.RATE_LIMIT_API_WINDOW_MS || 60 * 1000);
  },
  get max() {
    return Number(process.env.RATE_LIMIT_API_MAX || 120);
  },
  message: "Terlalu banyak request ke server. Silakan coba sebentar lagi.",
  keyGenerator: (req, res) => {
    return typeof res.locals?.userId === "string" ? `api:user:${res.locals.userId}` : `api:ip:${req.ip || "unknown"}`;
  },
  skip: () => process.env.RATE_LIMIT_DISABLED === "true",
});
