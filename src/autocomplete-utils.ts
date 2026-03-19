import type { RelationshipType } from "./types";

/**
 * Filter relationship types by query string (matches key or label, case-insensitive).
 * Returns all types when query is empty.
 */
export function filterTypes(query: string, types: RelationshipType[]): RelationshipType[] {
	const lq = query.toLowerCase();
	return lq === ""
		? types
		: types.filter(
				(rt) =>
					rt.key.toLowerCase().includes(lq) ||
					rt.label.toLowerCase().includes(lq)
			);
}

/**
 * Clamp a selection index after movement, staying within [0, length - 1].
 */
export function clampIndex(idx: number, length: number, direction: "up" | "down"): number {
	if (direction === "down") {
		return Math.min(idx + 1, length - 1);
	}
	return Math.max(idx - 1, 0);
}
