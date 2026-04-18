export function buildAudioPlaybackHookModule({
  isManagedAudioMixPlaylist,
  queueManagedAudioMixPlaybackResync,
  gameRef,
  perfTracker
} = {}) {
  return {
    id: "audio-playback",
    registrations: [
      ["updatePlaylistSound", (sound, changed) => {
        const playlist = sound?.parent ?? null;
        if (!isManagedAudioMixPlaylist?.(playlist)) return;
        if (!changed || typeof changed !== "object") return;

        const touchesPlayback = Object.prototype.hasOwnProperty.call(changed, "playing")
          || Object.prototype.hasOwnProperty.call(changed, "volume")
          || Object.prototype.hasOwnProperty.call(changed, "fade")
          || Object.prototype.hasOwnProperty.call(changed, "channel")
          || Object.prototype.hasOwnProperty.call(changed, "path");
        if (!touchesPlayback) return;

        perfTracker?.increment?.("audio-playback-resync", 1, { eventName: "updatePlaylistSound" });
        queueManagedAudioMixPlaybackResync?.(80, { playlist, refresh: true });
      }],
      ["updatePlaylist", (playlist, changed) => {
        if (!isManagedAudioMixPlaylist?.(playlist)) return;
        if (!changed || typeof changed !== "object") return;

        const touchesPlayback = Object.prototype.hasOwnProperty.call(changed, "playing")
          || Object.prototype.hasOwnProperty.call(changed, "mode")
          || Object.prototype.hasOwnProperty.call(changed, "channel")
          || Object.prototype.hasOwnProperty.call(changed, "fade");
        if (!touchesPlayback) return;

        perfTracker?.increment?.("audio-playback-resync", 1, { eventName: "updatePlaylist" });
        queueManagedAudioMixPlaybackResync?.(80, { playlist, refresh: true });
      }]
    ]
  };
}
