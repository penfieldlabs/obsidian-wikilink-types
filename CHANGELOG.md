# Changelog

All notable changes to Wikilink Types will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 2026-04-06

### Added

- Verify and repair prompt (`prompts/verify-and-repair.md`) — exhaustive 7-phase post-build verification with broken link repair, orphan classification, and idempotency confirmation
- Parallel agent safety section in build prompt — prevents race condition where agents link to files that don't exist yet
- Structured skip log format (`SKIPPED:` prefix) for build-to-verify data handoff
- Type vocabulary handoff — build prompt writes `## Type Vocabulary` to linking log, verify prompt reads it in Phase 7
- Survey phase produces concrete vault index in linking log (hub/spoke classification, folder, tags, topic summary)

### Changed

- Default to 24 Penfield relationship types — removed custom type placeholder
- Build prompt (`prompts/autonomous-vault-linking.md`) — scoped verification to per-batch checks, deferred broken-link detection to verify pass
- Skill Step 6 — link target verification is now deferrable when a calling prompt runs parallel agents
- File index in verify prompt includes all file types (images, PDFs, canvas), not just `.md`
- Verify prompt handles heading refs (`#Heading`), block refs (`#^id`), and same-file links (`[[#Heading]]`)

### Fixed

- Build prompt no longer claims branch is ready for merge — verify pass is required first
- Removed "spot-check 10-15 notes" guidance — replaced with exhaustive automated verification

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

[1.0.0]: https://github.com/penfieldlabs/obsidian-wikilink-types/releases/tag/1.0.0
