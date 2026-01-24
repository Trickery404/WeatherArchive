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
 * Lambda Handler for getCities
 * User Stories 16, 18-22: Retrieve cities with Redis caching
 * @param {Object} event - API Gateway event
 * @returns {Promise<Object>} Response with cities list
 */
export const handler = async (event) => {
	console.log('[getCities] Handler called');

	try {
		// Use cache-first strategy (User Stories 18-22)
		const cities = await getOrSet(
			'cities:all',
			async () => {
				console.log('[getCities] Cache miss - fetching from PostgreSQL');

				const client = new Client(PG_CONFIG);
				await client.connect();

				// language=PostgreSQL
				const result = await client.query(`
					SELECT id, slug, name, country, created_at
					FROM cities
					ORDER BY name ASC
				`);

				await client.end();

				console.log(`[getCities] Retrieved ${result.rows.length} cities from DB`);
				return result.rows;
			},
			300 // Cache for 5 minutes (cities rarely change)
		);

		return {
			statusCode: 200,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*'
			},
			body: JSON.stringify({
				cities,
				cached: true,
				count: cities.length
			})
		};
	} catch (error) {
		console.error('[getCities] Error:', error);

		return {
			statusCode: 500,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*'
			},
			body: JSON.stringify({
				error: 'Failed to retrieve cities',
				message: error.message
			})
		};
	}
};
