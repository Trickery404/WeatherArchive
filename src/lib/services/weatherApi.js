// API Service for WeatherArchive
// Handles communication with AWS Lambda queryWeatherData (with Redis caching)

const API_URL = 'https://iuuqxsiemk.execute-api.us-east-1.amazonaws.com/dev';
const API_KEY = 'Gx5CjLcaicw5cAnsjjm44qx88qdEGF02XU7BpzCg';

/**
 * Fetch images for a city (with Redis caching)
 * User Stories 18-22: Redis cache integration
 * @param {string} citySlug - City slug (e.g., "vienna", "amsterdam")
 * @param {string} [date] - Optional date filter (YYYY-MM-DD)
 * @param {number} [hour] - Optional hour filter (0-23)
 * @returns {Promise<{source: string, cached: boolean, count: number, images: Array, city: string, date: string, hour: string}>}
 */
export async function fetchCityImages(citySlug, date = null, hour = null) {
	// Build query parameters
	let url = `${API_URL}/query-weather-data?city=${citySlug}`;

	if (date) {
		url += `&date=${date}`;
	}

	if (hour !== null && hour !== undefined) {
		url += `&hour=${hour}`;
	}

	console.log('[API] Fetching:', url);

	try {
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'x-api-key': API_KEY
				// Note: Cache-Control header removed to avoid CORS issues
				// Redis caching happens server-side, not affected by browser cache
			}
		});

		if (!response.ok) {
			throw new Error(`API Error: ${response.status} - ${response.statusText}`);
		}

		const data = await response.json();

		// Log cache status for debugging
		console.log(`[Cache] Source: ${data.source}`);
		console.log(`[Cache] Cached: ${data.cached}`);
		console.log(`[Cache] Count: ${data.count}`);

		return data;
	} catch (error) {
		console.error('[API] Error:', error);
		throw error;
	}
}

/**
 * Get S3 URL for an image
 * UPDATED: No longer requires s3_bucket parameter (hard-coded to weatherarchive-raw)
 * @param {string} s3Key - S3 key (e.g., "amsterdam/unedited/amsterdam_2026-01-17_06.jpg")
 * @returns {string} Full S3 URL
 */
export function getImageUrl(s3Key) {
	const bucket = 'weatherarchive-raw';  // Hard-coded - single bucket strategy
	const region = 'us-east-1';
	return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
}

/**
 * Get S3 URL for a video
 * @param {string} s3VideoKey - S3 key (e.g., "videos/amsterdam_2026-01-17_10.mp4")
 * @returns {string} Full S3 URL
 */
export function getVideoUrl(s3VideoKey) {
	const bucket = 'weatherarchive-videos';
	const region = 'us-east-1';
	return `https://${bucket}.s3.${region}.amazonaws.com/${s3VideoKey}`;
}

