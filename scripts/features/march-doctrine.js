export const MARCH_FORMATION_CATEGORIES = Object.freeze({
  TIGHT: "tight",
  OPEN: "open",
  LOOSE: "loose",
  FREE: "free"
});

export const MARCH_DOCTRINE_STATES = Object.freeze({
  STABLE: "stable",
  STRAINED: "strained",
  BROKEN: "broken"
});

export const MARCH_DOCTRINE_CHECK_METHODS = Object.freeze({
  GROUP_CHARISMA_AVERAGE: "group-charisma-average"
});

export const MARCH_DOCTRINE_TRIGGERS = Object.freeze({
  MANUAL: "manual",
  MAJOR_REPOSITION: "major-reposition",
  SPACING_VIOLATION: "spacing-violation",
  SCENE_ENTRY: "scene-entry",
  TRAVEL_INTERVAL: "travel-interval",
  GROUP_DISRUPTION: "group-disruption"
});

export const MARCH_RANK_ORDER = Object.freeze(["front", "middle", "rear"]);

const CATEGORY_LABELS = Object.freeze({
  [MARCH_FORMATION_CATEGORIES.TIGHT]: "Tight",
  [MARCH_FORMATION_CATEGORIES.OPEN]: "Open",
  [MARCH_FORMATION_CATEGORIES.LOOSE]: "Loose",
  [MARCH_FORMATION_CATEGORIES.FREE]: "Free"
});

const DOCTRINE_STATE_LABELS = Object.freeze({
  [MARCH_DOCTRINE_STATES.STABLE]: "Stable",
  [MARCH_DOCTRINE_STATES.STRAINED]: "Strained",
  [MARCH_DOCTRINE_STATES.BROKEN]: "Broken"
});

const DOCTRINE_TRIGGER_LABELS = Object.freeze({
  [MARCH_DOCTRINE_TRIGGERS.MANUAL]: "Manual GM trigger",
  [MARCH_DOCTRINE_TRIGGERS.MAJOR_REPOSITION]: "Major repositioning",
  [MARCH_DOCTRINE_TRIGGERS.SPACING_VIOLATION]: "Spacing violation",
  [MARCH_DOCTRINE_TRIGGERS.SCENE_ENTRY]: "Scene entry",
  [MARCH_DOCTRINE_TRIGGERS.TRAVEL_INTERVAL]: "Travel interval",
  [MARCH_DOCTRINE_TRIGGERS.GROUP_DISRUPTION]: "Group disruption"
});

const EFFECT_DEFINITIONS = Object.freeze({
  initiative: Object.freeze({
    key: "initiative",
    label: "Initiative",
    path: "system.attributes.init.bonus",
    unit: ""
  }),
  passivePerception: Object.freeze({
    key: "passivePerception",
    label: "Passive Perception",
    path: "system.skills.prc.passive",
    unit: ""
  }),
  perceptionCheck: Object.freeze({
    key: "perceptionCheck",
    label: "Perception Checks",
    path: "system.skills.prc.bonuses.check",
    unit: ""
  }),
  stealthCheck: Object.freeze({
    key: "stealthCheck",
    label: "Stealth Checks",
    path: "system.skills.ste.bonuses.check",
    unit: ""
  }),
  movementWalk: Object.freeze({
    key: "movementWalk",
    label: "Walk Speed",
    path: "system.attributes.movement.walk",
    unit: " ft"
  }),
  acBonus: Object.freeze({
    key: "acBonus",
    label: "AC",
    path: "system.attributes.ac.bonus",
    unit: ""
  })
});

const TRIGGER_DC_ADJUSTMENTS = Object.freeze({
  [MARCH_DOCTRINE_TRIGGERS.MANUAL]: 0,
  [MARCH_DOCTRINE_TRIGGERS.MAJOR_REPOSITION]: 1,
  [MARCH_DOCTRINE_TRIGGERS.SPACING_VIOLATION]: 2,
  [MARCH_DOCTRINE_TRIGGERS.SCENE_ENTRY]: 1,
  [MARCH_DOCTRINE_TRIGGERS.TRAVEL_INTERVAL]: 0,
  [MARCH_DOCTRINE_TRIGGERS.GROUP_DISRUPTION]: 2
});

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const entry of Object.values(value)) deepFreeze(entry);
  return value;
}

