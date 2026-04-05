# MTG Frontend — Planning

## Overview

Magic: The Gathering game client. Ships as a desktop/mobile app via Tauri v2, with web browser fallback. Connects to the mtg-server Rust backend via REST API.

### Stack

| Library | Version | Purpose |
|---------|---------|---------|
| React | 19 | UI framework |
| TypeScript | 5.7 (strict) | Type safety, zero `any` |
| Vite | 6 | Build tool, HMR |
| Tauri | 2 | Desktop/mobile shell, native file I/O |
| react-three-fiber | 9 | 3D card rendering and battlefield |
| @react-three/drei | 10 | R3F helpers (Text, OrbitControls) |
| react-spring | 9 | Physics-based animations |
| zustand | 5 | Lightweight state management |
| react-router-dom | 7 | Client-side routing |
| vitest | 3 | Testing framework |

## Theme System

Swappable theme engine controlling CSS variables, 3D scene properties, and layout overrides.

### Architecture

```
ThemeProvider (React Context)
├── Injects CSS custom properties on :root  (colors, fonts)
├── Injects <style> tag for cssOverrides    (layout hacks per theme)
├── Persists theme ID via StorageService
└── Exposes useTheme() hook for 3D scene values

Theme interface
├── colors      → CSS vars (--color-bg, --color-accent, etc.)
├── typography  → font families, weights
├── layout      → border radius, width, style
├── scene       → Three.js: table color, lighting, card materials, glow colors
├── particles   → damage/heal particle colors
└── cssOverrides → raw CSS string for theme-specific layout hacks
```

### Available Themes

| Theme | ID | Description |
|-------|-----|-------------|
| Classic Dark | `default` | Original dark blue/gold look |
| Cubist Avant-Garde | `picasso` | Picasso-inspired: burnt orange accent, geometric fonts, double borders, skewed buttons, terracotta table, dramatic lighting, asymmetric panels |

### Adding a New Theme

1. Create `src/theme/myTheme.ts` implementing the `Theme` interface
2. Add it to the `themes` array in `ThemeProvider.tsx`
3. Done — it appears in the settings dropdown automatically

### What Themes Control

| Layer | Properties |
|-------|-----------|
| CSS | 20+ custom properties (colors, fonts, overlay) |
| Layout | Border radius, width, style (solid/double/dashed) |
| 3D Scene | Table surface color, ambient/directional light intensity |
| Cards | Face colors per MTG color, back color, glow colors, text colors |
| Particles | Damage color, heal color array |
| CSS Overrides | Arbitrary CSS for skewed buttons, asymmetric borders, rotated zones, etc. |

## Architecture Decisions

| Choice | Rationale |
|---|---|
| Tauri v2 over Electron | Smaller binary, Rust backend for file I/O, mobile support |
| R3F over plain Three.js | Declarative 3D in React; component model for cards, zones |
| zustand over Redux | Minimal boilerplate; perfect for single-store game state |
| react-spring | Smooth card animations; integrates with R3F via @react-spring/three |
| Storage abstraction | `StorageService` interface with Tauri/Web implementations; auto-detects runtime |
| Named exports only | Consistent imports, better tree-shaking, easier refactoring |

## Architecture Summary

