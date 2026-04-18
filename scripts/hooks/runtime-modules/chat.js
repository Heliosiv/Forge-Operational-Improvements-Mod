export function buildChatHookModule({
  moduleId,
  autoUpkeepPromptStates,
  handleAutomaticUpkeepChatAction
} = {}) {
  return {
    id: "chat",
    registrations: [
      ["renderChatMessage", (message, html) => {
        const promptState = String(message?.flags?.[moduleId]?.autoUpkeepPrompt?.state ?? "").trim().toLowerCase();
        if (!Object.values(autoUpkeepPromptStates ?? {}).includes(promptState)) return;
        if (promptState === autoUpkeepPromptStates?.IDLE) return;

        const root = html?.[0] ?? html;
        if (!root?.querySelectorAll) return;

        for (const button of root.querySelectorAll("[data-po-chat-action]")) {
          button.addEventListener("click", async (event) => {
            event.preventDefault();
            await handleAutomaticUpkeepChatAction?.(button.dataset.poChatAction, message);
          });
        }
      }]
    ]
  };
}
