import { Notice, Plugin, TFile } from "obsidian";
import type { RelationshipType, PluginData } from "./types";
import { DEFAULT_RELATIONSHIP_TYPES, loadPluginData } from "./config";
import { buildCompletionExtension } from "./autocomplete";
import { syncFrontmatter } from "./sync";

/** Debounce delay for frontmatter sync after file modify */
const SYNC_DEBOUNCE_MS = 500;

export default class WikilinkTypesPlugin extends Plugin {
	relationshipTypes: RelationshipType[] = [];

	async onload(): Promise<void> {
		let raw: PluginData | null = null;
		try {
			raw = await this.loadData();
		} catch (err) {
			console.error("wikilink-types: failed to load plugin data", err);
			new Notice("Wikilink types: failed to load config, using defaults");
		}

		const data = loadPluginData(raw);
		this.relationshipTypes = data.relationshipTypes;

		// Write defaults on first run
		if (!raw) {
			await this.saveData({
				relationshipTypes: DEFAULT_RELATIONSHIP_TYPES,
			} as PluginData);
		}

		// Register CM6 ViewPlugin + Obsidian Scope for autocomplete
		this.registerEditorExtension(
			buildCompletionExtension(this.app, () => this.relationshipTypes)
		);

		// Sync frontmatter on file modify (save)
		this.registerEvent(
			this.app.vault.on("modify", (file) => {
				if (file instanceof TFile && file.extension === "md") {
					this.debouncedSync(file);
				}
			})
		);
	}

	private syncTimers = new Map<string, ReturnType<typeof setTimeout>>();
	private syncing = new Set<string>();

	private debouncedSync(file: TFile): void {
		if (this.syncing.has(file.path)) return;

		const existing = this.syncTimers.get(file.path);
		if (existing) clearTimeout(existing);

		const timer = setTimeout(() => {
			void (async () => {
				this.syncTimers.delete(file.path);
				this.syncing.add(file.path);
				try {
					await syncFrontmatter(this.app, file, this.relationshipTypes);
				} catch (err) {
					console.error("wikilink-types: frontmatter sync failed", err);
				} finally {
					this.syncing.delete(file.path);
				}
			})();
		}, SYNC_DEBOUNCE_MS);

		this.syncTimers.set(file.path, timer);
	}

	onunload(): void {
		for (const timer of this.syncTimers.values()) {
			clearTimeout(timer);
		}
		this.syncTimers.clear();
		this.syncing.clear();
	}
}
