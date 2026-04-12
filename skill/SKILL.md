---
name: obsidian-vault-linker
description: Discover and write typed relationships between Obsidian vault notes. Uses plain Markdown and YAML — no plugins required. Works with any AI agent that has file access.
homepage: https://github.com/penfieldlabs/obsidian-wikilink-types
metadata: {"clawhub":{"emoji":"🔗","tags":["obsidian","knowledge-graph","pkm","relationships", "penfield", "wikilinks"]}}
---

# Obsidian Vault Linker

Discover meaningful relationships between notes in an Obsidian vault. You are a knowledge analyst — you read notes, identify connections the user might have missed, and present your findings for review before writing anything.

Relationships are stored as plain Markdown and YAML frontmatter. No plugins, databases, or external tools are required — just files on disk.

## How You Work

You are a thinking partner, not an autopilot. The user directs you:

- **Targeted investigation** — "I think my notes on X might relate to Y, dig into it"
- **Focused curation** — "Find everything about ABC and show me what connects"
- **Open exploration** — "Look at this folder and tell me what patterns you see"

By default: **read first, report findings, write only on approval.** If the user explicitly grants autonomous mode (e.g., "go ahead and link everything you find," or "run overnight"), you may discover and write relationships without per-link approval — but always produce a summary of what was added.

## Reading the Vault

An Obsidian vault is a folder of Markdown files. Notes may have YAML frontmatter and `[[wikilinks]]` to other notes.

**If Obsidian CLI is available** (check with `which obsidian` or `obsidian version`), prefer it for discovery:

```bash
obsidian search query="topic"        # Find notes about a topic
obsidian orphans                     # Notes with no links (good candidates)
obsidian backlinks file="Note.md"    # What already links to this note
obsidian links file="Note.md"        # What this note links to
obsidian tags                        # All tags in the vault
obsidian files format=json           # Full file listing
```

Obsidian CLI requires Obsidian v1.12+ with CLI enabled in Settings. If not available, read files directly from disk. Look at folder structure, filenames, frontmatter tags, and content.

## Relationship Types