const FORMATION_DEFINITIONS = deepFreeze([
  {
    id: "free",
    label: "Free Formation",
    category: MARCH_FORMATION_CATEGORIES.FREE,
    summary: "No enforced posture, no doctrine maintenance, no formation bonuses.",
    doctrineDc: 0,
    bandTargets: {
      front: { recommended: 0, min: 0, max: null },
      middle: { recommended: 0, min: 0, max: null },
      rear: { recommended: 0, min: 0, max: null }
    },
    tolerances: {
      maxStepUnits: null,
      maxWidthUnits: null,
      minBandGapUnits: null,
      lateralBandUnits: null
    },
    effectsByState: {
      stable: { shared: {}, byRank: {} },
      strained: { shared: {}, byRank: {} }
    }
  },
  {
    id: "loose",
    label: "Loose Formation",
    category: MARCH_FORMATION_CATEGORIES.LOOSE,
    summary: "Light travel discipline with wide spacing tolerance and light doctrine pressure.",
    doctrineDc: 10,
    bandTargets: {
      front: { recommended: 1, min: 1, max: 2 },
      middle: { recommended: 2, min: 1, max: 4 },
      rear: { recommended: 1, min: 0, max: 3 }
    },
    tolerances: {
      maxStepUnits: 4,
      maxWidthUnits: 4.5,
      minBandGapUnits: 0.5,
      lateralBandUnits: 2.5
    },
    effectsByState: {
      stable: {
        shared: {
          passivePerception: 1
        },
        byRank: {}
      },
      strained: {
        shared: {},
        byRank: {}
      }
    }
  },
  {
    id: "tight-guard",
    label: "Tight Guard",
    category: MARCH_FORMATION_CATEGORIES.TIGHT,
    summary: "Compact, disciplined posture with stronger protection and slower movement.",
    doctrineDc: 12,
    bandTargets: {
      front: { recommended: 2, min: 1, max: 3 },
      middle: { recommended: 2, min: 1, max: 3 },
      rear: { recommended: 1, min: 0, max: 2 }
    },
    tolerances: {
      maxStepUnits: 2,
      maxWidthUnits: 2,
      minBandGapUnits: 1,
      lateralBandUnits: 1.25
    },
    effectsByState: {
      stable: {
        shared: {
          initiative: 1,
          movementWalk: -5,
          stealthCheck: -1
        },
        byRank: {
          front: { acBonus: 1 },
          middle: { acBonus: 1 }
        }
      },
      strained: {
        shared: {
          movementWalk: -5
        },
        byRank: {
          front: { acBonus: 1 }
        }
      }
    }
  },
  {
    id: "tight-column",
    label: "Tight Column",
    category: MARCH_FORMATION_CATEGORIES.TIGHT,
    summary: "Narrow compact file with strict spacing and limited maneuver margin.",
    doctrineDc: 12,
    bandTargets: {
      front: { recommended: 1, min: 1, max: 2 },
      middle: { recommended: 2, min: 1, max: 3 },
      rear: { recommended: 1, min: 1, max: 2 }
    },
    tolerances: {
      maxStepUnits: 1.75,
      maxWidthUnits: 1.5,
      minBandGapUnits: 1,
      lateralBandUnits: 1
    },
    effectsByState: {
      stable: {
        shared: {
          initiative: 1,
          movementWalk: -5,
          stealthCheck: -1
        },
        byRank: {
          front: { acBonus: 1 },
          rear: { acBonus: 1 }
        }
      },
      strained: {
        shared: {
          movementWalk: -5
        },
        byRank: {
          front: { acBonus: 1 }
        }
      }
    }
  },
  {
    id: "open-screen",
    label: "Open Screen",
    category: MARCH_FORMATION_CATEGORIES.OPEN,
    summary: "Broader spread that prioritizes scanning and mobility over protection.",
    doctrineDc: 11,
    bandTargets: {
      front: { recommended: 2, min: 1, max: 3 },
      middle: { recommended: 1, min: 1, max: 3 },
      rear: { recommended: 1, min: 0, max: 2 }
    },
    tolerances: {
      maxStepUnits: 3.5,
      maxWidthUnits: 4,
      minBandGapUnits: 0.75,
      lateralBandUnits: 2
    },
    effectsByState: {
      stable: {
        shared: {
          passivePerception: 2,
          perceptionCheck: 1,
          movementWalk: 5
        },
        byRank: {}
      },
      strained: {
        shared: {
          passivePerception: 1,
          perceptionCheck: 1
        },
        byRank: {}
      }
    }
  },
  {
    id: "open-staggered",
    label: "Open Staggered",
    category: MARCH_FORMATION_CATEGORIES.OPEN,
    summary: "Mobile stagger with moderate spacing and light awareness bonuses.",
    doctrineDc: 11,
    bandTargets: {
      front: { recommended: 2, min: 1, max: 3 },
      middle: { recommended: 2, min: 1, max: 3 },
      rear: { recommended: 0, min: 0, max: 2 }
    },
    tolerances: {
      maxStepUnits: 3,
      maxWidthUnits: 3.5,
      minBandGapUnits: 0.75,
      lateralBandUnits: 2
    },
    effectsByState: {
      stable: {
        shared: {
          initiative: 1,
          passivePerception: 1,
          movementWalk: 5,
          stealthCheck: 1
        },
        byRank: {}
      },
      strained: {
        shared: {
          passivePerception: 1
        },
        byRank: {}
      }
    }
  }
]);

