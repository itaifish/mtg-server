# Magic: The Gathering Server — Planning Document

## Project Overview

A Rust-based server that emulates the rules of Magic: The Gathering, using the comprehensive rules as the authoritative source.

- **Comprehensive Rules**: Included in repo (sourced from `/Users/ifish/Downloads/MagicRules.txt`, effective Feb 27, 2026)
- **Rule Reference Convention**: Every implemented rule must include a comment linking the rule number (e.g., `// CR 117.1`)
- **No Amazon tooling** — standard Rust ecosystem only.

## Decisions

### D1: Game Format & Player Count

- Support ALL formats from the start (Standard, Modern, Commander, Draft, Legacy, Vintage, Pioneer, Pauper, etc.)
- Card legality per format will be enforced, but we won't implement all legal cards at once
- Multiplayer support from the beginning (Commander needs it, and the rules are format-agnostic)

### D2: Server Architecture — Smithy-RS

- Using **smithy-rs** (https://github.com/smithy-lang/smithy-rs) for code generation
- Smithy model defines the API → Gradle codegen → generates Rust server SDK + client SDK
- Transport: REST/HTTP for now (smithy-rs server doesn't natively support WebSockets)
  - Future: Could layer WebSocket support on top for real-time game state push
- Project structure follows the smithy-rs-pokemon-service pattern:
  - `model/` — Smithy model files
  - `server/` — Rust server implementation (business logic)
  - `build.gradle.kts` — Gradle build for codegen
  - smithy-rs as a git submodule

### D3: Client & Interaction Model

- Backend-only for now (JSON REST API)
- Clients poll for game state updates
- Priority passing: server tracks whose priority it is; clients poll and submit actions when it's their turn

### D4: Card Data & Initial Subset

- Start with a small curated subset of simple cards:
  - **Vanilla creatures** (no abilities, just power/toughness)
  - **Basic sorceries and instants** (e.g., Lightning Bolt, Giant Growth, Divination)
  - **Simple artifacts and enchantments** (e.g., Sol Ring, Pacifism)
  - **All basic lands** (Plains, Island, Swamp, Mountain, Forest)
- Future: Import full card database via Scryfall API (https://scryfall.com/docs/api)
  - Scryfall provides bulk JSON exports (~153MB for Oracle Cards)
  - Can be fetched programmatically; updates daily

### D5: Persistence & Matchmaking

- **Persist game state** (games survive server restarts)
- **No matchmaking** — players create lobbies that any other player can join
- Lobby system: create game → get game ID → share with opponent → they join

### D8: Determinism & RNG

- Single deterministic RNG seed per game (ChaCha8Rng via `rand_chacha` crate)
- All randomness derived from this seed — engine must never use non-deterministic sources
- Seed stored in the game record; replay feeds the same seed to reproduce identical outcomes
- RNG state advances deterministically with each random operation in action order

### D9: Storage Model — Dual Storage

- Store **both** current game state AND the ordered action log
- Current state: fast path for reads (GetGameState, GetLegalActions)
- Action log: append-only, used for replay (GetActionLog, ReplayGame)
- No intermediate state snapshots — replay always reconstructs from initial state + seed + action log

### D10: Card Implementation Strategy — Data-Driven + Custom Handlers

- **Three tiers** for implementing cards at scale (~30k cards in Magic):
  1. **Data-driven** (~60-70%): Cards are pure data — name, cost, types, P/T, keywords, and effects composed from a library of primitives (e.g., `DealDamage`, `DrawCards`, `GainLife`, `AddMana`). Vanilla creatures, basic burn, simple enchantments.
  2. **Composable effects** (~20-25%): Effects are trees of primitives — `Sequence(Destroy(Target::Creature), GainLife(3))`, `Conditional(IfControlCreature, ...)`. Covers modal spells, ETB triggers, etc.
  3. **Custom handlers** (~10-15%): Truly unique cards (e.g., Shahrazad, Panglacial Wurm) use `AbilityEffect::Custom { name }` dispatching to a registered Rust function.
- **Card registry**: Maps card names to `CardDefinition` builders. Hand-authored for initial set, eventually auto-generated from Scryfall data + effect mappings.
- **Incremental**: Cards not yet implemented return an error when used. New effect primitives added as needed.
- **Storage**: Scryfall JSONB in Postgres for card data/images. Runtime `CardDefinition` built from registry at game start.
- **Future: Rules text parser**: An ANTLR4 formal grammar for MTG rules text exists (https://github.com/Soothsilver/mtg-grammar, Unlicense). Magic Arena uses a similar parser internally to generate code from oracle text. The grammar covers keywords, activated/triggered/static abilities, modal spells, targeting, zones, and more (~400 lines). Plan: port to Rust (via `pest` PEG parser) as a batch tool that parses Scryfall oracle text → `Effect` DSL nodes. Would auto-generate ~80% of card registry entries. Remaining ~20% hand-authored or custom. Not blocking for initial playable game.

### D11: Frontend — Tauri + React + react-three-fiber

- **Stack**: Tauri v2 (cross-platform desktop/web shell) + React + react-three-fiber (R3F) for 3D game rendering
- **Why Three.js/R3F over 2D engines**: Rich animations are a priority — 3D cards with thickness/foil/reflections, table surface with lighting and shadows, camera swoops on big spells, particle effects (fire for damage, sparkles for healing), physically sliding cards between zones. R3F wraps Three.js in React's component model so state management stays unified.
- **Key libraries**:
  - `react-three-fiber` — React renderer for Three.js
  - `@react-three/drei` — Helpers: Image (card textures from S3), Text, Environment (lighting), Float (hover animations)
  - `@react-three/postprocessing` — Bloom, depth of field, vignette
  - `react-spring` or `@react-three/rapier` — Physics-based animations
  - `zustand` — State management (game state, UI state)
- **Architecture**:
  - React owns: lobby, deckbuilder, menus, chat, settings
  - R3F owns: game board (3D scene with cards, zones, stack, particles)
  - No framework bridging — R3F components are React components
  - Orthographic camera option for 2D-feeling layout; perspective camera for immersive 3D
- **Communication**:
  - **WebSocket** for server → client push: priority notifications, game state updates, opponent actions. Enables smooth real-time feel for both players and spectators.
  - **Smithy REST API** (existing TS client) for client → server actions: submit actions, create/join games, etc.
  - Clean split: WS for reads/notifications, REST for writes/commands.
- **Card rendering**: S3 card images loaded as Three.js textures. Preloaded during deck loading screen.
- **Spectator mode**: Same R3F renderer with server-side hidden information filtering. Spectators receive WS updates with appropriate perspective.
- **Visuals wishlist**:
  - Cards as 3D objects with thickness, foil/holographic shader effects
  - Table surface with dynamic lighting and card shadows
  - Camera animations on spell resolution, combat, game-ending moments
  - Particle systems per damage type / mana color
  - Stack visualized as physically stacked floating cards
  - Graveyard as a fannable pile
  - Hand cards that fan out and highlight on hover

## Future Features (Out of Scope)

### F1: Loop Declaration System

- Players should be able to **define loops** — bundles of actions that can be executed an arbitrary number of times
- Critical for supporting Magic's many infinite combos (e.g., Splinter Twin, Thopter/Sword, Exquisite Blood + Sanguine Bond)
- Current digital implementations (MTGO, Arena) handle this poorly — players must manually click through each iteration
- Design goals:
  - Player declares a loop: specifies the sequence of actions and a repeat count (or "until condition")
  - Server validates the loop is legal (each action in the sequence is valid given the resulting state)
  - Server executes the loop N times, advancing the RNG and action log accordingly
  - Opponent can interrupt at any point (priority is offered each iteration, or opponent pre-approves)
- This interacts with determinism: loop execution must produce the same action log entries as manual execution would

### D6: Spectators & Replay

- Lobbies support **spectators** with configurable perspective:
  - View one player's perspective (see their hand, hidden info)
  - View both perspectives (full information)
  - View "broadcast" perspective (no hidden info — like a stream)
- **Deterministic replay**: Given an initial game state + ordered action log + RNG seeds, any game is fully replayable from any point
- Action log is the backbone of replay — every game action is recorded in order

### D7: Database — PostgreSQL

- Data is relational (games ↔ players ↔ actions ↔ cards ↔ zones ↔ formats)
- PostgreSQL for all persistence
- Action log stored as ordered rows per game for efficient range queries

## Open Questions (Resolved)

### Q6: Randomness & Determinism → RESOLVED

- **Decision**: Single deterministic RNG seed per game (e.g., ChaCha8Rng)
- All randomness (shuffles, coin flips, random effects) derived from this seed
- Seed stored with the game record; replay feeds the same seed to reproduce identical outcomes
- Engine must NEVER use non-deterministic randomness — all random calls go through the seeded RNG

### Q7: Replay Granularity → RESOLVED

- **Decision**: Replay from initial state only — no intermediate snapshots
- Game is reconstructible by replaying the action log from the initial state + seed
- Simpler storage, acceptable performance (MTG games rarely exceed ~1000 actions)

### Q8: Event Sourcing vs. Dual Storage → RESOLVED

- **Decision**: Dual storage — store BOTH current game state AND the action log
- Current state in DB for fast reads (GetGameState, GetLegalActions)
- Action log in DB for replay (GetActionLog, ReplayGame)
- Current state is the "hot" path; action log is append-only

## Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────┐
│                  Smithy Model                    │
│  (API definition: operations, shapes, errors)    │
└──────────────────────┬──────────────────────────┘
                       │ codegen (gradle)
                       ▼
┌─────────────────────────────────────────────────┐
│              Generated Server SDK                │
│  (request/response types, routing, serialization)│
└──────────────────────┬──────────────────────────┘
                       │ implements
                       ▼
┌─────────────────────────────────────────────────┐
│              Server Implementation               │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Lobby   │  │  Game    │  │  Card         │  │
│  │  Manager │  │  Engine  │  │  Database     │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
│                     │                            │
│              ┌──────┴──────┐                     │
│              │ Rules Engine│                     │
│              │ (CR impl)   │                     │
│              └─────────────┘                     │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │         Persistence Layer                │    │
│  │  (game state serialization/storage)      │    │
│  └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

### Key Modules

1. **Smithy Model** — API contract (operations like CreateGame, JoinGame, GetGameState, SubmitAction)
2. **Lobby Manager** — Game creation, joining, player management
3. **Game Engine** — Turn structure, phase management, priority system
4. **Rules Engine** — Comprehensive rules implementation (the core logic)
5. **Card Database** — Card definitions, initially hardcoded, later from Scryfall
6. **Persistence** — PostgreSQL for game state, action logs, card data, lobbies

### Smithy API Operations (Initial)

- `CreateGame` — Create a new game lobby
- `ListGames` - Get a paginated list of available lobbies
- `JoinGame` — Join an existing game
- `GetGameState` — Poll current game state (filtered by player/spectator perspective — hidden info)
- `SubmitAction` — Play a card, activate ability, declare attackers/blockers, pass priority, etc.
- `GetLegalActions` — What can the current player do right now?
- `ConcedeGame` — Player concedes
- `GetActionLog` — Retrieve action log (for replay), supports range queries
- `SpectateGame` — Join a game as a spectator with a chosen perspective
- `ReplayGame` — Retrieve game state at a specific action index

## Implementation Phases

### Phase 1: Project Scaffolding

- [ ] Set up smithy-rs project structure (gradle, model, server crate)
- [ ] Copy comprehensive rules into repo
- [ ] Define initial Smithy model with basic operations
- [ ] Get codegen working and a hello-world server running

### Phase 2: Core Game State

- [x] Implement basic game objects: Player, Card, Zone (Library, Hand, Battlefield, Graveyard, Stack, Exile, Command)
- [x] Implement card definitions (mana cost with all symbol types, card types including Battle, counters with keyword/P-T/special variants)
- [x] Implement game state struct with serialization (phases, turns, zones as HashSet/Vec per ordering rules)
- [x] Implement action types with full replay data (targets, choices, mana payments, multi-block, planeswalker attacks)
- [x] Implement basic persistence (save/load game state to PostgreSQL)
- [x] CDK infrastructure: VPC, RDS PostgreSQL, ECS Fargate behind ALB, Secrets Manager for DB credentials, S3 bucket for card images (private, service-only access)
- [x] Dockerfile for Rust server

### Phase 3: Turn Structure & Priority

- [x] Implement turn phases and steps (CR 500-514)
- [x] Implement priority system (CR 117) — full round-table priority passing with `living_turn_order`, `priority_index`, `players_passed`
- [x] Implement the stack (CR 405) — spells go on stack when cast, resolve when all players pass

### Phase 4: Basic Card Types & Actions

- [x] Implement land playing (CR 305)
- [x] Implement creature casting (CR 302) — simplified: resolves immediately, no stack
- [ ] Implement instant and sorcery casting (CR 303, 304) — framework exists, needs spell effects
- [ ] Implement basic artifacts and enchantments (CR 301, 306)

### Phase 5: Combat

- [x] Declare attackers (CR 508) — validates creatures, taps attackers, supports player/planeswalker/battle targets
- [x] Declare blockers (CR 509) — validates defending player, assigns blockers to attackers
- [x] Combat damage (CR 510) — unblocked deals to player, blocked creatures exchange damage
- [ ] First strike, double strike, trample, deathtouch

### Phase 6: State-Based Actions & Win Conditions

- [x] Implement state-based actions (CR 704) — life ≤ 0, poison ≥ 10, lethal damage, zero toughness, game over check; loops until stable
- [x] Implement win/loss conditions (CR 104) — concede, last player standing
- [x] Implement life total tracking (CR 119)
- [x] Implement damage (CR 120) — combat damage to players and creatures

### Phase 7: Mana System

- [x] Implement mana pool (per-color slots with unrestricted/restricted tracking, ManaRestriction enum)
- [x] Implement mana abilities (activate_mana_ability engine action, intrinsic land abilities)
- [ ] Implement mana costs and paying costs (CR 118, 202) — needs payment model for hybrid/phyrexian

### Phase 8: Lobby & Multiplayer

- [x] Implement lobby creation/joining
- [x] Support 2+ player games
- [ ] Hidden information (each player sees only what they should)

### Phase 9: Card Database & Scryfall Integration

- [x] Design card data schema (`cards` table in PostgreSQL with indexed columns + full Scryfall JSON blob)
- [x] Implement Scryfall bulk import (`seed-cards` binary: fetches oracle_cards via bulk-data API, downloads normal images to S3, upserts into Postgres)
- [x] S3 bucket for card images (private, service-only access, added to CDK stack)
- [ ] Card legality per format

## Progress Log

- **2026-03-22**: Project initiated. Decisions D1-D5 finalized. Architecture drafted. Implementation phases defined.
- **2026-03-22**: Decisions D6 (spectators/replay) and D7 (PostgreSQL) finalized. Open questions Q6-Q8 on determinism approach documented.
- **2026-03-22**: Q6-Q8 resolved: deterministic RNG seed (ChaCha8), replay from scratch (no snapshots), dual storage (current state + action log). D8, D9 added. Future feature F1 (loop declaration for infinite combos) documented.
- **2026-03-22**: Phase 1 complete. Project scaffolded at `/Users/ifish/workplace/mtg-server`. smithy-rs git submodule (release-2026-03-16), Gradle codegen pipeline working, Smithy model with Ping/CreateGame/JoinGame/GetGameState operations, server compiles and serves all endpoints. Stub handlers return placeholder data.
- **2026-03-22**: Card seeding infrastructure added. `seed-cards` binary fetches Scryfall oracle_cards bulk data (~37k cards), downloads normal-size images to a private S3 bucket, and upserts card data into PostgreSQL `cards` table (indexed columns + full Scryfall JSON). CDK stack updated with S3 bucket (private, encrypted, service-only read/write). Added `tokio-postgres`, `aws-sdk-s3`, `reqwest`, `serde_json` dependencies. DB connection helper parses Secrets Manager JSON or plain connection string for local dev.
- **2026-03-23**: CI/CD pipeline fixes. Dockerfile switched from Docker Hub base images to ECR Public Gallery mirrors (`public.ecr.aws/docker/library/...`) to avoid 429 rate limits in CodeBuild. Pipeline synth step updated to shallow-clone the pinned smithy-rs tag (read from `.gitmodules` `branch` field) and run `./gradlew assemble` before `cdk synth`, since generated `mtg-server-sdk/src/` files are gitignored and unavailable in pipeline checkouts. `.gitmodules` is now the single source of truth for the smithy-rs version.
- **2026-03-23**: API Gateway + auth + integration tests. ALB switched to internal (`publicLoadBalancer: false`). API Gateway REST API added with VPC Link through an NLB in front of the ALB (REST API VpcLink requires NLB). `/ping` is open (no API key); all other routes (`/{proxy+}`) require an API key via `x-api-key` header. Two API keys per stage: one for general use, one for integration tests. Usage plan with throttling (20 req/s dev, 100 req/s prod). Smithy TypeScript client codegen added (`typescript-client-codegen` plugin, `smithy-typescript-codegen:0.47.0` + `smithy-aws-typescript-codegen:0.47.0`). Generated TS client output to `integration-tests/mtg-client/` via Gradle copy task. Integration test project (`integration-tests/`) uses generated Smithy TS client with Jest. Pipeline runs integ tests as a post-deploy step for each stage, retrieving the integ test API key at runtime.
- **2026-03-23**: Rust codebase refactored. Split `card.rs` into `card/`, `mana/`, `counter/` modules. Split `state.rs` into `state/`, `phases_and_steps/`, `action/` modules. Each module in its own directory with `mod.rs` + `tests.rs`. Added `Phase::next()` for turn progression. 53 unit tests across all game modules.
- **2026-03-23**: Game engine and persistence. Added `GameStore` (in-memory `RwLock<HashMap>` cache backed by Postgres `games` table with JSONB state). ALB sticky sessions (1hr cookie) keep players on the same server; DB is fallback on cache miss. Handlers wired to real game state via `Extension<Arc<GameStore>>`. Added `engine/` module: `actions/` (pass_priority, play_land, concede + `can_play_at_sorcery_speed` helper), `legal_actions/` (computes legal actions per player, early-returns for non-priority players), `state_based/` (CR 704 loop: life ≤ 0, poison ≥ 10, game over). Added `SubmitAction` and `GetLegalActions` to Smithy model with `ActionInput` union, `IllegalActionError`. Domain-to-SDK conversions via `From`/`Into` impls in `conversions.rs`. Handler helpers extracted to `handler_helpers.rs` with generic `get_game` + turbofish pattern. Player elimination removes all owned objects (CR 800.4a). `advance_turn` skips eliminated players. Dependencies added: `rand`, `anyhow`, `thiserror`. All `Box<dyn Error>` replaced with `anyhow::Error`.
- **2026-03-23**: Ability system and mana pool. Added `game/ability/` module with `Ability` struct (costs, effect, `is_mana_ability` flag). `AbilityCost` enum: TapSelf, Mana, SacrificeSelf, Sacrifice, Exile, PayLife, Discard. `AbilityEffect` enum: AddMana, DealDamage, DrawCards, GainLife, Custom (named handler for complex card-specific effects). CR 305.6 intrinsic land abilities: `intrinsic_land_ability()` maps basic land subtypes (Plains/Island/Swamp/Mountain/Forest) to tap-for-mana abilities. `all_abilities()` merges explicit card abilities with intrinsic ones. Added `abilities: Vec<Ability>` to `CardDefinition`, `mana_pool: Vec<ManaType>` to `Player`. Added `Player::new()` constructor with defaults. 60 unit tests passing.
- **2026-03-24**: Deployment fixes. Dockerfile runtime image switched from `bookworm-slim` to `rust:1.94-slim` (same as builder) to fix glibc 2.38 mismatch. Switched from `rustls` to `native-tls` (`postgres-native-tls`) for RDS TLS — uses system OpenSSL/CA store. Downloaded AWS RDS CA bundle into Docker image via `update-ca-certificates` to resolve "self-signed certificate in certificate chain" error. Added ECS deployment circuit breaker with rollback for faster failure detection. Added `dev.sh` script (auto-detects finch/docker) for local development.
- **2026-03-26**: Mana system. Redesigned mana pool: `ManaPool` has typed slots per color (white/blue/black/red/green/colorless), each with `unrestricted: u32` and `restricted: Vec<RestrictedMana>`. `ManaRestriction` enum (starting with `CreatureSpell` for cards like Ancient Ziggurat). `ManaProduction` struct describes ability output (type, amount, optional restriction) with `::new()` shorthand for unrestricted. `ManaPayment` removed from action log (TODO: design full payment model for hybrid/phyrexian costs). `GameState` helpers: `add_mana`, `add_mana_restricted`, `empty_mana_pools`, `get_player`/`get_player_mut`, `deal_damage_to_player`, `draw_card`, `gain_life`, `send_to_graveyard`, `battlefield_of_type` — all wrapped as helpers for future replacement effect and triggered ability hooks. `From<Color> for ManaType` impl. `SymbolPayment` + `ManaPool::try_pay` for explicit mana payment with per-symbol validation (colored, generic, hybrid, phyrexian). Engine: `activate_mana_ability` action validates costs (tap check, summoning sickness TODO), pays costs, resolves `AddMana` effect. `cast_spell` action validates timing (sorcery/instant speed), pays mana via `try_pay`, resolves immediately (permanents to battlefield, spells to graveyard). Phase transitions now empty mana pools. `pass_priority` only advances phase when stack is empty and active player passes. `GameState::new()` constructor. `CardType::is_permanent()` helper. Combat: `declare_attackers`, `declare_blockers`, `resolve_combat_damage` in `engine/actions/combat/`. `CombatState`, `AttackerInfo`, `BlockerInfo`, `AttackTarget` on `GameState`. Lethal damage SBA (CR 704.5f/g) sends creatures with damage ≥ toughness or toughness ≤ 0 to graveyard. 77 unit tests passing.
- **2026-03-26**: Card registry. Added `cards/` module with `LazyLock<HashMap>` registry mapping card names to `CardDefinition`. Builder helpers: `basic_land`, `vanilla` (creature), `mana_dork`. Initial set: 5 basic lands, 2 mana dorks (Llanowar Elves, Elvish Mystic), 11 vanilla creatures across all colors (Savannah Lions, Grizzly Bears, Hill Giant, Craw Wurm, etc.). Mana symbol shorthands (W/U/B/R/G/M1-M4). Decision D10 added: three-tier card implementation strategy (data-driven → composable effects → custom handlers). 81 unit tests passing.
- **2026-03-26**: Pregame flow and deck loading. Smithy model split into `main.smithy` (service + shared types), `lobby.smithy` (CreateGame, JoinGame, SetReady), `gameplay.smithy` (GetGameState, SubmitAction, GetLegalActions). Added `SetReady` operation — players toggle ready; when all ready, random player chosen to pick who goes first. `GameStatus` expanded: `WaitingForPlayers → ChoosingPlayOrder → ResolvingMulligans → InProgress → Finished`. `Player.pregame: PregameInfo` (ready, mulligan_count, has_kept). `GameState.play_order_chooser`. `ChaCha8Rng` stored directly on `GameState` (serializable via `serde1` feature). `deck/loader` creates `CardInstance`s from decklist, shuffles with game RNG. `CardInstance::new()` constructor. `From<&DecklistEntry> for DeckEntry` conversion. Pregame engine actions: `choose_first_player` (rotates turn order, draws 7), `mulligan` (London mulligan — shuffle back, draw 7), `keep_hand` (put N cards on bottom, game starts when all keep). All wired into `submit_action` handler via `ActionInput` union. Integration test helpers extracted to `test-helpers.ts` (shared client creation, API key middleware). Full game integration test: create → join → ready → choose first → keep → pass priority → concede. `test-local.sh` script: starts Postgres, builds server, runs integration tests, cleans up. 89 Rust unit tests + 11 integration tests passing.
- **2026-04-04**: Priority system and stack. Refactored turn order: `starting_turn_order` (immutable) and `living_turn_order` (updated on elimination) replace old index-based `turn_order`. Priority now passes around the table: `priority_index` into `living_turn_order`, `players_passed: HashSet<PlayerId>` tracks the passing round. `priority_player()` is the single source of truth; `has_priority()` delegates to it. `reset_priority_to_active()` clears the round after any action. `pass_priority_to_next()` returns true when all living players have passed. `advance_phase()` helper on `GameState` — empties mana pools, advances phase or turn, resets priority (single place for this logic). Stack: `cast_spell` now moves spells to the stack instead of resolving immediately. `pass_priority` resolves top of stack via `resolve_top_of_stack()` when all pass with non-empty stack (permanents → battlefield, non-permanents → graveyard). TODO: abilities on the stack, spell effects before graveyard. SBAs now call `eliminate_player` (which updates `living_turn_order`) instead of just setting `has_lost`. Auto-pass priority: `holdPriority` boolean on `SubmitActionInput` (defaults false). After any action except `passPriority`, the player auto-passes unless holding. `generate_sdk.sh` script added. 89 Rust unit tests + 11 integration tests passing.
- **2026-04-05**: Effect DSL and stack targets. Replaced flat `AbilityEffect` enum with composable `Effect` DSL in `game/effect/`. Effect nodes: DealDamage, GainLife, LoseLife (distinct from damage per CR 119.3a), DrawCards, Discard, Mill, AddMana, Destroy, Exile, Bounce, Tap, Untap, AddCounters, RemoveCounters, ModifyPowerToughness, Counter, Sequence, ForEach, Conditional, Choose, Custom. `Value` (Constant, XValue, Count), `TargetSpec` (Chosen, Source, Each), `PlayerSpec` (Controller, Opponent, TargetPlayer, Each), `Selector`/`Filter`/`Condition` for queries. `AbilityEffect` now: `AddMana` (mana abilities) or `Effect(Effect)` (everything else). `Stack` promoted to its own struct in `game/stack/` with `push`, `pop`, `contains`, `remove`, `top`, `is_empty`. `StackEntry` holds object_id, controller, targets (`Vec<SpellTarget>`), mode_choices. `GameState.push_to_stack()` replaces `move_object(Stack)`. `resolve_effect` walks the DSL tree; `eval_value`, `get_referenced_targets`, `get_referenced_players` resolve specs to concrete values. All actions wired to API: castSpell (with mana payment + targets), activateManaAbility, declareAttackers, declareBlockers. Smithy model updated with full action types. Card registry: Lightning Bolt, Healing Salve, Divination using DSL. Keywords system: `Keyword` enum, `HashMap<Keyword, u32>` on both `CardDefinition` and `CardInstance`, `is_summoning_sick()` checks haste. `CardDefinition` derives `Default`. Untap/draw/cleanup steps automated. `generate_sdk.sh` script. Auto-pass priority via `holdPriority` flag. 89 unit tests + 11 integration tests passing.
- **2026-04-05**: Triggered abilities and event system. Added `game/event/` module with composable trigger system: `TriggerEvent` (EntersZone, LeavesZone, ZoneTransition, DamageDealt, LifeGained, SpellCast, etc.) + `TriggerFilter` (ObjectMatches, ControlledBy, IsSelf, PlayerIs, IsCombatDamage, DamageTargetIsPlayer, Not). `Not(Box<TriggerFilter>)` enables "another creature" via `Not(IsSelf)`. `card_matches_filters` checks card types, subtypes, colors, power, toughness, mana value. `TriggeredAbility` on `CardDefinition` keyed by zone (`HashMap<ZoneType, Vec<TriggeredAbility>>`) — supports triggers from non-battlefield zones (e.g., Ovalchase Daredevil). Unified `ZoneType` — removed duplicate `ZoneRef`. `GameState.emit_event()` scans battlefield and graveyard objects for matching triggers, collects `PendingTrigger`s. Events emitted from all state helpers: `move_object` (ZoneChange), `deal_damage_to_player` (LifeLost), `draw_card` (CardDrawn), `gain_life` (LifeGained). `StackEntry` refactored: `StackEntryKind::Spell` (card moves to stack) vs `StackEntryKind::Ability` (source stays, effect on stack). `resolve_top_of_stack` handles both. `engine/triggers/` module: `process_pending_triggers` groups by controller in APNAP order, auto-orders identical triggers (e.g., two Soul Wardens), puts on stack. `check_state_and_triggers` helper runs SBAs then trigger processing after every action. `AddCounters` effect implemented. Cards: Soul Warden ("whenever another creature ETBs, gain 1 life"), Ajani's Pridemate ("whenever you gain life, +1/+1 counter"). Cascading triggers verified: creature ETB → Soul Warden triggers → gain life → Pridemate triggers. `GetGameStateOutput` expanded: `priorityPlayerId`, `activePlayerId`, `playOrderChooserId`, `battlefield` with full `PermanentInfo` (power, toughness, effective P/T, tapped, summoning sick, damage marked, counters, keywords). `TryFrom<&CardInstance> for PermanentInfo`. Integration test: Soul Warden deck casts creatures over 30 turns, verifies life gain above 20 from triggers. `generate_sdk.sh` script. 101 Rust unit tests + 10 integration tests passing.
- **2026-04-05**: Card images and oracle IDs. Added `oracle_id: String` to `CardDefinition` with Scryfall oracle IDs for all 23 registry cards (looked up via Scryfall API). Renamed "Grey Ogre" → "Gray Ogre" to match Scryfall. Added `GetCardImage` operation — returns Scryfall image URL by oracle ID (temporary; will serve from S3 once seed pipeline runs). Added `hand` to `GetGameStateOutput` — returns cards in the requesting player's hand (filtered by `perspectivePlayerId`, opponents can't see your hand). `CardInfo` includes objectId, name, oracleId, cardTypes, manaCost, manaValue. Added `PermanentInfo` with full battlefield state. `LeaveGame` and `ListGames` operations with DB-backed pagination, search, and status filtering. Games table schema expanded with indexed columns (name, status, player_count, format, created_at). Stale game handling: auto-delete on get, skip on list. TODO: run `seed-cards` binary as ECS task to populate S3 bucket with card images and cards table from Scryfall bulk data.
