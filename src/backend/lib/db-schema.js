/**
 * Database Schema Type Definitions
 * This file provides IDE autocomplete for SQL queries
 */

// @ts-check

/**
 * Cities table schema
 * @typedef {Object} City
 * @property {number} id - Primary key
 * @property {string} slug - Unique city identifier (e.g., 'vienna', 'berlin')
 * @property {string} name - City display name
 * @property {string} [country] - Country name
 * @property {Date} created_at - Record creation timestamp
 */

/**
 * Images table schema
 * @typedef {Object} Image
 * @property {number} id - Primary key
 * @property {string} city_slug - Foreign key to cities.slug
 * @property {Date} capture_time - When the image was captured
 * @property {string} camera_id - Camera identifier
 * @property {string} s3_bucket - S3 bucket name where raw image is stored
 * @property {string} s3_key - S3 object key for raw image
 * @property {string} [s3_key_processed] - S3 object key for processed/resized image
 * @property {number} [temperature] - Temperature in Celsius
 * @property {number} [humidity] - Humidity percentage (0-100)
 * @property {number} [air_pressure] - Air pressure in hPa
 * @property {boolean} processed - Whether image has been processed/resized
 * @property {boolean} used_in_video - Whether image was used in a video
 * @property {Date} created_at - Record creation timestamp
 * @property {Date} updated_at - Record last update timestamp
 */

/**
 * Database client type
 * @typedef {Object} PostgresClient
 * @property {function(string, Array): Promise<{rows: Array}>} query - Execute SQL query
 * @property {function(): Promise<void>} connect - Connect to database
 * @property {function(): Promise<void>} end - Close database connection
 */

export const TABLES = {
	CITIES: 'cities',
	IMAGES: 'images'
};

export const COLUMNS = {
	CITIES: {
		ID: 'id',
		SLUG: 'slug',
		NAME: 'name',
		COUNTRY: 'country',
		CREATED_AT: 'created_at'
	},
	IMAGES: {
		ID: 'id',
		CITY_SLUG: 'city_slug',
		CAPTURE_TIME: 'capture_time',
		CAMERA_ID: 'camera_id',
		S3_BUCKET: 's3_bucket',
		S3_KEY: 's3_key',
		S3_KEY_PROCESSED: 's3_key_processed',
		TEMPERATURE: 'temperature',
		HUMIDITY: 'humidity',
		AIR_PRESSURE: 'air_pressure',
		PROCESSED: 'processed',
		USED_IN_VIDEO: 'used_in_video',
		CREATED_AT: 'created_at',
		UPDATED_AT: 'updated_at'
	}
};