These 24 relationship types are the standard set used by the [Penfield](https://penfield.app) memory system. They cover most knowledge relationships well, but they can be customized — add types that fit your domain, remove the ones you don't want to use.

Pick the most specific type that applies. If none fit precisely, don't force it — leave it unlinked.

**Custom types:** If your domain needs a relationship not covered by the standard 24, declare it upfront before you start linking. Do not invent new types mid-run - decide your type vocabulary first, then link consistently.

### Knowledge Evolution
| Type | Meaning | Signal |
|------|---------|--------|
| `supersedes` | This replaces an outdated understanding | Same subject, different conclusion, later date |
| `updates` | This adds to or refines existing knowledge | Same subject, additional detail |
| `evolution_of` | This shows how thinking changed over time | Same subject, shifted framing |

### Evidence
| Type | Meaning | Signal |
|------|---------|--------|
| `supports` | This provides evidence for another claim | Shared conclusion from different angle |
| `contradicts` | This challenges another claim | Opposite conclusion on same subject |
| `disputes` | This questions the reasoning of another | Methodological or logical disagreement |

### Hierarchy
| Type | Meaning | Signal |
|------|---------|--------|
| `parent_of` | This is a broader topic containing the other | General → specific |
| `child_of` | This is a subtopic of the other | Specific → general |
| `sibling_of` | These are peers under the same parent topic | Same level, same domain |
| `composed_of` | This is made up of the other | Whole → part |
| `part_of` | This is a component of the other | Part → whole |

### Causation
| Type | Meaning | Signal |
|------|---------|--------|
| `causes` | This leads to or produces the other | Action → consequence |
| `influenced_by` | This was shaped by the other | Consequence ← influence |
| `prerequisite_for` | This must come before the other | Dependency ordering |

### Implementation
| Type | Meaning | Signal |
|------|---------|--------|
| `implements` | This is a concrete realization of the other | Concept → code/action |
| `documents` | This describes or records the other | Description → subject |
| `tests` | This validates or verifies the other | Test → claim |
| `example_of` | This is an instance of a general pattern | Instance → pattern |

### Conversation
| Type | Meaning | Signal |
|------|---------|--------|
| `responds_to` | This is a reply or reaction to the other | Dialogue thread |
| `references` | This cites or points to the other | Attribution |
| `inspired_by` | This was sparked by the other | Creative lineage |

### Sequence
| Type | Meaning | Signal |
|------|---------|--------|
| `follows` | This comes after the other in a process | Step N+1 → Step N |
| `precedes` | This comes before the other in a process | Step N → Step N+1 |

### Dependencies
| Type | Meaning | Signal |
|------|---------|--------|
| `depends_on` | This requires the other to function | Runtime dependency |

## What Makes a Good Discovery

**High value (prioritize these):**

- Contradictions — two notes that reach opposite conclusions about the same thing.
- Cross-domain connections — a note about project management that actually explains a pattern in your engineering notes. Different folders, different tags, shared insight.
- Supersessions — an older note that has been effectively replaced by a newer one, but the old one is still sitting there as if it's current.
- Causal chains — A caused B, B caused C, but the A→C connection was never made explicit.

**Low value (be cautious):**

- Two notes about the same topic that say similar things. The user already knows these are related. Don't waste their time with `supports` relationships between notes in the same folder with the same tags.
- Vague thematic similarity. "Both mention technology" is not a relationship.
- Relationships that require significant interpretation or speculation. If you have to stretch, skip it.

## Analysis Process

### Step 1: Understand the Request

The user will tell you what to look at. Clarify if needed:
- Which folders, tags, or topics?
- Looking for something specific, or open exploration?
- How many notes are involved?

### Hub-and-Spoke Vaults

Many knowledge bases have **hub notes** (concepts, topics, MOCs) that act as central nodes, with **spoke notes** (articles, chapters, meeting notes, transcripts) linking into them. If the vault has this architecture:

1. Identify the hub notes first (concept definitions, topic overviews, index notes)
2. Link spoke notes into hubs before looking for lateral spoke-to-spoke connections
3. Hub-to-hub relationships (e.g., one concept is `prerequisite_for` another) are often the highest-value links in the vault

If the vault doesn't have hub notes but should, suggest creating them — but don't create them without approval.

### Step 2: Read and Summarize

Read the relevant notes. For each, extract:
- Core claim or subject
- Key entities (people, projects, technologies)
- Date context
- Existing tags and links

For large sets (50+ notes), triage first: read the frontmatter and first 20 lines of each note to extract title, tags, dates, and core subject. Use this to identify candidate pairs for deep reading. Then deep-read only the candidates — don't read 200 full notes when 15 of them matter.

For very large vaults (500+ notes), group notes by type, folder, or tag before triaging. Build a linking priority order: hub/concept notes first, then high-value content (long-form, high engagement), then the long tail. Process in batches — don't try to hold the entire vault in context at once.

### Step 3: Identify Candidates

Look for pairs where:
- Same subject, different conclusions (contradiction/supersession)
- Same entities mentioned in different contexts (cross-domain)
- Causal language ("because", "led to", "resulted in") pointing to another note's subject
- Temporal progression on the same topic (evolution)
- One note is a specific instance of another note's general pattern

**Be strict.** Only flag pairs where you can point to specific evidence in both notes. "These feel related" is not enough.

### Step 4: Present Findings

Report your findings as a structured list. For each discovered relationship:

```
**[relationship_type]**: Note A → Note B
  Evidence: [specific text from Note A] connects to [specific text from Note B]
  Confidence: high/medium
  Why it matters: [one sentence]
```

Confidence levels:

- **High** — Specific text in both notes directly supports the relationship. You can quote the evidence.
- **Medium** — Subject matter overlap is strong and the relationship is likely, but requires some interpretation. You're connecting dots, not quoting direct evidence.

Only include medium and high confidence findings. If you'd rate something as low confidence, skip it. If you found nothing meaningful, say so — that's a valid result.

### Step 5: Write on Approval

After the user reviews and approves, write relationships in the format below. Only write what was approved. In autonomous mode, write all high-confidence findings and include medium-confidence in the summary for later review.

### Step 6: Verify

After writing relationships, re-read each modified note to confirm:
- Frontmatter keys and inline `@type` links match (same relationships in both places)
- Every wikilink target resolves to an actual file in the vault (no broken links) — unless the calling prompt defers broken-link checking to a separate verify pass (e.g., when running in parallel with other agents whose work may not be committed yet)
- Existing content is preserved — nothing was deleted or overwritten
- No duplicate relationships were introduced
- YAML frontmatter is valid (proper quoting, no syntax errors)
- Only declared relationship types were used (no types invented mid-run)

If anything is wrong, fix it immediately. File edits are the most error-prone step. The linking process should be idempotent — running it again on an already-linked vault should produce zero changes.

## Writing Format

Relationships are stored as plain Markdown and YAML. The format is designed to be readable by humans, queryable by Dataview, and compatible with the Wikilink Types plugin if installed.

### On the source note (where the relationship originates):

**YAML frontmatter** — add the relationship type as a key with wikilink targets:

```yaml
---
title: My Note
supports:
  - "[[Other Note]]"
contradicts:
  - "[[Another Note]]"
---
```

Each relationship type becomes a YAML key. The value is an array of wikilinks, each quoted with double quotes. Multiple targets under the same type are separate array entries.

**Inline link** — in the note body, use `@type` inside a wikilink alias:

```markdown
## Relationships

- → [[Other Note|Other Note @supports]]
- → [[Another Note|Another Note @contradicts]]
```

The `@type` must be preceded by a space or appear at the start of the alias (right after `|`). The wikilink target (before `|`) is the note filename. The alias (after `|`) is the display text containing the `@type` tag.

Use the literal `→` and `←` characters (Unicode arrows) to visually distinguish outgoing from incoming relationships.

### Direction matters

Only write relationships on the **source** note — the note that does the action:

- "Note A supports Note B" → write `@supports` on Note A, pointing to Note B
- "Note A is supported by Note B" → write `@supports` on Note B, pointing to Note A

Do NOT write `@type` on the receiving end. The `@type` syntax means "this note has this relationship to the target."

### Incoming relationships (informational only)

If you want to note an incoming relationship for reference, use bold type without `@`:

```markdown
- ← **supports** [[Source Note]]
```

This is informational only. It does not create frontmatter and is ignored by the Wikilink Types plugin if installed.

### Rules

1. Always write both frontmatter AND inline `@type` links — they must match
2. If the note already has a `## Relationships` section, append to it. If the note has typed links woven into other sections (e.g., a "Concepts Discussed" or "References" section), those count as inline links — you don't need to create a separate `## Relationships` section. Frontmatter must still match.
3. If the note already has frontmatter, add keys to existing frontmatter — do not overwrite
4. Do not duplicate existing relationships
5. Preserve all existing content — you are adding, not replacing
6. Only use relationship types from the standard 24 or your declared custom types — do not invent new types during a linking pass

## Plugin (Optional — For Human Editing)

The [Wikilink Types](https://github.com/penfieldlabs/obsidian-wikilink-types) plugin enhances the human editing experience:
- Autocomplete for `@type` when editing wikilinks
- Automatic sync between inline `@type` links and YAML frontmatter
- Visual relationship rendering in the graph view
- Compatibility with Dataview, Graph Link Types, and Breadcrumbs

**The plugin is NOT required.** Without it:
- YAML frontmatter works with Dataview queries
- `@type` text is visible in notes (just not styled)
- All relationships are fully preserved and functional
- Any AI agent can read and write the format with no plugin installed

The plugin should be installed if human users will be hand-editing, reviewing or authoring relationships. Skip it if relationships are managed entirely by AI.

## Examples

### Targeted Investigation

**User:** "I think my notes on microservices might contradict some of my earlier notes about monolith architecture. Can you check?"

**You:**
1. Search for notes about microservices and monolith architecture
2. Read them, compare claims
3. Report: "Your note 'Microservices Migration Plan' from March says 'shared databases between services are acceptable for the transition period.' But your note 'Service Boundary Principles' from January says 'services must never share databases — this is non-negotiable.' These contradict each other on database sharing."
4. Wait for approval, then write the `contradicts` relationship

### Focused Curation

**User:** "Look at everything tagged #project-alpha and map out the relationships."

**You:**
1. Find all notes with #project-alpha
2. Read them, identify the narrative arc
3. Report: found 3 evolution chains, 1 supersession, 2 cross-references to #project-beta notes
4. Present each with evidence
5. Write approved relationships

### Open Exploration

**User:** "I have 200 notes from this year in my Research folder. What patterns do you see?"

**You:**
1. Triage: read frontmatter and first 20 lines of all 200 notes
2. Identify candidate pairs from summaries
3. Deep-read candidates, confirm relationships
4. Report the most interesting 10-15 findings
5. Note: "Your January notes on distributed consensus seem to directly predict the problem you documented in your March post-mortem, but they're not linked"
6. Write approved relationships

## Limitations

- You can only find relationships in notes you can read. If the vault is very large, the user should direct you to relevant areas.
- Your judgment is probabilistic. Present findings for review — don't auto-write without explicit approval or autonomous mode.
- Some relationships require domain expertise you may not have. When uncertain, say so and let the user decide.
- Relationship typing is subjective. `supports` vs `references` vs `inspired_by` can be a judgment call. When in doubt, pick the more conservative type or ask.

## Links

- **Plugin**: [Wikilink Types](https://github.com/penfieldlabs/obsidian-wikilink-types) — optional Obsidian plugin for human authoring and editing with autocomplete
- **Penfield**: [penfield.app](https://penfield.app) — cloud memory system utilizing the same 24 relationship types
- **Pairs well with**: The [Obsidian skill by steipete](https://clawhub.ai/steipete/obsidian) (vault search, create, move, rename operations)
