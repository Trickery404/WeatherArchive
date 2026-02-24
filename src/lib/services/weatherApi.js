import { PUBLIC_API_URL, PUBLIC_API_KEY } from '$env/static/public';

const API_URL = PUBLIC_API_URL || 'https://j7gfdg5i29.execute-api.us-east-1.amazonaws.com/dev';
const API_KEY = PUBLIC_API_KEY;

// Map used to deduplicate identical in-flight requests: url -> Promise
const pendingRequests = new Map();

/**
 * Fetch images (or video selection) for a city.
 * - Validates parameters early
 * - Sends API key in header
 * - Deduplicates concurrent identical requests
 * - Returns the JSON payload from the API
 *
 * @param {string} citySlug - City slug (e.g., "vienna", "amsterdam")
 * @param {string|null} [date] - Optional date filter (YYYY-MM-DD)
 * @param {number|null} [hour] - Optional hour filter (0-23)
 * @returns {Promise<Object>} API response JSON
 */
export async function fetchCityImages(citySlug, date = null, hour = null) {
	// Fail fast if API key is missing (avoids confusing 403/500 responses)
	if (!API_KEY) {
		const error = new Error('Missing PUBLIC_API_KEY environment variable. Check .env or deployment config.');
		console.error('[API] Configuration Error:', error.message);
		throw error;
	}

	// Parameter validation
	if (!citySlug || typeof citySlug !== 'string') {
		const error = new Error('Invalid citySlug parameter (must be non-empty string)');
		console.error('[API] Parameter Error:', error.message);
		throw error;
	}

	if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		const error = new Error(`Invalid date format: "${date}". Expected YYYY-MM-DD (e.g., "2026-02-16")`);
		console.error('[API] Parameter Error:', error.message);
		throw error;
	}

	if (hour !== null && hour !== undefined) {
		const hourNum = Number(hour);
		if (isNaN(hourNum) || hourNum < 0 || hourNum > 23) {
			const error = new Error(`Invalid hour: "${hour}". Must be between 0-23`);
			console.error('[API] Parameter Error:', error.message);
			throw error;
		}
	}

	// Build query string with proper encoding
	let url = `${API_URL}/queryWeatherData?city=${encodeURIComponent(citySlug)}`;
	if (date) url += `&date=${encodeURIComponent(date)}`;
	if (hour !== null && hour !== undefined) url += `&hour=${encodeURIComponent(String(hour))}`;

	// If an identical request is already in-flight, return its promise (dedupe)
	if (pendingRequests.has(url)) {
		console.log('[API] DEDUPLICATED - Reusing pending request:', url);
		return pendingRequests.get(url);
	}

	// Create and store the Promise for this request
	const requestPromise = (async () => {
		try {
			console.log('[API] NEW REQUEST:', url);
			console.log('[API] Request Details:', {
				citySlug,
				date: date || 'all',
				hour: hour !== null && hour !== undefined ? hour : 'all',
				hasApiKey: !!API_KEY
			});

			// x-api-key must be sent as a header (not as a query parameter)
			const response = await fetch(url, {
				method: 'GET',
				headers: {
					'x-api-key': API_KEY
				}
			});

			if (!response.ok) {
				let errorDetails = '';
				let errorBody = null;
				try {
					errorBody = await response.json();
					errorDetails = errorBody.error || errorBody.message || '';
				} catch {
					errorDetails = response.statusText;
				}

				console.error('[API] Request Failed:', {
					status: response.status,
					statusText: response.statusText,
					url: url.replace(/x-api-key=[^&]+/, 'x-api-key=***'),
					errorDetails,
					errorBody
				});

				if (response.status === 400) throw new Error(`Bad Request: ${errorDetails}`);
				if (response.status === 404) throw new Error(`Data not found: ${errorDetails}`);
				if (response.status === 403) throw new Error(`Access denied: Check API key configuration. Status: ${response.status}`);
				if (response.status >= 500) throw new Error(`Server error: ${errorDetails} (Status: ${response.status})`);
				throw new Error(`API Error: ${response.status} - ${errorDetails}`);
			}

			const data = await response.json();

			if (!data || typeof data !== 'object') {
				const error = new Error('Invalid API response format (expected JSON object)');
				console.error('[API] Response Validation Error:', error.message);
				throw error;
			}

			console.log(`[Cache] Success - Source: ${data.source || 'unknown'}`);
			console.log(`[Cache] Cached: ${data.cached ?? 'unknown'}`);
			console.log(`[Cache] Count: ${data.count ?? 0}`);

			return data;
		} catch (error) {
			console.error('[API] Exception caught:', {
				message: error.message,
				name: error.name,
				stack: error.stack,
				url: url.replace(/x-api-key=[^&]+/, 'x-api-key=***')
			});
			throw error;
		} finally {
			// Ensure the pending promise entry is removed when request completes (success or error)
			pendingRequests.delete(url);
		}
	})();

	pendingRequests.set(url, requestPromise);
	return requestPromise;
}