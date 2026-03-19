# Changelog

All notable changes to Wikilink Types will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-19

### Added

- Autocomplete popup for `@` inside wikilink aliases
- `@` triggers after a space or at the start of the alias (right after `|`) — email addresses like `john@type` are ignored
- Multiple `@types` per wikilink for natural display text
- 24 default relationship types (supersedes, supports, contradicts, causes, etc.)
- Automatic sync of typed wikilinks to YAML frontmatter on save
- Only configured relationship types generate frontmatter
- Keyboard navigation (Arrow keys, Enter/Tab to accept, Escape to dismiss)
- Mouse click selection
- Case-insensitive filtering by key or label
- Debounced frontmatter sync (500ms) to avoid write storms
- Re-trigger prevention (skips write when frontmatter already matches)
- Viewport-aware popup positioning
- ARIA attributes for accessibility (listbox, option, aria-selected)
- Configurable relationship types via `data.json`
- Duplicate key detection in config with console warning
- Graceful fallback to defaults on corrupted config
- Full compatibility with Dataview, Graph Link Types, Breadcrumbs, Juggl
- AGPL-3.0 license

[1.0.0]: https://github.com/penfieldlabs/obsidian-wikilink-types/releases/tag/v1.0.0
