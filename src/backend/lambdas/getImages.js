import { successResponse, errorResponse } from './apiGatewayHelpers.js';
import { getAdapters } from '../adapters/index.js';

const { db, s3, cache } = getAdapters();

/**
 * Get Images Handler
 * Returns all images with optional filtering
 * Uses Redis cache with PostgreSQL fallback
 */
export async function handler(event) {
	console.log('getImages handler called');

	try {
		const queryParams = event.queryStringParameters || {};
		const { city, from, to, limit = '50', offset = '0' } = queryParams;

		// Build cache key
		const cacheKey = `images:${city || 'all'}:${from || ''}:${to || ''}:${limit}:${offset}`;
		const CACHE_TTL = 300; // 5 minutes

		// Try cache first
		if (cache) {
			try {
				const cached = await cache.get(cacheKey);
				if (cached) {
					console.log('Images found in cache');
					return successResponse({ ...JSON.parse(cached), cached: true });
				}
			} catch (cacheError) {
				console.warn('Cache error, falling back to DB:', cacheError);
			}
		}

		// Build SQL query
		let query = `
      SELECT 
        i.id, i.image_key, i.captured_at, i.temperature, i.humidity, i.pressure, i.weather_condition,
        c.name as city_name, c.slug as city_slug, c.country
      FROM images i
      JOIN cities c ON i.city_id = c.id
    `;
		const params = [];
		const conditions = [];
		let paramCount = 1;

		if (city) {
			conditions.push(`c.slug = $${paramCount++}`);
			params.push(city);
		}

		if (from) {
			conditions.push(`i.captured_at >= $${paramCount++}`);
			params.push(from);
		}

		if (to) {
			conditions.push(`i.captured_at <= $${paramCount++}`);
			params.push(to);
		}

		if (conditions.length > 0) {
			query += ' WHERE ' + conditions.join(' AND ');
		}

		query += ` ORDER BY i.captured_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
		params.push(parseInt(limit), parseInt(offset));

		const result = await db.query(query, params);

		const images = result.rows.map((row) => ({
			id: row.id,
			imageKey: row.image_key,
			capturedAt: row.captured_at,
			temperature: row.temperature,
			humidity: row.humidity,
			pressure: row.pressure,
			weatherCondition: row.weather_condition,
			city: {
				name: row.city_name,
				slug: row.city_slug,
				country: row.country
			}
		}));

		// Generate presigned URLs for images
		if (s3) {
			for (const image of images) {
				try {
					image.url = await s3.getPresignedUrl(image.imageKey, 3600);
				} catch (error) {
					console.warn(`Failed to generate URL for ${image.imageKey}:`, error);
					image.url = null;
				}
			}
		}

		const response = {
			images,
			count: images.length,
			limit: parseInt(limit),
			offset: parseInt(offset)
		};

		// Cache the result
		if (cache && images.length > 0) {
			try {
				await cache.set(cacheKey, JSON.stringify(response), CACHE_TTL);
			} catch (cacheError) {
				console.warn('Failed to cache images:', cacheError);
			}
		}

		return successResponse({ ...response, cached: false });
	} catch (error) {
		console.error('Error fetching images:', error);
		return errorResponse(500, 'Failed to fetch images', error.message);
	}
}
