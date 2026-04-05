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
