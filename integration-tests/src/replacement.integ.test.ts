import {
	setupGame,
	getState,
	submitAction,
	advanceToPrecombatMain,
	cleanupGame,
} from './game-helpers';
import type { DecklistEntry } from '@mtg-server/client';

/// Every card is a Sacred Foundry, so the opening hand always holds one. The server shuffles each
/// game from a random seed and the API exposes no way to pin it, so any mixed deck makes this test
/// a coin flip on the draw. Declining to pay life costs no mana, so a land-only deck loses nothing.
const deck: DecklistEntry[] = [{ cardName: 'Sacred Foundry', count: 60 }];

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
		const state = await advanceToPrecombatMain(gameId);
		expect(state.phase).toBe('PRECOMBAT_MAIN');
		expect(state.priorityPlayerId).toBe(aliceId);

		const aliceView = await getState(gameId, aliceId);
		const foundry = (aliceView.hand ?? []).find((c) => c.name === 'Sacred Foundry');
		expect(foundry).toBeDefined();
		const foundryId = foundry!.objectId!;

		await submitAction(gameId, aliceId, { playLand: { objectId: foundryId } });

		const afterPlay = await getState(gameId);
		expect(afterPlay.pendingChoice).toBeDefined();
		expect(afterPlay.pendingChoice!.choiceType).toBe('YES_NO');
		expect(afterPlay.pendingChoice!.playerId).toBe(aliceId);

		// Answer no — enters tapped
		await submitAction(gameId, aliceId, { makeChoice: { yesNo: false } });

		const afterChoice = await getState(gameId);
		expect(afterChoice.pendingChoice).toBeUndefined();

		const sfOnField = afterChoice.battlefield?.find((p) => p.objectId === foundryId);
		expect(sfOnField).toBeDefined();
		expect(sfOnField!.tapped).toBe(true);
	});
});
