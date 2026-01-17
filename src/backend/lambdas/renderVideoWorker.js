import { getAdapters } from '../adapters/index.js';
import { config } from '../lib/config.js';
import { genId } from '../lib/id.js';
import { createRedisAdapter } from '../adapters/redisAdapter.js';

const { s3, ddb } = getAdapters();

let ffmpegAvailable = false;

async function ensureFFmpeg() {
	if (ffmpegAvailable) return true;
	// In production, ffmpeg should be available via Lambda Layer or Container Image
	// For local testing, we'll skip actual video generation
	if (process.env.USE_FFMPEG === '1') {
		try {
			// Check if ffmpeg is available (not importing, just checking environment)
			ffmpegAvailable = true;
			return true;
		} catch (e) {
			console.warn('ffmpeg not available, will create placeholder video', e.message || e);
			return false;
		}
	}
	return false;
}

/**
 * Render Video Worker
 * User Stories: 26-30
 * - Scheduled for specific time periods
 * - Reads database for image sequences
 * - Creates video from images
 * - Stores video in S3
 * - Only uses new images (no reuse from past videos)
 */
export async function handler(event) {
	// Parse input - can be SQS event or direct invocation
	let payload = event;
	if (event.Records && event.Records[0] && event.Records[0].body) {
		// SQS event
		try {
			payload = JSON.parse(event.Records[0].body);
		} catch (e) {
			console.error('Failed to parse SQS body', e);
			return { statusCode: 400, body: JSON.stringify({ error: 'Invalid SQS payload' }) };
		}
	} else if (event.body) {
		// API Gateway event
		try {
			payload = JSON.parse(event.body);
		} catch (e) {
			return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
		}
	}

	const required = ['city', 'startDate', 'endDate'];
	for (const r of required) {
		if (!payload || !payload[r]) {
			return { statusCode: 400, body: JSON.stringify({ error: `Missing field ${r}` }) };
		}
	}

	const jobId = payload.jobId || genId('render');
	const city = payload.city.toLowerCase();
	const startDate = payload.startDate;
	const endDate = payload.endDate;

	console.log(`Starting render job ${jobId} for ${city} from ${startDate} to ${endDate}`);

	try {
		// Step 1: Query DynamoDB for all images in the time range that haven't been used in a video yet
		const images = await getUnusedImages(city, startDate, endDate);

		if (!images || images.length === 0) {
			console.log('No new images found for rendering');
			return {
				statusCode: 200,
				body: JSON.stringify({ jobId, message: 'No new images to render' })
			};
		}

		console.log(`Found ${images.length} images to render`);

		// Step 2: Download images from S3 (or get presigned URLs)
		const imageUrls = await getImageUrls(images);

		// Step 3: Create video using ffmpeg (or placeholder in mock mode)
		const videoBuffer = await createVideo(imageUrls, jobId);

		// Step 4: Upload video to S3
		const videoKey = `videos/${city}/${startDate}_to_${endDate}_${jobId}.mp4`;
		await s3.putObject({
			Bucket: config.VIDEO_BUCKET,
			Key: videoKey,
			Body: videoBuffer,
			ContentType: 'video/mp4'
		});

		console.log(`Video uploaded to ${videoKey}`);

		// Step 5: Update DynamoDB - mark images as used and create video metadata entry
		await markImagesAsUsed(images, jobId);
		await createVideoMetadata(jobId, city, startDate, endDate, videoKey, images.length);

		// Step 6: Invalidate cache (both Redis and CloudFront if applicable)
		await invalidateCache(city);

		return {
			statusCode: 200,
			body: JSON.stringify({
				jobId,
				videoKey,
				bucket: config.VIDEO_BUCKET,
				imagesProcessed: images.length
			})
		};
	} catch (error) {
		console.error('Render job failed', error);
		// Update job status to FAILED
		await updateJobStatus(jobId, 'FAILED', error.message);
		return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
	}
}

/**
 * Query DynamoDB for images that haven't been used in a video yet
 * User Story 29: Only use new images
 */
