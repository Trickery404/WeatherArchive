import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import pkg from 'pg';
const { Client } = pkg;
import { randomUUID } from 'crypto';
import { invalidatePattern } from '../lib/redis-helper.js';

const s3 = new S3Client({});
const BUCKET = 'weatherarchive-raw-339712992816';

const PG_CONFIG = {
	host: process.env.PG_HOST,
	database: process.env.PG_DB,
	user: process.env.PG_USER,
	password: process.env.PG_PASSWORD,
	port: 5432,
	ssl: { rejectUnauthorized: false }
};

/**
 * Lambda Handler for Image Upload
 * @param {Object} event - API Gateway event with multipart/form-data body
 * @returns {Promise<Object>} Response with image metadata
 */
export const handler = async (event) => {
	//  FULL DEBUG LOGGING  this is what you asked for
	console.log('===== FULL EVENT DUMP =====');
	console.log(JSON.stringify(event, null, 2));
	console.log('===== END EVENT DUMP =====');

	try {
		// --- Validate body ---
		if (!event.body) {
			console.error('Missing event.body');
			return {
				statusCode: 400,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*'
				},
				body: JSON.stringify({ error: 'Missing request body' })
			};
		}

		// --- Validate headers ---
		const contentType = event.headers['content-type'] || event.headers['Content-Type'];

		if (!contentType || !contentType.includes('multipart/form-data')) {
			console.error('Invalid or missing Content-Type header:', contentType);
			return {
				statusCode: 400,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*'
				},
				body: JSON.stringify({ error: 'Invalid or missing Content-Type header' })
			};
		}

		// --- Extract boundary ---
		const boundary = contentType.split('boundary=')[1];
		if (!boundary) {
			console.error('Boundary not found in Content-Type header');
			return {
				statusCode: 400,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*'
				},
				body: JSON.stringify({ error: 'Boundary not found' })
			};
		}

		// --- Decode body ---
		const body = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');

		console.log('Decoded body length:', body.length);

		// --- Split multipart parts ---
		const parts = body
			.toString('binary')
			.split(`--${boundary}`)
			.filter((p) => p.includes('Content-Disposition'));

		console.log('Found multipart parts:', parts.length);

		let imageBuffer;
		let metadata;

		for (const part of parts) {
			console.log('Processing part:', part.substring(0, 200));

			if (part.includes('name="image"')) {
				const raw = part.split('\r\n\r\n')[1];
				imageBuffer = Buffer.from(raw, 'binary');
				console.log('Extracted image buffer length:', imageBuffer.length);
			}

			if (part.includes('name="metadata"')) {
				const raw = part.split('\r\n\r\n')[1];
				const cleaned = raw.split('\r\n')[0]; // remove trailing boundary
				console.log('Raw metadata string:', cleaned);
				metadata = JSON.parse(cleaned);
			}
		}

		if (!imageBuffer) {
			throw new Error('Image part missing in multipart data');
		}
		if (!metadata) {
			throw new Error('Metadata part missing or invalid JSON');
		}

		// --- Generate S3 key ---
		const imageId = randomUUID();
		const key = `raw/${metadata.city_slug}/${imageId}.jpg`;

		// --- Upload to S3 ---
		await s3.send(
			new PutObjectCommand({
				Bucket: BUCKET,
				Key: key,
				Body: imageBuffer,
				ContentType: 'image/jpeg'
			})
		);

		console.log('Uploaded to S3:', key);

		// --- Insert into Postgres ---
		const client = new Client(PG_CONFIG);
		await client.connect();

		// language=PostgreSQL
		const insertQuery = `
      INSERT INTO images
        (city_slug, capture_time, camera_id, s3_bucket, s3_key, temperature, humidity, air_pressure, processed, used_in_video, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false,false,now())
      RETURNING id
    `;

		const values = [
			metadata.city_slug,
			metadata.capture_time,
			metadata.camera_id,
			BUCKET,
			key,
			metadata.temperature,
			metadata.humidity,
			metadata.air_pressure
		];

		const res = await client.query(insertQuery, values);
		await client.end();

		console.log('Inserted DB row:', res.rows[0].id);

		// Invalidate cache for this city (User Story 18-22)
		try {
			const invalidated = await invalidatePattern(`city:${metadata.city_slug}:*`);
			console.log(`[Cache] Invalidated ${invalidated} keys for ${metadata.city_slug}`);
		} catch (cacheError) {
			console.error('[Cache] Invalidation failed:', cacheError.message);
			// Continue anyway - cache invalidation failure shouldn't fail the upload
		}

		return {
			statusCode: 200,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*'
			},
			body: JSON.stringify({
				image_id: imageId,
				db_id: res.rows[0].id,
				s3_bucket: BUCKET,
				s3_key: key
			})
		};
	} catch (err) {
		console.error('ERROR:', err);

		return {
			statusCode: 500,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*'
			},
			body: JSON.stringify({
				error: err.message,
				stack: err.stack
			})
		};
	}
};
