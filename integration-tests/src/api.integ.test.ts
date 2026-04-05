import {
	PingCommand,
	CreateGameCommand,
	GetGameStateCommand,
	JoinGameCommand,
} from '@mtg-server/client';
import { createClient, isLocal } from './test-helpers';

const SIMPLE_DECK = [
	{ cardName: 'Forest', count: 17 },
	{ cardName: 'Grizzly Bears', count: 13 },
];

describe('API Gateway auth', () => {
	it('/ping succeeds without an API key', async () => {
		const client = createClient({ withApiKey: false });
		const response = await client.send(new PingCommand({}));
		expect(response.status).toBeDefined();
	});

	(isLocal ? it.skip : it)('protected endpoint returns 403 without an API key', async () => {
		const client = createClient({ withApiKey: false });
		await expect(
			client.send(
				new CreateGameCommand({
					format: 'STANDARD',
					gameName: 'Test',
					playerName: 'test',
					decklist: SIMPLE_DECK,
				}),
			),
		).rejects.toThrow();
	});
});

describe('Game lifecycle', () => {
	const client = createClient();

	it('can ping the server', async () => {
		const response = await client.send(new PingCommand({}));
		expect(response.status).toBeDefined();
	});

	it('can create and retrieve a game', async () => {
		const createResponse = await client.send(
			new CreateGameCommand({
				format: 'STANDARD',
				gameName: 'Test',
				playerName: 'Alice',
				decklist: SIMPLE_DECK,
			}),
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
			new CreateGameCommand({
				format: 'STANDARD',
				gameName: 'Test',
				playerName: 'Alice',
				decklist: SIMPLE_DECK,
			}),
		);

		const joinResponse = await client.send(
			new JoinGameCommand({
				gameId: createResponse.gameId,
				playerName: 'Bob',
				decklist: SIMPLE_DECK,
			}),
		);
		expect(joinResponse.playerId).toBeDefined();

		const getResponse = await client.send(
			new GetGameStateCommand({ gameId: createResponse.gameId }),
		);
		expect(getResponse.players).toHaveLength(2);
	});
});