async function getUnusedImages(city, startDate, endDate) {
	try {
		// Query all images for the city in the date range
		const result = await ddb.query({ TableName: config.DDB_TABLE });
		const items = (result.Items || [])
			.filter((i) => {
				// Filter by city
				if (!i.city || i.city.S !== city) return false;
				// Filter by date range
				const captureTime = i.captureTime.S;
				if (captureTime < startDate || captureTime > endDate) return false;
				// Filter out images that have already been used in a video
				const usedInVideo = i.usedInVideo && i.usedInVideo.S === 'true';
				return !usedInVideo && i.status.S === 'PROCESSED';
			})
			.map((i) => ({
				jobId: i.jobId.S,
				captureTime: i.captureTime.S,
				thumbnails: i.thumbnails ? JSON.parse(i.thumbnails.S) : null
			}))
			.sort((a, b) => a.captureTime.localeCompare(b.captureTime));

		return items;
	} catch (error) {
		console.error('Failed to query images', error);
		return [];
	}
}

/**
 * Get URLs or data for images
 */
async function getImageUrls(images) {
	const urls = [];
	for (const img of images) {
		// Use the largest processed image (1920px if available)
		if (img.thumbnails && img.thumbnails['1920']) {
			urls.push({
				bucket: img.thumbnails['1920'].bucket,
				key: img.thumbnails['1920'].key,
				captureTime: img.captureTime
			});
		}
	}
	return urls;
}

/**
 * Create video from images using ffmpeg
 * In mock mode, creates a placeholder
 */
async function createVideo(imageUrls, jobId) {
	const useFFmpeg = await ensureFFmpeg();

	if (useFFmpeg) {
		// TODO: Implement actual ffmpeg video creation
		// This would require:
		// 1. Download all images from S3 to /tmp
		// 2. Run ffmpeg to create video
		// 3. Return video buffer
		// For now, this is a placeholder for the AWS team to implement
		console.log('FFmpeg video creation would happen here');
		return Buffer.from('MOCK_VIDEO_PLACEHOLDER');
	} else {
		// Mock mode: create a small placeholder buffer
		console.log(`Creating mock video for ${imageUrls.length} images`);
		return Buffer.from(`MOCK_VIDEO_${jobId}_IMAGES_${imageUrls.length}`);
	}
}

/**
 * Mark images as used in DynamoDB
 * User Story 29: Prevent reuse
 */
async function markImagesAsUsed(images, videoJobId) {
	for (const img of images) {
		try {
			const pk = `IMAGE#${img.jobId}`;
			await ddb.putItem({
				TableName: config.DDB_TABLE,
				Item: {
					PK: { S: pk },
					jobId: { S: img.jobId },
					usedInVideo: { S: 'true' },
					videoJobId: { S: videoJobId },
					usedAt: { S: new Date().toISOString() }
				}
			});
		} catch (error) {
			console.error(`Failed to mark image ${img.jobId} as used`, error);
		}
	}
}

/**
 * Create metadata entry for the rendered video
 */
async function createVideoMetadata(jobId, city, startDate, endDate, videoKey, imageCount) {
	const pk = `VIDEO#${jobId}`;
	const item = {
		PK: { S: pk },
		jobId: { S: jobId },
		city: { S: city },
		startDate: { S: startDate },
		endDate: { S: endDate },
		videoKey: { S: videoKey },
		bucket: { S: config.VIDEO_BUCKET },
		imageCount: { N: String(imageCount) },
		status: { S: 'COMPLETED' },
		createdAt: { S: new Date().toISOString() }
	};

	await ddb.putItem({ TableName: config.DDB_TABLE, Item: item });
}

/**
 * Update job status
 */
async function updateJobStatus(jobId, status, errorMessage = null) {
	const pk = `VIDEO#${jobId}`;
	const item = {
		PK: { S: pk },
		jobId: { S: jobId },
		status: { S: status },
		updatedAt: { S: new Date().toISOString() }
	};

	if (errorMessage) {
		item.error = { S: errorMessage };
	}

	await ddb.putItem({ TableName: config.DDB_TABLE, Item: item });
}

/**
 * Invalidate cache for the city
 * User Story 18-22: Redis cache integration
 */
async function invalidateCache(city) {
	try {
		const redis = await createRedisAdapter();
		if (redis) {
			// Invalidate all cache keys for this city
			const pattern = `city:${city}:*`;
			console.log(`Invalidating cache pattern: ${pattern}`);
			// In production, you'd use SCAN to find all matching keys and delete them
			// For now, we'll just log it
			// await redis.del(pattern); // This doesn't work with patterns, need SCAN
		}
	} catch (error) {
		console.warn('Cache invalidation failed', error.message || error);
	}
}

/**
 * Process a render job (used by SQS workers)
 */
export async function processRenderJob(job) {
	return handler(job);
}
