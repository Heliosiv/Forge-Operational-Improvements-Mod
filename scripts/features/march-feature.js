export function createMarchFeatureModule(deps = {}) {
  return {
    id: "march",
    register() {
      if (typeof deps.onRegister === "function") deps.onRegister("march");
    }
  };
}

export const MARCH_BOARD_RANKS = Object.freeze([
  { id: "vanguard", label: "Vanguard Lane", shortLabel: "Vanguard" },
  { id: "front", label: "Front Lane", shortLabel: "Front" },
  { id: "middle", label: "Middle Lane", shortLabel: "Middle" },
  { id: "rear", label: "Rear Lane", shortLabel: "Rear" },
  { id: "reserve", label: "Reserve Lane", shortLabel: "Reserve" }
]);

export function buildMarchFormationSummaryContext({
  formationSnapshot = {},
  tracker = {},
  activeCombatId = "",
  doctrineStates = {}
} = {}) {
  const formation = formationSnapshot?.formation ?? {};
  const validity = formationSnapshot?.validity ?? {};
  const doctrine = formationSnapshot?.doctrine ?? {};
  const formationState = formationSnapshot?.formationState ?? {};
  const formationReasons = Array.isArray(validity?.reasons) ? validity.reasons : [];
  const tokenCoverageFallbackReason =
    formationReasons.find((reason) => String(reason?.code ?? "") === "missing-token-positions") ?? null;
  const invalidReasons = formationReasons.filter((reason) => String(reason?.code ?? "") !== "missing-token-positions");
  const doctrineStateCode = String(doctrine?.state ?? "")
    .trim()
    .toLowerCase();
  const failureStreakCount = Math.max(0, Number(tracker?.failureStreakCount ?? 0));
  const consecutiveSuccessCount = Math.max(0, Number(tracker?.consecutiveSuccessCount ?? 0));
  const leadersCommandUsedThisCombat =
    Boolean(activeCombatId) && String(tracker?.leadersCommandCombatId ?? "") === activeCombatId;
  const leadershipCheckDue = Boolean(doctrine?.cohesionCheckRequired && String(doctrine?.pendingTrigger ?? "").trim());
  const canUseLeadersCommand = !leadersCommandUsedThisCombat;
  const brokenState = String(doctrineStates?.BROKEN ?? "")
    .trim()
    .toLowerCase();
  const strainedState = String(doctrineStates?.STRAINED ?? "")
    .trim()
    .toLowerCase();
  const shouldShowRecoveryGuidance =
    leadershipCheckDue ||
    doctrineStateCode === strainedState ||
    doctrineStateCode === brokenState ||
    failureStreakCount > 0;

  const recoveryGuidance = (() => {
    if (!shouldShowRecoveryGuidance) {
      return {
        recommendedAction: "none",
        title: "Formation Stable",
        text: "No immediate recovery action is needed.",
        canRally: true,
        canLeadersCommand: canUseLeadersCommand,
        canDropFormation: true
      };
    }
    if (doctrineStateCode === brokenState) {
      if (canUseLeadersCommand) {
        return {
          recommendedAction: "leaders-command",
          title: "Critical Recovery",
          text: "Formation is broken. Use Leader's Command first, then Rally Check or Drop Formation if pressure remains.",
          canRally: true,
          canLeadersCommand: true,
          canDropFormation: true
        };
      }
      return {
        recommendedAction: "formation-drop",
        title: "Critical Recovery",
        text: "Formation is broken and Leader's Command is spent. Drop Formation now, then Rally Check to stabilize.",
        canRally: true,
        canLeadersCommand: false,
        canDropFormation: true
      };
    }
    if (leadershipCheckDue) {
      return {
        recommendedAction: "doctrine-check",
        title: "Immediate Maintenance",
        text: "Roll Joint Leadership now to prevent further pressure this round.",
        canRally: true,
        canLeadersCommand: canUseLeadersCommand,
        canDropFormation: true
      };
    }
    if (failureStreakCount >= 2 && canUseLeadersCommand) {
      return {
        recommendedAction: "leaders-command",
        title: "Escalating Pressure",
        text: "Failure streak is high. Use Leader's Command to cut pressure quickly, then continue with Joint Leadership.",
        canRally: true,
        canLeadersCommand: true,
        canDropFormation: true
      };
    }
    return {
      recommendedAction: "rally-check",
      title: "Stabilize Formation",
      text: "Use Rally Check to reduce pressure, or Drop Formation for a lower-DC posture.",
      canRally: true,
      canLeadersCommand: canUseLeadersCommand,
      canDropFormation: true
    };
  })();

  const recoveryRecommendedActionLabel = (() => {
    const action = String(recoveryGuidance.recommendedAction ?? "")
      .trim()
      .toLowerCase();
    if (action === "doctrine-check") return "Joint Leadership";
    if (action === "rally-check") return "Rally Check";
    if (action === "leaders-command") return "Leader's Command";
    if (action === "formation-drop") return "Drop Formation";
    return "None";
  })();

  const failureStreakLabel = (() => {
    if (failureStreakCount === 0) return "No failures";
    if (failureStreakCount === 1) return "1 failure - DC increasing";
    return `${failureStreakCount} failures - DC escalated +${failureStreakCount}`;
  })();
  const successStreakLabel = (() => {
    if (consecutiveSuccessCount === 0) return "No momentum";
    if (consecutiveSuccessCount < 3) {
      return `${consecutiveSuccessCount} success${consecutiveSuccessCount !== 1 ? "es" : ""} - building momentum`;
    }
    const bonus = Math.floor(consecutiveSuccessCount / 3);
    return `${consecutiveSuccessCount} successes (+${bonus} momentum bonus)`;
  })();
  const healthTrendIndicator = Boolean(tracker?.lastCheckWasSuccess ?? false) ? "Improving" : "Declining";
  const formationHealthPercent = Math.max(0, 100 - failureStreakCount * 15);
  const statusToneClass =
    leadershipCheckDue || doctrineStateCode === brokenState
      ? "is-alert"
      : failureStreakCount > 0 || doctrineStateCode === strainedState
        ? "is-warn"
        : "is-stable";
  const statusHeadline = leadershipCheckDue
    ? "Leadership Check Due"
    : doctrineStateCode === brokenState
      ? "Formation Broken"
      : failureStreakCount > 0
        ? "Pressure Building"
        : "Formation Stable";
  const statusDetail = leadershipCheckDue
    ? `Triggered by ${String(doctrine?.pendingTriggerLabel ?? "current pressure").trim() || "current pressure"}.`
    : recoveryGuidance.text;
  const momentumRows = [
    {
      label: failureStreakCount > 0 ? "Pressure" : "Status",
      value: failureStreakLabel,
      toneClass: failureStreakCount > 0 ? "is-negative" : "is-muted"
    },
    {
      label: consecutiveSuccessCount >= 3 ? "Momentum Bonus" : "Momentum",
      value: successStreakLabel,
      toneClass: consecutiveSuccessCount >= 3 ? "is-positive" : consecutiveSuccessCount > 0 ? "is-neutral" : "is-muted"
    }
  ];
  const metaBlocks = [
    { label: "Category", value: formation?.categoryLabel ?? "-" },
    { label: "Formation State", value: formationState?.stateLabel ?? "-" },
    { label: "Doctrine State", value: doctrine?.stateLabel ?? "-" },
    { label: "Layout Validity", value: validity?.stateLabel ?? "-" },
    { label: "Doctrine Checks", value: doctrine?.checksActive ? "Active" : "Inactive" },
    { label: "Cohesion Checks", value: doctrine?.cohesionChecksActive ? "Active" : "Inactive" },
    { label: "Cohesion Required", value: doctrine?.cohesionCheckRequired ? "Yes" : "No" },
    { label: "Last Doctrine Check", value: tracker?.lastCheckAt ?? "-" }
  ];

  return {
    label: formation?.label ?? "-",
    category: formation?.category ?? "",
    categoryLabel: formation?.categoryLabel ?? "-",
    summary: formation?.summary ?? "-",
    validityLabel: validity?.stateLabel ?? "-",
    valid: Boolean(validity?.isValid),
    doctrineStateLabel: doctrine?.stateLabel ?? "-",
    doctrineChecksActive: Boolean(doctrine?.checksActive),
    cohesionChecksActive: Boolean(doctrine?.cohesionChecksActive),
    cohesionCheckRequired: Boolean(doctrine?.cohesionCheckRequired),
    pendingTriggerCode: doctrine?.pendingTrigger ?? "",
    leadershipCheckDue,
    formationStateLabel: formationState?.stateLabel ?? "-",
    lastCheckAt: tracker?.lastCheckAt ?? "-",
    lastCheckTriggerLabel: doctrine?.lastCheckTriggerLabel ?? "-",
    lastCheckSummary: tracker?.lastCheckSummary ?? "-",
    pendingTriggerLabel: doctrine?.pendingTriggerLabel ?? "",
    effectEntries: formationSnapshot?.effectEntries ?? [],
    effectSummaries: formationSnapshot?.effectSummaries ?? [],
    tokenCoverageFallbackActive: Boolean(tokenCoverageFallbackReason),
    tokenCoverageFallbackMessage: String(tokenCoverageFallbackReason?.message ?? ""),
    invalidReasons,
    bandTargets: formationSnapshot?.bandTargets,
    failureStreakCount,
    consecutiveSuccessCount,
    failureStreakActive: failureStreakCount > 0,
    successStreakActive: consecutiveSuccessCount > 0,
    successMomentumBonusActive: consecutiveSuccessCount >= 3,
    lastCheckWasSuccess: Boolean(tracker?.lastCheckWasSuccess ?? false),
    failureStreakLabel,
    successStreakLabel,
    formationHealthPercent,
    formationHealthStyle: `--po-march-health:${formationHealthPercent}%;`,
    healthTrendIndicator,
    leadersCommandUsedThisCombat,
    canUseLeadersCommand,
    recoveryGuidanceVisible: shouldShowRecoveryGuidance,
    recoveryGuidanceTitle: recoveryGuidance.title,
    recoveryGuidanceText: recoveryGuidance.text,
    recoveryRecommendedAction: recoveryGuidance.recommendedAction,
    recoveryRecommendedActionLabel,
    recoveryCanRally: recoveryGuidance.canRally,
    recoveryCanLeadersCommand: recoveryGuidance.canLeadersCommand,
    recoveryCanDropFormation: recoveryGuidance.canDropFormation,
    statusToneClass,
    statusHeadline,
    statusDetail,
    momentumVisible: momentumRows.some((row) => !String(row?.value ?? "").startsWith("No ")),
    momentumRows,
    metaBlocks
  };
}

