$version: "2.0"

namespace com.mtg.server

use smithy.framework#ValidationException

// --- Gameplay Operations ---
@readonly
@http(method: "GET", uri: "/games/{gameId}")
operation GetGameState {
    input: GetGameStateInput
    output: GetGameStateOutput
    errors: [
        ValidationException
        NotFoundError
        ServerError
    ]
}

@input
structure GetGameStateInput {
    @required
    @httpLabel
    gameId: String

    @httpQuery("perspective")
    perspectivePlayerId: String
}

@output
structure GetGameStateOutput {
    @required
    gameId: String

    @required
    status: GameStatus

    @required
    players: PlayerList

    @required
    turnNumber: Integer

    @required
    actionCount: Integer
}

/// Submit a game action.
@http(method: "POST", uri: "/games/{gameId}/actions")
operation SubmitAction {
    input: SubmitActionInput
    output: SubmitActionOutput
    errors: [
        ValidationException
        NotFoundError
        IllegalActionError
        ServerError
    ]
}

@input
structure SubmitActionInput {
    @required
    @httpLabel
    gameId: String

    @required
    playerId: String

    @required
    action: ActionInput

    /// If true, the player retains priority after the action instead of
    /// automatically passing. Defaults to false (auto-pass). CR 117.3c
    holdPriority: Boolean
}

union ActionInput {
    passPriority: PassPriorityAction
    playLand: PlayLandAction
    chooseFirstPlayer: ChooseFirstPlayerAction
    keepHand: KeepHandAction
    mulligan: MulliganAction
    concede: ConcedeAction
}

structure PassPriorityAction {}

structure PlayLandAction {
    @required
    objectId: Long
}

/// CR 103.1 — The chosen player picks who goes first.
structure ChooseFirstPlayerAction {
    @required
    firstPlayerId: String
}

/// Keep the current hand. During mulligan phase, if the player has mulliganed
/// N times, they must put N cards from hand on the bottom of their library.
structure KeepHandAction {
    /// Object IDs of cards to put on the bottom (required if mulligan count > 0).
    cardsToBottom: ObjectIdList
}

/// Mulligan: shuffle hand back into library and draw 7 new cards.
structure MulliganAction {}

structure ConcedeAction {}

list ObjectIdList {
    member: Long
}

@output
structure SubmitActionOutput {
    @required
    gameId: String

    @required
    actionCount: Integer

    @required
    status: GameStatus
}

/// Get the legal actions for a player.
@readonly
@http(method: "GET", uri: "/games/{gameId}/legal-actions")
operation GetLegalActions {
    input: GetLegalActionsInput
    output: GetLegalActionsOutput
    errors: [
        ValidationException
        NotFoundError
        ServerError
    ]
}

@input
structure GetLegalActionsInput {
    @required
    @httpLabel
    gameId: String

    @required
    @httpQuery("playerId")
    playerId: String
}

@output
structure GetLegalActionsOutput {
    @required
    gameId: String

    @required
    actions: LegalActionList
}

list LegalActionList {
    member: LegalAction
}

structure LegalAction {
    @required
    actionType: LegalActionType

    objectId: Long
}

enum LegalActionType {
    PASS_PRIORITY
    PLAY_LAND
    CHOOSE_FIRST_PLAYER
    KEEP_HAND
    MULLIGAN
    CONCEDE
}