```
frontend/
├── src/
│   ├── types/              # Domain types mirroring Smithy model
│   │   ├── enums.ts        # GameFormat, GameStatus, ManaType, LegalActionType
│   │   ├── models.ts       # PlayerInfo, DecklistEntry, LegalAction, etc.
│   │   ├── actions.ts      # ActionInput union, SpellTarget, creator helpers
│   │   ├── api.ts          # Request/Response types for all 7 operations
│   │   └── game3d.ts       # CardData, ZoneData, placeholder data
│   ├── api/                # REST API client
│   │   ├── client.ts       # MtgApiClient (typed fetch wrapper, 7 methods)
│   │   └── hooks.tsx       # ApiClientProvider context, useApiClient hook
│   ├── theme/              # Theme engine
│   │   ├── types.ts        # Theme, ThemeColors, ThemeScene, ThemeParticles
│   │   ├── defaultTheme.ts # Classic Dark (original look)
│   │   ├── picassoTheme.ts # Cubist Avant-Garde
│   │   └── ThemeProvider.tsx # React context, CSS injection, persistence
│   ├── services/           # Platform abstraction
│   │   └── storage.ts      # StorageService interface, Tauri/Web implementations
│   ├── stores/             # zustand state management
│   │   ├── gameStore.ts    # Game state, polling, legal actions, selectors
│   │   ├── lobbyStore.ts   # Game creation/joining, ready state
│   │   └── uiStore.ts      # Selection, targeting, camera, chat
│   ├── hooks/              # Custom React hooks
│   │   └── useGameActions.ts  # All 10 action submission functions
│   ├── components/
│   │   ├── shared/         # Button, Input, Select, Modal, ErrorBanner, Spinner
│   │   ├── lobby/          # LobbyPage, CreateGameForm, GameList, WaitingRoom
│   │   ├── game/           # GamePage, ActionBar, PlayerPanel, PriorityIndicator,
│   │   │                   # PregamePanel, CombatPanel, ManaPanel, SpellCastPanel
│   │   ├── game3d/         # R3F Canvas, Card3D, 5 zone components, animations
│   │   ├── deckbuilder/    # DeckBuilderPage (Tauri file I/O + localStorage)
│   │   └── settings/       # SettingsPanel (Tauri file I/O + localStorage)
│   └── styles/
│       └── global.css      # Dark theme, gold accents, CSS custom properties
├── src-tauri/              # Tauri v2 backend (Rust)
│   ├── Cargo.toml          # tauri 2, fs/dialog/opener plugins, serde
│   ├── tauri.conf.json     # App config (1280x800, devUrl, frontendDist)
│   ├── capabilities/       # Permission system (replaces v1 allowlist)
│   │   └── default.json    # fs:appdata read/write, dialog, opener
│   └── src/
│       ├── main.rs         # Desktop entry point
│       └── lib.rs          # 6 Tauri commands + mobile entry point
└── package.json            # npm scripts: dev, build, test, tauri
```

## Tauri Integration

### Storage Abstraction

The `StorageService` interface provides platform-agnostic persistence:

```
┌─────────────────────────────────────────┐
│           StorageService                │
│  saveDeck / loadDeck / listDecks        │
│  deleteDeck / saveSettings / loadSettings│
└──────────┬──────────────┬───────────────┘
           │              │
    ┌──────▼──────┐ ┌────▼────────────┐
    │   Tauri     │ │      Web        │
    │ invoke()    │ │  localStorage   │
    │ → Rust I/O  │ │  (prefixed keys)│
    └─────────────┘ └─────────────────┘
```

- `isTauri()` detects runtime via `window.__TAURI_INTERNALS__`
- `TauriStorageService` uses dynamic `import('@tauri-apps/api/core')` to avoid web failures
- `WebStorageService` uses localStorage with `mtg-deck-` / `mtg-settings` prefixes
- Factory `createStorageService()` returns the appropriate implementation

### Rust Commands (src-tauri/src/lib.rs)