export function buildMarchOverviewContext({
  totalAssigned = 0,
  allActorCount = 0,
  laneCounts = {},
  formationLabel = "March Board",
  formationStateLabel = "Active",
  lightSources = 0,
  lockState = "Open",
  unassignedCount = 0,
  warningCount = 0,
  leadershipCheckDue = false
} = {}) {
  const hasAlert = leadershipCheckDue || warningCount > 0 || unassignedCount > 0;
  const miniRows = MARCH_BOARD_RANKS.map((rank) => {
    const count = Math.max(0, Number(laneCounts?.[rank.id] ?? 0) || 0);
    const cells = Array.from({ length: Math.max(3, count) }, (_, index) => ({
      filled: index < count
    }));
    return {
      id: rank.id,
      label: rank.shortLabel,
      count,
      cells
    };
  });
  const safeAllActorCount = Math.max(Number(allActorCount) || 0, totalAssigned + unassignedCount);
  return {
    totalAssigned,
    allActorCount: safeAllActorCount,
    laneCounts,
    formationLabel,
    formationStateLabel,
    lightSources,
    lockState,
    miniRows,
    cards: [
      {
        label: "All Actors",
        value: String(safeAllActorCount),
        detail: unassignedCount > 0 ? `${unassignedCount} not deployed` : "Roster ready",
        toneClass: unassignedCount > 0 ? "is-alert" : ""
      },
      {
        label: "Deployed Actors",
        value: String(totalAssigned),
        detail: `${totalAssigned} on march board`,
        toneClass: totalAssigned > 0 ? "" : "is-muted"
      },
      {
        label: "Lane Spread",
        value: "",
        detail: "",
        toneClass: "",
        isMiniBoard: true,
        miniRows
      },
      {
        label: "Light Sources",
        value: String(lightSources),
        detail: lightSources > 0 ? "Visible light carriers" : "No mapped light carriers",
        toneClass: lightSources > 0 ? "" : "is-muted"
      }
    ]
  };
}

