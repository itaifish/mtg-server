import {
	setupGame,
	getState,
	getLegalActions,
	submitAction,
	passPriority,
	findAction,
	findAllActions,
} from './game-helpers';

const SOUL_WARDEN_DECK = [
	{ cardName: 'Plains', count: 20 },
	{ cardName: 'Soul Warden', count: 10 },
	{ cardName: "Ajani's Pridemate", count: 10 },
	{ cardName: 'Savannah Lions', count: 20 },
];

describe('Triggered abilities', () => {
	it('Soul Warden gains life when creatures enter, Pridemate grows from life gain', async () => {
		const { gameId, aliceId, bobId } = await setupGame(SOUL_WARDEN_DECK);

		let creaturescast = 0;
		const MAX_ITERATIONS = 1000;

		for (let i = 0; i < MAX_ITERATIONS; i++) {
			const state = await getState(gameId);
			if (state.status === 'FINISHED') break;
			if (state.turnNumber! > 30) break;

			const priorityId = state.priorityPlayerId;
			if (!priorityId) break;

			// Bob just passes
			if (priorityId === bobId) {
				await passPriority(gameId, bobId);
				continue;
			}

			const actions = await getLegalActions(gameId, aliceId);

			// Play a plains if possible
			const playLand = findAction(actions, 'PLAY_LAND');
			if (playLand) {
				await submitAction(gameId, aliceId, {
					playLand: { objectId: playLand.objectId! },
				});
				continue;
			}

			// Tap all available mana
			const manaAbilities = findAllActions(actions, 'ACTIVATE_MANA_ABILITY');
			if (manaAbilities.length > 0 && findAction(actions, 'CAST_SPELL')) {
				for (const ma of manaAbilities) {
					await submitAction(gameId, aliceId, {
						activateManaAbility: {
							objectId: ma.objectId!,
							abilityIndex: 0,
						},
					});
				}

				// Now cast a creature
				const afterMana = await getLegalActions(gameId, aliceId);
				const cast = findAction(afterMana, 'CAST_SPELL');
				if (cast) {
					// Soul Warden / Savannah Lions = {W} → 1 symbol
					// Ajani's Pridemate = {1}{W} → 2 symbols
					// Pay each symbol with one WHITE
					const numLands = manaAbilities.length;
					const payment = Array.from({ length: Math.min(numLands, 2) }, () => ({
						paidWith: ['WHITE' as const],
					}));
					try {
						await submitAction(gameId, aliceId, {
							castSpell: {
								objectId: cast.objectId!,
								manaPayment: payment,
								targets: [],
							},
						});
						creaturescast++;
					} catch {
						// Mana payment might not match cost — just continue
					}
				}
				continue;
			}

			await passPriority(gameId, aliceId);
		}

		const finalState = await getState(gameId);
		const alice = finalState.players!.find((p) => p.playerId === aliceId);
		const battlefield = finalState.battlefield ?? [];
		const pridemate = battlefield.find((p) => p.name === "Ajani's Pridemate");
		const soulWarden = battlefield.find((p) => p.name === 'Soul Warden');

		console.log(
			`Creatures cast: ${creaturescast}, ` +
				`Alice life: ${alice?.lifeTotal}, ` +
				`Turn: ${finalState.turnNumber}, ` +
				`Battlefield: ${battlefield.map((p) => `${p.name}(${p.effectivePower}/${p.effectiveToughness})`).join(', ')}, ` +
				`Pridemate power: ${pridemate?.effectivePower ?? 'not on battlefield'}`,
		);

		expect(creaturescast).toBeGreaterThanOrEqual(2);
		expect(alice!.lifeTotal!).toBeGreaterThan(20);

		if (pridemate) {
			expect(pridemate.effectivePower!).toBeGreaterThan(2);
		}
	}, 120000);
});
