import { MtgServiceClient } from '@mtg-server/client';
import { HttpRequest } from '@smithy/protocol-http';

export const API_URL = process.env.API_URL!;
export const API_KEY = process.env.INTEG_TEST_API_KEY;
export const isLocal = !API_KEY;

export function createClient({
	withApiKey = true,
}: { withApiKey?: boolean } = {}): MtgServiceClient {
	const client = new MtgServiceClient({ endpoint: API_URL });
	if (withApiKey && API_KEY) {
		// Middleware is inlined (not a standalone typed function) so its type is
		// inferred from the client's own middlewareStack.add() signature. This avoids
		// depending on a separately-resolved @smithy/types, which drifted from the
		// generated SDK's copy and broke the alpha typecheck.
		const apiKey = API_KEY;
		client.middlewareStack.add(
			(next) => (args) => {
				if (HttpRequest.isInstance(args.request)) {
					args.request.headers['x-api-key'] = apiKey;
				}
				return next(args);
			},
			{ step: 'build', name: 'apiKeyHeader' },
		);
	}
	return client;
}
