import { bindCanvasKeyboardSuppression } from "../core/ui-keyboard-guard.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export const REST_WATCH_SHARED_NOTE_APP_ID = "party-operations-rest-watch-shared-note";

const SHARED_NOTE_ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "a",
  "span"
]);

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeLegacyTextToHtml(value) {
  const source = String(value ?? "");
  if (!source.trim()) return "";
  if (source.includes("<") && source.includes(">")) return source;
  const paragraphs = source
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return "";
  return paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`).join("");
}

export function sanitizeRichTextHtml(value) {
  const rawHtml = normalizeLegacyTextToHtml(value);
  if (!rawHtml) return "";
  const scratch = document.createElement("div");
  scratch.innerHTML = rawHtml;

  const walker = document.createTreeWalker(scratch, NodeFilter.SHOW_ELEMENT);
  const elements = [];
  while (walker.nextNode()) elements.push(walker.currentNode);

  for (const node of elements) {
    const tag = String(node?.tagName ?? "").toLowerCase();
    if (!tag) continue;
    if (!SHARED_NOTE_ALLOWED_TAGS.has(tag)) {
      node.replaceWith(...Array.from(node.childNodes));
      continue;
    }
    if (tag === "a") {
      const href = String(node.getAttribute("href") ?? "").trim();
      const safeHref = /^(https?:|mailto:|#|\/)/i.test(href);
      const attrs = Array.from(node.attributes ?? []);
      for (const attr of attrs) {
        if (String(attr?.name ?? "").toLowerCase() !== "href") node.removeAttribute(attr.name);
      }
      if (!safeHref) node.removeAttribute("href");
      else node.setAttribute("href", href);
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
      continue;
    }
    const attrs = Array.from(node.attributes ?? []);
    for (const attr of attrs) node.removeAttribute(attr.name);
  }

  return scratch.innerHTML.trim();
}

export function buildSharedNoteLinkPromptContent({ defaultUrl = "https://", selectedText = "" } = {}) {
  return `
        <div class="form-group">
          <label>URL</label>
          <input type="url" name="linkUrl" value="${escapeHtml(defaultUrl)}" placeholder="https://example.com" style="width: 100%; padding: 8px;" />
        </div>
        ${
          selectedText
            ? `<div class="form-group"><label>Text</label><input type="text" name="linkText" value="${escapeHtml(selectedText)}" disabled style="width: 100%; padding: 8px;" /></div>`
            : ""
        }
      `;
}

function getRichTextContentLength(value) {
  const scratch = document.createElement("div");
  scratch.innerHTML = String(value ?? "");
  return String(scratch.textContent ?? "").trim().length;
}

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
  #lastSafeDraftHtml = "";
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
    this.#lastSafeDraftHtml = "";
    this.#isSaving = false;
    this.#saveStatus = { message: "", tone: "info" };
    this.#focusInputOnRender = options.focus !== false;
  }

  #setSaveStatus(message = "", tone = "info") {
    this.#saveStatus = {
      message: String(message ?? "").trim(),
      tone:
        String(tone ?? "info")
          .trim()
          .toLowerCase() || "info"
    };

    const root = this.element instanceof HTMLElement ? this.element : (this.element?.[0] ?? null);
    if (!root) return;
    const statusNode = root.querySelector("[data-shared-note-status]");
    if (!(statusNode instanceof HTMLElement)) return;

    statusNode.textContent = this.#saveStatus.message;
    statusNode.classList.toggle("is-warn", this.#saveStatus.tone === "warn");
    statusNode.classList.toggle("is-ready", this.#saveStatus.tone === "ready");
  }

  #focusEditorAtEnd(editor) {
    if (!(editor instanceof HTMLElement)) return;
    const selection = window.getSelection?.();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  #applyRichTextCommand(command) {
    if (!command) return;
    document.execCommand(String(command), false, null);
  }

  async #applyLinkCommand(editor) {
    if (!(editor instanceof HTMLElement)) return;
    const result = await this.#promptForLinkUrl();
    if (!result) return;

    const scratch = document.createElement("div");
    scratch.innerHTML = String(result ?? "");
    const input = scratch.querySelector("input[name='linkUrl']");
    const url = String(input?.value ?? "").trim();
    if (!url) return;

    document.execCommand("createLink", false, url);
  }

  async #promptForLinkUrl() {
    const selection = window.getSelection?.();
    const selectedText = selection?.toString?.() ?? "";
    const currentUrl = this.#getSelectedLinkHref() ?? "";
    const defaultUrl = currentUrl || "https://";

    const result = await Dialog.prompt({
      title: "Insert Link",
      content: buildSharedNoteLinkPromptContent({ defaultUrl, selectedText }),
      rejectClose: false
    });

    return result;
  }

  #getSelectedLinkHref() {
    const selection = window.getSelection?.();
    const range = selection?.rangeCount > 0 ? selection?.getRangeAt?.(0) : null;
    if (!range) return null;
    const container = range?.commonAncestorContainer;
    if (!container) return null;
    const parentElement = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
    const linkElement = parentElement?.closest?.("a");
    return linkElement?.href ?? null;
  }

  async _prepareContext() {
    const resolved = await this.#resolveContext(this.#target);
    const noteHtml = sanitizeRichTextHtml(this.#draftText ?? String(resolved?.noteText ?? ""));
    const noteMaxLength = Math.max(0, Number(resolved?.noteMaxLength ?? 0) || 0);
    const noteLength = getRichTextContentLength(noteHtml);
    return {
      actorId: String(resolved?.actorId ?? this.#target.actorId ?? ""),
      slotId: String(resolved?.slotId ?? this.#target.slotId ?? ""),
      actorName: String(resolved?.actorName ?? "Unknown Actor"),
      slotLabel: String(resolved?.slotLabel ?? "Rest Watch"),
      noteHtml,
      noteMaxLength,
      noteLengthLabel: noteMaxLength > 0 ? `${noteLength} / ${noteMaxLength}` : String(noteLength),
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

    const editor = root.querySelector("[data-shared-note-input]");
    const saveButton = root.querySelector("[data-action='save-shared-note']");
    const closeButton = root.querySelector("[data-action='close-shared-note']");

    if (saveButton instanceof HTMLElement) {
      saveButton.toggleAttribute("disabled", this.#isSaving);
    }

    if (editor instanceof HTMLElement && editor.dataset.poBoundInput !== "1") {
      editor.dataset.poBoundInput = "1";
      this.#lastSafeDraftHtml = sanitizeRichTextHtml(editor.innerHTML ?? "");
      editor.addEventListener("input", () => {
        try {
          const maxLength = Number(editor.getAttribute("data-max-length") ?? 0) || 0;
          const nextDraft = sanitizeRichTextHtml(editor.innerHTML ?? "");
          const nextLength = getRichTextContentLength(nextDraft);
          if (maxLength > 0 && nextLength > maxLength) {
            editor.innerHTML = this.#lastSafeDraftHtml;
            this.#focusEditorAtEnd(editor);
            this.#setSaveStatus(`Shared note is limited to ${maxLength} characters.`, "warn");
            return;
          }

          this.#draftText = nextDraft;
          this.#lastSafeDraftHtml = nextDraft;
          const counter = root.querySelector("[data-shared-note-count]");
          if (counter) {
            counter.textContent = maxLength > 0 ? `${nextLength} / ${maxLength}` : String(nextLength);
          }
          if (this.#saveStatus.message) this.#setSaveStatus("", "info");
        } catch (error) {
          console.warn("party-operations: shared-note input handler failed", error);
          this.#setSaveStatus("Editor error encountered. Please retry.", "warn");
        }
      });
      editor.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
          event.preventDefault();
          if (editor.getAttribute("contenteditable") === "true") void this.#onSaveClick();
        }
      });
    }

    root.querySelectorAll("[data-action='shared-note-format']").forEach((button) => {
      if (!(button instanceof HTMLElement) || button.dataset.poBoundClick === "1") return;
      button.dataset.poBoundClick = "1";
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        if (!(editor instanceof HTMLElement) || editor.getAttribute("contenteditable") !== "true") return;
        try {
          editor.focus?.({ preventScroll: true });
          const command = String(button.dataset.command ?? "").trim();
          if (command === "createLink") {
            await this.#applyLinkCommand(editor);
          } else {
            this.#applyRichTextCommand(command);
          }
          const nextDraft = sanitizeRichTextHtml(editor.innerHTML ?? "");
          const maxLength = Number(editor.getAttribute("data-max-length") ?? 0) || 0;
          const nextLength = getRichTextContentLength(nextDraft);
          if (maxLength > 0 && nextLength > maxLength) {
            editor.innerHTML = this.#lastSafeDraftHtml;
            this.#focusEditorAtEnd(editor);
            this.#setSaveStatus(`Shared note is limited to ${maxLength} characters.`, "warn");
            return;
          }
          editor.innerHTML = nextDraft;
          this.#draftText = nextDraft;
          this.#lastSafeDraftHtml = nextDraft;
          this.#focusEditorAtEnd(editor);
          const counter = root.querySelector("[data-shared-note-count]");
          if (counter) {
            counter.textContent = maxLength > 0 ? `${nextLength} / ${maxLength}` : String(nextLength);
          }
          if (this.#saveStatus.message) this.#setSaveStatus("", "info");
        } catch (error) {
          console.warn("party-operations: shared-note format handler failed", error);
          this.#setSaveStatus("Formatting failed. Please retry.", "warn");
        }
      });
    });

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

    if (
      this.#focusInputOnRender &&
      editor instanceof HTMLElement &&
      editor.getAttribute("contenteditable") === "true"
    ) {
      this.#focusInputOnRender = false;
      editor.focus?.({ preventScroll: true });
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
    const editor = root?.querySelector?.("[data-shared-note-input]");
    const text = sanitizeRichTextHtml(editor?.innerHTML ?? this.#draftText ?? "");
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
