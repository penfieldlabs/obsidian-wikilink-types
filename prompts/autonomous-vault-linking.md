# Autonomous Vault Linking

Use this prompt when you want an AI agent to link an entire Obsidian vault in one pass — overnight, unattended, no per-link approval. The agent uses the [Obsidian Vault Linker skill](../skill/SKILL.md) for format and relationship types, but operates autonomously with safety guardrails.

## When to Use This

- You have a vault with 50+ notes that need typed relationships added
- You want the agent to work through everything without stopping to ask
- You trust the agent to make high-confidence linking decisions
- You'll review the output after, not during

## Prerequisites

- The vault is in a git repository (or you're okay with the agent creating one)
- The agent has read/write access to the vault directory
- The [Obsidian Vault Linker skill](../skill/SKILL.md) is available to the agent

## The Prompt

Copy everything below the line and give it to your agent, replacing the placeholders.

---

```
You have autonomous authority to link this Obsidian vault using the Obsidian Vault Linker skill. Read the skill first — it defines the relationship types, writing format, and quality standards you must follow.

## Vault Location
[VAULT_PATH]

## Safety

Before writing any relationships:
1. If this vault is not already a git repo, initialize one and commit the current state
2. Create a branch called `auto-linking-YYYY-MM-DD` and work there — do not write to main
3. Commit after each batch of notes (every 20-50 notes) with a message describing what was linked
4. If you break YAML frontmatter or corrupt a file, revert that file from the last commit immediately

## Custom Relationship Types

In addition to the standard 24 types from the skill, use these custom types:
[LIST YOUR CUSTOM TYPES HERE, or delete this section to use only the standard 24]

Example:
- `discusses` — this note substantively covers the target topic
- `summarizes` — this note is a condensed version of the target

Do not invent any relationship types beyond the standard 24 and the custom types listed above.

## Linking Order

Work through the vault in this order:

1. **Survey** — Read folder structure, frontmatter, and first 20 lines of every note. Build a mental map of note types, topics, and existing links. Identify hub notes (concepts, MOCs, indexes) vs spoke notes (content, articles, logs).

2. **Hub-to-hub** — Link hub notes to each other first. These are the highest-value relationships (e.g., one concept is `prerequisite_for` another, or `parent_of` a sub-concept).

3. **Spoke-to-hub** — Link content notes into the hub notes they substantively discuss. This is usually the bulk of the work.

4. **Spoke-to-spoke** — Look for lateral connections between content notes: contradictions, evolutions, causal chains, cross-domain insights. Be selective — only link when you can point to specific evidence in both notes.

5. **Orphan check** — Find notes with zero typed relationships. Decide: link them, or flag them for human review.

## Quality Standards

- **Write only high-confidence relationships.** If you'd rate it medium confidence, include it but flag it in the summary log.
- **Be specific with types.** Don't default to `references` when `supports` or `contradicts` is more precise.
- **Don't over-link.** 3-8 typed relationships per note is typical. A note with 20 relationships is probably over-linked.
- **Preserve everything.** You are adding relationships, not editing content. If you need to modify existing frontmatter, add keys — never remove or overwrite existing ones.

## Verification

After completing each batch:
- Every wikilink target must resolve to an actual file in the vault
- Frontmatter relationship keys and inline `@type` links must match
- No duplicate relationships
- YAML must be valid
- Only declared relationship types were used

## Output

When finished, produce:
1. A summary in `_meta/linking-log.md` (or append to an existing one) with:
   - Date, total notes processed, total relationships added
   - Breakdown by relationship type
   - List of medium-confidence relationships for human review
   - Any orphan notes that couldn't be meaningfully linked
   - Any errors encountered and how they were resolved
2. The branch is ready for the user to review and merge

Do not merge the branch yourself.
```

---

## After the Run

1. Review the diff: `git diff main..auto-linking-YYYY-MM-DD`
2. Spot-check 10-15 notes for relationship quality
3. Check the linking log for medium-confidence items and orphans
4. Merge if satisfied: `git merge auto-linking-YYYY-MM-DD`
5. Or cherry-pick specific commits if you only want some of the changes

## Tips

- **Smaller vaults (50-200 notes):** The agent can usually handle the full vault in one session.
- **Larger vaults (500+):** The agent may run out of context. The commit-per-batch approach means progress is saved. Point the agent at the linking log next session and it can resume.
- **Mixed-quality notes:** If some notes are polished reference material and others are rough scratchpads, tell the agent which folders to prioritize and which to skip.
- **Existing relationships:** The agent will detect and skip existing typed relationships (idempotent). Safe to re-run on a partially-linked vault.
