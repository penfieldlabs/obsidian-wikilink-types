import { App, type CachedMetadata, type SectionCache, TFile } from "obsidian";
import { parseTypedWikilinks } from "./parser";
import type { RelationshipType } from "./types";

/**
 * Strip YAML frontmatter fences from file content, returning only the body.
 */
export function stripFrontmatter(content: string): string {
	const match = content.match(/^---[\s\S]*?\n---(?:\r?\n|$)/);
	if (!match) return content;
	return content.slice(match[0].length);
}

/**
 * Strip code blocks and inline code from body text so they are not
 * parsed for @type wikilinks.
 *
 * Uses Obsidian's MetadataCache sections (type === 'code') when
 * available — this handles all code fence variants (```, ~~~,
 * indented, 4+ backticks) without fragile regex.
 *
 * Falls back to regex stripping when the cache is unavailable
 * (e.g. metadata not yet indexed after a modify event).
 *
 * Inline code (`...`) is always stripped via regex since SectionCache
 * does not track inline spans.
 *
 * Fixes: https://github.com/penfieldlabs/obsidian-wikilink-types/issues/1
 */
export function stripCodeContent(
	body: string,
	codeSections?: SectionCache[]
): string {
	let result = body;

	if (codeSections && codeSections.length > 0) {
		// Use section offsets to blank out code block content.
		// Work backwards so offsets stay valid as we splice.
		const lines = result.split("\n");
		for (let i = codeSections.length - 1; i >= 0; i--) {
			const sec = codeSections[i];
			const startLine = sec.position.start.line;
			const endLine = sec.position.end.line;
			for (let ln = startLine; ln <= endLine && ln < lines.length; ln++) {
				lines[ln] = "";
			}
		}
		result = lines.join("\n");
	} else {
		// Fallback: regex strip fenced code blocks (``` and ~~~)
		result = result.replace(/^(`{3,}|~{3,}).*\n[\s\S]*?\n\1\s*$/gm, "");
	}

	// Always strip inline code — SectionCache does not track inline spans
	result = result.replace(/`[^`]+`/g, "");

	return result;
}

/**
 * Build a map of relationship type -> list of [[target]] links from document body.
 */
export function buildRelationshipMap(
	body: string,
	validKeys: Set<string>
): Map<string, string[]> {
	const matches = parseTypedWikilinks(body);
	const map = new Map<string, string[]>();

	for (const m of matches) {
		if (!validKeys.has(m.type)) continue;
		const linkStr = `[[${m.target}]]`;
		if (!map.has(m.type)) {
			map.set(m.type, []);
		}
		const list = map.get(m.type)!;
		if (!list.includes(linkStr)) {
			list.push(linkStr);
		}
	}

	return map;
}

/**
 * Compare desired relationship map against current frontmatter.
 * Returns true if frontmatter already matches and no write is needed.
 */
export function frontmatterMatchesDesired(
	frontmatter: Record<string, unknown>,
	desired: Map<string, string[]>,
	validKeys: Set<string>
): boolean {
	for (const key of validKeys) {
		const desiredLinks = desired.get(key);
		const current = frontmatter[key];

		if (desiredLinks && desiredLinks.length > 0) {
			if (!Array.isArray(current)) return false;
			if (current.length !== desiredLinks.length) return false;
			// Compare as sets — user may reorder links in frontmatter manually
			const currentSet = new Set(current as string[]);
			if (!desiredLinks.every((link) => currentSet.has(link)))
				return false;
		} else {
			if (key in frontmatter) return false;
		}
	}
	return true;
}

/**
 * Sync typed wikilinks in the document body to YAML frontmatter.
 * Only touches frontmatter keys that match configured relationship type keys.
 * Skips the write entirely if frontmatter already matches, preventing
 * infinite re-trigger from the vault "modify" event.
 *
 * Code blocks (fenced and inline) are excluded from parsing so that
 * example/documentation wikilinks don't create bogus frontmatter entries.
 */
export async function syncFrontmatter(
	app: App,
	file: TFile,
	relationshipTypes: RelationshipType[]
): Promise<void> {
	const content = await app.vault.read(file);
	const body = stripFrontmatter(content);

	// Get code block sections from Obsidian's metadata cache.
	// The cache may be stale immediately after a modify event —
	// stripCodeContent falls back to regex when sections are unavailable.
	const cache: CachedMetadata | null = app.metadataCache.getFileCache(file);
	const codeSections = (cache?.sections || []).filter(
		(s: SectionCache) => s.type === "code"
	);

	// Frontmatter line count affects section offsets — sections are
	// indexed from the start of the file, but `body` has frontmatter
	// stripped. Adjust section line numbers to be relative to body.
	const frontmatterLineCount = content.split("\n").length - body.split("\n").length;
	const adjustedSections: SectionCache[] = codeSections.map((s) => ({
		...s,
		position: {
			start: {
				...s.position.start,
				line: s.position.start.line - frontmatterLineCount,
			},
			end: {
				...s.position.end,
				line: s.position.end.line - frontmatterLineCount,
			},
		},
	}));
	// Filter out sections that are entirely within the frontmatter
	const bodySections = adjustedSections.filter(
		(s) => s.position.start.line >= 0
	);

	const cleanBody = stripCodeContent(body, bodySections.length > 0 ? bodySections : undefined);
	const validKeys = new Set(relationshipTypes.map((rt) => rt.key));
	const desired = buildRelationshipMap(cleanBody, validKeys);

	await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
		if (frontmatterMatchesDesired(frontmatter, desired, validKeys)) return;

		for (const key of validKeys) {
			const links = desired.get(key);
			if (links && links.length > 0) {
				frontmatter[key] = links;
			} else if (key in frontmatter) {
				delete frontmatter[key];
			}
		}
	});
}
