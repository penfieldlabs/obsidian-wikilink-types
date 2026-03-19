import { describe, it, expect } from "vitest";
import { parseTypedWikilinks, getAtContext } from "../src/parser";

describe("parseTypedWikilinks", () => {
	it("parses a single typed wikilink", () => {
		const result = parseTypedWikilinks("[[Note A|Display @supersedes]]");
		expect(result).toEqual([
			{ full: "[[Note A|Display @supersedes]]", target: "Note A", type: "supersedes" },
		]);
	});

	it("parses multiple typed wikilinks", () => {
		const content = "See [[A|text @supports]] and [[B|other @contradicts]] here.";
		const result = parseTypedWikilinks(content);
		expect(result).toHaveLength(2);
		expect(result[0].type).toBe("supports");
		expect(result[1].type).toBe("contradicts");
	});

	it("parses multiple @types in one wikilink", () => {
		const content = "[[Analysis|This @supersedes and @contradicts the old work]]";
		const result = parseTypedWikilinks(content);
		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({
			full: "[[Analysis|This @supersedes and @contradicts the old work]]",
			target: "Analysis",
			type: "supersedes",
		});
		expect(result[1]).toEqual({
			full: "[[Analysis|This @supersedes and @contradicts the old work]]",
			target: "Analysis",
			type: "contradicts",
		});
	});

	it("handles @type in the middle of display text", () => {
		const result = parseTypedWikilinks("[[Note|The analysis @supersedes the archive]]");
		expect(result).toHaveLength(1);
		expect(result[0].type).toBe("supersedes");
	});

	it("ignores email-style @ (no space before)", () => {
		expect(parseTypedWikilinks("[[Note|contact john@causes.com about this]]")).toEqual([]);
	});

	it("ignores @ glued to preceding word", () => {
		expect(parseTypedWikilinks("[[Note|itself@behaves like that]]")).toEqual([]);
	});

	it("matches space-preceded @ but ignores glued @", () => {
		const result = parseTypedWikilinks("[[Note|john@causes but @supports the claim]]");
		expect(result).toHaveLength(1);
		expect(result[0].type).toBe("supports");
	});

	it("ignores wikilinks without alias (no pipe)", () => {
		expect(parseTypedWikilinks("[[Note @foo]]")).toEqual([]);
	});

	it("ignores wikilinks without @ in alias", () => {
		expect(parseTypedWikilinks("[[Note|just an alias]]")).toEqual([]);
	});

	it("ignores bare @ outside wikilinks", () => {
		expect(parseTypedWikilinks("email@example.com")).toEqual([]);
	});

	it("handles @ in note title without alias", () => {
		expect(parseTypedWikilinks("[[email@work]]")).toEqual([]);
	});

	it("trims whitespace from target name", () => {
		const result = parseTypedWikilinks("[[ Note A |Display @supports]]");
		expect(result[0].target).toBe("Note A");
	});

	it("supports underscore type keys", () => {
		const result = parseTypedWikilinks("[[N|text @parent_of]]");
		expect(result[0].type).toBe("parent_of");
	});

	it("supports hyphenated type keys", () => {
		const result = parseTypedWikilinks("[[N|text @my-custom-type]]");
		expect(result[0].type).toBe("my-custom-type");
	});

	it("handles display text before @", () => {
		const result = parseTypedWikilinks("[[Note|This is a long display name @supersedes]]");
		expect(result[0].type).toBe("supersedes");
		expect(result[0].target).toBe("Note");
	});

	it("returns empty array for no matches", () => {
		expect(parseTypedWikilinks("Just some text with no links")).toEqual([]);
	});

	it("returns empty array for empty string", () => {
		expect(parseTypedWikilinks("")).toEqual([]);
	});

	it("handles multiline content", () => {
		const content = "Line 1\n[[A|foo @supports]]\nLine 3\n[[B|bar @causes]]\n";
		const result = parseTypedWikilinks(content);
		expect(result).toHaveLength(2);
	});

	it("does not match when @ appears before pipe", () => {
		expect(parseTypedWikilinks("[[Note@foo|display]]")).toEqual([]);
	});

	it("matches @ at start of alias (right after pipe)", () => {
		const result = parseTypedWikilinks("[[Note|@supports]]");
		expect(result).toHaveLength(1);
		expect(result[0].type).toBe("supports");
	});

	it("can be called multiple times without stale state (lastIndex reset)", () => {
		parseTypedWikilinks("[[A|x @supports]]");
		const result = parseTypedWikilinks("[[B|y @causes]]");
		expect(result).toHaveLength(1);
		expect(result[0].target).toBe("B");
	});

	it("handles adjacent wikilinks on same line", () => {
		const content = "[[A|x @supports]][[B|y @causes]]";
		const result = parseTypedWikilinks(content);
		expect(result).toHaveLength(2);
	});
});

