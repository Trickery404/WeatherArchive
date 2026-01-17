import {
	successResponse,
	errorResponse,
	parseJsonBody,
	validateRequiredFields
} from './apiGatewayHelpers.js';
import { getAdapters } from '../adapters/index.js';
import { genId } from '../lib/id.js';

const { db } = getAdapters();

/**
 * Upload Handler
 * Handles image upload confirmation after S3 upload
 * Stores metadata in PostgreSQL
 */
export async function handler(event) {
	console.log('upload handler called');

	try {
		// Parse body
		const bodyResult = parseJsonBody(event);
		if (!bodyResult.success) {
			return errorResponse(400, bodyResult.error);
		}

		const body = bodyResult.data;

		// Validate required fields
		const validation = validateRequiredFields(body, [
			'imageKey',
			'city',
			'captureTime',
			'metadata'
		]);
		if (!validation.valid) {
			return errorResponse(400, validation.error);
		}

		const { imageKey, city, captureTime, metadata } = body;

		// Insert into database
		const imageId = genId('img');
		const result = await db.query(
			`INSERT INTO images (id, city_id, image_key, captured_at, temperature, humidity, pressure, weather_condition, created_at)
       VALUES ($1, (SELECT id FROM cities WHERE slug = $2), $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id, image_key, captured_at`,
			[
				imageId,
				city,
				imageKey,
				captureTime,
				metadata.temperature || null,
				metadata.humidity || null,
				metadata.pressure || null,
				metadata.weatherCondition || null
			]
		);

		const image = result.rows[0];

		console.log('Image metadata stored:', imageId);

		return successResponse({
			message: 'Image uploaded successfully',
			imageId: image.id,
			imageKey: image.image_key,
			capturedAt: image.captured_at
		});
	} catch (error) {
		console.error('Error uploading image:', error);
		return errorResponse(500, 'Failed to upload image', error.message);
	}
}
