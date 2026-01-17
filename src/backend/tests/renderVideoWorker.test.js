import { describe, it, expect } from 'vitest';
import { handler } from '../lambdas/renderVideoWorker.js';

describe('Render Video Worker Lambda', () => {
	it('should process valid render job (direct invocation)', async () => {
		const event = {
			city: 'vienna',
			startDate: '2025-01-01',
			endDate: '2025-01-31',
			jobId: 'render-test-001'
		};

		const result = await handler(event);

		expect(result.statusCode).toBe(200);

		const body = JSON.parse(result.body);
		expect(body).toHaveProperty('jobId');
		expect(body).toHaveProperty('message');
	});

	it('should process SQS event format', async () => {
		const event = {
			Records: [
				{
					body: JSON.stringify({
						city: 'paris',
						startDate: '2025-02-01',
						endDate: '2025-02-28'
					})
				}
			]
		};

		const result = await handler(event);

		expect(result.statusCode).toBe(200);

		const body = JSON.parse(result.body);
		expect(body).toBeDefined();
	});

	it('should reject request with missing required fields', async () => {
		const event = {
			city: 'berlin'
			// Missing startDate and endDate
		};

		const result = await handler(event);

		expect(result.statusCode).toBe(400);

		const body = JSON.parse(result.body);
		expect(body).toHaveProperty('error');
	});

	it('should handle API Gateway event format', async () => {
		const event = {
			httpMethod: 'POST',
			body: JSON.stringify({
				city: 'berlin',
				startDate: '2025-03-01',
				endDate: '2025-03-15'
			})
		};

		const result = await handler(event);

		expect(result.statusCode).toBe(200);

		const body = JSON.parse(result.body);
		expect(body).toHaveProperty('jobId');
	});
});
