import {
	setupGame,
	getState,
	getLegalActions,
	submitAction,
	passPriority,
	findAction,
	findAllActions,
	cleanupGame,
} from './game-helpers';

const SOUL_WARDEN_DECK = [
	{ cardName: 'Plains', count: 20 },
	{ cardName: 'Soul Warden', count: 10 },
	{ cardName: "Ajani's Pridemate", count: 10 },
	{ cardName: 'Savannah Lions', count: 20 },
];

describe('Triggered abilities', () => {
	let gameId: string;
	let aliceId: string;
	let bobId: string;

	afterAll(async () => {
		if (gameId) await cleanupGame(gameId, [aliceId, bobId]);
	});

	it('Soul Warden gains life when creatures enter, Pridemate grows from life gain', async () => {
		const setup = await setupGame(SOUL_WARDEN_DECK);
		gameId = setup.gameId;
		aliceId = setup.aliceId;
		bobId = setup.bobId;

		let creaturescast = 0;
		const MAX_ITERATIONS = 1000;

		for (let i = 0; i < MAX_ITERATIONS; i++) {
			if (i % 10 === 0) await new Promise((r) => setTimeout(r, 50));
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

			// Tap one land and try to cast a 1-mana creature, then try 2-mana
			const manaAbilities = findAllActions(actions, 'ACTIVATE_MANA_ABILITY');
			const castSpell = findAction(actions, 'CAST_SPELL');
			if (manaAbilities.length > 0 && castSpell) {
				// Tap one land first
				await submitAction(gameId, aliceId, {
					activateManaAbility: {
						objectId: manaAbilities[0].objectId!,
						abilityIndex: 0,
					},
				});

				// Try casting with 1 WHITE
				const afterMana = await getLegalActions(gameId, aliceId);
				const cast = findAction(afterMana, 'CAST_SPELL');
				if (cast) {
					try {
						await submitAction(gameId, aliceId, {
							castSpell: {
								objectId: cast.objectId!,
								manaPayment: [{ paidWith: ['WHITE' as const] }],
								targets: [],
							},
						});
						creaturescast++;
						continue;
					} catch {
						// Might need 2 mana — tap another and try again
						if (manaAbilities.length > 1) {
							await submitAction(gameId, aliceId, {
								activateManaAbility: {
									objectId: manaAbilities[1].objectId!,
									abilityIndex: 0,
								},
							});
							const afterMana2 = await getLegalActions(gameId, aliceId);
							const cast2 = findAction(afterMana2, 'CAST_SPELL');
							if (cast2) {
								try {
									await submitAction(gameId, aliceId, {
										castSpell: {
											objectId: cast2.objectId!,
											manaPayment: [
												{ paidWith: ['WHITE' as const] },
												{ paidWith: ['WHITE' as const] },
											],
											targets: [],
										},
									});
									creaturescast++;
								} catch {
									// couldn't cast
								}
							}
						}
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
		expect(soulWarden).toBeDefined();

		if (pridemate) {
			expect(pridemate.effectivePower!).toBeGreaterThan(2);
		}
	}, 120000);
});
