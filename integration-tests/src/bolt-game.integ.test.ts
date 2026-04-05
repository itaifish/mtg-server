import {
	setupGame,
	getState,
	getLegalActions,
	submitAction,
	passPriority,
	findAction,
} from './game-helpers';

const BOLT_DECK = [
	{ cardName: 'Mountain', count: 20 },
	{ cardName: 'Lightning Bolt', count: 40 },
];

describe('Bolt game', () => {
	it('two players bolt each other until someone dies', async () => {
		const { gameId, aliceId, bobId } = await setupGame(BOLT_DECK);

		const MAX_ITERATIONS = 1000;
		let iterations = 0;

		while (iterations < MAX_ITERATIONS) {
			iterations++;
			const state = await getState(gameId);
			if (state.status === 'FINISHED') break;

			const priorityId = state.priorityPlayerId;
			if (!priorityId) {
				// No one has priority — shouldn't happen during IN_PROGRESS
				break;
			}

			const opponentId = priorityId === aliceId ? bobId : aliceId;
			const actions = await getLegalActions(gameId, priorityId);

			// Play a mountain if we can
			const playLand = findAction(actions, 'PLAY_LAND');
			if (playLand) {
				await submitAction(gameId, priorityId, {
					playLand: { objectId: playLand.objectId! },
				});
				continue;
			}

			// If we have a mana ability and a bolt, tap and bolt the opponent
			const manaAbility = findAction(actions, 'ACTIVATE_MANA_ABILITY');
			const castSpell = findAction(actions, 'CAST_SPELL');

			if (manaAbility && castSpell) {
				// Tap mountain
				await submitAction(gameId, priorityId, {
					activateManaAbility: {
						objectId: manaAbility.objectId!,
						abilityIndex: 0,
					},
				});

				// Cast bolt targeting opponent (holdPriority: false auto-passes)
				await submitAction(gameId, priorityId, {
					castSpell: {
						objectId: castSpell.objectId!,
						manaPayment: [{ paidWith: ['RED'] }],
						targets: [{ player: { playerId: opponentId } }],
					},
				});
				continue;
			}

			// Otherwise pass priority
			await passPriority(gameId, priorityId);
		}

		const finalState = await getState(gameId);
		expect(finalState.status).toBe('FINISHED');

		const loser = finalState.players!.find((p) => p.lifeTotal! <= 0);
		expect(loser).toBeDefined();

		console.log(
			`Bolt game ended after ${iterations} iterations. ` +
				finalState.players!.map((p) => `${p.name}: ${p.lifeTotal} life`).join(', '),
		);
	}, 60000);
});
