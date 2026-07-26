# Proposal: Fix ESLint Globals

## Intent
The current ESLint flat configuration in `eslint.config.js` throws `no-undef` errors for standard browser globals and environment variables. This breaks the local developer verification pipeline and automated build checks. We need to standardize and expand the ESLint globals configuration to restore linting health and developer workflow usability.

## Scope
### In Scope
- Update `eslint.config.js` to correctly declare and support standard browser globals.
- Ensure standard Web APIs (like `fetch`, `window`, `document`, `localStorage`, etc.) are recognized.
- Restructure or update `eslint.config.js` using clean ESLint flat configuration patterns.
- Ensure `npm run lint` passes without false-positive linter errors.

### Out of Scope
- Code modularization of large view files (e.g. `proveedores.jsx` or `admin.jsx`).
- Expanding unit/integration test suites or writing new mock configurations.

## Capabilities
### New Capabilities
None

### Modified Capabilities
None

## Approach
We will modify the flat linter configuration in [eslint.config.js](file:///C:/Users/facu/kiosko-pos/eslint.config.js) by defining the standard browser globals. If the `globals` package is available, we will import it and spread `globals.browser` within the language options; otherwise, we will enrich the existing inline `globals` dictionary with all missing standard browser globals to resolve the linting errors cleanly.

## Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| [eslint.config.js](file:///C:/Users/facu/kiosko-pos/eslint.config.js) | Low | Linter configuration file will be updated to recognize environment globals. |

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Adding globals hides real undefined variable bugs | Low | Keep configured globals restricted strictly to standard Web API and environment contexts. |

## Rollback Plan
Revert changes to `eslint.config.js` via Git.

## Dependencies
- None

## Success Criteria
- [ ] Running `npm run lint` passes successfully without throwing `no-undef` errors for standard browser globals.
