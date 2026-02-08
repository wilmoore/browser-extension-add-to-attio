# 004. TypeScript Test-Driven Architecture with Debug Package

Date: 2026-02-07

## Status

Accepted

## Context

The codebase was originally written in JavaScript with console.log statements for debugging. As the extension grew, several issues emerged:

1. **Type safety**: No compile-time type checking led to runtime errors
2. **Logging noise**: console.log statements cluttered production output
3. **Test coverage**: Limited unit testing made refactoring risky
4. **Code duplication**: Shared logic (e.g., feedback toasts) was duplicated across content scripts
5. **Name display bug**: Popup showed usernames instead of proper display names when Attio had bad data

## Decision

Adopted a test-driven TypeScript architecture with the debug package for conditional logging:

1. **Strict TypeScript**: Enabled `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`

2. **Centralized types** (`src/types/index.ts`): `Platform`, `ProfileData`, `AttioPerson`, message types

3. **Centralized constants** (`src/constants/index.ts`): Platform patterns, selectors, badge states, timing

4. **Debug package** (`src/lib/logger.ts`): Namespaced loggers (attio:api, attio:linkedin, etc.) enabled via `localStorage.debug = 'attio:*'`

5. **Shared modules** (`src/content/shared/feedback.ts`): Extracted duplicated feedback toast logic

6. **Unit tests**: Vitest with jsdom for DOM testing, 90 tests covering storage, API, constants, and content scripts

7. **Name validation**: Prefer scraped name if Attio name lacks spaces (indicating username-like value)

## Consequences

### Positive

- Compile-time error detection catches bugs before runtime
- Debug logs are silent in production, enabled on-demand in development
- 90 unit tests enable confident refactoring
- Centralized types/constants reduce duplication and inconsistency
- Name display bug is fixed with validation logic

### Negative

- Increased build complexity (TypeScript compilation)
- Debug package adds ~8KB to bundle (acceptable for debugging capability)
- Test setup requires Chrome API mocks

## Alternatives Considered

1. **JSDoc types only**: Provides some type checking but lacks strict enforcement
2. **Custom debug implementation**: More control but reinvents the wheel
3. **No unit tests**: Faster initial development but riskier long-term

## Related

- Planning: `.plan/.done/fix-css-path-resolution-in-manifest/`
