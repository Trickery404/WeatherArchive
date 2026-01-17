/**
 * Local Development Server for WeatherArchive Backend
 * Simulates API Gateway + Lambda environment locally
 *
 * Usage: node src/backend/dev-server.js
 * Server will run on http://localhost:3000
 */

import http from 'http';
import { config } from './lib/config.js';

// Import Lambda handlers
import { handler as presignHandler } from './lambdas/presign.js';
import { handler as ingestHandler } from './lambdas/ingest.js';
import { handler as getCityImagesHandler } from './lambdas/getCityImages.js';

const PORT = process.env.PORT || 3000;

// Mock API Gateway event structure
function createApiGatewayEvent(req, body) {
	const url = new URL(req.url, `http://${req.headers.host}`);

	return {
		httpMethod: req.method,
		path: url.pathname,
		queryStringParameters: Object.fromEntries(url.searchParams),
		headers: req.headers,
		body: body ? JSON.stringify(body) : null,
		requestContext: {
			http: {
				method: req.method,
				path: url.pathname
			}
		},
		isBase64Encoded: false
	};
}

// Parse JSON body from request
async function parseBody(req) {
	return new Promise((resolve, reject) => {
		let body = '';
		req.on('data', (chunk) => {
			body += chunk.toString();
		});
		req.on('end', () => {
			try {
				resolve(body ? JSON.parse(body) : null);
			} catch (e) {
				reject(e);
			}
		});
		req.on('error', reject);
	});
}

// Router
async function handleRequest(req, res) {
	// CORS headers
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

	// Handle preflight
	if (req.method === 'OPTIONS') {
		res.writeHead(204);
		res.end();
		return;
	}

	const url = new URL(req.url, `http://${req.headers.host}`);
	const path = url.pathname;

	console.log(`${req.method} ${path}`);

	try {
		let response;
		let body = null;

		// Parse body for POST/PUT requests
		if (['POST', 'PUT'].includes(req.method)) {
			body = await parseBody(req);
		}

		const event = createApiGatewayEvent(req, body);

		// Route to handlers
		if (path === '/api/health' || path === '/health') {
			response = {
				statusCode: 200,
				body: JSON.stringify({
					status: 'healthy',
					service: 'WeatherArchive Backend',
					timestamp: new Date().toISOString(),
					config: {
						rawBucket: config.RAW_BUCKET,
						processedBucket: config.PROCESSED_BUCKET,
						videoBucket: config.VIDEO_BUCKET,
						useRedis: config.USE_REDIS
					}
				})
			};
		} else if (path === '/api/presign' && req.method === 'POST') {
			response = await presignHandler(event);
		} else if (path === '/api/ingest' && req.method === 'POST') {
			response = await ingestHandler(event);
		} else if (path.match(/^\/api\/cities\/[^/]+\/images$/) && req.method === 'GET') {
			response = await getCityImagesHandler(event);
		} else if (path === '/api/cities' && req.method === 'GET') {
			// Mock cities list
			response = {
				statusCode: 200,
				body: JSON.stringify({
					cities: [
						{ name: 'Vienna', slug: 'vienna', country: 'Austria' },
						{ name: 'Berlin', slug: 'berlin', country: 'Germany' },
						{ name: 'Paris', slug: 'paris', country: 'France' },
						{ name: 'London', slug: 'london', country: 'United Kingdom' },
						{ name: 'Rome', slug: 'rome', country: 'Italy' },
						{ name: 'Madrid', slug: 'madrid', country: 'Spain' },
						{ name: 'Amsterdam', slug: 'amsterdam', country: 'Netherlands' },
						{ name: 'Brussels', slug: 'brussels', country: 'Belgium' }
					]
				})
			};
		} else {
			response = {
				statusCode: 404,
				body: JSON.stringify({
					error: 'Not Found',
					message: `Route ${path} not found`
				})
			};
		}

		// Send response
		const statusCode = response.statusCode || 200;
		const responseBody =
			typeof response.body === 'string' ? response.body : JSON.stringify(response.body);

		res.writeHead(statusCode, {
			'Content-Type': 'application/json',
			...(response.headers || {})
		});
		res.end(responseBody);
	} catch (error) {
		console.error('Request error:', error);
		res.writeHead(500, { 'Content-Type': 'application/json' });
		res.end(
			JSON.stringify({
				error: 'Internal Server Error',
				message: error.message,
				stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
			})
		);
	}
}

// Create server
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
	console.log('');
	console.log('🚀 WeatherArchive Backend Development Server');
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log(`📍 Server running at: http://localhost:${PORT}`);
	console.log('');
	console.log('Available endpoints:');
	console.log(`  GET  http://localhost:${PORT}/api/health`);
	console.log(`  GET  http://localhost:${PORT}/api/cities`);
	console.log(`  GET  http://localhost:${PORT}/api/cities/{city}/images`);
	console.log(`  POST http://localhost:${PORT}/api/presign`);
	console.log(`  POST http://localhost:${PORT}/api/ingest`);
	console.log('');
	console.log('📝 API Key (X-API-Key header): ' + config.API_KEY);
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
	console.log('SIGTERM received, shutting down gracefully...');
	server.close(() => {
		console.log('Server closed');
		process.exit(0);
	});
});
