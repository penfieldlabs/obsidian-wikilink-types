import { describe, it, expect } from "vitest";
import { stripFrontmatter, stripCodeContent, buildRelationshipMap, frontmatterMatchesDesired } from "../src/sync";
import type { SectionCache } from "obsidian";

describe("stripFrontmatter", () => {
	it("strips standard frontmatter with LF endings", () => {
		const content = "---\ntitle: Test\n---\nBody content here";
		expect(stripFrontmatter(content)).toBe("Body content here");
	});

	it("strips frontmatter with CRLF endings", () => {
		const content = "---\r\ntitle: Test\r\n---\r\nBody content here";
		expect(stripFrontmatter(content)).toBe("Body content here");
	});

	it("returns full content when no frontmatter present", () => {
		const content = "Just body content, no frontmatter";
		expect(stripFrontmatter(content)).toBe(content);
	});

	it("returns full content when file starts with --- but no closing ---", () => {
		const content = "---\ntitle: Test\nBody content";
		expect(stripFrontmatter(content)).toBe(content);
	});

	it("returns empty string after frontmatter-only file", () => {
		const content = "---\ntitle: Test\n---\n";
		expect(stripFrontmatter(content)).toBe("");
	});

	it("handles frontmatter with no trailing newline after closing ---", () => {
		const content = "---\ntitle: Test\n---";
		expect(stripFrontmatter(content)).toBe("");
	});

	it("handles complex frontmatter with arrays and nested values", () => {
		const content = "---\ntitle: Test\ntags:\n  - foo\n  - bar\n---\nBody here";
		expect(stripFrontmatter(content)).toBe("Body here");
	});

	it("handles frontmatter containing wikilink-like strings", () => {
		const content = '---\nsupersedes:\n  - "[[Note A]]"\n---\nBody [[B|text @supports]]';
		const body = stripFrontmatter(content);
		expect(body).toBe("Body [[B|text @supports]]");
		expect(body).not.toContain("Note A");
	});

	it("does not strip --- that appears in body content", () => {
		const content = "---\ntitle: Test\n---\nBody\n---\nMore body";
		const body = stripFrontmatter(content);
		expect(body).toBe("Body\n---\nMore body");
	});

	it("handles empty frontmatter", () => {
		const content = "---\n---\nBody";
		expect(stripFrontmatter(content)).toBe("Body");
	});
});

describe("stripCodeContent", () => {
	// Helper to build a SectionCache for a code block spanning lines start..end
	function codeSection(startLine: number, endLine: number): SectionCache {
		return {
			type: "code",
			position: {
				start: { line: startLine, col: 0, offset: 0 },
				end: { line: endLine, col: 0, offset: 0 },
			},
		};
	}

	it("strips fenced code block using SectionCache", () => {
		const body = "Real text\n```\n[[A|@supports]]\n```\nMore text";
		const sections = [codeSection(1, 3)];
		const result = stripCodeContent(body, sections);
		expect(result).not.toContain("@supports");
		expect(result).toContain("Real text");
		expect(result).toContain("More text");
	});

	it("strips multiple code blocks using SectionCache", () => {
		const body = "Start\n```\n[[A|@supports]]\n```\nMiddle\n```\n[[B|@contradicts]]\n```\nEnd";
		const sections = [codeSection(1, 3), codeSection(5, 7)];
		const result = stripCodeContent(body, sections);
		expect(result).not.toContain("@supports");
		expect(result).not.toContain("@contradicts");
		expect(result).toContain("Start");
		expect(result).toContain("Middle");
		expect(result).toContain("End");
	});

	it("preserves typed wikilinks outside code blocks", () => {
		const body = "[[A|@supports]] this\n```\n[[B|@contradicts]]\n```";
		const sections = [codeSection(1, 3)];
		const result = stripCodeContent(body, sections);
		expect(result).toContain("@supports");
		expect(result).not.toContain("@contradicts");
	});

	it("strips inline code", () => {
		const body = "See `[[A|@supports]]` for example";
		const result = stripCodeContent(body, []);
		expect(result).not.toContain("@supports");
		expect(result).toContain("See");
		expect(result).toContain("for example");
	});

	it("strips inline code even when SectionCache is provided", () => {
		const body = "Real [[A|@supports]] and `[[B|@contradicts]]` inline";
		const result = stripCodeContent(body, []);
		expect(result).toContain("@supports");
		expect(result).not.toContain("@contradicts");
	});

	it("falls back to regex when no sections provided", () => {
		const body = "Text\n```\n[[A|@supports]]\n```\nMore";
		const result = stripCodeContent(body, undefined);
		expect(result).not.toContain("@supports");
		expect(result).toContain("Text");
		expect(result).toContain("More");
	});

	it("regex fallback handles tilde fences", () => {
		const body = "Text\n~~~\n[[A|@supports]]\n~~~\nMore";
		const result = stripCodeContent(body, undefined);
		expect(result).not.toContain("@supports");
	});

	it("returns body unchanged when no code blocks present", () => {
		const body = "Just [[A|@supports]] plain text";
		const result = stripCodeContent(body, []);
		expect(result).toBe(body);
	});

	it("handles empty body", () => {
		expect(stripCodeContent("", [])).toBe("");
		expect(stripCodeContent("", undefined)).toBe("");
	});
});

