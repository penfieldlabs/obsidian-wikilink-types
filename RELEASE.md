# Release Notes: obsidian-wikilink-types 1.0.1

**Date:** May 19, 2026
**Type:** Patch — code quality and scorecard hygiene

---

## What's Changed

### Fixed

- **Popout window compatibility:** replaced bare `document`, `setTimeout`, and `clearTimeout` references with Obsidian-safe `activeDocument`, `createDiv()`, `activeWindow.setTimeout()`, and `activeWindow.clearTimeout()`
- **Dev dependency vulnerabilities:** upgraded esbuild, vite, picomatch, postcss, brace-expansion, yaml, fast-uri — `npm audit` now reports 0 vulnerabilities
- **README:** removed outdated placeholder text ("coming soon", "pre-listing"), updated installation instructions to reflect Community Plugins listing
- **Release workflow:** removed unnecessary `plugin.zip` asset, added `actions/attest@v4` artifact attestation for `main.js` and `styles.css`, added lint step

### No behavior changes

Autocomplete, frontmatter sync, and all user-facing functionality are identical to 1.0.0.

---

## Overview

Obsidian plugin that adds typed relationships to wikilinks. Type `@` inside a wikilink alias to trigger an autocomplete dropdown of relationship types. On selection, the plugin syncs the relationship to YAML frontmatter automatically — so Dataview, Graph Link Types, Breadcrumbs, and the rest of the Obsidian ecosystem can consume it without changes.

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

### Community Plugins

1. Open **Settings → Community Plugins → Browse**
2. Search for **Wikilink Types**
3. Click **Install**, then **Enable**

### BRAT

To test pre-release versions, install via [BRAT](https://github.com/TfTHacker/obsidian42-brat):

1. Install BRAT from Community Plugins
2. Open Command Palette → **BRAT: Add a beta plugin for testing**
3. Paste: `penfieldlabs/obsidian-wikilink-types`
4. Click **Add Plugin**, then enable in Settings → Community Plugins

### Manual

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/penfieldlabs/obsidian-wikilink-types/releases)
2. Create a `wikilink-types` folder in your vault's `.obsidian/plugins/` directory
3. Copy the three files into that folder
4. Enable the plugin in **Settings → Community Plugins**

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