function buildDefaultRankPlacements() {
  return Object.fromEntries(MARCH_BOARD_RANKS.map((rank) => [rank.id, {}]));
}

function clearActorPlacement(state, actorId) {
  if (!state.rankPlacements || typeof state.rankPlacements !== "object") {
    state.rankPlacements = buildDefaultRankPlacements();
  }
  for (const key of Object.keys(state.rankPlacements)) {
    if (state.rankPlacements[key] && typeof state.rankPlacements[key] === "object") {
      delete state.rankPlacements[key][actorId];
    }
  }
}

function setActorPlacement(state, rankId, actorId, cellIndex) {
  clearActorPlacement(state, actorId);
  if (!Number.isInteger(cellIndex) || cellIndex < 0) return;
  if (!state.rankPlacements[rankId] || typeof state.rankPlacements[rankId] !== "object") {
    state.rankPlacements[rankId] = {};
  }
  state.rankPlacements[rankId][actorId] = cellIndex;
}

export function normalizeSocketMarchRequest(request, deps = {}) {
  const { marchOps, marchRanks, sanitizeSocketIdentifier, clampSocketText, noteMaxLength } = deps;

  if (!request || typeof request !== "object") return null;
  const op = String(request.op ?? "").trim();
  if (!marchOps?.has?.(op)) return null;
  if (op === "replaceState") {
    const state =
      request.state && typeof request.state === "object" && !Array.isArray(request.state) ? request.state : null;
    return state ? { op, state } : null;
  }
  const actorId = sanitizeSocketIdentifier(request.actorId, { maxLength: 64 });
  if (!actorId) return null;

  if (op === "joinRank") {
    const rankId = String(request.rankId ?? "").trim();
    if (!marchRanks?.has?.(rankId)) return null;
    const insertIndexRaw = Number.parseInt(String(request.insertIndex ?? ""), 10);
    const insertIndex = Number.isInteger(insertIndexRaw) && insertIndexRaw >= 0 ? insertIndexRaw : null;
    const cellIndexRaw = Number.parseInt(String(request.cellIndex ?? ""), 10);
    const cellIndex = Number.isInteger(cellIndexRaw) && cellIndexRaw >= 0 ? cellIndexRaw : null;
    const normalized = { op, actorId, rankId };
    if (insertIndex !== null) normalized.insertIndex = insertIndex;
    if (cellIndex !== null) normalized.cellIndex = cellIndex;
    return normalized;
  }

  if (op === "leaveRank") {
    return { op, actorId };
  }

  if (op === "setLight") {
    return { op, actorId, enabled: Boolean(request.enabled) };
  }

  if (op === "setLightRange") {
    const rangeKey = String(request.range ?? "")
      .trim()
      .toLowerCase();
    if (!["bright", "dim"].includes(rangeKey)) return null;
    const valueRaw = Number.parseInt(String(request.value ?? ""), 10);
    const value = Number.isInteger(valueRaw) ? Math.max(0, Math.min(999, valueRaw)) : 0;
    return { op, actorId, range: rangeKey, value };
  }

  return {
    op,
    actorId,
    text: clampSocketText(request.text, noteMaxLength)
  };
}

