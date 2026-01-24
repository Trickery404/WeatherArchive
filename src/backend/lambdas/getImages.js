import 'dotenv/config';
import { getOrSet } from '../lib/redis-helper.js';
import pkg from 'pg';
const { Client } = pkg;

const PG_CONFIG = {
	host: process.env.PG_HOST,
	database: process.env.PG_DB,
	user: process.env.PG_USER,
	password: process.env.PG_PASSWORD,
	port: 5432,
	ssl: { rejectUnauthorized: false }
};

/**
 * Lambda Handler for getImages
 * User Stories 16-22: Retrieve images with Redis cache-first strategy
 * @param {Object} event - API Gateway event
 * @returns {Promise<Object>} Response with images list
 */
export const handler = async (event) => {
	console.log('[getImages] Handler called');
	console.log('[getImages] Event:', JSON.stringify(event, null, 2));

	try {
		// Extract parameters
		const pathParams = event.pathParameters || {};
		const queryParams = event.queryStringParameters || {};

		const citySlug = pathParams.city || queryParams.city;
		const date = queryParams.date;
		const hour = queryParams.hour;

		// Validate city
		if (!citySlug) {
			return {
				statusCode: 400,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*'
				},
				body: JSON.stringify({
					error: 'Missing required parameter: city'
				})
			};
		}

		// Build cache key based on query parameters
		let cacheKey = `city:${citySlug}:images`;
		if (date) cacheKey += `:${date}`;
		if (hour) cacheKey += `:${hour}`;

		console.log(`[getImages] Cache key: ${cacheKey}`);

		// Use cache-first strategy (User Stories 20-22)
		const images = await getOrSet(
			cacheKey,
			async () => {
				console.log('[getImages] Cache miss - fetching from PostgreSQL');

				const client = new Client(PG_CONFIG);
				await client.connect();

				// Build dynamic query based on filters
				let query = `
					SELECT 
						i.id,
						i.city_slug,
						i.capture_time,
						i.camera_id,
						i.s3_bucket,
						i.s3_key,
						i.s3_key_processed,
						i.temperature,
						i.humidity,
						i.air_pressure,
						i.processed,
						i.used_in_video,
						i.created_at
					FROM images i
					WHERE i.city_slug = $1
				`;

				const params = [citySlug];
				let paramIndex = 2;

				// Add date filter if provided
				if (date) {
					query += ` AND DATE(i.capture_time) = $${paramIndex}`;
					params.push(date);
					paramIndex++;
				}

				// Add hour filter if provided
				if (hour !== undefined) {
					query += ` AND EXTRACT(HOUR FROM i.capture_time) = $${paramIndex}`;
					params.push(parseInt(hour));
					paramIndex++;
				}

				query += ` ORDER BY i.capture_time DESC LIMIT 100`;

				// language=PostgreSQL
				const result = await client.query(query, params);

				await client.end();

				console.log(`[getImages] Retrieved ${result.rows.length} images from DB`);
				return result.rows;
			},
			3600 // Cache for 1 hour
		);

		return {
			statusCode: 200,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*'
			},
			body: JSON.stringify({
				city: citySlug,
				date: date || null,
				hour: hour || null,
				images,
				count: images.length,
				cached: true
			})
		};
	} catch (error) {
		console.error('[getImages] Error:', error);

		return {
			statusCode: 500,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*'
			},
			body: JSON.stringify({
				error: 'Failed to retrieve images',
				message: error.message
			})
		};
	}
};
