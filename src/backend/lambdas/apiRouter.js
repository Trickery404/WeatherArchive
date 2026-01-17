import { handler as presignHandler } from './presign.js';
import { handler as ingestHandler } from './ingest.js';
import { handler as getCityImagesHandler } from './getCityImages.js';
import { handler as renderVideoHandler } from './renderVideoWorker.js';
import { errorResponse, handleOptions } from './apiGatewayHelpers.js';

/**
 * API Router Lambda
 * Central entry point for API Gateway HTTP API
 * Routes requests to appropriate handlers based on path and method
 */
export async function handler(event) {
	console.log('API Router received request:', {
		path: event.path || event.rawPath,
		method: event.httpMethod || event.requestContext?.http?.method
	});

	// Handle CORS preflight
	const method = event.httpMethod || event.requestContext?.http?.method;
	if (method === 'OPTIONS') {
		return handleOptions();
	}

	// Extract path and method
	const path = event.path || event.rawPath || event.requestContext?.http?.path || '';
	const httpMethod = method || 'GET';

	// Route to appropriate handler
	try {
		// POST /presign-upload or /api/presign
		if ((path === '/presign-upload' || path === '/api/presign') && httpMethod === 'POST') {
			return await presignHandler(event);
		}

		// POST /ingest or /api/ingest
		if ((path === '/ingest' || path === '/api/ingest') && httpMethod === 'POST') {
			return await ingestHandler(event);
		}

		// GET /cities/{city}/images or /api/cities/{city}/images
		if (path.includes('/cities/') && path.includes('/images') && httpMethod === 'GET') {
			return await getCityImagesHandler(event);
		}

		// GET /cities or /api/cities (list all cities)
		if ((path === '/cities' || path === '/api/cities') && httpMethod === 'GET') {
			return await listCitiesHandler(event);
		}

		// POST /render/start or /api/render/start
		if ((path === '/render/start' || path === '/api/render/start') && httpMethod === 'POST') {
			return await renderVideoHandler(event);
		}

		// GET /health or /api/health (health check)
		if (path === '/health' || path === '/api/health') {
			return {
				statusCode: 200,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					status: 'healthy',
					timestamp: new Date().toISOString(),
					service: 'WeatherArchive API'
				})
			};
		}

		// No matching route
		return errorResponse(404, 'Not Found', `No handler for ${httpMethod} ${path}`);
	} catch (error) {
		console.error('Router error:', error);
		return errorResponse(500, 'Internal Server Error', error.message);
	}
}

/**
 * List all available cities
 * Public endpoint
 */
async function listCitiesHandler(event) {
	// In production, this could query DynamoDB for unique cities
	// For now, return a static list of European capitals
	const cities = [
		{ slug: 'vienna', name: 'Vienna', country: 'Austria' },
		{ slug: 'paris', name: 'Paris', country: 'France' },
		{ slug: 'berlin', name: 'Berlin', country: 'Germany' },
		{ slug: 'rome', name: 'Rome', country: 'Italy' },
		{ slug: 'madrid', name: 'Madrid', country: 'Spain' },
		{ slug: 'london', name: 'London', country: 'United Kingdom' },
		{ slug: 'amsterdam', name: 'Amsterdam', country: 'Netherlands' },
		{ slug: 'prague', name: 'Prague', country: 'Czech Republic' },
		{ slug: 'budapest', name: 'Budapest', country: 'Hungary' },
		{ slug: 'warsaw', name: 'Warsaw', country: 'Poland' }
	];

	return {
		statusCode: 200,
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*'
		},
		body: JSON.stringify({ cities, count: cities.length })
	};
}
