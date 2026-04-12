import {
	CreateGameCommand,
	JoinGameCommand,
	LeaveGameCommand,
	SetReadyCommand,
	GetGameStateCommand,
	GetLegalActionsCommand,
	SubmitActionCommand,
} from '@mtg-server/client';
import type {
	GetGameStateCommandOutput,
	SubmitActionCommandOutput,
	LegalAction,
	ActionInput,
	DecklistEntry,
} from '@mtg-server/client';

import { createClient } from './test-helpers';

const client = createClient();

export interface GameSetup {
	gameId: string;
	aliceId: string;
	bobId: string;
}

export async function getState(gameId: string, perspectivePlayerId?: string): Promise<GetGameStateCommandOutput> {
	return client.send(new GetGameStateCommand({ gameId, perspectivePlayerId }));
}

export async function getLegalActions(gameId: string, playerId: string): Promise<LegalAction[]> {
	const result = await client.send(new GetLegalActionsCommand({ gameId, playerId }));
	return result.actions ?? [];
}

export async function submitAction(
	gameId: string,
	playerId: string,
	action: ActionInput,
): Promise<SubmitActionCommandOutput> {
	return client.send(new SubmitActionCommand({ gameId, playerId, action }));
}

export async function passPriority(
	gameId: string,
	playerId: string,
): Promise<SubmitActionCommandOutput> {
	return submitAction(gameId, playerId, { passPriority: {} });
}

export async function setupGame(decklist: DecklistEntry[]): Promise<GameSetup> {
	const create = await client.send(
		new CreateGameCommand({
			format: 'STANDARD',
			gameName: 'Test Game',
			playerName: 'Alice',
			decklist,
		}),
	);
	const join = await client.send(
		new JoinGameCommand({ gameId: create.gameId!, playerName: 'Bob', decklist }),
	);
	const gameId = create.gameId!;
	const aliceId = create.playerId!;
	const bobId = join.playerId!;

	// Ready up
	await client.send(new SetReadyCommand({ gameId, playerId: aliceId, ready: true }));
	await client.send(new SetReadyCommand({ gameId, playerId: bobId, ready: true }));

	// Choose first player — query who the chooser is
	const state = await getState(gameId);
	const chooserId = state.playOrderChooserId!;
	await submitAction(gameId, chooserId, {
		chooseFirstPlayer: { firstPlayerId: aliceId },
	});

	// Both keep
	await submitAction(gameId, aliceId, { keepHand: {} });
	await submitAction(gameId, bobId, { keepHand: {} });

	return { gameId, aliceId, bobId };
}

export function findAction(actions: LegalAction[], type: string): LegalAction | undefined {
	return actions.find((a) => a.actionType === type);
}

export function findAllActions(actions: LegalAction[], type: string): LegalAction[] {
	return actions.filter((a) => a.actionType === type);
}

/// Pass priority for both players until the game state changes
/// (turn advances, stack resolves, etc.) or max iterations reached.
export async function passBothUntilChange(
	gameId: string,
	aliceId: string,
	bobId: string,
	maxPasses = 20,
): Promise<GetGameStateCommandOutput> {
	const initial = await getState(gameId);
	for (let i = 0; i < maxPasses; i++) {
		const state = await getState(gameId);
		if (state.status === 'FINISHED') return state;
		if (state.actionCount! > initial.actionCount! + i * 2 + 2) return state;

		if (state.priorityPlayerId === aliceId) {
			await passPriority(gameId, aliceId);
		} else if (state.priorityPlayerId === bobId) {
			await passPriority(gameId, bobId);
		} else {
			break;
		}
	}
	return getState(gameId);
}

/// Clean up a game by having all players leave (if in lobby) or concede.
export async function cleanupGame(gameId: string, playerIds: string[]): Promise<void> {
	try {
		const state = await getState(gameId);
		if (state.status === 'WAITING_FOR_PLAYERS' || state.status === 'CHOOSING_PLAY_ORDER') {
			for (const pid of playerIds) {
				try {
					await client.send(new LeaveGameCommand({ gameId, playerId: pid }));
				} catch {
					// already left or game deleted
				}
			}
		} else {
			// Game in progress — concede with first living player
			for (const pid of playerIds) {
				try {
					await submitAction(gameId, pid, { concede: {} });
				} catch {
					// already lost or game over
				}
			}
		}
	} catch {
		// game already deleted
	}
}
