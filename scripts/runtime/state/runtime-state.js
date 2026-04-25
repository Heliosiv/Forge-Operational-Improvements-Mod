const runtimeState = {
  bootedAt: Date.now(),
  initCount: 0,
  readyCount: 0,
  refreshCount: 0,
  navigationRequests: [],
  socketMessages: []
};

function pushBounded(list, entry, limit = 50) {
  list.push(entry);
  while (list.length > limit) list.shift();
}

export function recordRuntimeInit() {
  runtimeState.initCount += 1;
}

export function recordRuntimeReady() {
  runtimeState.readyCount += 1;
}

export function recordRuntimeRefresh(payload = {}) {
  runtimeState.refreshCount += 1;
  pushBounded(runtimeState.socketMessages, {
    type: "refresh",
    payload,
    timestamp: Date.now()
  });
}

export function recordNavigationRequest(action, details = {}) {
  pushBounded(runtimeState.navigationRequests, {
    action,
    details,
    timestamp: Date.now()
  });
}

export function recordSocketMessage(message = {}) {
  pushBounded(runtimeState.socketMessages, {
    type: "message",
    payload: message,
    timestamp: Date.now()
  });
}

export function getRuntimeStateSnapshot() {
  return {
    ...runtimeState,
    navigationRequests: runtimeState.navigationRequests.map((entry) => ({ ...entry })),
    socketMessages: runtimeState.socketMessages.map((entry) => ({ ...entry }))
  };
}
