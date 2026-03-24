$version: "2.0"

namespace com.mtg.server

use aws.protocols#restJson1
use smithy.framework#ValidationException

/// A server for playing Magic: The Gathering games.
@title("Magic: The Gathering Game Server")
@restJson1
service MtgService {
    version: "2026-03-22"
    operations: [
        Ping
        CreateGame
        JoinGame
        GetGameState
        SubmitAction
        GetLegalActions
    ]
}

// --- Health ---
@readonly
@http(method: "GET", uri: "/ping")
operation Ping {
    input: PingInput
    output: PingOutput
}

@input
structure PingInput {}

@output
structure PingOutput {
    @required
    status: String
}

// --- Game Lifecycle ---
@http(method: "POST", uri: "/games")
operation CreateGame {
    input: CreateGameInput
    output: CreateGameOutput
    errors: [
        ValidationException
        ServerError
    ]
}

@input
structure CreateGameInput {
    @required
    format: GameFormat

    @required
    playerName: String
}

@output
structure CreateGameOutput {
    @required
    gameId: String

    @required
    playerId: String
}

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

    /// The player or spectator requesting the state. Determines what hidden information is visible.
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

@http(method: "POST", uri: "/games/{gameId}/join")
operation JoinGame {
    input: JoinGameInput
    output: JoinGameOutput
    errors: [
        ValidationException
        NotFoundError
        GameFullError
        ServerError
    ]
}

@input
structure JoinGameInput {
    @required
    @httpLabel
    gameId: String

    @required
    playerName: String
}

@output
structure JoinGameOutput {
    @required
    playerId: String
}

// --- Game Actions ---
/// Submit a game action (pass priority, play a land, cast a spell, etc.)
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
}

/// The action a player wants to take.
union ActionInput {
    passPriority: PassPriorityAction
    playLand: PlayLandAction
    concede: ConcedeAction
}

structure PassPriorityAction {}

structure PlayLandAction {
    @required
    objectId: Long
}

structure ConcedeAction {}

@output
structure SubmitActionOutput {
    @required
    gameId: String

    @required
    actionCount: Integer

    @required
    status: GameStatus
}

/// Get the legal actions for a player in the current game state.
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

/// A description of a legal action the player can take.
structure LegalAction {
    @required
    actionType: LegalActionType

    /// For playLand: the objectId of the land card.
    objectId: Long
}

enum LegalActionType {
    PASS_PRIORITY
    PLAY_LAND
    CONCEDE
}

/// The player attempted an action that is not legal in the current game state.
@error("client")
@httpError(400)
structure IllegalActionError {
    @required
    message: String
}

// --- Enums ---
enum GameFormat {
    STANDARD
    MODERN
    LEGACY
    VINTAGE
    COMMANDER
    PIONEER
    PAUPER
    DRAFT
}

enum GameStatus {
    WAITING_FOR_PLAYERS
    IN_PROGRESS
    FINISHED
}

// --- Shared Structures ---
structure PlayerInfo {
    @required
    playerId: String

    @required
    name: String

    @required
    lifeTotal: Integer
}

list PlayerList {
    member: PlayerInfo
}

// --- Errors ---
@error("server")
@httpError(500)
structure ServerError {
    @required
    message: String
}

@error("client")
@httpError(404)
structure NotFoundError {
    @required
    message: String
}

@error("client")
@httpError(409)
structure GameFullError {
    @required
    message: String
}