function normalizeInteger(value, { min = 0, max = Number.POSITIVE_INFINITY, fallback = min } = {}) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(raw)));
}

function normalizeDoctrineState(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === MARCH_DOCTRINE_STATES.STRAINED) return MARCH_DOCTRINE_STATES.STRAINED;
  if (normalized === MARCH_DOCTRINE_STATES.BROKEN) return MARCH_DOCTRINE_STATES.BROKEN;
  return MARCH_DOCTRINE_STATES.STABLE;
}

function normalizeDoctrineMethod(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === MARCH_DOCTRINE_CHECK_METHODS.GROUP_CHARISMA_AVERAGE) {
    return MARCH_DOCTRINE_CHECK_METHODS.GROUP_CHARISMA_AVERAGE;
  }
  return MARCH_DOCTRINE_CHECK_METHODS.GROUP_CHARISMA_AVERAGE;
}

function normalizeDoctrineTrigger(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return DOCTRINE_TRIGGER_LABELS[normalized] ? normalized : MARCH_DOCTRINE_TRIGGERS.MANUAL;
}

function stateWeight(state) {
  if (state === MARCH_DOCTRINE_STATES.BROKEN) return 2;
  if (state === MARCH_DOCTRINE_STATES.STRAINED) return 1;
  return 0;
}

function maxState(a, b) {
  return stateWeight(a) >= stateWeight(b) ? a : b;
}

function formatSignedValue(value, unit = "") {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric === 0) return `0${unit}`;
  return `${numeric > 0 ? "+" : ""}${numeric}${unit}`;
}

function createReason({ code, severity, message }) {
  return {
    code: String(code ?? "").trim() || "formation-state",
    severity: normalizeDoctrineState(severity),
    message: String(message ?? "").trim()
  };
}

function cloneBandTargets(definition) {
  const result = {};
  for (const rankId of MARCH_RANK_ORDER) {
    const source = definition?.bandTargets?.[rankId] ?? {};
    result[rankId] = {
      recommended: normalizeInteger(source.recommended, { min: 0, max: 99, fallback: 0 }),
      min: normalizeInteger(source.min, { min: 0, max: 99, fallback: 0 }),
      max: source.max === null ? null : normalizeInteger(source.max, { min: 0, max: 99, fallback: 0 })
    };
  }
  return result;
}

function normalizeBandCounts(ranks = {}) {
  const counts = {};
  for (const rankId of MARCH_RANK_ORDER) {
    counts[rankId] = Array.isArray(ranks?.[rankId]) ? ranks[rankId].filter(Boolean).length : 0;
  }
  return counts;
}

function getAssignedActorIds(ranks = {}) {
  const ordered = [];
  for (const rankId of MARCH_RANK_ORDER) {
    for (const actorId of ranks?.[rankId] ?? []) {
      const normalized = String(actorId ?? "").trim();
      if (!normalized || ordered.includes(normalized)) continue;
      ordered.push(normalized);
    }
  }
  return ordered;
}

function buildRankByActorId(ranks = {}) {
  const map = {};
  for (const rankId of MARCH_RANK_ORDER) {
    for (const actorId of ranks?.[rankId] ?? []) {
      const normalized = String(actorId ?? "").trim();
      if (!normalized || map[normalized]) continue;
      map[normalized] = rankId;
    }
  }
  return map;
}

