export function buildUserPresenceHookModule({
  schedulePendingSopNoteSync,
  gameRef
} = {}) {
  return {
    id: "user-presence",
    registrations: [
      ["updateUser", (user, changed) => {
        if (!user || !changed || gameRef?.user?.isGM) return;
        if (!Object.prototype.hasOwnProperty.call(changed, "active")) return;
        if (!user.isGM || !user.active) return;
        schedulePendingSopNoteSync?.("gm-activated");
      }]
    ]
  };
}
