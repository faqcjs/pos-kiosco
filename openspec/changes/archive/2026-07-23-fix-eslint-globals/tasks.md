<Tasks: Fix ESLint Globals>
## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 10 lines |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units
- **Single PR**: Apply dependency updates to `package.json` and linter configuration updates to `eslint.config.js` in a single PR.

## Phase 1: Dependency Management
- [x] 1.1 Add `"globals": "^14.0.0"` to the `devDependencies` block in [package.json](file:///C:/Users/facu/kiosko-pos/package.json).
- [x] 1.2 Run `npm install` in the project root to install the new `globals` package and update `package-lock.json`.

## Phase 2: Configuration Update
- [x] 2.1 Import `globals` package in [eslint.config.js](file:///C:/Users/facu/kiosko-pos/eslint.config.js).
- [x] 2.2 Replace manual browser globals declaration with standard `globals.browser` in [eslint.config.js](file:///C:/Users/facu/kiosko-pos/eslint.config.js).

## Phase 3: Validation
- [x] 3.1 Execute linter validation using `npm run lint` and verify that all standard browser global-related linter errors (like `fetch` or `sessionStorage` being undefined) are resolved.
- [x] 3.2 Verify that other code quality rules (such as unused variables) are still properly flagged by the linter.
