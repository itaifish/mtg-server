import {
	setupGame,
	getState,
	getLegalActions,
	submitAction,
	passPriority,
	findAction,
	cleanupGame,
} from './game-helpers';

const LAND_DECK = [
	{ cardName: 'Island', count: 20 },
	{ cardName: 'Mountain', count: 10 },
];

describe('Mana pool', () => {
	let gameId: string;
	let aliceId: string;
	let bobId: string;

	afterAll(async () => {
		if (gameId) await cleanupGame(gameId, [aliceId, bobId]);
	});

	it('tapping lands adds mana, passing phases empties it', async () => {
		const setup = await setupGame(LAND_DECK);
		gameId = setup.gameId;
		aliceId = setup.aliceId;
		bobId = setup.bobId;

		// Pass to precombat main
		let state = await getState(gameId);
		while (state.phase !== 'PRECOMBAT_MAIN') {
			const pid = state.priorityPlayerId!;
			await passPriority(gameId, pid);
			state = await getState(gameId);
		}

		// Play a land
		let actions = await getLegalActions(gameId, aliceId);
		const playLand = findAction(actions, 'PLAY_LAND');
		expect(playLand).toBeDefined();
		await submitAction(gameId, aliceId, {
			playLand: { objectId: playLand!.objectId! },
		});

		// Tap the land for mana
		actions = await getLegalActions(gameId, aliceId);
		const manaAbility = findAction(actions, 'ACTIVATE_MANA_ABILITY');
		expect(manaAbility).toBeDefined();
		await submitAction(gameId, aliceId, {
			activateManaAbility: {
				objectId: manaAbility!.objectId!,
				abilityIndex: 0,
			},
		});

		// Check mana pool has mana
		state = await getState(gameId);
		const alice = state.players!.find((p) => p.playerId === aliceId)!;
		const pool = alice.manaPool!;
		const totalMana =
			pool.white!.unrestricted! +
			pool.blue!.unrestricted! +
			pool.black!.unrestricted! +
			pool.red!.unrestricted! +
			pool.green!.unrestricted! +
			pool.colorless!.unrestricted!;
		expect(totalMana).toBe(1);
		console.log(
			`Mana pool after tap: W=${pool.white!.unrestricted} U=${pool.blue!.unrestricted} B=${pool.black!.unrestricted} R=${pool.red!.unrestricted} G=${pool.green!.unrestricted} C=${pool.colorless!.unrestricted}`,
		);

		// Pass through phases until mana empties (both players pass)
		for (let i = 0; i < 20; i++) {
			state = await getState(gameId);
			if (state.status === 'FINISHED') break;
			const pid = state.priorityPlayerId;
			if (!pid) break;
			await passPriority(gameId, pid);
		}

		// Mana pool should be empty after phase transition
		state = await getState(gameId);
		const aliceAfter = state.players!.find((p) => p.playerId === aliceId)!;
		const poolAfter = aliceAfter.manaPool!;
		const totalAfter =
			poolAfter.white!.unrestricted! +
			poolAfter.blue!.unrestricted! +
			poolAfter.black!.unrestricted! +
			poolAfter.red!.unrestricted! +
			poolAfter.green!.unrestricted! +
			poolAfter.colorless!.unrestricted!;
		expect(totalAfter).toBe(0);
		console.log(`Mana pool after phase pass: empty=${totalAfter === 0}`);
	}, 30000);
});
