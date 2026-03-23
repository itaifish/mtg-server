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
- [ ] Implement basic persistence (save/load game state to PostgreSQL)
- [x] CDK infrastructure: VPC, RDS PostgreSQL, ECS Fargate behind ALB, Secrets Manager for DB credentials, S3 bucket for card images (private, service-only access)
- [x] Dockerfile for Rust server

### Phase 3: Turn Structure & Priority

- [ ] Implement turn phases and steps (CR 500-514)
- [ ] Implement priority system (CR 117)
- [ ] Implement the stack (CR 405)

### Phase 4: Basic Card Types & Actions

- [ ] Implement land playing (CR 305)
- [ ] Implement creature casting and combat (CR 302, 506-511)
- [ ] Implement instant and sorcery casting (CR 303, 304)
- [ ] Implement basic artifacts and enchantments (CR 301, 306)

### Phase 5: Combat

- [ ] Declare attackers (CR 508)
- [ ] Declare blockers (CR 509)
- [ ] Combat damage (CR 510)

### Phase 6: State-Based Actions & Win Conditions

- [ ] Implement state-based actions (CR 704)
- [ ] Implement win/loss conditions (CR 104)
- [ ] Implement life total tracking (CR 119)
- [ ] Implement damage (CR 120)

### Phase 7: Mana System

- [ ] Implement mana pool and mana abilities (CR 106, 605)
- [ ] Implement mana costs and paying costs (CR 118, 202)

### Phase 8: Lobby & Multiplayer

- [ ] Implement lobby creation/joining
- [ ] Support 2+ player games
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
