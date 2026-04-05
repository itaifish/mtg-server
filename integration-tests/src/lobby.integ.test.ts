import {
	CreateGameCommand,
	JoinGameCommand,
	LeaveGameCommand,
	ListGamesCommand,
	GetGameStateCommand,
	SetReadyCommand,
} from '@mtg-server/client';
import { createClient, isLocal } from './test-helpers';

const client = createClient();

const SIMPLE_DECK = [
	{ cardName: 'Forest', count: 17 },
	{ cardName: 'Grizzly Bears', count: 13 },
];

describe('ListGames', () => {
	it('lists created games', async () => {
		const create = await client.send(
			new CreateGameCommand({ format: 'STANDARD', playerName: 'Alice', decklist: SIMPLE_DECK }),
		);

		const list = await client.send(new ListGamesCommand({}));
		const found = list.games!.find((g) => g.gameId === create.gameId);
		expect(found).toBeDefined();
		expect(found!.status).toBe('WAITING_FOR_PLAYERS');
		expect(found!.playerCount).toBe(1);
	});

	it('filters by status', async () => {
		await client.send(
			new CreateGameCommand({ format: 'STANDARD', playerName: 'Alice', decklist: SIMPLE_DECK }),
		);

		const waiting = await client.send(new ListGamesCommand({ status: 'WAITING_FOR_PLAYERS' }));
		expect(waiting.games!.length).toBeGreaterThanOrEqual(1);
		for (const game of waiting.games!) {
			expect(game.status).toBe('WAITING_FOR_PLAYERS');
		}
	});
});

describe('LeaveGame', () => {
	it('player can leave a lobby', async () => {
		const create = await client.send(
			new CreateGameCommand({ format: 'STANDARD', playerName: 'Alice', decklist: SIMPLE_DECK }),
		);
		const join = await client.send(
			new JoinGameCommand({ gameId: create.gameId!, playerName: 'Bob', decklist: SIMPLE_DECK }),
		);

		const result = await client.send(
			new LeaveGameCommand({ gameId: create.gameId!, playerId: join.playerId! }),
		);
		expect(result.playersRemaining).toBe(1);

		const state = await client.send(new GetGameStateCommand({ gameId: create.gameId! }));
		expect(state.players).toHaveLength(1);
		expect(state.players![0].name).toBe('Alice');
	});

	it('game is deleted when last player leaves', async () => {
		const create = await client.send(
			new CreateGameCommand({ format: 'STANDARD', playerName: 'Alice', decklist: SIMPLE_DECK }),
		);

		const result = await client.send(
			new LeaveGameCommand({ gameId: create.gameId!, playerId: create.playerId! }),
		);
		expect(result.playersRemaining).toBe(0);

		await expect(
			client.send(new GetGameStateCommand({ gameId: create.gameId! })),
		).rejects.toThrow();
	});

	it('cannot leave a game that has started', async () => {
		const create = await client.send(
			new CreateGameCommand({ format: 'STANDARD', playerName: 'Alice', decklist: SIMPLE_DECK }),
		);
		const join = await client.send(
			new JoinGameCommand({ gameId: create.gameId!, playerName: 'Bob', decklist: SIMPLE_DECK }),
		);

		await client.send(
			new SetReadyCommand({ gameId: create.gameId!, playerId: create.playerId!, ready: true }),
		);
		await client.send(
			new SetReadyCommand({ gameId: create.gameId!, playerId: join.playerId!, ready: true }),
		);

		await expect(
			client.send(new LeaveGameCommand({ gameId: create.gameId!, playerId: create.playerId! })),
		).rejects.toThrow();
	});
});

describe('Lobby API key enforcement', () => {
	const noKeyClient = createClient({ withApiKey: false });

	(isLocal ? it.skip : it)('ListGames requires API key', async () => {
		await expect(noKeyClient.send(new ListGamesCommand({}))).rejects.toThrow();
	});

	(isLocal ? it.skip : it)('LeaveGame requires API key', async () => {
		await expect(
			noKeyClient.send(new LeaveGameCommand({ gameId: 'fake', playerId: 'fake' })),
		).rejects.toThrow();
	});

	(isLocal ? it.skip : it)('JoinGame requires API key', async () => {
		await expect(
			noKeyClient.send(
				new JoinGameCommand({ gameId: 'fake', playerName: 'test', decklist: SIMPLE_DECK }),
			),
		).rejects.toThrow();
	});
});
