#!/usr/bin/env bash
set -euo pipefail

# Regenerate the Rust server SDK and TypeScript client from the Smithy model.
# Run this after modifying any .smithy files in model/src/main/smithy/.

cd "$(dirname "$0")"
./gradlew assemble