function normalizeTokenPositions(tokenPositionsByActorId = {}) {
  const positions = {};
  for (const [actorId, raw] of Object.entries(tokenPositionsByActorId ?? {})) {
    const x = Number(raw?.x);
    const y = Number(raw?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    positions[String(actorId ?? "").trim()] = { x, y };
  }
  return positions;
}

function getAxisFromBands(bandCenters) {
  const front = bandCenters.front ?? null;
  const middle = bandCenters.middle ?? null;
  const rear = bandCenters.rear ?? null;
  const head = front ?? middle ?? rear;
  const tail = rear ?? middle ?? front;
  if (head && tail && (head.x !== tail.x || head.y !== tail.y)) {
    const dx = head.x - tail.x;
    const dy = head.y - tail.y;
    const magnitude = Math.hypot(dx, dy) || 1;
    return { x: dx / magnitude, y: dy / magnitude };
  }
  return { x: 1, y: 0 };
}

function getPerpendicularAxis(axis) {
  return { x: -axis.y, y: axis.x };
}

function averagePoint(points = []) {
  if (!points.length) return null;
  const total = points.reduce((accumulator, point) => {
    accumulator.x += point.x;
    accumulator.y += point.y;
    return accumulator;
  }, { x: 0, y: 0 });
  return {
    x: total.x / points.length,
    y: total.y / points.length
  };
}

function scalarProjection(point, axis) {
  return (Number(point?.x ?? 0) * Number(axis?.x ?? 0)) + (Number(point?.y ?? 0) * Number(axis?.y ?? 0));
}

function evaluateStructuralValidity(definition, ranks) {
  const counts = normalizeBandCounts(ranks);
  const reasons = [];
  for (const rankId of MARCH_RANK_ORDER) {
    const band = definition?.bandTargets?.[rankId] ?? { min: 0, max: null };
    const count = counts[rankId] ?? 0;
    if (count < band.min) {
      reasons.push(createReason({
        code: `${rankId}-under-min`,
        severity: count + 1 >= band.min ? MARCH_DOCTRINE_STATES.STRAINED : MARCH_DOCTRINE_STATES.BROKEN,
        message: `${capitalize(rankId)} band below minimum (${count} / ${band.min}).`
      }));
    }
    if (band.max !== null && count > band.max) {
      reasons.push(createReason({
        code: `${rankId}-over-max`,
        severity: count === band.max + 1 ? MARCH_DOCTRINE_STATES.STRAINED : MARCH_DOCTRINE_STATES.BROKEN,
        message: `${capitalize(rankId)} band above tolerance (${count} / ${band.max}).`
      }));
    }
  }
  return {
    counts,
    reasons
  };
}

function evaluatePositionalValidity(definition, ranks, tokenPositionsByActorId, gridUnitPixels) {
  const reasons = [];
  const tokens = normalizeTokenPositions(tokenPositionsByActorId);
  const assignedActorIds = getAssignedActorIds(ranks);
  const missingTokenActorIds = assignedActorIds.filter((actorId) => !tokens[actorId]);

  if (assignedActorIds.length > 0 && missingTokenActorIds.length > 0) {
    reasons.push(createReason({
      code: "missing-token-positions",
      severity: missingTokenActorIds.length === 1 ? MARCH_DOCTRINE_STATES.STRAINED : MARCH_DOCTRINE_STATES.BROKEN,
      message: `Token positions unavailable for ${missingTokenActorIds.length} assigned actor${missingTokenActorIds.length === 1 ? "" : "s"}.`
    }));
  }

  const bandPoints = {};
  for (const rankId of MARCH_RANK_ORDER) {
    bandPoints[rankId] = (ranks?.[rankId] ?? [])
      .map((actorId) => tokens[String(actorId ?? "").trim()] ?? null)
      .filter(Boolean);
  }

  const availableTokenCount = Object.values(bandPoints).reduce((sum, points) => sum + points.length, 0);
  const bandCenters = {
    front: averagePoint(bandPoints.front),
    middle: averagePoint(bandPoints.middle),
    rear: averagePoint(bandPoints.rear)
  };
  if (availableTokenCount <= 1) {
    return {
      availableTokenCount,
      missingTokenActorIds,
      reasons,
      bandCenters
    };
  }

  const axis = getAxisFromBands(bandCenters);
  const lateralAxis = getPerpendicularAxis(axis);
  const minBandGapPx = Number(definition?.tolerances?.minBandGapUnits ?? 0) * gridUnitPixels;
  const maxWidthPx = Number(definition?.tolerances?.maxWidthUnits ?? 0) * gridUnitPixels;
  const lateralBandPx = Number(definition?.tolerances?.lateralBandUnits ?? 0) * gridUnitPixels;
  const maxStepPx = Number(definition?.tolerances?.maxStepUnits ?? 0) * gridUnitPixels;

  const projectionsByBand = {};
  for (const rankId of MARCH_RANK_ORDER) {
    const points = bandPoints[rankId];
    const average = bandCenters[rankId];
    if (!points.length || !average) continue;
    const bandProjection = scalarProjection(average, axis);
    projectionsByBand[rankId] = bandProjection;
    const lateralCenter = scalarProjection(average, lateralAxis);
    const maxLateralDelta = points.reduce((largest, point) => {
      const delta = Math.abs(scalarProjection(point, lateralAxis) - lateralCenter);
      return Math.max(largest, delta);
    }, 0);
    if (lateralBandPx > 0 && maxLateralDelta > lateralBandPx) {
      reasons.push(createReason({
        code: `${rankId}-band-width`,
        severity: maxLateralDelta <= (lateralBandPx * 1.5) ? MARCH_DOCTRINE_STATES.STRAINED : MARCH_DOCTRINE_STATES.BROKEN,
        message: `${capitalize(rankId)} band spread exceeded tolerance.`
      }));
    }
  }

  if (bandCenters.front && bandCenters.middle) {
    const frontGap = projectionsByBand.front - projectionsByBand.middle;
    if (frontGap < minBandGapPx) {
      reasons.push(createReason({
        code: "front-middle-gap",
        severity: frontGap >= (minBandGapPx * 0.5) ? MARCH_DOCTRINE_STATES.STRAINED : MARCH_DOCTRINE_STATES.BROKEN,
        message: "Front and middle bands are not maintaining order."
      }));
    }
  }
  if (bandCenters.middle && bandCenters.rear) {
    const rearGap = projectionsByBand.middle - projectionsByBand.rear;
    if (rearGap < minBandGapPx) {
      reasons.push(createReason({
        code: "middle-rear-gap",
        severity: rearGap >= (minBandGapPx * 0.5) ? MARCH_DOCTRINE_STATES.STRAINED : MARCH_DOCTRINE_STATES.BROKEN,
        message: "Middle and rear bands are not maintaining order."
      }));
    }
  }
  if (!bandCenters.middle && bandCenters.front && bandCenters.rear) {
    const directGap = projectionsByBand.front - projectionsByBand.rear;
    if (directGap < minBandGapPx) {
      reasons.push(createReason({
        code: "front-rear-gap",
        severity: directGap >= (minBandGapPx * 0.5) ? MARCH_DOCTRINE_STATES.STRAINED : MARCH_DOCTRINE_STATES.BROKEN,
        message: "Front and rear bands have collapsed into the same envelope."
      }));
    }
  }

  const allPoints = assignedActorIds
    .map((actorId) => tokens[actorId] ?? null)
    .filter(Boolean);
  if (allPoints.length > 1) {
    const allLateralValues = allPoints.map((point) => scalarProjection(point, lateralAxis));
    const width = Math.max(...allLateralValues) - Math.min(...allLateralValues);
    if (maxWidthPx > 0 && width > maxWidthPx) {
      reasons.push(createReason({
        code: "formation-width",
        severity: width <= (maxWidthPx * 1.5) ? MARCH_DOCTRINE_STATES.STRAINED : MARCH_DOCTRINE_STATES.BROKEN,
        message: "Formation envelope width exceeded tolerance."
      }));
    }

    const allForwardValues = allPoints
      .map((point) => scalarProjection(point, axis))
      .sort((left, right) => right - left);
    let largestStep = 0;
    for (let index = 1; index < allForwardValues.length; index += 1) {
      largestStep = Math.max(largestStep, allForwardValues[index - 1] - allForwardValues[index]);
    }
    if (maxStepPx > 0 && largestStep > maxStepPx) {
      reasons.push(createReason({
        code: "formation-spacing",
        severity: largestStep <= (maxStepPx * 1.5) ? MARCH_DOCTRINE_STATES.STRAINED : MARCH_DOCTRINE_STATES.BROKEN,
        message: "Formation spacing exceeded tolerance."
      }));
    }
  }

  return {
    availableTokenCount,
    missingTokenActorIds,
    reasons,
    bandCenters
  };
}

function effectValueToEntry(effectKey, value, rankId = "") {
  const definition = EFFECT_DEFINITIONS[effectKey];
  if (!definition) return null;
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric === 0) return null;
  const prefix = rankId ? `${capitalize(rankId)} ` : "";
  return {
    key: definition.key,
    label: `${prefix}${definition.label}`,
    path: definition.path,
    value: numeric,
    unit: definition.unit,
    rankId: rankId || "",
    summary: `${prefix}${formatSignedValue(numeric, definition.unit)} ${definition.label}`.trim()
  };
}

