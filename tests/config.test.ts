import { describe, it, expect, vi } from "vitest";
import {
	DEFAULT_RELATIONSHIP_TYPES,
	validateRelationshipTypes,
	loadPluginData,
} from "../src/config";

describe("DEFAULT_RELATIONSHIP_TYPES", () => {
	it("has 24 types", () => {
		expect(DEFAULT_RELATIONSHIP_TYPES).toHaveLength(24);
	});

	it("every type has key, label, and description as strings", () => {
		for (const rt of DEFAULT_RELATIONSHIP_TYPES) {
			expect(typeof rt.key).toBe("string");
			expect(typeof rt.label).toBe("string");
			expect(typeof rt.description).toBe("string");
			expect(rt.key.length).toBeGreaterThan(0);
			expect(rt.label.length).toBeGreaterThan(0);
			expect(rt.description.length).toBeGreaterThan(0);
		}
	});

	it("all keys are unique", () => {
		const keys = DEFAULT_RELATIONSHIP_TYPES.map((rt) => rt.key);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it("all keys match the regex pattern used in parser", () => {
		for (const rt of DEFAULT_RELATIONSHIP_TYPES) {
			expect(rt.key).toMatch(/^[\w-]+$/);
		}
	});
});

describe("validateRelationshipTypes", () => {
	it("returns valid array unchanged", () => {
		const data = [
			{ key: "a", label: "A", description: "Desc A" },
			{ key: "b", label: "B", description: "Desc B" },
		];
		expect(validateRelationshipTypes(data)).toEqual(data);
	});

	it("returns null for non-array input", () => {
		expect(validateRelationshipTypes("string")).toBeNull();
		expect(validateRelationshipTypes(42)).toBeNull();
		expect(validateRelationshipTypes(null)).toBeNull();
		expect(validateRelationshipTypes(undefined)).toBeNull();
		expect(validateRelationshipTypes({})).toBeNull();
	});

	it("returns null if any item is missing key", () => {
		const data = [{ label: "A", description: "D" }];
		expect(validateRelationshipTypes(data)).toBeNull();
	});

	it("returns null if any item is missing label", () => {
		const data = [{ key: "a", description: "D" }];
		expect(validateRelationshipTypes(data)).toBeNull();
	});

	it("returns null if any item is missing description", () => {
		const data = [{ key: "a", label: "A" }];
		expect(validateRelationshipTypes(data)).toBeNull();
	});

	it("returns null if any field is not a string", () => {
		expect(validateRelationshipTypes([{ key: 1, label: "A", description: "D" }])).toBeNull();
		expect(validateRelationshipTypes([{ key: "a", label: null, description: "D" }])).toBeNull();
		expect(validateRelationshipTypes([{ key: "a", label: "A", description: false }])).toBeNull();
	});

	it("returns null if array contains a non-object", () => {
		expect(validateRelationshipTypes(["string"])).toBeNull();
		expect(validateRelationshipTypes([null])).toBeNull();
	});

	it("returns empty array for empty input", () => {
		expect(validateRelationshipTypes([])).toEqual([]);
	});

	it("deduplicates entries with the same key and warns", () => {
		const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const data = [
			{ key: "a", label: "A1", description: "D1" },
			{ key: "a", label: "A2", description: "D2" },
			{ key: "b", label: "B", description: "D" },
		];
		const result = validateRelationshipTypes(data);
		expect(result).toHaveLength(2);
		expect(result![0].label).toBe("A1");
		expect(result![1].key).toBe("b");
		expect(spy).toHaveBeenCalledWith(
			expect.stringContaining('duplicate relationship type key "a"')
		);
		spy.mockRestore();
	});
});

describe("loadPluginData", () => {
	it("loads valid plugin data from {relationshipTypes: [...]} format", () => {
		const raw = {
			relationshipTypes: [
				{ key: "a", label: "A", description: "D" },
			],
		};
		const result = loadPluginData(raw);
		expect(result.relationshipTypes).toHaveLength(1);
		expect(result.relationshipTypes[0].key).toBe("a");
	});

	it("returns defaults for null input", () => {
		const result = loadPluginData(null);
		expect(result.relationshipTypes).toEqual(DEFAULT_RELATIONSHIP_TYPES);
	});

	it("returns defaults for undefined input", () => {
		const result = loadPluginData(undefined);
		expect(result.relationshipTypes).toEqual(DEFAULT_RELATIONSHIP_TYPES);
	});

	it("returns defaults for malformed data", () => {
		expect(loadPluginData({ relationshipTypes: "bad" }).relationshipTypes).toEqual(
			DEFAULT_RELATIONSHIP_TYPES
		);
		expect(loadPluginData({ relationshipTypes: [{ bad: true }] }).relationshipTypes).toEqual(
			DEFAULT_RELATIONSHIP_TYPES
		);
		expect(loadPluginData(42).relationshipTypes).toEqual(DEFAULT_RELATIONSHIP_TYPES);
	});

	it("returns defaults for empty object", () => {
		expect(loadPluginData({}).relationshipTypes).toEqual(DEFAULT_RELATIONSHIP_TYPES);
	});

	it("preserves extra fields in relationship type objects", () => {
		const raw = {
			relationshipTypes: [
				{ key: "a", label: "A", description: "D", extra: "ignored" },
			],
		};
		const result = loadPluginData(raw);
		expect(result.relationshipTypes).toHaveLength(1);
		expect(result.relationshipTypes[0].key).toBe("a");
	});
});
