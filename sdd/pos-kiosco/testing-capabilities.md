# Testing Capabilities - pos-kiosco

This document details the testing capabilities and development validation conventions resolved for the `pos-kiosco` project.

## Testing Setup
- **Test Runner**: Vitest (`vitest run` / `vitest`)
- **Test Layers**: Unit, Integration
- **Coverage Tool**: Vitest built-in coverage
- **Strict TDD**: `true` (Enabled as a Vitest runner is configured and active in the project)

## Tooling & Verification
- **Linter**: ESLint (Flat Config in `eslint.config.js`)
- **Type Checker**: None (JavaScript project using `jsconfig.json` for paths/editor configuration)
- **Formatter**: None (No local configuration, relies on IDE formatters)

## Configuration Status
- **Resolved via**: package.json detection
- **Mode**: `hybrid`
