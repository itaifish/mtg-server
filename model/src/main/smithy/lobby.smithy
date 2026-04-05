$version: "2.0"

namespace com.mtg.server

use smithy.framework#ValidationException

// --- Lobby Operations ---
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
    gameName: String

    @required
    playerName: String

    @required
    decklist: Decklist
}

@output
structure CreateGameOutput {
    @required
    gameId: String

    @required
    playerId: String
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

    @required
    decklist: Decklist
}

@output
structure JoinGameOutput {
    @required
    playerId: String
}

/// Leave a game lobby. Only allowed during WAITING_FOR_PLAYERS.
/// If the last player leaves, the game is deleted.
@http(method: "POST", uri: "/games/{gameId}/leave")
operation LeaveGame {
    input: LeaveGameInput
    output: LeaveGameOutput
    errors: [
        ValidationException
        NotFoundError
        ServerError
    ]
}

@input
structure LeaveGameInput {
    @required
    @httpLabel
    gameId: String

    @required
    playerId: String
}

@output
structure LeaveGameOutput {
    @required
    gameId: String

    @required
    playersRemaining: Integer
}

/// List available game lobbies.
@readonly
@http(method: "GET", uri: "/games")
operation ListGames {
    input: ListGamesInput
    output: ListGamesOutput
    errors: [
        ServerError
    ]
}

@input
structure ListGamesInput {
    @httpQuery("status")
    status: GameStatus

    @httpQuery("search")
    search: String

    @httpQuery("limit")
    limit: Integer

    @httpQuery("offset")
    offset: Integer
}

@output
structure ListGamesOutput {
    @required
    games: GameSummaryList
}

list GameSummaryList {
    member: GameSummary
}

structure GameSummary {
    @required
    gameId: String

    @required
    name: String

    @required
    status: GameStatus

    @required
    playerCount: Integer

    @required
    format: GameFormat
}

/// Mark a player as ready. When all players are ready, the game starts
/// and transitions to the mulligan phase.
@http(method: "POST", uri: "/games/{gameId}/ready")
operation SetReady {
    input: SetReadyInput
    output: SetReadyOutput
    errors: [
        ValidationException
        NotFoundError
        ServerError
    ]
}

@input
structure SetReadyInput {
    @required
    @httpLabel
    gameId: String

    @required
    playerId: String

    @required
    ready: Boolean
}

@output
structure SetReadyOutput {
    @required
    gameId: String

    @required
    allReady: Boolean

    @required
    status: GameStatus
}