function buildEffectEntries(effectState = {}) {
  const entries = [];
  for (const [effectKey, value] of Object.entries(effectState?.shared ?? {})) {
    const entry = effectValueToEntry(effectKey, value);
    if (entry) entries.push(entry);
  }
  for (const [rankId, rankEffects] of Object.entries(effectState?.byRank ?? {})) {
    for (const [effectKey, value] of Object.entries(rankEffects ?? {})) {
      const entry = effectValueToEntry(effectKey, value, rankId);
      if (entry) entries.push(entry);
    }
  }
  return entries;
}

function buildEffectChangesForActor(actorId, rankByActorId, effectEntries) {
  const rankId = rankByActorId[actorId] ?? "";
  return effectEntries
    .filter((entry) => !entry.rankId || entry.rankId === rankId)
    .map((entry) => ({
      key: entry.path,
      value: String(entry.value),
      mode: "ADD",
      label: entry.label
    }));
}

function buildStateLabel(state) {
  return DOCTRINE_STATE_LABELS[normalizeDoctrineState(state)] ?? DOCTRINE_STATE_LABELS.stable;
}

function buildPendingTriggerLabel(tracker) {
  const pending = String(tracker?.pendingTrigger ?? "").trim().toLowerCase();
  if (!pending) return "";
  return DOCTRINE_TRIGGER_LABELS[pending] ?? "Pending trigger";
}

