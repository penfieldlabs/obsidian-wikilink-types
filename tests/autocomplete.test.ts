import { describe, it, expect } from "vitest";
import type { RelationshipType } from "../src/types";
import { getAtContext } from "../src/parser";
import { filterTypes, clampIndex } from "../src/autocomplete-utils";

/**
 * Autocomplete tests.
 *
 * The ViewPlugin class itself requires a full CM6 EditorView + Obsidian App,
 * so we test the exported pure functions that drive autocomplete behavior:
 * - filterTypes (used in evaluate())
 * - clampIndex (used in keyboard handlers)
 * - getAtContext integration (the bridge between cursor position and popup trigger)
 */

const SAMPLE_TYPES: RelationshipType[] = [
	{ key: "supersedes", label: "Supersedes", description: "Replaces" },
	{ key: "supports", label: "Supports", description: "Provides evidence" },
	{ key: "contradicts", label: "Contradicts", description: "Challenges" },
	{ key: "causes", label: "Causes", description: "Was caused by" },
	{ key: "parent_of", label: "Parent Of", description: "Encompasses" },
	{ key: "child_of", label: "Child Of", description: "Subset of" },
];

describe("autocomplete filtering", () => {
	it("returns all types for empty query", () => {
		const result = filterTypes("", SAMPLE_TYPES);
		expect(result).toEqual(SAMPLE_TYPES);
		expect(result).toHaveLength(6);
	});

	it("filters by key substring", () => {
		const result = filterTypes("sup", SAMPLE_TYPES);
		expect(result).toHaveLength(2);
		expect(result.map((r) => r.key)).toEqual(["supersedes", "supports"]);
	});

	it("filters by label substring", () => {
		const result = filterTypes("Parent", SAMPLE_TYPES);
		expect(result).toHaveLength(1);
		expect(result[0].key).toBe("parent_of");
	});

	it("is case insensitive", () => {
		expect(filterTypes("SUPER", SAMPLE_TYPES)).toHaveLength(1);
		expect(filterTypes("super", SAMPLE_TYPES)).toHaveLength(1);
		expect(filterTypes("Super", SAMPLE_TYPES)).toHaveLength(1);
	});

	it("returns empty for no matches", () => {
		expect(filterTypes("zzz", SAMPLE_TYPES)).toHaveLength(0);
	});

	it("matches partial key with underscore", () => {
		const result = filterTypes("parent_", SAMPLE_TYPES);
		expect(result).toHaveLength(1);
		expect(result[0].key).toBe("parent_of");
	});

	it("matches single character", () => {
		const result = filterTypes("c", SAMPLE_TYPES);
		// contradicts, causes, child_of (key), Supersedes has no c in key but label doesn't either...
		// supersedes key has no c, label "Supersedes" has no c
		// supports key has no c, label "Supports" has no c
		// contradicts key has c, causes key has c, child_of key has c
		// parent_of neither
		expect(result).toHaveLength(3);
	});

	it("handles types array being empty", () => {
		expect(filterTypes("anything", [])).toHaveLength(0);
		expect(filterTypes("", [])).toHaveLength(0);
	});
});

describe("autocomplete index clamping", () => {
	it("increments index on down", () => {
		expect(clampIndex(0, 5, "down")).toBe(1);
		expect(clampIndex(1, 5, "down")).toBe(2);
	});

	it("clamps at last index on down", () => {
		expect(clampIndex(4, 5, "down")).toBe(4);
		expect(clampIndex(3, 5, "down")).toBe(4);
	});

	it("decrements index on up", () => {
		expect(clampIndex(3, 5, "up")).toBe(2);
		expect(clampIndex(1, 5, "up")).toBe(0);
	});

	it("clamps at 0 on up", () => {
		expect(clampIndex(0, 5, "up")).toBe(0);
	});

	it("handles single item list", () => {
		expect(clampIndex(0, 1, "down")).toBe(0);
		expect(clampIndex(0, 1, "up")).toBe(0);
	});
});

describe("autocomplete trigger integration", () => {
	/**
	 * These tests verify that getAtContext correctly identifies when
	 * the autocomplete popup should appear or disappear.
	 */

	it("triggers popup when @ is typed in alias", () => {
		const line = "[[Note|text @";
		const query = getAtContext(line, line.length);
		expect(query).toBe("");
		// Empty query → show all types (popup opens)
	});

	it("narrows filter as user types after @", () => {
		const query1 = getAtContext("[[Note|text @s", 14);
		expect(query1).toBe("s");
		const filtered1 = filterTypes(query1!, SAMPLE_TYPES);
		expect(filtered1.length).toBeGreaterThan(0);
		expect(filtered1.length).toBeLessThan(SAMPLE_TYPES.length);

		const query2 = getAtContext("[[Note|text @super", 18);
		expect(query2).toBe("super");
		const filtered2 = filterTypes(query2!, SAMPLE_TYPES);
		expect(filtered2).toHaveLength(1);
		expect(filtered2[0].key).toBe("supersedes");
	});

	it("closes popup when query matches nothing", () => {
		const query = getAtContext("[[Note|text @zzz", 16);
		expect(query).toBe("zzz");
		const filtered = filterTypes(query!, SAMPLE_TYPES);
		expect(filtered).toHaveLength(0);
		// Empty filtered → popup closes
	});

	it("closes popup when cursor leaves wikilink context", () => {
		// User moves cursor outside the wikilink
		expect(getAtContext("text after ]] cursor here", 20)).toBeNull();
	});

	it("does not trigger in wikilink without alias", () => {
		expect(getAtContext("[[Note @sup", 11)).toBeNull();
	});

	it("full acceptance flow: query → filter → select", () => {
		// Simulates: user types [[Note|display @sup, then accepts "supersedes"
		const line = "[[Note|display @sup";
		const query = getAtContext(line, line.length);
		expect(query).toBe("sup");

		const filtered = filterTypes(query!, SAMPLE_TYPES);
		expect(filtered.length).toBeGreaterThan(0);

		// User accepts first match
		const accepted = filtered[0];
		expect(accepted.key).toBe("supersedes");

		// After acceptance, the text would be: [[Note|display @supersedes]]
		// The key replaces the partial query from `from` to `to`
		const from = line.length - query!.length; // position of 's' in 'sup'
		const to = line.length;
		const insertedText = line.slice(0, from) + accepted.key;
		expect(insertedText).toBe("[[Note|display @supersedes");
	});
});
