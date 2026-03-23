import {
	MtgServiceClient,
	PingCommand,
	CreateGameCommand,
	GetGameStateCommand,
	JoinGameCommand,
} from '@mtg-server/client';
import type { ServiceInputTypes, ServiceOutputTypes } from '@mtg-server/client';
import { HttpRequest } from '@smithy/protocol-http';
import type { BuildMiddleware } from '@smithy/types';

/**
 * Integration test configuration.
 *
 * API_URL: The API Gateway endpoint (e.g. https://abc123.execute-api.us-east-1.amazonaws.com/test)
 * INTEG_TEST_API_KEY: The actual API key value for authenticated requests
 */
const API_URL = process.env.API_URL!;
const API_KEY = process.env.INTEG_TEST_API_KEY;
const isLocal = !API_KEY;

function apiKeyMiddleware(apiKey: string): BuildMiddleware<ServiceInputTypes, ServiceOutputTypes> {
	return (next) => (args) => {
		if (HttpRequest.isInstance(args.request)) {
			args.request.headers['x-api-key'] = apiKey;
		}
		return next(args);
	};
}

function createClient(apiKey?: string): MtgServiceClient {
	const client = new MtgServiceClient({ endpoint: API_URL });
	if (apiKey) {
		client.middlewareStack.add(apiKeyMiddleware(apiKey), {
			step: 'build',
			name: 'apiKeyHeader',
		});
	}
	return client;
}

describe('API Gateway auth', () => {
	it('/ping succeeds without an API key', async () => {
		const client = createClient();
		const response = await client.send(new PingCommand({}));
		expect(response.status).toBeDefined();
	});

	(isLocal ? it.skip : it)('protected endpoint returns 403 without an API key', async () => {
		const client = createClient();
		await expect(
			client.send(new CreateGameCommand({ format: 'STANDARD', playerName: 'test' })),
		).rejects.toThrow();
	});
});

describe('Game lifecycle', () => {
	let client: MtgServiceClient;

	beforeAll(() => {
		if (!isLocal && !API_KEY) throw new Error('INTEG_TEST_API_KEY environment variable is required');
		client = createClient(API_KEY);
	});

	it('can ping the server', async () => {
		const response = await client.send(new PingCommand({}));
		expect(response.status).toBeDefined();
	});

	it('can create and retrieve a game', async () => {
		const createResponse = await client.send(
			new CreateGameCommand({ format: 'STANDARD', playerName: 'Alice' }),
		);
		expect(createResponse.gameId).toBeDefined();
		expect(createResponse.playerId).toBeDefined();

		const getResponse = await client.send(
			new GetGameStateCommand({ gameId: createResponse.gameId }),
		);
		expect(getResponse.gameId).toBe(createResponse.gameId);
		expect(getResponse.players).toHaveLength(1);
		expect(getResponse.players![0].name).toBe('Alice');
	});

	it('can join an existing game', async () => {
		const createResponse = await client.send(
			new CreateGameCommand({ format: 'STANDARD', playerName: 'Alice' }),
		);

		const joinResponse = await client.send(
			new JoinGameCommand({ gameId: createResponse.gameId, playerName: 'Bob' }),
		);
		expect(joinResponse.playerId).toBeDefined();

		const getResponse = await client.send(
			new GetGameStateCommand({ gameId: createResponse.gameId }),
		);
		expect(getResponse.players).toHaveLength(2);
	});
});
