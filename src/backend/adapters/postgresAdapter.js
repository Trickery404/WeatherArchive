import pg from 'pg';
const { Pool } = pg;

let pool = null;

/**
 * PostgreSQL Connection Pool
 * Compatible with AWS RDS PostgreSQL
 */
function getPool() {
	if (!pool) {
		const config = {
			host: process.env.POSTGRES_HOST,
			port: parseInt(process.env.POSTGRES_PORT || '5432'),
			database: process.env.POSTGRES_DATABASE || 'weatherarchive',
			user: process.env.POSTGRES_USER || 'postgres',
			password: process.env.POSTGRES_PASSWORD,
			max: 20, // Maximum pool size
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 5000
		};

		// AWS RDS requires SSL
		if (process.env.POSTGRES_HOST && process.env.POSTGRES_HOST.includes('rds.amazonaws.com')) {
			config.ssl = {
				rejectUnauthorized: false
			};
		}

		pool = new Pool(config);

		// Error handling
		pool.on('error', (err) => {
			console.error('Unexpected PostgreSQL pool error:', err);
		});

		console.log('PostgreSQL pool created:', {
			host: config.host,
			database: config.database,
			user: config.user
		});
	}
	return pool;
}

/**
 * PostgreSQL Adapter
 * Provides database operations for WeatherArchive
 */
export const postgresAdapter = {
	/**
	 * Execute raw SQL query
	 */
	async query(sql, params = []) {
		const pool = getPool();
		try {
			const result = await pool.query(sql, params);
			return result.rows;
		} catch (error) {
			console.error('PostgreSQL query error:', error);
			console.error('SQL:', sql);
			console.error('Params:', params);
			throw error;
		}
	},

	/**
	 * Get all cities
	 */
	async getCities() {
		const sql = 'SELECT * FROM cities ORDER BY name';
		return await this.query(sql);
	},

	/**
	 * Get city by slug
	 */
	async getCityBySlug(slug) {
		const sql = 'SELECT * FROM cities WHERE slug = $1';
		const result = await this.query(sql, [slug]);
		return result[0] || null;
	},

	/**
	 * Insert new image metadata
	 */
	async insertImage(image) {
		const sql = `
            INSERT INTO images 
            (city_slug, capture_time, camera_id, s3_bucket, s3_key, 
             temperature, humidity, air_pressure)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, created_at
        `;

		const result = await this.query(sql, [
			image.city,
			image.captureTime,
			image.cameraId,
			image.s3Bucket,
			image.s3Key,
			image.temperature || null,
			image.humidity || null,
			image.airPressure || null
		]);

		return result[0];
	},

	/**
	 * Get images by city (with optional date range)
	 */
	async getImagesByCity(citySlug, startDate = null, endDate = null) {
		let sql = `
            SELECT * FROM images 
            WHERE city_slug = $1
        `;
		const params = [citySlug];

		if (startDate && endDate) {
			sql += ` AND capture_time BETWEEN $2 AND $3`;
			params.push(startDate, endDate);
		}

		sql += ` ORDER BY capture_time DESC LIMIT 1000`;

		return await this.query(sql, params);
	},

	/**
	 * Update image as processed
	 */
	async updateImageProcessed(id, processedKey) {
		const sql = `
            UPDATE images 
            SET processed = TRUE, 
                s3_key_processed = $2, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
		const result = await this.query(sql, [id, processedKey]);
		return result[0];
	},

	/**
	 * Get unprocessed images (for resize worker)
	 */
	async getUnprocessedImages(limit = 100) {
		const sql = `
            SELECT * FROM images 
            WHERE processed = FALSE 
            ORDER BY created_at 
            LIMIT $1
        `;
		return await this.query(sql, [limit]);
	},

	/**
	 * Get images for video rendering (not yet used in video)
	 */
	async getImagesForVideo(citySlug, startDate, endDate) {
		const sql = `
            SELECT * FROM images 
            WHERE city_slug = $1 
            AND capture_time BETWEEN $2 AND $3
            AND processed = TRUE
            AND used_in_video = FALSE
            ORDER BY capture_time
        `;
		return await this.query(sql, [citySlug, startDate, endDate]);
	},

	/**
	 * Mark images as used in video
	 */
	async markImagesUsedInVideo(imageIds) {
		if (!imageIds || imageIds.length === 0) return;

		const sql = `
            UPDATE images 
            SET used_in_video = TRUE, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ANY($1::int[])
        `;
		await this.query(sql, [imageIds]);
	},

	/**
	 * Get images statistics by city
	 */
	async getImageStats(citySlug) {
		const sql = `
            SELECT 
                COUNT(*) as total_images,
                COUNT(*) FILTER (WHERE processed = TRUE) as processed_images,
                COUNT(*) FILTER (WHERE used_in_video = TRUE) as video_images,
                MIN(capture_time) as first_image,
                MAX(capture_time) as last_image
            FROM images 
            WHERE city_slug = $1
        `;
		const result = await this.query(sql, [citySlug]);
		return result[0];
	},

	/**
	 * Get available dates for a city
	 */
	async getAvailableDates(citySlug) {
		const sql = `
            SELECT DISTINCT DATE(capture_time) as date
            FROM images 
            WHERE city_slug = $1 
            ORDER BY date DESC
            LIMIT 365
        `;
		return await this.query(sql, [citySlug]);
	},

	/**
	 * Health check - test database connection
	 */
	async healthCheck() {
		try {
			const result = await this.query('SELECT 1 as health');
			return result[0]?.health === 1;
		} catch (error) {
			console.error('PostgreSQL health check failed:', error);
			return false;
		}
	},

	/**
	 * Close connection pool (for cleanup)
	 */
	async close() {
		if (pool) {
			await pool.end();
			pool = null;
			console.log('PostgreSQL pool closed');
		}
	}
};
