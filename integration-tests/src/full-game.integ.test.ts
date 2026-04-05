import {
	CreateGameCommand,
	JoinGameCommand,
	SetReadyCommand,
	GetGameStateCommand,
	SubmitActionCommand,
} from '@mtg-server/client';
import { createClient } from './test-helpers';

const GREEN_DECK = [
	{ cardName: 'Forest', count: 17 },
	{ cardName: 'Grizzly Bears', count: 13 },
];

describe('Full game simulation', () => {
	const client = createClient();
	let gameId: string;
	let aliceId: string;
	let bobId: string;

	it('creates a game and both players join', async () => {
		const create = await client.send(
			new CreateGameCommand({
				format: 'STANDARD',
				playerName: 'Alice',
				decklist: GREEN_DECK,
			}),
		);
		gameId = create.gameId!;
		aliceId = create.playerId!;

		const join = await client.send(
			new JoinGameCommand({ gameId, playerName: 'Bob', decklist: GREEN_DECK }),
		);
		bobId = join.playerId!;

		const state = await client.send(new GetGameStateCommand({ gameId }));
		expect(state.players).toHaveLength(2);
		expect(state.status).toBe('WAITING_FOR_PLAYERS');
	});

	it('both players ready up', async () => {
		await client.send(new SetReadyCommand({ gameId, playerId: aliceId, ready: true }));
		const result = await client.send(
			new SetReadyCommand({ gameId, playerId: bobId, ready: true }),
		);
		expect(result.allReady).toBe(true);
		expect(result.status).toBe('CHOOSING_PLAY_ORDER');
	});

	it('chosen player picks who goes first', async () => {
		// Try alice — if she's not the chooser, try bob
		try {
			await client.send(
				new SubmitActionCommand({
					gameId,
					playerId: aliceId,
					action: { chooseFirstPlayer: { firstPlayerId: aliceId } },
				}),
			);
		} catch {
			await client.send(
				new SubmitActionCommand({
					gameId,
					playerId: bobId,
					action: { chooseFirstPlayer: { firstPlayerId: aliceId } },
				}),
			);
		}

		const state = await client.send(new GetGameStateCommand({ gameId }));
		expect(state.status).toBe('MULLIGAN');
	});

	it('both players keep their hands and game starts', async () => {
		await client.send(
			new SubmitActionCommand({
				gameId,
				playerId: aliceId,
				action: { keepHand: {} },
			}),
		);
		const result = await client.send(
			new SubmitActionCommand({
				gameId,
				playerId: bobId,
				action: { keepHand: {} },
			}),
		);
		expect(result.status).toBe('IN_PROGRESS');
	});

	it('active player can pass priority', async () => {
		// Alice is first player, pass priority to advance phases
		const result = await client.send(
			new SubmitActionCommand({
				gameId,
				playerId: aliceId,
				action: { passPriority: {} },
			}),
		);
		expect(result.actionCount).toBeGreaterThan(0);
	});

	it('a player can concede and game ends', async () => {
		const result = await client.send(
			new SubmitActionCommand({
				gameId,
				playerId: bobId,
				action: { concede: {} },
			}),
		);
		expect(result.status).toBe('FINISHED');
	});
});
