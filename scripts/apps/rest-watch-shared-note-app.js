import { bindCanvasKeyboardSuppression } from "../core/ui-keyboard-guard.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export const REST_WATCH_SHARED_NOTE_APP_ID = "party-operations-rest-watch-shared-note";

export class RestWatchSharedNoteApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    id: REST_WATCH_SHARED_NOTE_APP_ID,
    classes: ["party-operations", "po-shared-note-app"],
    tag: "section",
    window: { title: "Party Operations - Shared Rest Note" },
    position: {
      width: 560,
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
  #isSaving = false;
  #saveStatus = {
    message: "",
    tone: "info"
  };

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
    this.#isSaving = false;
    this.#saveStatus = { message: "", tone: "info" };
    this.#focusInputOnRender = options.focus !== false;
  }

  #setSaveStatus(message = "", tone = "info") {
    this.#saveStatus = {
      message: String(message ?? "").trim(),
      tone: String(tone ?? "info").trim().toLowerCase() || "info"
    };

    const root = this.element instanceof HTMLElement ? this.element : (this.element?.[0] ?? null);
    if (!root) return;
    const statusNode = root.querySelector("[data-shared-note-status]");
    if (!(statusNode instanceof HTMLElement)) return;

    statusNode.textContent = this.#saveStatus.message;
    statusNode.classList.toggle("is-warn", this.#saveStatus.tone === "warn");
    statusNode.classList.toggle("is-ready", this.#saveStatus.tone === "ready");
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
      missingEntryMessage: String(resolved?.missingEntryMessage ?? ""),
      saveStatusMessage: this.#saveStatus.message,
      saveStatusTone: this.#saveStatus.tone,
      saveStatusWarn: this.#saveStatus.tone === "warn",
      isSaving: this.#isSaving
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element instanceof HTMLElement ? this.element : (this.element?.[0] ?? null);
    if (!root) return;
    bindCanvasKeyboardSuppression(root);
    if (!root) return;

    const textarea = root.querySelector("[data-shared-note-input]");
    const saveButton = root.querySelector("[data-action='save-shared-note']");
    const closeButton = root.querySelector("[data-action='close-shared-note']");

    if (saveButton instanceof HTMLElement) {
      saveButton.toggleAttribute("disabled", this.#isSaving);
    }

    if (textarea && textarea.dataset.poBoundInput !== "1") {
      textarea.dataset.poBoundInput = "1";
      textarea.addEventListener("input", () => {
        this.#draftText = String(textarea.value ?? "");
        const counter = root.querySelector("[data-shared-note-count]");
        if (counter) {
          const maxLength = Number(textarea.getAttribute("maxlength") ?? 0) || 0;
          counter.textContent = maxLength > 0 ? `${this.#draftText.length} / ${maxLength}` : String(this.#draftText.length);
        }
        if (this.#saveStatus.message) this.#setSaveStatus("", "info");
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
    if (this.#isSaving) return;
    const root = this.element;
    const textarea = root?.querySelector?.("[data-shared-note-input]");
    const text = String(textarea?.value ?? this.#draftText ?? "");
    this.#isSaving = true;
    this.#setSaveStatus("Saving shared note...", "info");

    try {
      const saved = await this.#saveNote(this.#target, text);
      this.#draftText = text;
      if (saved) {
        this.#setSaveStatus("Shared note saved.", "ready");
        await this.render({ force: true, parts: ["main"], focus: false });
        this.bringToFront?.();
        return;
      }

      this.#setSaveStatus("Save failed. Please try again.", "warn");
    } catch (error) {
      console.warn("party-operations: failed to save shared note", error);
      this.#setSaveStatus("Save failed. Please try again.", "warn");
    } finally {
      this.#isSaving = false;
      const saveButton = root?.querySelector?.("[data-action='save-shared-note']");
      if (saveButton instanceof HTMLElement) saveButton.toggleAttribute("disabled", this.#isSaving);
    }
  }
}
