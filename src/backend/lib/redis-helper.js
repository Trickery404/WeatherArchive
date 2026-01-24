/**
 * Redis Helper fr Lambda Funktionen
 * Verwendung: import { getRedisClient } from './redis-helper.js';
 */

import Redis from 'ioredis';

let redisClient = null;

/**
 * Erstellt oder gibt bestehenden Redis Client zurck
 * @returns {Redis} Redis Client Instance
 */
export function getRedisClient() {
	if (!redisClient) {
		redisClient = new Redis({
			host: process.env.REDIS_HOST,
			port: parseInt(process.env.REDIS_PORT) || 6379,
			username: process.env.REDIS_USERNAME || 'default',
			password: process.env.REDIS_PASSWORD,

			retryStrategy: (times) => {
				if (times > 3) {
					console.error('Redis: Max reconnection attempts reached');
					return null;
				}
				const delay = Math.min(times * 100, 2000);
				console.log(`Redis: Reconnecting in ${delay}ms (attempt ${times})`);
				return delay;
			},

			connectTimeout: 10000,
			commandTimeout: 5000,

			maxRetriesPerRequest: 3,
			enableReadyCheck: true,
			enableOfflineQueue: true,

			lazyConnect: false
		});

		redisClient.on('connect', () => {
			console.log('[Redis] Connected');
		});

		redisClient.on('ready', () => {
			console.log('[Redis] Ready');
		});

		redisClient.on('error', (err) => {
			console.error('[Redis] Error:', err.message);
		});

		redisClient.on('close', () => {
			console.log('[Redis] Connection closed');
		});

		redisClient.on('reconnecting', () => {
			console.log('[Redis] Reconnecting...');
		});
	}

	return redisClient;
}

/**
 * Cache Helper Functions
 */

/**
 * Holt Daten aus dem Cache oder fhrt Callback aus
 * @param {string} key - Cache Key
 * @param {Function} fetchFn - Async function to fetch data if not cached
 * @param {number} ttl - Time to live in seconds (default: 1 hour)
 * @returns {Promise<any>} Cached or fresh data
 */
export async function getOrSet(key, fetchFn, ttl = 3600) {
	const redis = getRedisClient();

	try {
		const cached = await redis.get(key);
		if (cached) {
			console.log(`[Cache] HIT: ${key}`);
			return JSON.parse(cached);
		}

		console.log(`[Cache] MISS: ${key}`);
		const data = await fetchFn();

		await redis.setex(key, ttl, JSON.stringify(data));
		console.log(`[Cache] Stored: ${key} (TTL: ${ttl}s)`);

		return data;
	} catch (error) {
		console.error(`[Cache] Error for ${key}:`, error.message);
		return await fetchFn();
	}
}

/**
 * Lscht Cache-Eintrge nach Pattern
 * @param {string} pattern - Redis key pattern (e.g., 'city:vienna:*')
 * @returns {Promise<number>} Number of deleted keys
 */
export async function invalidatePattern(pattern) {
	const redis = getRedisClient();

	try {
		const keys = await redis.keys(pattern);
		if (keys.length === 0) {
			console.log(`[Cache] No keys found for pattern: ${pattern}`);
			return 0;
		}

		const deleted = await redis.del(...keys);
		console.log(`[Cache] Invalidated ${deleted} keys matching: ${pattern}`);
		return deleted;
	} catch (error) {
		console.error(`[Cache] Error invalidating pattern ${pattern}:`, error.message);
		return 0;
	}
}

/**
 * Prft ob Redis verfgbar ist
 * @returns {Promise<boolean>} true wenn verbunden
 */
export async function isRedisAvailable() {
	const redis = getRedisClient();

	try {
		await redis.ping();
		return true;
	} catch (error) {
		console.error('[Redis] Not available:', error.message);
		return false;
	}
}

/**
 * Schliet die Redis-Verbindung (fr Lambda cleanup)
 * @returns {Promise<void>}
 */
export async function closeRedis() {
	if (redisClient) {
		await redisClient.quit();
		redisClient = null;
		console.log('[Redis] Connection closed gracefully');
	}
}

// Beispiel-Verwendung:
//
// import { getRedisClient, getOrSet, invalidatePattern } from './redis-helper.js';
//
// export async function handler(event) {
//   // Cache images for a city
//   const images = await getOrSet(
//     `city:${citySlug}:images`,
//     async () => {
//       // Fetch from DB
//       return await db.query('SELECT * FROM images WHERE city_slug = $1', [citySlug]);
//     },
//     3600 // Cache for 1 hour
//   );
//
//   // Invalidate when new image uploaded
//   await invalidatePattern(`city:${citySlug}:*`);
//
//   return { statusCode: 200, body: JSON.stringify(images) };
// }

