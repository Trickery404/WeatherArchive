import { successResponse, errorResponse } from './apiGatewayHelpers.js';
import { getAdapters } from '../adapters/index.js';

const { db, cache } = getAdapters();

/**
 * Get Cities Handler
 * Returns list of all available cities
 * Uses Redis cache with PostgreSQL fallback
 */
// eslint-disable-next-line no-unused-vars
export async function handler(event) {
	console.log('getCities handler called');

	try {
		const CACHE_KEY = 'cities:all';
		const CACHE_TTL = 3600; // 1 hour

		// Try cache first
		if (cache) {
			try {
				const cached = await cache.get(CACHE_KEY);
				if (cached) {
					console.log('Cities found in cache');
					return successResponse({ cities: JSON.parse(cached), cached: true });
				}
			} catch (cacheError) {
				console.warn('Cache error, falling back to DB:', cacheError);
			}
		}

		// Query database
		const result = await db.query(
			'SELECT id, name, slug, country, latitude, longitude FROM cities ORDER BY name'
		);

		const cities = result.rows;

		// Cache the result
		if (cache && cities.length > 0) {
			try {
				await cache.set(CACHE_KEY, JSON.stringify(cities), CACHE_TTL);
			} catch (cacheError) {
				console.warn('Failed to cache cities:', cacheError);
			}
		}

		return successResponse({
			cities,
			cached: false,
			count: cities.length
		});
	} catch (error) {
		console.error('Error fetching cities:', error);
		return errorResponse(500, 'Failed to fetch cities', error.message);
	}
}