function marchRequestResult(ok, summary, scope) {
  return { ok, summary, scope };
}

function marchRequestFailure(summary, scope) {
  return marchRequestResult(false, summary, scope);
}

function marchRequestSuccess(scope) {
  return marchRequestResult(true, "", scope);
}

export async function applyMarchRequest(request, requesterRef, deps = {}) {
  const {
    getMarchingOrderState,
    game,
    resolveRequester,
    canAccessAllPlayerOps,
    canUserControlActor,
    canUserOperatePartyActor = canUserControlActor,
    isMarchingOrderPlayerLocked,
    stampUpdate,
    setModuleSettingWithLocalRefreshSuppressed,
    settings,
    scheduleIntegrationSync,
    refreshOpenApps,
    refreshScopeKeys,
    emitSocketRefresh,
    logUiDebug
  } = deps;

  const marchScope = refreshScopeKeys?.MARCH ?? "march";
  if (!request || typeof request !== "object")
    return marchRequestFailure("Marching order request was not valid.", marchScope);
  const state = getMarchingOrderState();
  const requester = resolveRequester(requesterRef, { allowGM: true });
  if (!requester) return marchRequestFailure("Marching order request could not be matched to a player.", marchScope);

  if (request.op === "replaceState") {
    if (!requester?.isGM && !canAccessAllPlayerOps?.(requester))
      return marchRequestFailure("Only shared party operators can replace marching order.", marchScope);
    const nextState =
      request.state && typeof request.state === "object" && !Array.isArray(request.state) ? request.state : null;
    if (!nextState) return marchRequestFailure("Marching order replacement was not valid.", marchScope);
    stampUpdate(nextState, requester);
    await setModuleSettingWithLocalRefreshSuppressed(settings.MARCH_STATE, nextState);
    scheduleIntegrationSync("marching-order-player-mutate");
    refreshOpenApps({ scope: refreshScopeKeys.MARCH });
    emitSocketRefresh({ scope: refreshScopeKeys.MARCH });
    return marchRequestSuccess(marchScope);
  }
  const requestedActor = game?.actors?.get?.(request.actorId) ?? null;
  const requesterHasSharedPageAccess = Boolean(!requester?.isGM && canAccessAllPlayerOps?.(requester));
  const requesterCanControlActor = Boolean(
    requestedActor &&
    (requester?.isGM || requesterHasSharedPageAccess || canUserOperatePartyActor?.(requestedActor, requester))
  );

  if (request.op === "joinRank") {
    if (!requesterCanControlActor) {
      logUiDebug?.("marching-order", "socket reject joinRank (permission denied)", {
        actorId: request.actorId,
        requesterId: String(requester?.id ?? ""),
        requesterName: String(requester?.name ?? "Unknown")
      });
      return marchRequestFailure("You do not have permission to move that actor in marching order.", marchScope);
    }
    if (!requester?.isGM && isMarchingOrderPlayerLocked?.(requester))
      return marchRequestFailure("Marching order is locked by the GM.", marchScope);
    for (const key of Object.keys(state.ranks)) {
      state.ranks[key] = (state.ranks[key] ?? []).filter((entryId) => entryId !== request.actorId);
    }
    clearActorPlacement(state, request.actorId);
    if (!state.ranks[request.rankId]) state.ranks[request.rankId] = [];
    const target = state.ranks[request.rankId];
    const requestedInsertIndex = Number.parseInt(String(request.insertIndex ?? ""), 10);
    const safeIndex =
      Number.isInteger(requestedInsertIndex) && requestedInsertIndex >= 0
        ? Math.max(0, Math.min(requestedInsertIndex, target.length))
        : target.length;
    target.splice(safeIndex, 0, request.actorId);
    const requestedCellIndex = Number.parseInt(String(request.cellIndex ?? ""), 10);
    setActorPlacement(
      state,
      request.rankId,
      request.actorId,
      Number.isInteger(requestedCellIndex) && requestedCellIndex >= 0 ? requestedCellIndex : null
    );
    stampUpdate(state, requester);
    await setModuleSettingWithLocalRefreshSuppressed(settings.MARCH_STATE, state);
    scheduleIntegrationSync("marching-order-player-mutate");
    refreshOpenApps({ scope: refreshScopeKeys.MARCH });
    emitSocketRefresh({ scope: refreshScopeKeys.MARCH });
    return marchRequestSuccess(marchScope);
  }

  if (request.op === "leaveRank") {
    if (!requesterCanControlActor) {
      logUiDebug?.("marching-order", "socket reject leaveRank (permission denied)", {
        actorId: request.actorId,
        requesterId: String(requester?.id ?? ""),
        requesterName: String(requester?.name ?? "Unknown")
      });
      return marchRequestFailure("You do not have permission to remove that actor from marching order.", marchScope);
    }
    if (!requester?.isGM && isMarchingOrderPlayerLocked?.(requester))
      return marchRequestFailure("Marching order is locked by the GM.", marchScope);
    for (const key of Object.keys(state.ranks ?? {})) {
      state.ranks[key] = (state.ranks[key] ?? []).filter((entryId) => entryId !== request.actorId);
    }
    clearActorPlacement(state, request.actorId);
    if (state.notes) delete state.notes[request.actorId];
    if (state.light) delete state.light[request.actorId];
    if (state.lightRanges) delete state.lightRanges[request.actorId];
    stampUpdate(state, requester);
    await setModuleSettingWithLocalRefreshSuppressed(settings.MARCH_STATE, state);
    scheduleIntegrationSync("marching-order-player-mutate");
    refreshOpenApps({ scope: refreshScopeKeys.MARCH });
    emitSocketRefresh({ scope: refreshScopeKeys.MARCH });
    return marchRequestSuccess(marchScope);
  }

  if (request.op === "setLight") {
    if (!requesterCanControlActor) {
      logUiDebug?.("marching-order", "socket reject setLight (permission denied)", {
        actorId: request.actorId,
        requesterId: String(requester?.id ?? ""),
        requesterName: String(requester?.name ?? "Unknown")
      });
      return marchRequestFailure("You do not have permission to update that actor's light.", marchScope);
    }
    if (!requester?.isGM && isMarchingOrderPlayerLocked?.(requester))
      return marchRequestFailure("Marching order is locked by the GM.", marchScope);
    if (!state.light) state.light = {};
    if (!state.lightRanges) state.lightRanges = {};
    state.light[request.actorId] = Boolean(request.enabled);
    if (state.light[request.actorId] && !state.lightRanges[request.actorId]) {
      state.lightRanges[request.actorId] = { bright: 20, dim: 40 };
    }
    stampUpdate(state, requester);
    await setModuleSettingWithLocalRefreshSuppressed(settings.MARCH_STATE, state);
    scheduleIntegrationSync("marching-order-player-mutate");
    refreshOpenApps({ scope: refreshScopeKeys.MARCH });
    emitSocketRefresh({ scope: refreshScopeKeys.MARCH });
    return marchRequestSuccess(marchScope);
  }

  if (request.op === "setLightRange") {
    if (!requesterCanControlActor) {
      logUiDebug?.("marching-order", "socket reject setLightRange (permission denied)", {
        actorId: request.actorId,
        requesterId: String(requester?.id ?? ""),
        requesterName: String(requester?.name ?? "Unknown")
      });
      return marchRequestFailure("You do not have permission to update that actor's light range.", marchScope);
    }
    if (!requester?.isGM && isMarchingOrderPlayerLocked?.(requester))
      return marchRequestFailure("Marching order is locked by the GM.", marchScope);
    if (!state.lightRanges) state.lightRanges = {};
    const current = state.lightRanges[request.actorId] ?? { bright: 20, dim: 40 };
    const bright = request.range === "bright" ? request.value : Math.max(0, Number(current.bright ?? 20) || 0);
    const dimCandidate = request.range === "dim" ? request.value : Math.max(0, Number(current.dim ?? 40) || 0);
    state.lightRanges[request.actorId] = {
      bright,
      dim: Math.max(bright, dimCandidate)
    };
    if (!state.light) state.light = {};
    if (state.light[request.actorId] === undefined) state.light[request.actorId] = true;
    stampUpdate(state, requester);
    await setModuleSettingWithLocalRefreshSuppressed(settings.MARCH_STATE, state);
    scheduleIntegrationSync("marching-order-player-mutate");
    refreshOpenApps({ scope: refreshScopeKeys.MARCH });
    emitSocketRefresh({ scope: refreshScopeKeys.MARCH });
    return marchRequestSuccess(marchScope);
  }

  if (request.op === "setNote") {
    if (!requesterCanControlActor)
      return marchRequestFailure("You do not have permission to update that marching order note.", marchScope);
    if (!requester?.isGM && isMarchingOrderPlayerLocked?.(requester))
      return marchRequestFailure("Marching order is locked by the GM.", marchScope);
    const inFormation = Object.values(state.ranks ?? {}).some(
      (actorIds) => Array.isArray(actorIds) && actorIds.includes(request.actorId)
    );
    if (!inFormation) {
      logUiDebug("march-notes", "socket reject setNote (actor not in formation)", {
        actorId: request.actorId,
        requesterId: String(requester?.id ?? ""),
        requesterName: String(requester?.name ?? "Unknown")
      });
      return marchRequestFailure("That actor is not currently in the marching order.", marchScope);
    }
    if (!state.notes) state.notes = {};
    state.notes[request.actorId] = String(request.text ?? "");
    logUiDebug("march-notes", "socket apply setNote", {
      actorId: request.actorId,
      requesterId: String(requester?.id ?? ""),
      requesterName: String(requester?.name ?? "Unknown"),
      textLength: String(request.text ?? "").length
    });
    stampUpdate(state, requester);
    await setModuleSettingWithLocalRefreshSuppressed(settings.MARCH_STATE, state);
    scheduleIntegrationSync("marching-order-player-mutate");
    refreshOpenApps({ scope: refreshScopeKeys.MARCH });
    emitSocketRefresh({ scope: refreshScopeKeys.MARCH });
    return marchRequestSuccess(marchScope);
  }
  return marchRequestFailure("Marching order action is not supported.", marchScope);
}

