# Autonomous Vault Linking

Use this prompt when you want an AI agent to link an entire Obsidian vault in one pass — overnight, unattended, no per-link approval. The agent uses the [Obsidian Vault Linker skill](../skill/SKILL.md) for format and relationship types, but operates autonomously with safety guardrails.

After this prompt completes, run the [Verify and Repair](verify-and-repair.md) prompt on the same branch. The build prompt gets relationships written; the verify prompt ensures they're clean.

## When to Use This

- You have a vault with 50+ notes that need typed relationships added
- You want the agent to work through everything without stopping to ask
- You trust the agent to make high-confidence linking decisions
- You'll run the verify prompt after, then review the output

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
1. Verify `[VAULT_PATH]` contains a `.obsidian` directory. If not, stop and confirm with the user — this may not be an Obsidian vault.
2. If this vault is not already a git repo, initialize one and commit the current state
3. Create a branch called `auto-linking-YYYY-MM-DD` and work there — do not write to main
4. Commit after each batch of notes (every 20-50 notes) with a message describing what was linked
5. If you break YAML frontmatter or corrupt a file, revert that file from the last commit immediately

## Relationship Types

Use the 24 Penfield relationship types defined in the skill. These are your type vocabulary. Do not invent or add types.

## Linking Order

Work through the vault in this order:

1. **Survey** — Read folder structure, frontmatter, and first 20 lines of every note. Produce a vault index in `_meta/linking-log.md` listing every note with its classification (hub or spoke), folder, tags, and a one-line topic summary. This index is your reference for all later phases — do not skip it.

2. **Hub-to-hub** — Link hub notes to each other first. These are the highest-value relationships (e.g., one concept is `prerequisite_for` another, or `parent_of` a sub-concept).

3. **Spoke-to-hub** — Link content notes into the hub notes they substantively discuss. This is usually the bulk of the work.

4. **Spoke-to-spoke** — Look for lateral connections between content notes: contradictions, evolutions, causal chains, cross-domain insights. Be selective — only link when you can point to specific evidence in both notes.

5. **Orphan check** — Find notes with zero typed relationships. Decide: link them, or flag them for human review.

## Parallel Agent Safety

If you parallelize work across multiple agents (e.g., one agent per folder or topic cluster):

- **Only link to files that already exist on disk.** Before writing any wikilink, verify the target file is present. Do not link to a file you expect another agent to create — if it doesn't exist yet, skip that link and log it.
- **Log skipped links.** Write any "target not found" skips to the linking log using this exact format so the verify pass can find them:
  ```
  SKIPPED: [[Target Name]] from Source Note.md — target not found at write time
  ```
- **Each agent should work on a non-overlapping set of source notes.** Agents may read any note, but only one agent should write to a given note. Partition by folder, topic cluster, or alphabetical range — whatever prevents write conflicts.

## Quality Standards

- **Write only high-confidence relationships.** If you'd rate it medium confidence, include it but flag it in the summary log.
- **Be specific with types.** Don't default to `references` when `supports` or `contradicts` is more precise.
- **Don't over-link.** 3-8 typed relationships per note is typical. A note with 20 relationships is probably over-linked.
- **Preserve everything.** You are adding relationships, not editing content. If you need to modify existing frontmatter, add keys — never remove or overwrite existing ones.

## Per-Batch Verification

After completing each batch of notes, verify what you can:
- YAML frontmatter is valid (no syntax errors, proper quoting)
- Frontmatter relationship keys and inline `@type` links match each other
- No duplicate relationships within a note
- Only declared relationship types were used

**Do NOT attempt exhaustive broken-link detection during the build phase.** If you parallelized work, other agents may not have finished yet. Broken-link detection is the verify prompt's job.

## Output

When finished, produce:
1. A summary in `_meta/linking-log.md` (or append to an existing one) with:
   - The 24 Penfield relationship types used, written as a `## Type Vocabulary` section so the verify prompt can read it.
   - Date, total notes processed, total relationships added
   - Breakdown by relationship type
   - List of medium-confidence relationships for human review
   - Any links skipped because the target file didn't exist at write time (using the `SKIPPED:` format above)
   - Any orphan notes that couldn't be meaningfully linked
   - Any errors encountered and how they were resolved
2. The branch is ready for the verify prompt — not for merge yet

**Do not merge the branch yourself. The verify-and-repair prompt runs next.**
```

---

## After the Build

Do NOT merge yet. Run the [Verify and Repair](verify-and-repair.md) prompt on the same branch first.

The build phase is optimized for throughput — it writes relationships fast, in parallel where possible, and does per-batch sanity checks. But parallel agents can create links to files that don't exist yet (or ever), and some edge cases only surface in a full-vault scan. The verify prompt catches all of this.

## Workflow

1. Run this build prompt → produces branch + linking log
2. Run [verify-and-repair.md](verify-and-repair.md) on the same branch → fixes broken links, classifies orphans, produces verification report
3. Review the verification report
4. Merge if satisfied: `git merge auto-linking-YYYY-MM-DD`
5. Or cherry-pick specific commits if you only want some of the changes

## Tips

- **Smaller vaults (50-200 notes):** The agent can usually handle the full vault in one session. You can run build + verify back-to-back.
- **Larger vaults (500+):** The agent may run out of context. The commit-per-batch approach means progress is saved. Point the agent at the linking log next session and it can resume where it left off — the verify prompt handles partially-linked vaults.
- **Mixed-quality notes:** If some notes are polished reference material and others are rough scratchpads, tell the agent which folders to prioritize and which to skip.
- **Existing relationships:** Both the build and verify prompts are idempotent. Re-running on an already-linked vault should produce zero changes — existing relationships are detected and skipped. See the verify prompt for how this works.
