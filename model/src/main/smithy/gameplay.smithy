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

    /// The player who currently has priority (whose action we're waiting on).
    priorityPlayerId: String

    /// The active player (whose turn it is).
    activePlayerId: String

    /// The player who gets to choose play order (only during CHOOSING_PLAY_ORDER).
    playOrderChooserId: String

    /// Permanents on the battlefield (visible to all).
    battlefield: PermanentList

    /// Cards in the requesting player's hand (only if perspectivePlayerId is set).
    hand: CardInfoList

    /// Each player's graveyard (public zone, visible to all).
    graveyards: PlayerZoneMap

    /// Exile zone (public, visible to all).
    exile: CardInfoList

    /// Command zone (public, visible to all).
    command: CardInfoList

    /// Stack — spells and abilities waiting to resolve.
    stack: StackEntryList

    /// Current phase/step.
    @required
    phase: GamePhase

    /// Lands played this turn by the active player.
    @required
    landsPlayedThisTurn: Integer

    /// Current combat state, if in combat.
    combat: CombatInfo
}

list CardInfoList {
    member: CardInfo
}

structure CardInfo {
    @required
    objectId: Long

    @required
    name: String

    /// Scryfall oracle ID — used to look up card images from S3.
    @required
    oracleId: String

    @required
    cardTypes: StringList

    /// Mana cost symbols as strings (e.g., ["{1}", "{W}"]).
    manaCost: StringList

    @required
    manaValue: Integer
}

list PermanentList {
    member: PermanentInfo
}

structure PermanentInfo {
    @required
    objectId: Long

    @required
    name: String

    @required
    oracleId: String

    @required
    controller: String

    @required
    owner: String

    @required
    cardTypes: StringList

    @required
    subtypes: StringList

    power: Integer

    toughness: Integer

    /// Effective power after counters.
    effectivePower: Integer

    /// Effective toughness after counters.
    effectiveToughness: Integer

    @required
    tapped: Boolean

    @required
    summoningSick: Boolean

    @required
    damageMarked: Integer

    @required
    counters: CounterList

    @required
    keywords: StringList
}

list StringList {
    member: String
}

structure CounterInfo {
    @required
    counterType: String

    @required
    count: Integer
}

list CounterList {
    member: CounterInfo
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
    castSpell: CastSpellAction
    activateManaAbility: ActivateManaAbilityAction
    declareAttackers: DeclareAttackersAction
    declareBlockers: DeclareBlockersAction
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

/// CR 601 — Cast a spell from hand, paying its mana cost.
structure CastSpellAction {
    @required
    objectId: Long

    /// How each mana symbol in the cost is being paid.
    @required
    manaPayment: ManaPaymentList

    /// CR 601.2c — Targets chosen for the spell.
    targets: TargetList

    /// CR 601.2b — Modal choices (e.g., "choose one" / "choose two").
    modeChoices: IntegerList
}

list ManaPaymentList {
    member: SymbolPaymentEntry
}

/// How a single mana symbol is being paid.
structure SymbolPaymentEntry {
    /// The mana types from the pool used to pay this symbol.
    @required
    paidWith: ManaTypeList
}

list ManaTypeList {
    member: ManaTypeEnum
}

enum ManaTypeEnum {
    WHITE
    BLUE
    BLACK
    RED
    GREEN
    COLORLESS
}

/// A target for a spell or ability.
union SpellTarget {
    player: PlayerTarget
    object: ObjectTarget
}

structure PlayerTarget {
    @required
    playerId: String
}

structure ObjectTarget {
    @required
    objectId: Long
}

list TargetList {
    member: SpellTarget
}

list IntegerList {
    member: Integer
}

/// Activate a mana ability on a permanent.
structure ActivateManaAbilityAction {
    @required
    objectId: Long

    @required
    abilityIndex: Integer
}

/// CR 508 — Declare which creatures are attacking and what they're attacking.
structure DeclareAttackersAction {
    @required
    attackers: AttackerList
}

list AttackerList {
    member: AttackerEntry
}

structure AttackerEntry {
    @required
    objectId: Long

    /// The player being attacked.
    /// TODO: support attacking planeswalkers and battles
    @required
    targetPlayerId: String
}

/// CR 509 — Declare which creatures are blocking and what they're blocking.
structure DeclareBlockersAction {
    @required
    blockers: BlockerList
}

list BlockerList {
    member: BlockerEntry
}

structure BlockerEntry {
    @required
    objectId: Long

    /// The attacker being blocked.
    @required
    blockingId: Long
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

    /// For CAST_SPELL: target requirements, one entry per required target.
    /// Each entry lists the valid target kinds for that target slot.
    targetRequirements: TargetRequirementList

    /// For CAST_SPELL: mana cost symbols (e.g., ["{1}", "{R}"]).
    manaCost: StringList
}

list TargetRequirementList {
    member: TargetRequirement
}

/// Valid target kinds for a single target slot.
structure TargetRequirement {
    @required
    validKinds: TargetKindList
}

list TargetKindList {
    member: TargetKind
}

enum TargetKind {
    PLAYER
    CREATURE
    PLANESWALKER
    ARTIFACT
    ENCHANTMENT
    LAND
    PERMANENT
    SPELL
}

enum LegalActionType {
    PASS_PRIORITY
    PLAY_LAND
    CAST_SPELL
    ACTIVATE_MANA_ABILITY
    DECLARE_ATTACKERS
    DECLARE_BLOCKERS
    CHOOSE_FIRST_PLAYER
    KEEP_HAND
    MULLIGAN
    CONCEDE
}

// --- Card Image ---
/// Get the image URL for a card by oracle ID.
@readonly
@http(method: "GET", uri: "/cards/{oracleId}/image")
operation GetCardImage {
    input: GetCardImageInput
    output: GetCardImageOutput
    errors: [
        NotFoundError
        ServerError
    ]
}

@input
structure GetCardImageInput {
    @required
    @httpLabel
    oracleId: String

    @httpQuery("version")
    version: String
}

@output
structure GetCardImageOutput {
    @required
    imageUrl: String
}

// --- Combat Info ---
structure CombatInfo {
    @required
    attackers: CombatAttackerList

    @required
    blockers: CombatBlockerList
}

list CombatAttackerList {
    member: CombatAttackerInfo
}

structure CombatAttackerInfo {
    @required
    objectId: Long

    @required
    targetPlayerId: String
}

list CombatBlockerList {
    member: CombatBlockerInfo
}

structure CombatBlockerInfo {
    @required
    objectId: Long

    @required
    blockingId: Long
}

// --- Stack Info ---
list StackEntryList {
    member: StackEntryInfo
}

structure StackEntryInfo {
    @required
    name: String

    @required
    controller: String

    objectId: Long

    oracleId: String

    @required
    targets: TargetList
}

// --- Player Zone Map ---
list PlayerZoneMap {
    member: PlayerZoneEntry
}

structure PlayerZoneEntry {
    @required
    playerId: String

    @required
    cards: CardInfoList
}
