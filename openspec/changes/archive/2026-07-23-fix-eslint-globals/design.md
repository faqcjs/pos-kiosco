# Technical Design: Fix ESLint Globals

## Technical Approach
The current ESLint configuration in `eslint.config.js` manually lists a subset of browser globals, which has caused missing references for standard APIs such as `sessionStorage` and `fetch`. 
To fix this, we will import the `globals` package (version `^14.0.0`) and use `globals.browser` to provide a complete and standard list of browser global variables. This eliminates manual lists, avoids transitive dependency resolution risks, and prevents false-positive `no-undef` errors during developer builds and pipeline executions.

## Architecture Decisions
### Decision: Use `globals` NPM package for environment globals
**Choice**: Explicitly add `globals` package to `devDependencies` and import it in `eslint.config.js`.
**Alternatives considered**: 
1. *Inline definition expansion*: Manually add `sessionStorage` and `fetch` to the existing inline list.
   - *Pros*: Zero dependencies added to `package.json`.
   - *Cons*: Fragile, requires manual upkeep as more Web APIs are used (e.g. `Headers`, `Request`, `Response`, `crypto`).
2. *Transitive import*: Import `globals` without declaring it in `package.json`.
   - *Pros*: Keeps `package.json` untouched.
   - *Cons*: Unreliable and violates clean dependency management practices; if the parent package (ESLint) changes its internal dependency tree, the build could break.
**Rationale**: Using `globals` is the standard approach for ESLint flat configurations. Explicitly listing it in `package.json` ensures package manager reliability and deterministic installations.

## Data Flow
No dynamic runtime data flow is introduced. The flow of configuration is static:
1. `eslint.config.js` reads standard browser global declarations from the `globals` package.
2. ESLint CLI uses this list to validate syntax scopes in `src` files.

## File Changes
| File | Action | Description |
|------|--------|-------------|
| [package.json](file:///C:/Users/facu/kiosko-pos/package.json) | Modify | Add `"globals": "^14.0.0"` to `devDependencies`. |
| [eslint.config.js](file:///C:/Users/facu/kiosko-pos/eslint.config.js) | Modify | Import `globals` and spread `globals.browser` into the `languageOptions.globals` object. |

## Interfaces / Contracts
Not applicable. No system interfaces, API endpoints, or database structures are changed.

## Testing Strategy
| Layer | What to Test | Approach |
|------|--------|-------------|
| Linter Verification | ESLint verification checks | Run `npm run lint` and ensure all `no-undef` errors for `sessionStorage` and `fetch` are resolved, while actual syntax/unused-variable checks remain active. |

## Migration / Rollout
1. Run `npm install` to update `package-lock.json` with the new devDependency.
2. Run `npm run lint` to confirm that all global-related lint warnings/errors are resolved.

## Open Questions
- None
