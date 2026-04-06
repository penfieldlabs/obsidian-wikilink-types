# Verify and Repair

Run this prompt after the [Autonomous Vault Linking (Build)](autonomous-vault-linking.md) prompt completes. It performs an exhaustive scan of the vault, fixes broken links, classifies orphans, and produces a verification report. The branch should be clean before merge.

This prompt is also safe to run standalone on any vault — it only fixes problems it finds and doesn't add new relationships.

## When to Use This

- After an autonomous linking build pass (required — always run this)
- After any bulk vault operation that may have introduced broken links
- As a periodic health check on a linked vault
- After a partial or interrupted build that needs cleanup

## The Prompt

Copy everything below the line and give it to your agent, replacing the placeholders.

---

```
You are verifying and repairing an Obsidian vault after an automated linking pass. Your job is to find every broken link, fix or remove it, classify orphan notes, and confirm the vault is clean. You are not adding new relationships — only fixing problems.

Read the Obsidian Vault Linker skill first — it defines the relationship types and writing format you must follow.

## Vault Location
[VAULT_PATH]

Verify `[VAULT_PATH]` contains a `.obsidian` directory. If not, stop and confirm with the user — this may not be an Obsidian vault.

## Branch
Work on the existing branch: `auto-linking-YYYY-MM-DD` (or whatever branch the build prompt created). If there is no branch, work on a new branch called `verify-YYYY-MM-DD`.

Commit your fixes in logical batches with clear messages. Do not squash — the user may want to cherry-pick.

## Phase 1: Build the File Index

Before checking any links, build a complete index of every file in the vault:

1. List every file in the vault with its full path and filename (without extension). Include all file types — not just `.md`. Obsidian can link to images, PDFs, canvas files, and other attachments. Links to non-Markdown files use the file extension in the link: `[[Figure 1.png]]`.
2. Store this as your resolution table — a wikilink `[[Note Name]]` resolves if a file named `Note Name.md` exists anywhere in the vault. A wikilink `[[image.png]]` resolves if that file exists anywhere in the vault.
3. Account for Obsidian's resolution rules:
   - Wikilinks are case-insensitive for matching (`[[my note]]` matches `My Note.md`)
   - If multiple files share the same name in different folders, Obsidian uses the "Shortest path when possible" setting by default — the link resolves to the file with the shortest unique path. For verification purposes, flag duplicate filenames as ambiguous but not broken.
   - Wikilinks may include folder paths (`[[folder/Note]]`) — check both with and without the path prefix
   - **Heading and block references:** `[[Note#Heading]]`, `[[Note#Heading#Subheading]]`, and `[[Note#^block-id]]` link to sections within a note. Strip everything after `#` before resolving the file target. `[[#Heading]]` (no file target) is a same-file link and always valid.

This index is your source of truth. Every link check goes against this index — no guessing, no assumptions.

## Phase 2: Exhaustive Broken Link Scan

Scan every `.md` file in the vault. For each file:

1. **Extract all wikilinks** from the note body (not frontmatter). Match `[[target]]` and `[[target|alias]]` patterns.
2. **Extract all frontmatter wikilinks.** For each relationship type key in the YAML frontmatter, extract the `[[target]]` values.
3. **Check each link against the file index.** A link is broken if no file matches the target.

**Critical: Exclude code blocks and inline code.** Wikilinks inside any of the following are NOT real links and must be skipped:

- **Fenced code blocks** — lines between ` ``` ` or `~~~` markers (3 or more backticks/tildes). Backtick fences close only with backticks; tilde fences close only with tildes. The closing fence must use the same or more characters as the opening fence.
- **Nested fenced code blocks** — an outer fence with 4+ backticks can contain an inner fence with 3 backticks. Track fence depth correctly.
- **Fenced code blocks inside callouts/blockquotes** — fence markers may appear after `>` prefixes. These are still code blocks.
- **Inline code** — text between matching backtick runs (`` `code` `` or ``` ``code with `backtick` inside`` ```). The number of opening backticks must match the closing backticks exactly.
- **Indented code blocks** — lines indented 4+ spaces or 1+ tab (when not inside a list item). Less common but valid.

Wikilinks inside these constructs are examples, templates, or documentation — not real links. Treating them as broken links is a false positive.

Produce a list of every broken link with:
- Source file path
- The broken wikilink (exact text)
- Whether it appears in frontmatter, body, or both
- Location context (which section of the note)

## Phase 3: Repair Broken Links

For each broken link, apply the first matching repair strategy:

### 3a. Near-match resolution
Check if the target is a close match to an existing file:
- Case difference (`[[my note]]` → `My Note.md` exists) — fix the casing
- Minor typo (Levenshtein distance ≤ 2) — fix if unambiguous, flag if multiple candidates
- Missing or extra folder path prefix — fix to match actual location
- Plural/singular difference (`[[concepts]]` → `Concept.md`) — flag for review, don't auto-fix

### 3b. Orphaned by parallel agents
Check the linking log (`_meta/linking-log.md`) for lines starting with `SKIPPED:` — the build prompt writes these in the format `SKIPPED: [[Target Name]] from Source.md — target not found at write time`. If a broken link's target matches a logged skip, it's a parallel-agent race condition artifact. **Remove the broken link from both frontmatter and body.** Log what was removed.

### 3c. Unresolvable
If no near-match exists and it's not a logged skip:
- **Remove the broken link from frontmatter** (a broken frontmatter entry is worse than none)
- **In the body**, replace the broken wikilink with plain text (preserve the display text, remove the `[[]]` wrapper and any `@type` tag)
- Log it for human review — the user may want to create the missing note

Never leave a broken wikilink in the vault. Every link must either resolve or be removed.

## Phase 4: Frontmatter/Inline Consistency

For every note that has typed relationships (frontmatter relationship keys or body `@type` links):

1. **Parse frontmatter relationships** — extract all relationship type keys and their `[[target]]` arrays
2. **Parse body `@type` links** — extract all `@type` wikilinks from the note body (excluding code blocks per Phase 2 rules)
3. **Compare the two sets.** They must match:
   - If frontmatter has `supports: ["[[Note B]]"]` but the body has no `@supports` wikilink to Note B → add the missing inline link
   - If the body has `[[Note B|Note B @supports]]` but frontmatter is missing the `supports` key → add the missing frontmatter entry
   - If both exist but disagree on relationship type → flag for human review (don't auto-resolve type conflicts)

## Phase 5: Duplicate Detection

For each note, check for:
- Same target appearing multiple times under the same relationship type in frontmatter
- Same `@type` link to the same target appearing multiple times in the body
- Same target linked under multiple relationship types (not necessarily wrong, but flag if both types are near-synonyms like `supports` and `references` to the same target)

Remove exact duplicates. Flag near-synonym overlaps in the report.

## Phase 6: Orphan Classification

Find all notes with zero typed relationships (no relationship keys in frontmatter, no `@type` links in body, and not the target of any typed relationship from another note).

Classify each orphan:

### Legitimate orphans (leave alone)
- **Templates** — files in a templates folder, or with template frontmatter (e.g., `template: true`, `type: template`), or whose content is primarily template syntax (`{{`, `<%`, etc.)
- **Examples and documentation** — files in folders like `examples/`, `docs/`, `_templates/`, or that exist primarily to demonstrate syntax
- **Meta/config files** — `_meta/`, daily notes that are purely logs with no conceptual content, changelogs
- **Content inside code blocks** — if a note's only apparent "content" is inside code blocks, it's likely documentation or examples. Don't force-link it.

### Needs investigation
- Notes with substantive content (500+ words, clear topic, not a template) that have no relationships — these were likely missed by the build pass
- Notes that are targets of plain `[[wikilinks]]` from other notes but have no typed relationships — the relationship exists implicitly but was never typed

**Do not add new relationships.** Flag investigation-needed orphans in the report for either a re-run of the build prompt or human review.

## Phase 7: YAML Validation

Read the `## Type Vocabulary` section from `_meta/linking-log.md` to get the list of valid Penfield relationship types. If there is no linking log (standalone run), use the 24 types from the skill.

For every `.md` file in the vault (not just files modified during this verify pass):
- YAML frontmatter parses without errors
- Relationship arrays use proper format: `- "[[Target Note]]"` (quoted wikilinks)
- No bare wikilinks in frontmatter (unquoted `[[]]` breaks YAML)
- No relationship type keys that aren't in the type vocabulary from the linking log

## Output

Produce a verification report in `_meta/verification-report.md` with:

### Summary
- Date, vault size (total notes), notes scanned
- Total broken links found and repaired
- Total duplicates removed
- Total frontmatter/inline mismatches fixed
- Total orphans classified

### Broken Links Repaired
| Source File | Broken Link | Repair Action | Reason |
|---|---|---|---|
| (every broken link, what was done, and why) |

### Orphan Notes
**Legitimate orphans (no action needed):**
- List with reason (template, example, meta, etc.)

**Needs investigation:**
- List with reason (substantive content, implicit links exist, etc.)

### Remaining Issues
Anything that requires human judgment:
- Ambiguous near-matches that weren't auto-fixed
- Type conflicts between frontmatter and body
- Near-synonym overlaps
- Notes flagged for investigation

### Idempotency Confirmation
After all repairs, re-run Phase 2 (broken link scan). Report the result:
- "Zero broken links found — vault is clean" OR
- List of any remaining issues that could not be auto-resolved

Commit all changes with a message summarizing the verification results.

**The branch is now ready for the user to review and merge.**
```

---

## After Verification

1. Read the verification report: `_meta/verification-report.md`
2. Review the "Remaining Issues" section — these need human judgment
3. Check "Needs investigation" orphans — decide whether to re-run the build prompt on them or leave them unlinked
4. Review the diff: `git diff main..auto-linking-YYYY-MM-DD`
5. Merge if satisfied: `git merge auto-linking-YYYY-MM-DD`
6. Or cherry-pick specific commits if you only want some of the changes

## Running Standalone

This prompt works independently of the build prompt. Use it to:
- Verify a vault that was linked manually or by a different tool
- Health-check a vault after reorganizing files (renames, moves, folder restructuring)
- Clean up after a partial or interrupted build pass

Just point it at the vault and it will find and fix problems without adding new relationships.
