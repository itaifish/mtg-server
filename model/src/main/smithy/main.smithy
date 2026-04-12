$version: "2.0"

namespace com.mtg.server

use aws.protocols#restJson1

@title("Magic: The Gathering Game Server")
@restJson1
service MtgService {
    version: "2026-03-22"
    operations: [
        // Health
        Ping
        // Lobby
        CreateGame
        JoinGame
        LeaveGame
        ListGames
        SetReady
        // Gameplay
        GetGameState
        GetCardImage
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
    CHOOSING_PLAY_ORDER
    MULLIGAN
    IN_PROGRESS
    FINISHED
}

enum GamePhase {
    UNTAP
    UPKEEP
    DRAW
    PRECOMBAT_MAIN
    BEGINNING_OF_COMBAT
    DECLARE_ATTACKERS
    DECLARE_BLOCKERS
    COMBAT_DAMAGE
    END_OF_COMBAT
    POSTCOMBAT_MAIN
    END_STEP
    CLEANUP
}

// --- Shared Structures ---
structure DecklistEntry {
    @required
    cardName: String

    @required
    count: Integer
}

list Decklist {
    member: DecklistEntry
}

structure PlayerInfo {
    @required
    playerId: String

    @required
    name: String

    @required
    lifeTotal: Integer

    @required
    ready: Boolean

    @required
    handSize: Integer

    @required
    librarySize: Integer

    @required
    poisonCounters: Integer

    /// How many times this player has mulliganed (during mulligan phase).
    @required
    mulliganCount: Integer

    /// Whether this player has kept their hand (during mulligan phase).
    @required
    hasKept: Boolean

    /// CR 107.14 — Energy counters.
    @required
    energy: Integer

    /// Current mana in the player's mana pool.
    @required
    manaPool: ManaPoolInfo
}

structure ManaPoolInfo {
    @required
    white: ManaPoolSlotInfo

    @required
    blue: ManaPoolSlotInfo

    @required
    black: ManaPoolSlotInfo

    @required
    red: ManaPoolSlotInfo

    @required
    green: ManaPoolSlotInfo

    @required
    colorless: ManaPoolSlotInfo
}

structure ManaPoolSlotInfo {
    @required
    unrestricted: Integer

    @required
    restricted: RestrictedManaList
}

list RestrictedManaList {
    member: RestrictedManaInfo
}

structure RestrictedManaInfo {
    @required
    amount: Integer

    @required
    restriction: String
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

@error("client")
@httpError(400)
structure IllegalActionError {
    @required
    message: String
}
