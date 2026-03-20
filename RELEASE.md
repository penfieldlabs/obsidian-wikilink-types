# Release Notes: obsidian-wikilink-types 1.0.0

**Date:** March 19, 2026
**Type:** Initial Release

---

## Overview

Obsidian plugin that adds typed relationships to wikilinks. Type `@` inside a wikilink alias to trigger an autocomplete dropdown of relationship types. On selection, the plugin syncs the relationship to YAML frontmatter automatically — so Dataview, Graph Link Types, Breadcrumbs, and the rest of the Obsidian ecosystem can consume it without changes.

---

## What's New

### Autocomplete
- `@` trigger inside wikilink aliases — after a space or right after `|`
- Multiple `@types` per wikilink for natural display text (e.g. `[[Note|This @supersedes and @contradicts the old work]]`)
- Popup with keyboard navigation (Arrow keys, Enter/Tab to accept, Escape to dismiss)
- Mouse click selection
- Case-insensitive filtering by key or label
- Viewport-aware positioning (stays within screen bounds)
- ARIA attributes for accessibility (listbox, option, aria-selected)
- Email-safe: `john@causes.com` is ignored — `@` only triggers after a space or at alias start

### Frontmatter Sync
- Automatic sync of typed wikilinks to YAML frontmatter on save
- Multiple `@types` per link each create their own frontmatter entry
- Debounced writes (500ms) to avoid write storms
- Re-trigger prevention (skips write when frontmatter already matches)
- Only touches keys that match configured relationship types
- Removes frontmatter keys when all typed links of that type are deleted
- `@` in display text that doesn't match a configured type is left alone

### Configuration
- 24 default relationship types (Penfield vocabulary)
- Fully configurable via `data.json` in the plugin directory
- Duplicate key detection with console warning
- Graceful fallback to defaults on corrupted config
- No settings UI — edit JSON directly (settings tab planned for v1.1)

---

## 24 Default Relationship Types

**Knowledge Evolution:** supersedes, updates, evolution_of

**Evidence & Support:** supports, contradicts, disputes

**Hierarchy & Structure:** parent_of, child_of, sibling_of, composed_of, part_of

**Cause & Prerequisites:** causes, influenced_by, prerequisite_for

**Implementation & Testing:** implements, documents, tests, example_of

**Conversation & Attribution:** responds_to, references, inspired_by

**Sequence & Flow:** follows, precedes

**Dependencies:** depends_on

---

## Compatibility

| Plugin | Works? | How |
|--------|--------|-----|
| Dataview | Yes | Reads YAML frontmatter natively |
| Graph Link Types | Yes | Reads frontmatter via Dataview |
| Breadcrumbs | Yes | Reads frontmatter |
| Juggl | Yes | Reads Dataview metadata |
| Templater | Yes | No conflicts |
| Excalidraw | Yes | No conflicts |

---

## Graceful Degradation

If you uninstall the plugin:

- YAML frontmatter remains — no data loss
- `@type` text stays visible in wikilink aliases — readable, just not styled
- All Dataview queries continue to work
- Graph Link Types continues to work

---

## Installation

### BRAT (pre-listing)

If the plugin isn't in the Community Plugins directory yet:

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) from Community Plugins
2. Open Command Palette → **BRAT: Add a beta plugin for testing**
3. Paste: `penfieldlabs/obsidian-wikilink-types`
4. Click **Add Plugin**, then enable in Settings → Community Plugins

### Manual

1. Download `plugin.zip` from the [latest release](https://github.com/penfieldlabs/obsidian-wikilink-types/releases)
2. Unzip and copy the `wikilink-types` folder into your vault's `.obsidian/plugins/` directory
3. Enable the plugin in Settings → Community Plugins

Use Settings → Community Plugins → 📁 (Open plugins folder) to open the target directory for drag and drop.

---

## Architecture

| Module | Purpose |
|--------|---------|
| `main.ts` | Plugin lifecycle, event registration, debounced sync |
| `autocomplete.ts` | ViewPlugin (CM6) + Scope for popup rendering and keyboard capture |
| `autocomplete-utils.ts` | Pure functions: filtering and index clamping |
| `parser.ts` | Two-step typed wikilink parsing (find links, scan for space-preceded @types) and cursor context detection |
| `sync.ts` | Frontmatter stripping, relationship map building, YAML sync |
| `config.ts` | Config validation, defaults, data loading |
| `types.ts` | TypeScript interfaces |

---

## Requirements

- Obsidian 1.4.4+
- Desktop or mobile

---

## Credits

Author: Penfield

---

## Links

- Repository: https://github.com/penfieldlabs/obsidian-wikilink-types
- Issues: https://github.com/penfieldlabs/obsidian-wikilink-types/issues