describe("getAtContext", () => {
	it("returns query string after space+@ inside wikilink alias", () => {
		const line = "[[Note|Display @sup";
		expect(getAtContext(line, line.length)).toBe("sup");
	});

	it("returns empty string when cursor is right after space+@", () => {
		const line = "[[Note|Display @";
		expect(getAtContext(line, line.length)).toBe("");
	});

	it("returns null when @ has no space before it (email-style)", () => {
		expect(getAtContext("[[Note|john@sup", 15)).toBeNull();
	});

	it("returns query when @ is at start of alias (right after pipe)", () => {
		expect(getAtContext("[[Note|@sup", 11)).toBe("sup");
		expect(getAtContext("[[Note|@", 8)).toBe("");
	});

	it("returns null when no [[ present", () => {
		expect(getAtContext("text @foo", 9)).toBeNull();
	});

	it("returns null when no pipe present (not in alias)", () => {
		expect(getAtContext("[[Note @foo", 11)).toBeNull();
	});

	it("returns query when cursor is inside alias with @ before ]]", () => {
		expect(getAtContext("[[Note|text @sup]]", 16)).toBe("sup");
	});

	it("returns null when @ is between ] and ] (cursor in closing brackets)", () => {
		expect(getAtContext("[[Note|text]@", 13)).toBeNull();
		expect(getAtContext("[[Note|text] @", 14)).toBeNull();
	});

	it("returns null when @ is before the pipe", () => {
		expect(getAtContext("[[Note@x|display", 16)).toBeNull();
	});

	it("returns null when no @ in alias", () => {
		expect(getAtContext("[[Note|display text", 19)).toBeNull();
	});

	it("returns null outside of wikilinks entirely", () => {
		expect(getAtContext("Just some text", 5)).toBeNull();
	});

	it("handles cursor at various positions in partial type", () => {
		const line = "[[Note|Display @supersedes";
		expect(getAtContext(line, 16)).toBe("");     // right after @
		expect(getAtContext(line, 17)).toBe("s");    // after @s
		expect(getAtContext(line, 20)).toBe("supe"); // after @supe
		expect(getAtContext(line, line.length)).toBe("supersedes");
	});

	it("handles multiple wikilinks on same line, picks the one cursor is in", () => {
		const line = "[[A|x @done]] text [[B|y @sup";
		expect(getAtContext(line, line.length)).toBe("sup");
	});

	it("returns null when cursor is past ]] of a closed link", () => {
		const line = "[[A|x @done]] text [[B|y @sup";
		expect(getAtContext(line, 14)).toBeNull();
	});

	it("returns null when ] appears before @ in alias", () => {
		expect(getAtContext("[[Note|display text]@supersedes]", 31)).toBeNull();
	});

	it("triggers on second @ after first type is complete", () => {
		const line = "[[Note|This @supersedes and @con";
		expect(getAtContext(line, line.length)).toBe("con");
	});

	it("ignores glued @ but triggers on spaced @", () => {
		const line = "[[Note|john@company but @sup";
		expect(getAtContext(line, line.length)).toBe("sup");
	});
});
