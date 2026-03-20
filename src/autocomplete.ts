import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { App, Scope, type KeymapEventHandler } from "obsidian";
import type { RelationshipType } from "./types";
import { getAtContext } from "./parser";
import { filterTypes, clampIndex } from "./autocomplete-utils";

/** Popup offset from cursor in pixels */
const POPUP_OFFSET_Y = 4;

/**
 * Custom autocomplete popup for @ inside wikilink aliases.
 *
 * Architecture:
 * - ViewPlugin (CM6) handles state, popup rendering, and mouse interaction
 * - Obsidian Scope (via app.keymap.pushScope) handles keyboard capture
 *
 * Why not EditorSuggest: Obsidian's native link suggest suppresses
 * EditorSuggest.onTrigger() inside [[...]].
 *
 * Why not Prec.highest(keymap): CM6 keymaps run parallel to Obsidian's
 * scope stack, so they don't fully intercept Arrow/Enter/Tab.
 *
 * pushScope/popScope is how Obsidian's own modals and command palette
 * capture keyboard exclusively.
 */
export function buildCompletionExtension(
	app: App,
	getTypes: () => RelationshipType[]
) {
	class WikilinkTypesSuggest {
		popup: HTMLElement | null = null;
		items: HTMLElement[] = [];
		selectedIdx = 0;
		filtered: RelationshipType[] = [];
		from = 0;
		to = 0;
		isActive = false;

		private scope: Scope;
		private keymapHandlers: KeymapEventHandler[] = [];

		constructor(public view: EditorView) {
			this.scope = new Scope(app.scope);
		}

		destroy(): void {
			this.close();
		}

		update(update: ViewUpdate): void {
			if (update.docChanged || update.selectionSet) {
				this.evaluate();
			}
		}

		evaluate(): void {
			const state = this.view.state;
			const pos = state.selection.main.head;
			const line = state.doc.lineAt(pos);
			const col = pos - line.from;
			const query = getAtContext(line.text, col);

			if (query === null) {
				this.close();
				return;
			}

			this.filtered = filterTypes(query, getTypes());

			if (this.filtered.length === 0) {
				this.close();
				return;
			}

			this.from = pos - query.length;
			this.to = pos;
			// Clamp rather than reset — keeps selection stable when typing doesn't change the list
			if (this.selectedIdx >= this.filtered.length) {
				this.selectedIdx = this.filtered.length - 1;
			}

			if (!this.isActive) {
				this.isActive = true;
				this.pushScope();
			}

			requestAnimationFrame(() => this.render());
		}

		private pushScope(): void {
			app.keymap.pushScope(this.scope);

			this.keymapHandlers.push(
				this.scope.register([], "ArrowDown", (evt) => {
					evt.preventDefault();
					this.selectedIdx = clampIndex(this.selectedIdx, this.filtered.length, "down");
					this.updateSelection();
					return false;
				})
			);

			this.keymapHandlers.push(
				this.scope.register([], "ArrowUp", (evt) => {
					evt.preventDefault();
					this.selectedIdx = clampIndex(this.selectedIdx, this.filtered.length, "up");
					this.updateSelection();
					return false;
				})
			);

			this.keymapHandlers.push(
				this.scope.register([], "Enter", (evt) => {
					evt.preventDefault();
					this.accept(this.selectedIdx);
					return false;
				})
			);

			this.keymapHandlers.push(
				this.scope.register([], "Tab", (evt) => {
					evt.preventDefault();
					this.accept(this.selectedIdx);
					return false;
				})
			);

			this.keymapHandlers.push(
				this.scope.register([], "Escape", (evt) => {
					evt.preventDefault();
					this.close();
					return false;
				})
			);
		}

		private popScope(): void {
			for (const h of this.keymapHandlers) {
				this.scope.unregister(h);
			}
			this.keymapHandlers = [];
			app.keymap.popScope(this.scope);
		}

		render(): void {
			if (!this.isActive) return;

			if (!this.popup) {
				this.popup = document.createElement("div");
				this.popup.className = "wikilink-types-popup";
				this.popup.setAttribute("role", "listbox");
				this.popup.setAttribute(
					"aria-label",
					"Relationship type suggestions"
				);
				document.body.appendChild(this.popup);
			}

			this.popup.empty();
			this.items = [];

			for (let i = 0; i < this.filtered.length; i++) {
				const rt = this.filtered[i];
				const el = document.createElement("div");
				el.className = "wikilink-types-popup-item";
				el.setAttribute("role", "option");
				el.setAttribute("aria-selected", String(i === this.selectedIdx));
				if (i === this.selectedIdx) {
					el.classList.add("is-selected");
				}

				const label = document.createElement("div");
				label.className = "wikilink-types-popup-label";
				label.textContent = rt.label;
				el.appendChild(label);

				const desc = document.createElement("div");
				desc.className = "wikilink-types-popup-desc";
				desc.textContent = rt.description;
				el.appendChild(desc);

				const idx = i;
				el.addEventListener("mousedown", (e) => {
					e.preventDefault();
					this.accept(idx);
				});

				this.popup.appendChild(el);
				this.items.push(el);
			}

			this.position();
			this.popup.classList.add("is-visible");
		}

		position(): void {
			if (!this.popup) return;
			const coords = this.view.coordsAtPos(this.from);
			if (!coords) {
				this.close();
				return;
			}

			const popupRect = this.popup.getBoundingClientRect();
			let left = coords.left;
			let top = coords.bottom + POPUP_OFFSET_Y;

			// Keep popup within viewport
			if (left + popupRect.width > window.innerWidth) {
				left = window.innerWidth - popupRect.width - 8;
			}
			if (top + popupRect.height > window.innerHeight) {
				top = coords.top - popupRect.height - POPUP_OFFSET_Y;
			}

			this.popup.style.setProperty("left", Math.max(0, left) + "px");
			this.popup.style.setProperty("top", Math.max(0, top) + "px");
		}

		accept(idx: number): void {
			const rt = this.filtered[idx];
			if (!rt) return;

			this.view.dispatch({
				changes: {
					from: this.from,
					to: this.to,
					insert: rt.key,
				},
			});
			this.close();
		}

		close(): void {
			if (this.isActive) {
				this.popScope();
				this.isActive = false;
			}
			if (this.popup) {
				this.popup.remove();
				this.popup = null;
			}
			this.items = [];
			this.filtered = [];
		}

		updateSelection(): void {
			for (let i = 0; i < this.items.length; i++) {
				const isSelected = i === this.selectedIdx;
				this.items[i].classList.toggle("is-selected", isSelected);
				this.items[i].setAttribute(
					"aria-selected",
					String(isSelected)
				);
				if (isSelected) {
					this.items[i].scrollIntoView({ block: "nearest" });
				}
			}
		}
	}

	return ViewPlugin.fromClass(WikilinkTypesSuggest);
}
