import { MtgServiceClient, ServiceInputTypes, ServiceOutputTypes } from '@mtg-server/client';
import { HttpRequest } from '@smithy/protocol-http';
import type { BuildMiddleware } from '@smithy/types';

export const API_URL = process.env.API_URL!;
export const API_KEY = process.env.INTEG_TEST_API_KEY;
export const isLocal = !API_KEY;

function apiKeyMiddleware(apiKey: string): BuildMiddleware<ServiceInputTypes, ServiceOutputTypes> {
	return (next) => (args) => {
		if (HttpRequest.isInstance(args.request)) {
			args.request.headers['x-api-key'] = apiKey;
		}
		return next(args);
	};
}

export function createClient(): MtgServiceClient {
	const client = new MtgServiceClient({ endpoint: API_URL });
	if (API_KEY) {
		client.middlewareStack.add(apiKeyMiddleware(API_KEY), {
			step: 'build',
			name: 'apiKeyHeader',
		});
	}
	return client;
}
