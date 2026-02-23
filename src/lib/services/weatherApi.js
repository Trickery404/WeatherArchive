// API Service for WeatherArchive
// Handles communication with AWS Lambda queryWeatherData (with Redis caching)

import { PUBLIC_API_URL, PUBLIC_API_KEY } from '$env/static/public';

const API_URL = PUBLIC_API_URL || 'https://j7gfdg5i29.execute-api.us-east-1.amazonaws.com/dev';
const API_KEY = PUBLIC_API_KEY;

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
	let url = `${API_URL}/queryWeatherData?city=${citySlug}`;

	if (date) {
		url += `&date=${date}`;
	}

	if (hour !== null && hour !== undefined) {
		url += `&hour=${hour}`;
	}

	console.log('[API] Fetching:', url);

	try {
		// Send API key in header for authentication
		// Note: Only sending x-api-key to avoid unnecessary CORS preflight
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'x-api-key': API_KEY
			},
			cache: 'default' // Use browser's default caching strategy (no cache-control header)
		});

		if (!response.ok) {
			// Try to get error details from response body
			let errorDetails = '';
			try {
				const errorData = await response.json();
				errorDetails = errorData.error || errorData.message || '';
			} catch {
				errorDetails = response.statusText;
			}

			// Provide user-friendly error messages
			if (response.status === 400) {
				throw new Error(`Bad Request: ${errorDetails}`);
			} else if (response.status === 404) {
				throw new Error(`Data not found: ${errorDetails}`);
			} else if (response.status === 403) {
				throw new Error(`Access denied: Check API key configuration`);
			} else if (response.status >= 500) {
				throw new Error(`Server error: ${errorDetails}`);
			} else {
				throw new Error(`API Error: ${response.status} - ${errorDetails}`);
			}
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

// ========================================
// No URL building needed!
// The Lambda already returns signed URLs in the response:
// - signed_edited_url
// - signed_unedited_url
// - signed_video_url
// Just use them directly in your components!
// ========================================

