import { setupGame, getState, submitAction, passPriority, cleanupGame } from './game-helpers';
import type { DecklistEntry } from '@mtg-server/client';

const deck: DecklistEntry[] = [
	{ cardName: 'Sacred Foundry', count: 4 },
	{ cardName: 'Arena of Glory', count: 4 },
	{ cardName: 'Plains', count: 26 },
	{ cardName: 'Mountain', count: 26 },
];

let gameId: string;
let aliceId: string;
let bobId: string;

afterAll(async () => {
	if (gameId) await cleanupGame(gameId, [aliceId, bobId]);
});

describe('replacement effects', () => {
	beforeAll(async () => {
		const setup = await setupGame(deck);
		gameId = setup.gameId;
		aliceId = setup.aliceId;
		bobId = setup.bobId;
	});

	it('should show pending choice when playing a shock land', async () => {
		let foundry: number | undefined;

		for (let i = 0; i < 100; i++) {
			const state = await getState(gameId);
			if (state.status === 'FINISHED') break;

			const priorityId = state.priorityPlayerId;
			if (!priorityId) break;

			const canPlayLand =
				priorityId === state.activePlayerId &&
				(state.phase === 'PRECOMBAT_MAIN' || state.phase === 'POSTCOMBAT_MAIN') &&
				(state.stack ?? []).length === 0 &&
				state.landsPlayedThisTurn === 0;

			if (canPlayLand) {
				const playerState = await getState(gameId, priorityId);
				const sf = (playerState.hand ?? []).find((c) => c.name === 'Sacred Foundry');

				if (sf) {
					foundry = sf.objectId!;

					await submitAction(gameId, priorityId, {
						playLand: { objectId: foundry },
					});

					const afterPlay = await getState(gameId);
					expect(afterPlay.pendingChoice).toBeDefined();
					expect(afterPlay.pendingChoice!.choiceType).toBe('YES_NO');
					expect(afterPlay.pendingChoice!.playerId).toBe(priorityId);

					// Answer no — enters tapped
					await submitAction(gameId, priorityId, {
						makeChoice: { yesNo: false },
					});

					const afterChoice = await getState(gameId);
					expect(afterChoice.pendingChoice).toBeUndefined();

					const sfOnField = afterChoice.battlefield?.find(
						(p) => p.objectId === foundry,
					);
					expect(sfOnField).toBeDefined();
					expect(sfOnField!.tapped).toBe(true);

					console.log('Sacred Foundry entered tapped after declining to pay life');
					break;
				}
			}

			await passPriority(gameId, priorityId);
		}

		expect(foundry).toBeDefined();
	});
});