| Command | Args | Returns | Storage |
|---------|------|---------|---------|
| `save_deck` | name, content | `()` | AppData/decks/{name}.deck |
| `load_deck` | name | `String` | AppData/decks/{name}.deck |
| `list_decks` | — | `Vec<String>` | AppData/decks/*.deck |
| `delete_deck` | name | `()` | AppData/decks/{name}.deck |
| `save_settings` | content | `()` | AppData/settings.json |
| `load_settings` | — | `String` | AppData/settings.json |

All commands use the platform-appropriate AppData directory and create directories on first use.

### Running

```bash
# Web (browser)
npm run dev

# Desktop (Tauri)
npm run tauri dev

# Build desktop app
npm run tauri build

# Mobile (future)
npx tauri ios init && npx tauri ios dev
npx tauri android init && npx tauri android dev
```

## API Surface

### Operations
1. **Ping** `GET /ping` — health check
2. **CreateGame** `POST /games` — create a new game lobby
3. **JoinGame** `POST /games/{gameId}/join` — join an existing game
4. **SetReady** `POST /games/{gameId}/ready` — mark player as ready
5. **GetGameState** `GET /games/{gameId}` — poll current game state
6. **SubmitAction** `POST /games/{gameId}/actions` — submit a player action
7. **GetLegalActions** `GET /games/{gameId}/legal-actions` — get legal actions

### Key Types
- **GameFormat** — STANDARD, MODERN, LEGACY, VINTAGE, COMMANDER, PIONEER, PAUPER, DRAFT
- **GameStatus** — WAITING_FOR_PLAYERS, CHOOSING_PLAY_ORDER, MULLIGAN, IN_PROGRESS, FINISHED
- **ActionInput** — tagged union with 10 variants (passPriority, playLand, castSpell, etc.)
- **SpellTarget** — tagged union (player | object)

## Phase Plan

| # | Phase | Status |
|---|-------|--------|
| 0 | API surface exploration | ✅ |
| 1 | Project scaffold (Vite + React + TS + R3F + zustand) | ✅ |
| 2 | Core types and API client layer | ✅ |
| 3 | State management (zustand stores) | ✅ |
| 4 | 2D UI screens (lobby, game HUD, deck builder, settings) | ✅ |
| 5 | 3D game board (R3F canvas, cards, zones, camera) | ✅ |
| 6 | Game interaction (actions, priority, combat) | ✅ |
| 7 | Animations and polish (react-spring, particles) | ✅ |
| 8 | Comprehensive testing (90%+ coverage) | ✅ |
| 9 | Refactor and final polish | ✅ |
| 10 | .gitignore + Tauri v2 integration | ✅ |
| 11 | Theme system (engine + Picasso/Cubist theme) | ✅ |

## Statistics

| Metric | Value |
|---|---|
| Source files | ~70 |
| Test files | 37 |
| Total tests | 288 |
| Statement coverage | 97.84% |
| Branch coverage | 95.14% |
| Function coverage | 95.48% |
| Line coverage | 97.84% |
| TSC errors | 0 |
| `any` in source | 0 |
| Themes | 2 (Classic Dark, Cubist Avant-Garde) |
| Tauri cargo check | ✅ |
| Tauri cargo build | ✅ |

## Known Limitations

1. **Placeholder zone data** — Game state API doesn't expose per-card zone data yet; 3D board uses mock data
2. **Polling only** — No WebSocket support; game state updates via polling interval
3. **Placeholder card images** — Cards rendered as colored planes (no real textures from S3)
4. **No mobile builds yet** — Tauri v2 supports iOS/Android but `tauri ios init` / `tauri android init` not yet run

## Future Improvements

- [ ] More themes: Art Deco, Synthwave/Neon, Parchment/Medieval, Mondrian
- [ ] WebSocket for real-time game state push
- [ ] Real card images from S3 (loaded as Three.js textures)
- [ ] Mobile builds (iOS/Android via Tauri v2)
- [ ] Sound effects for actions, combat, spells
- [ ] Spectator mode
- [ ] Card foil/holographic shader effects
- [ ] Particle systems per mana color
- [ ] Camera animations on spell resolution

## Current Status

**All phases complete.** Frontend is fully implemented with Tauri v2 desktop integration, swappable theme system (Classic Dark + Cubist Avant-Garde), comprehensive test coverage (97.84%), and zero TypeScript errors. Runs as both a web app (`npm run dev`) and a native desktop app (`npm run tauri dev`). Switch themes instantly via Settings → Theme dropdown.
