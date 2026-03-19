import type { WikilinkMatch } from "./types";

/**
 * Regex to match wikilinks that have an alias (contain a |).
 * Captures: [1] target note name, [2] alias text.
 */
const WIKILINK_WITH_ALIAS_RE = /\[\[([^\]|]+)\|([^\]]+)\]\]/g;

/**
 * Regex to find @type tokens inside alias text.
 * Requires a space or start of string before @ to avoid matching emails like john@causes.com.
 * Captures: the type key (without @).
 */
const AT_TYPE_RE = /(?<=\s|^)@([\w-]+)/gm;

/**
 * Parse all typed wikilinks from document content.
 * Supports multiple @types per wikilink, e.g.:
 *   [[Note|This @supersedes and @contradicts the old analysis]]
 * Returns one WikilinkMatch per @type found.
 */
export function parseTypedWikilinks(content: string): WikilinkMatch[] {
	const matches: WikilinkMatch[] = [];
	let linkMatch: RegExpExecArray | null;

	WIKILINK_WITH_ALIAS_RE.lastIndex = 0;
	while ((linkMatch = WIKILINK_WITH_ALIAS_RE.exec(content)) !== null) {
		const full = linkMatch[0];
		const target = linkMatch[1].trim();
		const alias = linkMatch[2];

		AT_TYPE_RE.lastIndex = 0;
		let typeMatch: RegExpExecArray | null;
		while ((typeMatch = AT_TYPE_RE.exec(alias)) !== null) {
			matches.push({ full, target, type: typeMatch[1] });
		}
	}

	return matches;
}

/**
 * Determine if the cursor is inside a wikilink alias (after |) and after an @ character
 * that is preceded by a space or is at position 0 (right after |).
 * Returns the partial type string typed so far, or null if not in context.
 */
export function getAtContext(lineText: string, cursorCol: number): string | null {
	const before = lineText.slice(0, cursorCol);

	// Find the last unclosed [[ before cursor
	const openIdx = before.lastIndexOf("[[");
	if (openIdx === -1) return null;

	// Make sure there's no ]] between [[ and cursor (link closed before cursor)
	const segment = before.slice(openIdx);
	if (segment.includes("]]")) return null;

	// Must have a | (alias separator) after [[
	const pipeIdx = segment.indexOf("|");
	if (pipeIdx === -1) return null;

	// The alias portion is after the |
	const aliasSegment = segment.slice(pipeIdx + 1);

	// Find the last @ in the alias
	const atIdx = aliasSegment.lastIndexOf("@");
	if (atIdx === -1) return null;

	// Reject if there's a ] before @ in the alias — cursor is at/past closing bracket
	if (aliasSegment.slice(0, atIdx).includes("]")) return null;

	// @ must be preceded by a space or be at position 0 (right after |)
	if (atIdx > 0 && aliasSegment[atIdx - 1] !== " ") return null;

	// Return everything after the @ as the partial type query
	return aliasSegment.slice(atIdx + 1);
}
