# Magic: The Gathering Game Server

A Rust server that implements the rules of Magic: The Gathering, built with [smithy-rs](https://github.com/smithy-lang/smithy-rs) for API code generation.

## Prerequisites

- **Rust** (stable, 1.85+): https://www.rust-lang.org/tools/install
- **JDK 17+**: Required for Smithy code generation. Check with `java -version`.
- **Git**: With submodule support.

## Getting Started

### 1. Clone with submodules

```bash
git clone --recurse-submodules <repo-url>
cd mtg-server
```

If you already cloned without `--recurse-submodules`:

```bash
git submodule init
git submodule update
```

### 2. Generate the server SDK

The Smithy model in `model/src/main/smithy/main.smithy` defines the API. Gradle runs the smithy-rs code generator to produce a Rust server SDK crate.

```bash
./gradlew assemble
```

This generates the `mtg-server-sdk/` crate. You only need to re-run this when the Smithy model changes.

### 3. Build and run

```bash
cargo build
cargo run
```

## Project Structure

```
mtg-server/
├── model/                          # Smithy API model + Gradle codegen config
│   ├── src/main/smithy/main.smithy # API definition (operations, shapes, errors)
│   ├── build.gradle.kts            # Codegen build script
│   └── smithy-build.json           # Smithy codegen plugin configuration
├── server/                         # Rust server implementation (business logic)
│   └── src/main.rs
├── mtg-server-sdk/                 # GENERATED — Rust server SDK (do not edit)
├── smithy-rs/                      # Git submodule — smithy-rs code generator
├── MagicComprehensiveRules.txt     # MTG Comprehensive Rules (authoritative source)
├── PLANNING.md                     # Project planning and design decisions
├── Cargo.toml                      # Rust workspace definition
├── build.gradle.kts                # Root Gradle build
├── settings.gradle.kts             # Gradle settings (submodule + plugins)
└── gradle.properties               # Version pins
```

## Why a Git Submodule?

The `smithy-rs/` directory is a [git submodule](https://git-scm.com/book/en/v2/Git-Tools-Submodules) pointing to the [smithy-lang/smithy-rs](https://github.com/smithy-lang/smithy-rs) repository.

**Why it's needed:** smithy-rs provides a Kotlin-based code generator that reads Smithy model files (`.smithy`) and produces Rust server and client SDK crates. This code generator is not published to Maven Central — it must be built from source. Gradle's `includeBuild` directive in `settings.gradle.kts` references the submodule so the codegen is built automatically as part of `./gradlew assemble`.

**Why not just use crates.io?** The smithy-rs project has two halves:
1. **Code generator** (Kotlin/Gradle) — Transforms `.smithy` models into Rust source code. This is the part that requires the submodule.
2. **Runtime crates** (Rust) — Published to crates.io as `aws-smithy-http-server`, `aws-smithy-types`, etc. The generated SDK depends on these automatically.

**Trade-offs:**
- The submodule is large (~200MB). The initial clone takes a while, but subsequent operations are fast.
- Pinned to a specific release tag (`release-2026-03-16`) for reproducibility.
- Only developers who modify the Smithy model need to run `./gradlew assemble`. Everyone else just needs `cargo build`.

**Updating smithy-rs:**
```bash
cd smithy-rs
git fetch
git checkout release-YYYY-MM-DD  # pick a new release tag
cd ..
git add smithy-rs
git commit -m "Update smithy-rs to release-YYYY-MM-DD"
./gradlew assemble  # regenerate the SDK
```

## Comprehensive Rules

The file `MagicComprehensiveRules.txt` contains the official MTG Comprehensive Rules (effective Feb 27, 2026). Every implemented rule in the codebase includes a comment referencing the rule number:

```rust
// CR 117.1 — Unless a spell or ability is instructing a player to take an
// action, which player has priority determines who can play spells or activate
// abilities.
```

## License

TBD
