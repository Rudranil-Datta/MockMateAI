import { AppError } from "../utils/AppError.js";

const defaultMaximumEntries = 10_000;

function pruneExpiredEntries(entries, currentTime) {
  for (const [key, entry] of entries) {
    if (entry.resetAt <= currentTime) {
      entries.delete(key);
    }
  }
}

export function getRequestIp(request) {
  return request.ip || request.socket?.remoteAddress || "unknown";
}

export function createRateLimit({
  code,
  maximumEntries = defaultMaximumEntries,
  message,
  now = Date.now,
  rules,
}) {
  const entries = new Map();

  if (!Array.isArray(rules) || rules.length === 0) {
    throw new TypeError("Rate limit requires at least one rule.");
  }

  return function rateLimit(request, response, next) {
    const currentTime = now();
    const buckets = rules.map(({ key, limit, name, resetAt, windowMs }) => ({
      bucketKey: `${name}:${key(request)}`,
      limit,
      resetAt,
      windowMs,
    }));

    for (const bucket of buckets) {
      const entry = entries.get(bucket.bucketKey);

      if (entry && entry.resetAt > currentTime && entry.count >= bucket.limit) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((entry.resetAt - currentTime) / 1000),
        );
        response.set("Retry-After", String(retryAfterSeconds));
        next(new AppError(code, message, { expose: true, status: 429 }));
        return;
      }
    }

    let newBucketCount = buckets.filter(
      ({ bucketKey }) => !entries.has(bucketKey),
    ).length;

    if (entries.size + newBucketCount > maximumEntries) {
      pruneExpiredEntries(entries, currentTime);
      newBucketCount = buckets.filter(
        ({ bucketKey }) => !entries.has(bucketKey),
      ).length;
    }

    if (entries.size + newBucketCount > maximumEntries) {
      response.set("Retry-After", "60");
      next(new AppError(code, message, { expose: true, status: 429 }));
      return;
    }

    for (const bucket of buckets) {
      const entry = entries.get(bucket.bucketKey);

      if (!entry || entry.resetAt <= currentTime) {
        entries.set(bucket.bucketKey, {
          count: 1,
          resetAt:
            bucket.resetAt?.(currentTime) ?? currentTime + bucket.windowMs,
        });
      } else {
        entry.count += 1;
      }
    }

    next();
  };
}
