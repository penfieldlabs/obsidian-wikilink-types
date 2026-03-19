import { describe, it, expect } from "vitest";
import { stripFrontmatter, buildRelationshipMap, frontmatterMatchesDesired } from "../src/sync";

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
