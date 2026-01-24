/**
 * API Service for WeatherArchive Frontend
 * Handles all backend communication with proper error handling
 */

// Environment configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch(endpoint, options = {}) {
	const url = `${API_BASE_URL}${endpoint}`;

	try {
		const response = await fetch(url, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...options.headers
			}
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({
				message: `HTTP ${response.status}: ${response.statusText}`
			}));
			throw new Error(error.message || error.error || 'API request failed');
		}

		return await response.json();
	} catch (error) {
		console.error(`API Error [${endpoint}]:`, error);
		throw error;
	}
}

/**
 * Get list of available cities
 * User Stories 2-3: Autocomplete data source
 */
export async function getCities() {
	if (USE_MOCK_DATA) {
		return getMockCities();
	}

	try {
		const response = await apiFetch('/cities');
		return response.cities || response;
	} catch (error) {
		console.warn('Failed to fetch cities, using fallback');
		return getMockCities();
	}
}

/**
 * Get images and metadata for a specific city and time range
 * User Stories 16-17, 20-21: Cache-aware data retrieval
 */
export async function getCityImages(city, startDate, endDate, options = {}) {
	if (USE_MOCK_DATA) {
		return getMockCityImages(city, startDate, endDate);
	}

	try {
		const params = new URLSearchParams({
			startDate,
			endDate,
			...options
		});

		const response = await apiFetch(`/cities/${city}/images?${params}`);
		return response;
	} catch (error) {
		console.warn(`Failed to fetch images for ${city}, using fallback`);
		return getMockCityImages(city, startDate, endDate);
	}
}

/**
 * Request presigned URL for image upload (webcam use case)
 * User Stories 11-12: Webcam API with authentication
 */
export async function requestPresignedUrl(payload, apiKey) {
	const response = await apiFetch('/presign', {
		method: 'POST',
		headers: {
			'X-API-Key': apiKey
		},
		body: JSON.stringify(payload)
	});

	return response;
}

/**
 * Upload image using presigned URL
 * User Story 14: Store image in S3
 */
export async function uploadImage(presignedUrl, imageFile, contentType) {
	const response = await fetch(presignedUrl, {
		method: 'PUT',
		headers: {
			'Content-Type': contentType
		},
		body: imageFile
	});

	if (!response.ok) {
		throw new Error(`Upload failed: ${response.statusText}`);
	}

	return true;
}

/**
 * Notify backend about completed upload
 * User Stories 14-15: Store metadata in database
 */
export async function notifyIngest(payload, apiKey) {
	const response = await apiFetch('/ingest', {
		method: 'POST',
		headers: {
			'X-API-Key': apiKey
		},
		body: JSON.stringify(payload)
	});

	return response;
}

/**
 * Trigger video rendering for a city and time period
 * User Stories 26-30: Video service
 */
export async function triggerVideoRender(city, startDate, endDate, apiKey) {
	const response = await apiFetch('/render/start', {
		method: 'POST',
		headers: {
			'X-API-Key': apiKey
		},
		body: JSON.stringify({
			city,
			startDate,
			endDate
		})
	});

	return response;
}

// ============================================================================
// MOCK DATA PROVIDERS (for development without backend)
// ============================================================================

function getMockCities() {
	return [
		{ name: 'Vienna', slug: 'vienna', country: 'Austria' },
		{ name: 'Berlin', slug: 'berlin', country: 'Germany' },
		{ name: 'Paris', slug: 'paris', country: 'France' },
		{ name: 'London', slug: 'london', country: 'United Kingdom' },
		{ name: 'Rome', slug: 'rome', country: 'Italy' },
		{ name: 'Madrid', slug: 'madrid', country: 'Spain' },
		{ name: 'Amsterdam', slug: 'amsterdam', country: 'Netherlands' },
		{ name: 'Brussels', slug: 'brussels', country: 'Belgium' }
	];
}

function getMockCityImages(city, startDate, endDate) {
	const images = [];
	const start = new Date(startDate);
	const end = new Date(endDate);

	for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
		const dateStr = d.toISOString().split('T')[0];

		for (let hour = 0; hour < 24; hour++) {
			const hourStr = hour.toString().padStart(2, '0');

			// Generate mock weather data
			const temp = 15 + Math.sin((hour / 24) * Math.PI * 2) * 10;
			const humidity = 60 + Math.random() * 20;
			const pressure = 1010 + Math.random() * 20;

			images.push({
				city,
				captureTime: `${dateStr}T${hourStr}:00:00Z`,
				date: dateStr,
				hour: hourStr,
				s3Bucket: 'weatherarchive-dev-processed',
				s3Key: `processed/${city}/${dateStr}/${hourStr}.jpg`,
				imageUrl: `/images/${city}_${dateStr}_${hourStr}.jpg`,
				temperature: parseFloat(temp.toFixed(1)),
				humidity: Math.floor(humidity),
				airPressure: Math.floor(pressure),
				cameraId: `cam-${city}-001`
			});
		}
	}

	return {
		city,
		startDate,
		endDate,
		totalImages: images.length,
		images,
		cached: false
	};
}

/**
 * Get available dates for a city (for date picker)
 */
export async function getAvailableDates(city) {
	if (USE_MOCK_DATA) {
		return getMockAvailableDates(city);
	}

	try {
		const response = await apiFetch(`/cities/${city}/dates`);
		return response.dates || response;
	} catch (error) {
		console.warn(`Failed to fetch available dates for ${city}, using fallback`);
		return getMockAvailableDates(city);
	}
}

function getMockAvailableDates(city) {
	const dates = [];
	const today = new Date();

	for (let i = 0; i < 30; i++) {
		const d = new Date(today);
		d.setDate(d.getDate() - i);
		dates.push(d.toISOString().split('T')[0]);
	}

	return dates.reverse();
}

/**
 * Health check endpoint
 */
export async function healthCheck() {
	try {
		const response = await apiFetch('/health');
		return response;
	} catch (error) {
		return { status: 'error', message: error.message };
	}
}

