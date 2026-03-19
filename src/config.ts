import type { RelationshipType, PluginData } from "./types";

export const DEFAULT_RELATIONSHIP_TYPES: RelationshipType[] = [
	{ key: "supersedes", label: "Supersedes", description: "This replaces an outdated understanding" },
	{ key: "contradicts", label: "Contradicts", description: "This challenges an existing belief" },
	{ key: "supports", label: "Supports", description: "This provides evidence for a claim" },
	{ key: "causes", label: "Causes", description: "This was caused by another event" },
	{ key: "influenced_by", label: "Influenced By", description: "This was shaped by a contributing factor" },
	{ key: "parent_of", label: "Parent Of", description: "This encompasses a more specific concept" },
	{ key: "child_of", label: "Child Of", description: "This is a subset of a broader concept" },
	{ key: "sibling_of", label: "Sibling Of", description: "This parallels a related concept at the same level" },
	{ key: "updates", label: "Updates", description: "This modifies existing knowledge" },
	{ key: "evolution_of", label: "Evolution Of", description: "This develops from an earlier concept" },
	{ key: "prerequisite_for", label: "Prerequisite For", description: "Understanding this is required for the next concept" },
	{ key: "implements", label: "Implements", description: "This applies a theoretical concept" },
	{ key: "documents", label: "Documents", description: "This describes a system or process" },
	{ key: "example_of", label: "Example Of", description: "This demonstrates a general principle" },
	{ key: "tests", label: "Tests", description: "This validates an implementation or hypothesis" },
	{ key: "responds_to", label: "Responds To", description: "This answers a previous question or statement" },
	{ key: "references", label: "References", description: "This cites source material" },
	{ key: "inspired_by", label: "Inspired By", description: "This was motivated by earlier work" },
	{ key: "follows", label: "Follows", description: "This comes after a previous step" },
	{ key: "precedes", label: "Precedes", description: "This comes before a next step" },
	{ key: "depends_on", label: "Depends On", description: "This requires a prerequisite" },
	{ key: "composed_of", label: "Composed Of", description: "This contains component parts" },
	{ key: "part_of", label: "Part Of", description: "This belongs to a larger whole" },
	{ key: "disputes", label: "Disputes", description: "This disagrees with another perspective" },
];

export function validateRelationshipTypes(data: unknown): RelationshipType[] | null {
	if (!Array.isArray(data)) return null;
	const seen = new Set<string>();
	const result: RelationshipType[] = [];
	for (const item of data) {
		if (
			typeof item !== "object" ||
			item === null ||
			typeof item.key !== "string" ||
			typeof item.label !== "string" ||
			typeof item.description !== "string"
		) {
			return null;
		}
		if (seen.has(item.key)) {
			console.warn(`wikilink-types: duplicate relationship type key "${item.key}" in config, skipping`);
			continue;
		}
		seen.add(item.key);
		result.push(item as RelationshipType);
	}
	return result;
}

export function loadPluginData(raw: unknown): PluginData {
	if (raw && typeof raw === "object" && "relationshipTypes" in raw) {
		const validated = validateRelationshipTypes((raw as PluginData).relationshipTypes);
		if (validated) {
			return { relationshipTypes: validated };
		}
	}
	return { relationshipTypes: DEFAULT_RELATIONSHIP_TYPES };
}
