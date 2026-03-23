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
