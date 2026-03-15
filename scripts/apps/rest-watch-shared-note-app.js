import { bindCanvasKeyboardSuppression } from "../core/ui-keyboard-guard.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export const REST_WATCH_SHARED_NOTE_APP_ID = "party-operations-rest-watch-shared-note";

export class RestWatchSharedNoteApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    id: REST_WATCH_SHARED_NOTE_APP_ID,
    classes: ["party-operations"],
    tag: "section",
    window: { title: "Party Operations - Shared Rest Note" },
    position: {
      width: 520,
      height: "auto"
    },
    resizable: true
  });

  static PARTS = {
    main: { template: "modules/party-operations/templates/rest-watch-shared-note.hbs" }
  };

  #resolveContext;
  #saveNote;
  #onClose;
  #focusInputOnRender = false;
  #target = {
    slotId: "",
    actorId: ""
  };
  #draftText = null;

  constructor(options = {}) {
    super(options);
    this.#resolveContext = typeof options.resolveContext === "function" ? options.resolveContext : () => ({});
    this.#saveNote = typeof options.saveNote === "function" ? options.saveNote : async () => false;
    this.#onClose = typeof options.onCloseApp === "function" ? options.onCloseApp : null;
  }

  setTarget(target = {}, options = {}) {
    this.#target = {
      slotId: String(target?.slotId ?? "").trim(),
      actorId: String(target?.actorId ?? "").trim()
    };
    this.#draftText = null;
    this.#focusInputOnRender = options.focus !== false;
  }

  async _prepareContext() {
    const resolved = await this.#resolveContext(this.#target);
    const noteText = this.#draftText ?? String(resolved?.noteText ?? "");
    const noteMaxLength = Math.max(0, Number(resolved?.noteMaxLength ?? 0) || 0);
    return {
      actorId: String(resolved?.actorId ?? this.#target.actorId ?? ""),
      slotId: String(resolved?.slotId ?? this.#target.slotId ?? ""),
      actorName: String(resolved?.actorName ?? "Unknown Actor"),
      slotLabel: String(resolved?.slotLabel ?? "Rest Watch"),
      noteText,
      noteMaxLength,
      noteLengthLabel: noteMaxLength > 0 ? `${noteText.length} / ${noteMaxLength}` : String(noteText.length),
      canEdit: Boolean(resolved?.canEdit),
      hasEntry: Boolean(resolved?.hasEntry),
      entryStatus: String(resolved?.entryStatus ?? ""),
      lastSavedLabel: String(resolved?.lastSavedLabel ?? ""),
      visibilityHint: String(resolved?.visibilityHint ?? "Visible to everyone who can view Rest Watch."),
      missingEntryMessage: String(resolved?.missingEntryMessage ?? "")
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    bindCanvasKeyboardSuppression(this.element);
    const root = this.element;
    if (!root) return;

    const textarea = root.querySelector("[data-shared-note-input]");
    const saveButton = root.querySelector("[data-action='save-shared-note']");
    const closeButton = root.querySelector("[data-action='close-shared-note']");

    if (textarea && textarea.dataset.poBoundInput !== "1") {
      textarea.dataset.poBoundInput = "1";
      textarea.addEventListener("input", () => {
        this.#draftText = String(textarea.value ?? "");
        const counter = root.querySelector("[data-shared-note-count]");
        if (counter) {
          const maxLength = Number(textarea.getAttribute("maxlength") ?? 0) || 0;
          counter.textContent = maxLength > 0 ? `${this.#draftText.length} / ${maxLength}` : String(this.#draftText.length);
        }
      });
      textarea.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
          event.preventDefault();
          if (!textarea.disabled) void this.#onSaveClick();
        }
      });
    }

    if (saveButton && saveButton.dataset.poBoundClick !== "1") {
      saveButton.dataset.poBoundClick = "1";
      saveButton.addEventListener("click", (event) => {
        event.preventDefault();
        void this.#onSaveClick();
      });
    }

    if (closeButton && closeButton.dataset.poBoundClick !== "1") {
      closeButton.dataset.poBoundClick = "1";
      closeButton.addEventListener("click", (event) => {
        event.preventDefault();
        void this.close();
      });
    }

    if (this.#focusInputOnRender && textarea && !textarea.disabled) {
      this.#focusInputOnRender = false;
      textarea.focus?.({ preventScroll: true });
      textarea.setSelectionRange?.(textarea.value.length, textarea.value.length);
    }
  }

  async close(options = {}) {
    this.#focusInputOnRender = false;
    this.#draftText = null;
    if (this.#onClose) this.#onClose(this);
    return super.close(options);
  }

  async #onSaveClick() {
    const root = this.element;
    const textarea = root?.querySelector?.("[data-shared-note-input]");
    const text = String(textarea?.value ?? this.#draftText ?? "");
    const saved = await this.#saveNote(this.#target, text);
    this.#draftText = text;
    if (saved) {
      await this.render({ force: true, parts: ["main"], focus: false });
      this.bringToTop?.();
    }
  }
}
