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
import type { LegalAction } from '@mtg-server/client';

/// Soul Warden is a third of the deck so one reliably arrives early. The loop below also refuses to
/// cast anything else until a Soul Warden is on the battlefield: a Soul Warden that enters after the
/// other creatures sees nothing enter behind it, gains no life, and leaves the Pridemates at base
/// power, which is what the assertions read.
const SOUL_WARDEN_DECK = [
	{ cardName: 'Plains', count: 20 },
	{ cardName: 'Soul Warden', count: 20 },
	{ cardName: "Ajani's Pridemate", count: 10 },
	{ cardName: 'Savannah Lions', count: 10 },
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
			if (manaAbilities.length > 0 && findAllActions(actions, 'CAST_SPELL').length > 0) {
				const hand = (await getState(gameId, aliceId)).hand ?? [];
				const wardenIds = new Set(
					hand.filter((c) => c.name === 'Soul Warden').map((c) => c.objectId),
				);
				const wardenOnField = (state.battlefield ?? []).some((p) => p.name === 'Soul Warden');

				/// A Soul Warden if one is castable, otherwise anything once a Soul Warden is already
				/// out. Undefined means hold and draw instead of casting out of order.
				const pickCast = (from: LegalAction[]): LegalAction | undefined => {
					const options = findAllActions(from, 'CAST_SPELL');
					return (
						options.find((a) => wardenIds.has(a.objectId)) ??
						(wardenOnField ? options[0] : undefined)
					);
				};

				if (!pickCast(actions)) {
					await passPriority(gameId, aliceId);
					continue;
				}

				// Tap one land first
				await submitAction(gameId, aliceId, {
					activateManaAbility: {
						objectId: manaAbilities[0].objectId!,
						abilityIndex: 0,
					},
				});

				// Try casting with 1 WHITE
				const afterMana = await getLegalActions(gameId, aliceId);
				const cast = pickCast(afterMana);
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
							const cast2 = pickCast(afterMana2);
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
