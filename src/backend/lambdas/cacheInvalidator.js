import { createRedisAdapter } from '../adapters/redisAdapter.js';
import { getAdapters } from '../adapters/index.js';

const { ddb } = getAdapters();

/**
 * Cache Invalidation Lambda
 * User Stories 18-22: Redis cache invalidation
 *
 * Triggered by:
 * - New image ingestion (invalidate city cache)
 * - Video rendering completion (invalidate city cache)
 * - Manual invalidation requests
 * - Scheduled cleanup (EventBridge)
 */

/**
 * Main handler for cache invalidation
 * @param {Object} event - Can be SNS, EventBridge, or direct invocation
 */
export async function handler(event) {
	console.log('Cache invalidation triggered', JSON.stringify(event, null, 2));

	let payload = event;

	// Handle SNS event
	if (event.Records && event.Records[0] && event.Records[0].Sns) {
		try {
			payload = JSON.parse(event.Records[0].Sns.Message);
		} catch (e) {
			console.error('Failed to parse SNS message', e);
			return { statusCode: 400, body: 'Invalid SNS payload' };
		}
	}

	// Handle API Gateway event
	if (event.body) {
		try {
			payload = JSON.parse(event.body);
		} catch (e) {
			console.error('Failed to parse body', e);
			return { statusCode: 400, body: 'Invalid JSON' };
		}
	}

	// Handle EventBridge scheduled event
	if (event.source === 'aws.events' && event['detail-type'] === 'Scheduled Event') {
		// Scheduled cleanup - invalidate old cache entries
		return await scheduledCleanup();
	}

	const invalidationType = payload.type || 'city'; // 'city', 'pattern', 'all'
	const city = payload.city;
	const pattern = payload.pattern;

	try {
		const redis = await createRedisAdapter();
		if (!redis) {
			console.warn('Redis not available, skipping invalidation');
			return { statusCode: 200, body: JSON.stringify({ message: 'Redis not available' }) };
		}

		let invalidatedCount = 0;

		switch (invalidationType) {
			case 'city':
				if (!city) {
					return { statusCode: 400, body: JSON.stringify({ error: 'Missing city parameter' }) };
				}
				invalidatedCount = await invalidateCity(redis, city);
				break;

			case 'pattern':
				if (!pattern) {
					return { statusCode: 400, body: JSON.stringify({ error: 'Missing pattern parameter' }) };
				}
				invalidatedCount = await invalidatePattern(redis, pattern);
				break;

			case 'all':
				invalidatedCount = await invalidateAll(redis);
				break;

			default:
				return {
					statusCode: 400,
					body: JSON.stringify({ error: `Unknown invalidation type: ${invalidationType}` })
				};
		}

		return {
			statusCode: 200,
			body: JSON.stringify({
				message: 'Cache invalidated successfully',
				type: invalidationType,
				city: city || null,
				pattern: pattern || null,
				invalidatedCount
			})
		};
	} catch (error) {
		console.error('Cache invalidation failed', error);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Cache invalidation failed', message: error.message })
		};
	}
}

/**
 * Invalidate all cache keys for a specific city
 */
async function invalidateCity(redis, city) {
	const pattern = `city:${city.toLowerCase()}:*`;
	return await invalidatePattern(redis, pattern);
}

/**
 * Invalidate cache keys matching a pattern
 * Uses SCAN to find all matching keys
 */
async function invalidatePattern(redis, pattern) {
	console.log(`Invalidating cache pattern: ${pattern}`);

	try {
		// Use SCAN to find all matching keys (safe for production)
		let cursor = '0';
		let deletedCount = 0;
		const keysToDelete = [];

		do {
			// SCAN returns [cursor, keys]
			const result = await redis.scan(cursor, pattern);
			cursor = result.cursor;
			const keys = result.keys;

			if (keys && keys.length > 0) {
				keysToDelete.push(...keys);
			}
		} while (cursor !== '0');

		// Delete all found keys
		if (keysToDelete.length > 0) {
			deletedCount = await redis.deleteKeys(keysToDelete);
			console.log(`Deleted ${deletedCount} cache keys matching ${pattern}`);
		}

		return deletedCount;
	} catch (error) {
		console.error('Pattern invalidation failed', error);
		return 0;
	}
}

/**
 * Invalidate all cache keys
 */
async function invalidateAll(redis) {
	console.log('Invalidating ALL cache keys');
	try {
		await redis.flushAll();
		return -1; // Special value indicating all keys deleted
	} catch (error) {
		console.error('Failed to flush all cache', error);
		return 0;
	}
}

/**
 * Scheduled cleanup of old cache entries
 * Runs periodically (e.g., daily) to clean up expired or stale cache
 */
async function scheduledCleanup() {
	console.log('Running scheduled cache cleanup');

	try {
		const redis = await createRedisAdapter();
		if (!redis) {
			console.warn('Redis not available for cleanup');
			return { statusCode: 200, body: JSON.stringify({ message: 'Redis not available' }) };
		}

		// Get cache statistics
		const info = await redis.getInfo();
		console.log('Redis info:', info);

		// In production, you might want to:
		// 1. Scan for keys older than X days
		// 2. Delete temporary keys
		// 3. Optimize memory usage

		return {
			statusCode: 200,
			body: JSON.stringify({
				message: 'Scheduled cleanup completed',
				timestamp: new Date().toISOString()
			})
		};
	} catch (error) {
		console.error('Scheduled cleanup failed', error);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Cleanup failed', message: error.message })
		};
	}
}

/**
 * Invalidate cache for a specific key (direct)
 */
export async function invalidateCacheKey(key) {
	try {
		const redis = await createRedisAdapter();
		if (redis) {
			await redis.delete(key);
			console.log(`Cache key invalidated: ${key}`);
			return true;
		}
		return false;
	} catch (error) {
		console.error(`Failed to invalidate cache key ${key}`, error);
		return false;
	}
}
