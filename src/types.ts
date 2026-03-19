export interface RelationshipType {
	key: string;
	label: string;
	description: string;
}

export interface WikilinkMatch {
	/** The full match string e.g. [[Note Name|Display Text @supersedes]] */
	full: string;
	/** The target note name */
	target: string;
	/** The relationship type key (without @) */
	type: string;
}

export interface PluginData {
	relationshipTypes: RelationshipType[];
}
