import { App, TFile } from "obsidian";
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
 */
export async function syncFrontmatter(
	app: App,
	file: TFile,
	relationshipTypes: RelationshipType[]
): Promise<void> {
	const content = await app.vault.read(file);
	const body = stripFrontmatter(content);
	const validKeys = new Set(relationshipTypes.map((rt) => rt.key));
	const desired = buildRelationshipMap(body, validKeys);

	await app.fileManager.processFrontMatter(file, (frontmatter) => {
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