function capitalize(value) {
  const text = String(value ?? "");
  if (!text) return "";
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

export function getMarchFormationDefinitions() {
  return FORMATION_DEFINITIONS.map((entry) => ({
    ...entry,
    bandTargets: cloneBandTargets(entry)
  }));
}

export function getMarchFormationDefinition(id) {
  const normalized = normalizeMarchingFormationId(id);
  return FORMATION_DEFINITIONS.find((entry) => entry.id === normalized) ?? FORMATION_DEFINITIONS[0];
}

export function getMarchFormationCategoryLabel(category) {
  return CATEGORY_LABELS[String(category ?? "").trim().toLowerCase()] ?? CATEGORY_LABELS.loose;
}

export function getMarchDoctrineStateLabel(state) {
  return buildStateLabel(state);
}

export function getMarchDoctrineTriggerLabel(trigger) {
  return DOCTRINE_TRIGGER_LABELS[normalizeDoctrineTrigger(trigger)] ?? DOCTRINE_TRIGGER_LABELS.manual;
}

export function normalizeMarchingFormationId(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  const aliases = {
    standard: "loose",
    default: "loose",
    "combat-ready": "tight-guard",
    "tight-corridor": "tight-column",
    "two-wide": "tight-column",
    "single-file": "tight-column",
    "low-visibility": "open-screen",
    free: "free",
    loose: "loose",
    "tight-guard": "tight-guard",
    "tight-column": "tight-column",
    "open-screen": "open-screen",
    "open-staggered": "open-staggered"
  };
  return aliases[normalized] ?? "loose";
}

export function buildDefaultMarchDoctrineTracker() {
  return {
    state: MARCH_DOCTRINE_STATES.STABLE,
    checkMethod: MARCH_DOCTRINE_CHECK_METHODS.GROUP_CHARISMA_AVERAGE,
    lastCheckAt: "-",
    lastCheckTrigger: "-",
    lastCheckSummary: "-",
    lastCheckRollTotal: null,
    lastCheckDc: null,
    pendingTrigger: "",
    cohesionCheckRequired: false
  };
}

export function ensureMarchDoctrineTracker(state) {
  if (!state.doctrineTracker || typeof state.doctrineTracker !== "object") {
    state.doctrineTracker = buildDefaultMarchDoctrineTracker();
  }
  const tracker = state.doctrineTracker;
  tracker.state = normalizeDoctrineState(tracker.state);
  tracker.checkMethod = normalizeDoctrineMethod(tracker.checkMethod);
  tracker.lastCheckAt = typeof tracker.lastCheckAt === "string" ? tracker.lastCheckAt : "-";
  tracker.lastCheckTrigger = typeof tracker.lastCheckTrigger === "string" ? tracker.lastCheckTrigger : "-";
  tracker.lastCheckSummary = typeof tracker.lastCheckSummary === "string" ? tracker.lastCheckSummary : "-";
  tracker.lastCheckRollTotal = Number.isFinite(Number(tracker.lastCheckRollTotal)) ? Number(tracker.lastCheckRollTotal) : null;
  tracker.lastCheckDc = Number.isFinite(Number(tracker.lastCheckDc)) ? Number(tracker.lastCheckDc) : null;
  tracker.pendingTrigger = typeof tracker.pendingTrigger === "string" ? tracker.pendingTrigger : "";
  tracker.cohesionCheckRequired = Boolean(tracker.cohesionCheckRequired);
  return tracker;
}

export function markDoctrineTriggerPending(state, trigger) {
  const tracker = ensureMarchDoctrineTracker(state);
  tracker.pendingTrigger = normalizeDoctrineTrigger(trigger);
  tracker.cohesionCheckRequired = tracker.pendingTrigger !== "";
  return tracker;
}

export function clearDoctrineTriggerPending(state) {
  const tracker = ensureMarchDoctrineTracker(state);
  tracker.pendingTrigger = "";
  tracker.cohesionCheckRequired = false;
  return tracker;
}

export function buildMarchFormationChoices(currentFormationId) {
  const currentId = normalizeMarchingFormationId(currentFormationId);
  return FORMATION_DEFINITIONS.map((entry) => ({
    id: entry.id,
    label: entry.label,
    category: entry.category,
    categoryLabel: getMarchFormationCategoryLabel(entry.category),
    summary: entry.summary,
    active: entry.id === currentId
  }));
}

export function evaluateMarchingFormationState({
  formationId,
  ranks = {},
  doctrineTracker = {},
  tokenPositionsByActorId = {},
  gridUnitPixels = 100
} = {}) {
  const definition = getMarchFormationDefinition(formationId);
  const tracker = {
    ...buildDefaultMarchDoctrineTracker(),
    ...(doctrineTracker && typeof doctrineTracker === "object" ? doctrineTracker : {})
  };
  tracker.state = normalizeDoctrineState(tracker.state);
  tracker.checkMethod = normalizeDoctrineMethod(tracker.checkMethod);
  tracker.pendingTrigger = typeof tracker.pendingTrigger === "string" ? tracker.pendingTrigger : "";
  tracker.cohesionCheckRequired = Boolean(tracker.cohesionCheckRequired);

  const assignedActorIds = getAssignedActorIds(ranks);
  const rankByActorId = buildRankByActorId(ranks);

  if (definition.category === MARCH_FORMATION_CATEGORIES.FREE) {
    return {
      formation: {
        id: definition.id,
        label: definition.label,
        category: definition.category,
        categoryLabel: getMarchFormationCategoryLabel(definition.category),
        summary: definition.summary,
        bandTargets: cloneBandTargets(definition)
      },
      counts: normalizeBandCounts(ranks),
      assignedActorIds,
      rankByActorId,
      validity: {
        isValid: true,
        state: MARCH_DOCTRINE_STATES.STABLE,
        stateLabel: buildStateLabel(MARCH_DOCTRINE_STATES.STABLE),
        reasons: []
      },
      doctrine: {
        active: false,
        state: tracker.state,
        stateLabel: "Bypassed",
        checksActive: false,
        cohesionChecksActive: false,
        cohesionCheckRequired: false,
        lastCheckAt: tracker.lastCheckAt,
        lastCheckTrigger: tracker.lastCheckTrigger,
        lastCheckTriggerLabel: tracker.lastCheckTrigger === "-" ? "-" : getMarchDoctrineTriggerLabel(tracker.lastCheckTrigger),
        lastCheckSummary: tracker.lastCheckSummary,
        pendingTrigger: "",
        pendingTriggerLabel: "",
        checkMethod: tracker.checkMethod,
        checkMethodLabel: "Bypassed"
      },
      formationState: {
        state: MARCH_DOCTRINE_STATES.STABLE,
        stateLabel: buildStateLabel(MARCH_DOCTRINE_STATES.STABLE)
      },
      effectEntries: [],
      effectSummaries: [],
      effectChangesByActorId: {},
      bandTargets: cloneBandTargets(definition)
    };
  }

  const structural = evaluateStructuralValidity(definition, ranks);
  const positional = evaluatePositionalValidity(definition, ranks, tokenPositionsByActorId, Math.max(1, Number(gridUnitPixels) || 100));
  const validityState = [...structural.reasons, ...positional.reasons]
    .reduce((worst, reason) => maxState(worst, reason.severity), MARCH_DOCTRINE_STATES.STABLE);
  const formationState = maxState(tracker.state, validityState);
  const effectState = formationState === MARCH_DOCTRINE_STATES.STABLE
    ? definition.effectsByState.stable
    : formationState === MARCH_DOCTRINE_STATES.STRAINED
      ? definition.effectsByState.strained
      : { shared: {}, byRank: {} };
  const effectEntries = buildEffectEntries(effectState);
  const effectChangesByActorId = Object.fromEntries(
    assignedActorIds.map((actorId) => [
      actorId,
      buildEffectChangesForActor(actorId, rankByActorId, effectEntries)
    ])
  );
  const pendingTriggerLabel = buildPendingTriggerLabel(tracker);
  const cohesionCheckRequired = tracker.cohesionCheckRequired
    || tracker.pendingTrigger !== ""
    || validityState !== MARCH_DOCTRINE_STATES.STABLE;

  return {
    formation: {
      id: definition.id,
      label: definition.label,
      category: definition.category,
      categoryLabel: getMarchFormationCategoryLabel(definition.category),
      summary: definition.summary,
      bandTargets: cloneBandTargets(definition)
    },
    counts: structural.counts,
    assignedActorIds,
    rankByActorId,
    validity: {
      isValid: validityState === MARCH_DOCTRINE_STATES.STABLE,
      state: validityState,
      stateLabel: buildStateLabel(validityState),
      reasons: [...structural.reasons, ...positional.reasons]
    },
    doctrine: {
      active: true,
      state: tracker.state,
      stateLabel: buildStateLabel(tracker.state),
      checksActive: true,
      cohesionChecksActive: true,
      cohesionCheckRequired,
      lastCheckAt: tracker.lastCheckAt,
      lastCheckTrigger: tracker.lastCheckTrigger,
      lastCheckTriggerLabel: tracker.lastCheckTrigger === "-" ? "-" : getMarchDoctrineTriggerLabel(tracker.lastCheckTrigger),
      lastCheckSummary: tracker.lastCheckSummary,
      pendingTrigger: tracker.pendingTrigger,
      pendingTriggerLabel,
      checkMethod: tracker.checkMethod,
      checkMethodLabel: "Group Charisma (average modifier)"
    },
    formationState: {
      state: formationState,
      stateLabel: buildStateLabel(formationState)
    },
    effectEntries,
    effectSummaries: effectEntries.map((entry) => entry.summary),
    effectChangesByActorId,
    bandTargets: cloneBandTargets(definition)
  };
}

export function buildDoctrineCheckPayload({
  formationId,
  actorRows = [],
  doctrineState = MARCH_DOCTRINE_STATES.STABLE,
  trigger = MARCH_DOCTRINE_TRIGGERS.MANUAL,
  rollTotal = null
} = {}) {
  const definition = getMarchFormationDefinition(formationId);
  if (definition.category === MARCH_FORMATION_CATEGORIES.FREE) {
    return {
      active: false,
      method: MARCH_DOCTRINE_CHECK_METHODS.GROUP_CHARISMA_AVERAGE,
      state: MARCH_DOCTRINE_STATES.STABLE,
      dc: 0,
      trigger: normalizeDoctrineTrigger(trigger),
      triggerLabel: getMarchDoctrineTriggerLabel(trigger),
      averageModifier: 0,
      participantCount: 0,
      participantRows: [],
      summary: "Free formation bypasses doctrine checks."
    };
  }

  const participants = Array.isArray(actorRows)
    ? actorRows
      .map((row) => ({
        actorId: String(row?.actorId ?? "").trim(),
        name: String(row?.name ?? "Unknown").trim() || "Unknown",
        charismaModifier: Number(row?.charismaModifier ?? 0) || 0,
        rankId: String(row?.rankId ?? "").trim()
      }))
      .filter((row) => row.actorId)
    : [];
  const participantCount = participants.length;
  const totalModifier = participants.reduce((sum, row) => sum + row.charismaModifier, 0);
  const averageModifier = participantCount > 0 ? Math.round(totalModifier / participantCount) : 0;
  const normalizedTrigger = normalizeDoctrineTrigger(trigger);
  const dc = definition.doctrineDc
    + Number(TRIGGER_DC_ADJUSTMENTS[normalizedTrigger] ?? 0)
    + (normalizeDoctrineState(doctrineState) === MARCH_DOCTRINE_STATES.STRAINED ? 1 : 0);

  let nextState = normalizeDoctrineState(doctrineState);
  if (participantCount <= 0) {
    nextState = MARCH_DOCTRINE_STATES.BROKEN;
  } else if (Number.isFinite(Number(rollTotal))) {
    const total = Number(rollTotal);
    if (total >= dc) nextState = MARCH_DOCTRINE_STATES.STABLE;
    else if (total >= dc - 4) nextState = MARCH_DOCTRINE_STATES.STRAINED;
    else nextState = MARCH_DOCTRINE_STATES.BROKEN;
  }

  return {
    active: true,
    method: MARCH_DOCTRINE_CHECK_METHODS.GROUP_CHARISMA_AVERAGE,
    methodLabel: "Group Charisma (average modifier)",
    trigger: normalizedTrigger,
    triggerLabel: getMarchDoctrineTriggerLabel(normalizedTrigger),
    dc,
    baseDc: definition.doctrineDc,
    averageModifier,
    participantCount,
    participantRows: participants,
    rollFormula: `1d20 ${averageModifier >= 0 ? "+" : "-"} ${Math.abs(averageModifier)}`,
    rollTotal: Number.isFinite(Number(rollTotal)) ? Number(rollTotal) : null,
    state: nextState,
    stateLabel: buildStateLabel(nextState),
    summary: participantCount <= 0
      ? "No assigned actors were available for a group Charisma doctrine check."
      : `1d20 ${averageModifier >= 0 ? "+" : "-"} ${Math.abs(averageModifier)} vs DC ${dc}.`
  };
}
