import {
	CreateGameCommand,
	JoinGameCommand,
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

export async function getState(gameId: string): Promise<GetGameStateCommandOutput> {
	return client.send(new GetGameStateCommand({ gameId }));
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
		new CreateGameCommand({ format: 'STANDARD', playerName: 'Alice', decklist }),
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