export function setupMarchingDragAndDrop(html, deps = {}) {
  const {
    getMarchingOrderState,
    isActualGM = false, // Actual GM status for drag-and-drop interaction permissions
    canDragEntry,
    isLockedForUser,
    notifyUiWarnThrottled,
    updateMarchingOrderState,
    refreshSingleAppPreservingView,
    getAppInstance,
    appInstanceKeys
  } = deps;

  const state = getMarchingOrderState();
  const locked = state.locked;
  const playerLocked = !isActualGM && isLockedForUser(state, isActualGM);
  let selectedClickActorId = null;

  const draggableEntries = [
    ...Array.from(html.querySelectorAll(".po-entry")),
    ...Array.from(html.querySelectorAll(".po-march-board-card[data-actor-id]")),
    ...Array.from(html.querySelectorAll(".po-march-board-staging-chip[data-actor-id]")),
    ...Array.from(html.querySelectorAll(".po-march-spacing-token[data-actor-id]"))
  ];

  draggableEntries.forEach((entry) => {
    const actorId = entry.dataset.actorId;
    if (!actorId) return;
    const draggable = canDragEntry(actorId, isActualGM, locked) && !playerLocked;
    entry.setAttribute("draggable", draggable ? "true" : "false");
    entry.classList.toggle("is-draggable", draggable);
    if (!draggable) return;
    entry.setAttribute("tabindex", "0");
    entry.setAttribute("role", entry.getAttribute?.("role") ?? "button");
    entry.setAttribute("aria-pressed", "false");
    if (entry.dataset.poDndEntryBound === "1") return;
    entry.dataset.poDndEntryBound = "1";
    entry.addEventListener("dragstart", (event) => {
      event.dataTransfer?.setData("text/plain", actorId);
      event.dataTransfer?.setDragImage?.(entry, 20, 20);
    });
    const selectEntryForClickMove = async (event) => {
      if (event?.target?.closest?.("button, input, textarea, select, a")) return;
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (selectedClickActorId && selectedClickActorId !== actorId) {
        const targetCell =
          entry.closest?.(".po-march-board-cell[data-rank-id]") ??
          entry.closest?.(".po-march-spacing-cell[data-rank-id]") ??
          entry.closest?.(".po-rank-col[data-rank-id]");
        if (targetCell) {
          await moveSelectedActorToTarget(targetCell, event);
          return;
        }
      }
      if (selectedClickActorId === actorId) {
        clearClickSelection();
      } else {
        applyClickSelection(actorId);
      }
    };
    entry.addEventListener("click", selectEntryForClickMove);
    entry.addEventListener("keydown", async (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      await selectEntryForClickMove(event);
    });

    const handle = entry.querySelector(".po-entry-handle");
    if (handle) {
      handle.setAttribute("draggable", "true");
      if (handle.dataset.poDndHandleBound !== "1") {
        handle.dataset.poDndHandleBound = "1";
        handle.addEventListener("dragstart", (event) => {
          event.dataTransfer?.setData("text/plain", actorId);
          event.dataTransfer?.setDragImage?.(entry, 20, 20);
          event.stopPropagation();
        });
      }
    }
  });

  const dropTargets = [
    ...Array.from(html.querySelectorAll(".po-rank-col")),
    ...Array.from(html.querySelectorAll(".po-march-board-cell[data-rank-id]")),
    ...Array.from(html.querySelectorAll(".po-march-spacing-cell[data-rank-id]"))
  ];

  const clearClickSelection = () => {
    selectedClickActorId = null;
    draggableEntries.forEach((entry) => {
      entry.classList.remove("is-click-selected");
      entry.setAttribute("aria-pressed", "false");
    });
    dropTargets.forEach((target) => target.classList.remove("is-click-target"));
  };

  const applyClickSelection = (actorId) => {
    selectedClickActorId = actorId;
    draggableEntries.forEach((entry) => {
      const selected = entry.dataset.actorId === actorId;
      entry.classList.toggle("is-click-selected", selected);
      entry.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    dropTargets.forEach((target) => target.classList.toggle("is-click-target", Boolean(actorId)));
  };

  const moveSelectedActorToTarget = async (column, event) => {
    const liveState = getMarchingOrderState();
    if (isLockedForUser(liveState, isActualGM)) {
      notifyUiWarnThrottled("Marching order is locked by the GM.", {
        key: "marching-order-locked",
        ttlMs: 1500
      });
      clearClickSelection();
      return;
    }
    const actorId = selectedClickActorId;
    if (!actorId) return;
    const rankId = column.dataset.rankId || column.closest?.("[data-rank-id]")?.dataset?.rankId;
    if (!rankId) return;
    const requestedCellIndex = Number.parseInt(String(column.dataset.cellIndex ?? ""), 10);

    let insertIndex = Number.parseInt(String(column.dataset.insertIndex ?? ""), 10);
    if (!Number.isInteger(insertIndex) || insertIndex < 0) {
      const targetEntry =
        event?.target?.closest?.(".po-entry") ??
        event?.target?.closest?.(".po-march-board-card") ??
        event?.target?.closest?.(".po-march-spacing-token");
      const entryList = [
        ...Array.from(column.querySelectorAll(".po-entry")),
        ...Array.from(column.querySelectorAll(".po-march-board-card")),
        ...Array.from(column.querySelectorAll(".po-march-spacing-token"))
      ];
      insertIndex = targetEntry ? entryList.indexOf(targetEntry) : entryList.length;
    }

    const request = { op: "joinRank", actorId, rankId };
    if (Number.isInteger(insertIndex) && insertIndex >= 0) request.insertIndex = insertIndex;
    if (Number.isInteger(requestedCellIndex) && requestedCellIndex >= 0) request.cellIndex = requestedCellIndex;
    const saved = await updateMarchingOrderState(request, { skipLocalRefresh: true });

    if (saved !== false) {
      clearClickSelection();
      refreshSingleAppPreservingView(getAppInstance(appInstanceKeys.MARCHING_ORDER));
    }
  };

  dropTargets.forEach((column) => {
    if (column.dataset.poDndColBound === "1") return;
    column.dataset.poDndColBound = "1";
    column.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    });

    column.addEventListener("click", async (event) => {
      if (!selectedClickActorId) return;
      if (event?.target?.closest?.("button, input, textarea, select, a")) return;
      event.preventDefault();
      await moveSelectedActorToTarget(column, event);
    });

    column.addEventListener("drop", async (event) => {
      event.preventDefault();
      const liveState = getMarchingOrderState();
      if (isLockedForUser(liveState, isActualGM)) {
        notifyUiWarnThrottled("Marching order is locked by the GM.", {
          key: "marching-order-locked",
          ttlMs: 1500
        });
        return;
      }
      const actorId = event.dataTransfer?.getData("text/plain");
      if (!actorId) return;
      const rankId = column.dataset.rankId || column.closest?.("[data-rank-id]")?.dataset?.rankId;
      if (!rankId) return;
      const requestedCellIndex = Number.parseInt(String(column.dataset.cellIndex ?? ""), 10);

      let insertIndex = Number.parseInt(String(column.dataset.insertIndex ?? ""), 10);
      if (!Number.isInteger(insertIndex) || insertIndex < 0) {
        const targetEntry =
          event.target?.closest?.(".po-entry") ??
          event.target?.closest?.(".po-march-board-card") ??
          event.target?.closest?.(".po-march-spacing-token");
        const entryList = [
          ...Array.from(column.querySelectorAll(".po-entry")),
          ...Array.from(column.querySelectorAll(".po-march-board-card")),
          ...Array.from(column.querySelectorAll(".po-march-spacing-token"))
        ];
        insertIndex = targetEntry ? entryList.indexOf(targetEntry) : entryList.length;
      }

      const request = { op: "joinRank", actorId, rankId };
      if (Number.isInteger(insertIndex) && insertIndex >= 0) request.insertIndex = insertIndex;
      if (Number.isInteger(requestedCellIndex) && requestedCellIndex >= 0) request.cellIndex = requestedCellIndex;
      const saved = await updateMarchingOrderState(request, { skipLocalRefresh: true });

      if (saved !== false) {
        refreshSingleAppPreservingView(getAppInstance(appInstanceKeys.MARCHING_ORDER));
      }
    });
  });
}
