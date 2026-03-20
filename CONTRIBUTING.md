# Contributing to Wikilink Types

## Dev Setup

```bash
git clone git@github.com:penfieldlabs/obsidian-wikilink-types.git
cd obsidian-wikilink-types
npm install --legacy-peer-deps
npm run build
npm run test
```

To test in Obsidian, symlink or copy `main.js`, `manifest.json`, and `styles.css` into your vault's `.obsidian/plugins/wikilink-types/` directory.

## Project Structure

| File | Purpose |
|------|---------|
| `src/main.ts` | Plugin lifecycle — registers extensions, debounced frontmatter sync |
| `src/autocomplete.ts` | CM6 ViewPlugin — popup rendering, positioning, keyboard/mouse handling |
| `src/autocomplete-utils.ts` | Pure functions for type filtering and index clamping (no Obsidian deps) |
| `src/parser.ts` | Wikilink parsing (`parseTypedWikilinks`) and cursor context detection (`getAtContext`) |
| `src/sync.ts` | Frontmatter stripping, relationship map building, YAML sync via `processFrontMatter` |
| `src/config.ts` | Config validation, defaults, `data.json` loading |
| `src/types.ts` | TypeScript interfaces |

## Architecture Decisions

These are load-bearing and must not change without very good reason:

- **ViewPlugin + `app.keymap.pushScope`/`popScope` for autocomplete.** Obsidian's `EditorSuggest` is suppressed inside wikilinks by the built-in link suggest. CM6's `autocompletion()` creates a second instance that steals keyboard events. The custom ViewPlugin with Obsidian's Scope-based keyboard capture is the only approach that works.

- **Pure functions in `autocomplete-utils.ts`.** Anything testable without Obsidian goes here. This keeps the test suite fast and dependency-free.

- **`app.fileManager.processFrontMatter()` for all YAML writes.** No raw string manipulation of frontmatter. This is Obsidian's official API and handles serialization correctly.

- **Frontmatter diff check before writing.** `frontmatterMatchesDesired()` compares desired state against current frontmatter and skips the write if they match. This prevents infinite re-trigger loops from the `vault.on("modify")` handler.

## Testing

- All PRs must pass `npm run test`.
- New features need tests.
- Pure logic belongs in `autocomplete-utils.ts` or `parser.ts` so it's testable without mocking Obsidian.
- Tests live in `tests/` and use [Vitest](https://vitest.dev/).

## PR Guidelines

- **Do not commit `main.js`** — it's built from source and listed in `.gitignore`.
- Keep PRs focused — one feature or fix per PR.
- Describe what changed and why in the PR description.
- Follow existing code style (tabs, no trailing semicolons on imports, `import type` for type-only imports).

## Areas Where Help Is Welcome

- **Reading view post-processor** — hide or dim `@type` text in rendered wikilinks
- **Settings UI** — graphical configuration for relationship types (currently `data.json` only)
- Anything tagged in [GitHub Issues](https://github.com/penfieldlabs/obsidian-wikilink-types/issues)