describe("buildRelationshipMap", () => {
	const validKeys = new Set(["supports", "contradicts", "supersedes", "causes"]);

	it("builds map from single typed wikilink", () => {
		const body = "Some text [[Note A|display @supports]] more text";
		const map = buildRelationshipMap(body, validKeys);
		expect(map.get("supports")).toEqual(["[[Note A]]"]);
	});

	it("builds map from multiple types", () => {
		const body = "[[A|x @supports]] and [[B|y @contradicts]]";
		const map = buildRelationshipMap(body, validKeys);
		expect(map.get("supports")).toEqual(["[[A]]"]);
		expect(map.get("contradicts")).toEqual(["[[B]]"]);
	});

	it("groups multiple links under same type", () => {
		const body = "[[A|x @supports]] and [[B|y @supports]]";
		const map = buildRelationshipMap(body, validKeys);
		expect(map.get("supports")).toEqual(["[[A]]", "[[B]]"]);
	});

	it("deduplicates same target under same type", () => {
		const body = "[[A|x @supports]] and [[A|y @supports]]";
		const map = buildRelationshipMap(body, validKeys);
		expect(map.get("supports")).toEqual(["[[A]]"]);
	});

	it("ignores types not in validKeys", () => {
		const body = "[[A|x @unknown_type]]";
		const map = buildRelationshipMap(body, validKeys);
		expect(map.size).toBe(0);
	});

	it("returns empty map for content with no typed wikilinks", () => {
		const body = "Just text with [[A|normal alias]] and [[B]]";
		const map = buildRelationshipMap(body, validKeys);
		expect(map.size).toBe(0);
	});

	it("returns empty map for empty content", () => {
		const map = buildRelationshipMap("", validKeys);
		expect(map.size).toBe(0);
	});

	it("ignores typed wikilinks in code blocks when pre-stripped", () => {
		const raw = "Real [[A|text @supports]]\n```\n[[B|example @contradicts]]\n```";
		const cleaned = stripCodeContent(raw, undefined);
		const map = buildRelationshipMap(cleaned, validKeys);
		expect(map.get("supports")).toEqual(["[[A]]"]);
		expect(map.has("contradicts")).toBe(false);
	});

	it("ignores typed wikilinks in inline code when pre-stripped", () => {
		const raw = "See `[[A|@supports]]` but [[B|real @contradicts]]";
		const cleaned = stripCodeContent(raw, undefined);
		const map = buildRelationshipMap(cleaned, validKeys);
		expect(map.has("supports")).toBe(false);
		expect(map.get("contradicts")).toEqual(["[[B]]"]);
	});
});

describe("frontmatterMatchesDesired", () => {
	const validKeys = new Set(["supports", "contradicts", "supersedes"]);

	it("returns true when frontmatter matches desired exactly", () => {
		const frontmatter = { supports: ["[[A]]", "[[B]]"] };
		const desired = new Map([["supports", ["[[A]]", "[[B]]"]]]);
		expect(frontmatterMatchesDesired(frontmatter, desired, validKeys)).toBe(true);
	});

	it("returns true when both are empty", () => {
		expect(frontmatterMatchesDesired({}, new Map(), validKeys)).toBe(true);
	});

	it("returns false when frontmatter has key that desired does not", () => {
		const frontmatter = { supports: ["[[A]]"] };
		const desired = new Map<string, string[]>();
		expect(frontmatterMatchesDesired(frontmatter, desired, validKeys)).toBe(false);
	});

	it("returns false when desired has key that frontmatter does not", () => {
		const frontmatter = {};
		const desired = new Map([["supports", ["[[A]]"]]]);
		expect(frontmatterMatchesDesired(frontmatter, desired, validKeys)).toBe(false);
	});

	it("returns false when values differ", () => {
		const frontmatter = { supports: ["[[A]]"] };
		const desired = new Map([["supports", ["[[B]]"]]]);
		expect(frontmatterMatchesDesired(frontmatter, desired, validKeys)).toBe(false);
	});

	it("returns false when array lengths differ", () => {
		const frontmatter = { supports: ["[[A]]"] };
		const desired = new Map([["supports", ["[[A]]", "[[B]]"]]]);
		expect(frontmatterMatchesDesired(frontmatter, desired, validKeys)).toBe(false);
	});

	it("returns false when frontmatter value is not an array", () => {
		const frontmatter = { supports: "[[A]]" };
		const desired = new Map([["supports", ["[[A]]"]]]);
		expect(frontmatterMatchesDesired(frontmatter, desired, validKeys)).toBe(false);
	});

	it("ignores keys not in validKeys", () => {
		const frontmatter = { unrelated: "value" };
		expect(frontmatterMatchesDesired(frontmatter, new Map(), validKeys)).toBe(true);
	});

	it("handles multiple keys simultaneously", () => {
		const frontmatter = { supports: ["[[A]]"], contradicts: ["[[B]]"] };
		const desired = new Map([
			["supports", ["[[A]]"]],
			["contradicts", ["[[B]]"]],
		]);
		expect(frontmatterMatchesDesired(frontmatter, desired, validKeys)).toBe(true);
	});

	it("returns true when same links in different order", () => {
		const frontmatter = { supports: ["[[B]]", "[[A]]"] };
		const desired = new Map([["supports", ["[[A]]", "[[B]]"]]]);
		expect(frontmatterMatchesDesired(frontmatter, desired, validKeys)).toBe(true);
	});
});
