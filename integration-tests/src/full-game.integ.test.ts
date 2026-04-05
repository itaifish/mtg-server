import {
	setupGame,
	getState,
	submitAction,
	passPriority,
} from './game-helpers';

const GREEN_DECK = [
	{ cardName: 'Forest', count: 17 },
	{ cardName: 'Grizzly Bears', count: 13 },
];

describe('Full game simulation', () => {
	let gameId: string;
	let aliceId: string;
	let bobId: string;

	it('sets up a game through mulligan phase', async () => {
		const setup = await setupGame(GREEN_DECK);
		gameId = setup.gameId;
		aliceId = setup.aliceId;
		bobId = setup.bobId;

		const state = await getState(gameId);
		expect(state.status).toBe('IN_PROGRESS');
		expect(state.activePlayerId).toBe(aliceId);
		expect(state.priorityPlayerId).toBe(aliceId);
	});

	it('active player can pass priority', async () => {
		const result = await passPriority(gameId, aliceId);
		expect(result.actionCount).toBeGreaterThan(0);
	});

	it('a player can concede and game ends', async () => {
		const result = await submitAction(gameId, bobId, { concede: {} });
		expect(result.status).toBe('FINISHED');
	});
});
