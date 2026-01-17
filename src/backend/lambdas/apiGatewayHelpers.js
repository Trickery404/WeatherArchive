import { getAdapters } from '../adapters/index.js';
import { config } from '../lib/config.js';

const { ddb } = getAdapters();

/**
 * API Key Validator Middleware
 * User Stories 12-13: API key authentication for webcam API
 *
 * This function validates API keys for protected endpoints.
 * In production, API keys should be stored in AWS Secrets Manager or DynamoDB.
 */

// Mock API keys for testing - in production, these should come from Secrets Manager or DynamoDB
const VALID_API_KEYS = new Set([
	'test-camera-key-123',
	'test-admin-key-456',
	'weather-cam-001',
	'weather-cam-002'
]);

/**
 * Validate API key from request headers
 * @param {Object} event - API Gateway event
 * @returns {Object} - { valid: boolean, keyInfo: object, error: string }
 */
export function validateApiKey(event) {
	const headers = event.headers || {};
	const apiKey =
		headers['x-api-key'] ||
		headers['X-API-Key'] ||
		headers['Authorization']?.replace('Bearer ', '') ||
		null;

	if (!apiKey) {
		return {
			valid: false,
			error: 'Missing API key. Include x-api-key header or Authorization: Bearer <key>',
			statusCode: 401
		};
	}

	// In production: query DynamoDB or Secrets Manager
	// For now: check against mock set
	if (VALID_API_KEYS.has(apiKey)) {
		return {
			valid: true,
			keyInfo: {
				key: apiKey,
				type: apiKey.includes('admin') ? 'admin' : 'camera',
				validatedAt: new Date().toISOString()
			}
		};
	}

	return {
		valid: false,
		error: 'Invalid API key',
		statusCode: 403
	};
}

/**
 * API Key validation middleware wrapper
 * Wraps a handler function and validates API key before execution
 */
export function withApiKeyAuth(handler) {
	return async (event) => {
		const validation = validateApiKey(event);

		if (!validation.valid) {
			return {
				statusCode: validation.statusCode || 403,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*'
				},
				body: JSON.stringify({
					error: validation.error,
					message: 'Authentication required'
				})
			};
		}

		// Add keyInfo to event for use in handler
		event.apiKeyInfo = validation.keyInfo;

		// Call the actual handler
		return handler(event);
	};
}

/**
 * Rate limiter for API endpoints
 * In production, this should use DynamoDB or Redis for distributed rate limiting
 */
const rateLimitStore = new Map();

export function checkRateLimit(apiKey, limit = 100, windowSeconds = 60) {
	const now = Date.now();
	const windowMs = windowSeconds * 1000;
	const key = `ratelimit:${apiKey}`;

	if (!rateLimitStore.has(key)) {
		rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
		return { allowed: true, remaining: limit - 1 };
	}

	const data = rateLimitStore.get(key);

	// Reset window if expired
	if (now > data.resetAt) {
		rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
		return { allowed: true, remaining: limit - 1 };
	}

	// Check limit
	if (data.count >= limit) {
		return {
			allowed: false,
			remaining: 0,
			resetAt: data.resetAt,
			retryAfter: Math.ceil((data.resetAt - now) / 1000)
		};
	}

	// Increment
	data.count++;
	return { allowed: true, remaining: limit - data.count };
}

/**
 * Rate limiting middleware wrapper
 */
export function withRateLimit(handler, limit = 100, windowSeconds = 60) {
	return async (event) => {
		const apiKey = event.apiKeyInfo?.key || 'anonymous';
		const rateLimitResult = checkRateLimit(apiKey, limit, windowSeconds);

		if (!rateLimitResult.allowed) {
			return {
				statusCode: 429,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
					'X-RateLimit-Limit': String(limit),
					'X-RateLimit-Remaining': '0',
					'X-RateLimit-Reset': String(Math.floor(rateLimitResult.resetAt / 1000)),
					'Retry-After': String(rateLimitResult.retryAfter)
				},
				body: JSON.stringify({
					error: 'Rate limit exceeded',
					retryAfter: rateLimitResult.retryAfter
				})
			};
		}

		// Add rate limit headers to response
		const response = await handler(event);
		response.headers = {
			...response.headers,
			'X-RateLimit-Limit': String(limit),
			'X-RateLimit-Remaining': String(rateLimitResult.remaining)
		};

		return response;
	};
}

/**
 * CORS headers helper
 */
export function addCorsHeaders(response) {
	return {
		...response,
		headers: {
			...response.headers,
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
			'Access-Control-Max-Age': '86400'
		}
	};
}

/**
 * OPTIONS request handler for CORS preflight
 */
export function handleOptions() {
	return {
		statusCode: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
			'Access-Control-Max-Age': '86400'
		},
		body: ''
	};
}

/**
 * Error response helper with proper HTTP codes
 * User Story 13: Good error codes for webcam
 */
export function errorResponse(statusCode, error, message = null) {
	const errorMap = {
		400: 'Bad Request',
		401: 'Unauthorized',
		403: 'Forbidden',
		404: 'Not Found',
		409: 'Conflict',
		422: 'Unprocessable Entity',
		429: 'Too Many Requests',
		500: 'Internal Server Error',
		502: 'Bad Gateway',
		503: 'Service Unavailable'
	};

	return addCorsHeaders({
		statusCode,
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			error: error || errorMap[statusCode] || 'Error',
			message: message || errorMap[statusCode],
			statusCode,
			timestamp: new Date().toISOString()
		})
	});
}

/**
 * Success response helper
 */
export function successResponse(data, statusCode = 200) {
	return addCorsHeaders({
		statusCode,
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
}

/**
 * Validate required fields in payload
 */
export function validateRequiredFields(payload, requiredFields) {
	const missing = [];
	for (const field of requiredFields) {
		if (
			!payload ||
			payload[field] === undefined ||
			payload[field] === null ||
			payload[field] === ''
		) {
			missing.push(field);
		}
	}

	if (missing.length > 0) {
		return {
			valid: false,
			error: `Missing required fields: ${missing.join(', ')}`
		};
	}

	return { valid: true };
}

/**
 * Parse JSON body safely
 */
export function parseJsonBody(event) {
	if (!event.body) {
		return { success: false, error: 'No body provided' };
	}

	try {
		const parsed = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
		return { success: true, data: parsed };
	} catch (error) {
		return { success: false, error: 'Invalid JSON in request body' };
	}
}
