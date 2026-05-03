export const DOWNTIME_V2_SCHEMA_VERSION = 2;

export const DOWNTIME_V2_CARD_TYPES = Object.freeze([
  "learn",
  "craft",
  "work",
  "research",
  "social",
  "recovery",
  "custom"
]);

const DOWNTIME_V2_TYPE_LABELS = Object.freeze({
  learn: "Learn",
  craft: "Craft",
  work: "Work",
  research: "Research",
  social: "Social",
  recovery: "Recovery",
  custom: "Custom"
});

const DOWNTIME_V2_ABILITIES = new Set(["str", "dex", "con", "int", "wis", "cha"]);

export const DOWNTIME_V2_DEFAULT_CARDS = Object.freeze([
  {
    id: "learn-skill",
    type: "learn",
    title: "Learn A Skill",
    prompt: "Study with a mentor, drill fundamentals, or practice a new proficiency.",
    ability: "int",
    dc: 12,
    progressTarget: 8,
    costGp: 0,
    rewardText: "Training progress",
    completionName: "Completed Training"
  },
  {
    id: "craft-project",
    type: "craft",
    title: "Craft A Project",
    prompt: "Advance a crafted item, repair, alchemical batch, or practical tool.",
    ability: "int",
    dc: 13,
    progressTarget: 10,
    costGp: 2,
    rewardText: "Project progress",
    completionName: "Completed Craft"
  },
  {
    id: "paid-work",
    type: "work",
    title: "Paid Work",
    prompt: "Earn coin through useful labor, performance, professional work, or odd jobs.",
    ability: "cha",
    dc: 11,
    progressTarget: 0,
    costGp: 0,
    rewardText: "Coin and local reputation",
    completionName: ""
  },
  {
    id: "research-lead",
    type: "research",
    title: "Research A Lead",
    prompt: "Search archives, interview contacts, compare maps, or investigate a question.",
    ability: "int",
    dc: 12,
    progressTarget: 0,
    costGp: 0,
    rewardText: "Clues, leads, or useful answers",
    completionName: ""
  },
  {
    id: "social-contact",
    type: "social",
    title: "Build A Contact",
    prompt: "Spend time with a faction, guild, neighborhood, patron, or underworld circle.",
    ability: "cha",
    dc: 12,
    progressTarget: 0,
    costGp: 1,
    rewardText: "A contact, favor, or social opening",
    completionName: ""
  },
  {
    id: "recovery-care",
    type: "recovery",
    title: "Recovery And Care",
    prompt: "Rest, seek treatment, tend wounds, recover from strain, or stabilize a condition.",
    ability: "wis",
    dc: 10,
    progressTarget: 0,
    costGp: 0,
    rewardText: "Recovery progress or condition relief",
    completionName: ""
  },
  {
    id: "custom-gm-card",
    type: "custom",
    title: "Custom GM Action",
    prompt: "A custom downtime opportunity written for the current situation.",
    ability: "int",
    dc: 12,
    progressTarget: 0,
    costGp: 0,
    rewardText: "GM-defined result",
    completionName: ""
  }
]);

function clone(value) {
  if (value === undefined) return undefined;
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

function clampInt(value, min = 0, max = Number.MAX_SAFE_INTEGER, fallback = min) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(numeric)));
}

function normalizeId(value, fallback = "") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function normalizeList(values = [], max = 100) {
  const source = Array.isArray(values) ? values : [];
  const seen = new Set();
  const result = [];
  for (const value of source) {
    const normalized = String(value ?? "").trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
    if (result.length >= max) break;
  }
  return result;
}

export function normalizeDowntimeV2CardType(value, fallback = "custom") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return DOWNTIME_V2_CARD_TYPES.includes(normalized) ? normalized : fallback;
}

export function getDowntimeV2CardTypeLabel(type) {
  const normalized = normalizeDowntimeV2CardType(type);
  return DOWNTIME_V2_TYPE_LABELS[normalized] ?? "Custom";
}

export function normalizeDowntimeV2Ability(value, fallback = "int") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 3);
  return DOWNTIME_V2_ABILITIES.has(normalized) ? normalized : fallback;
}

export function normalizeDowntimeV2Card(raw = {}, index = 0) {
  const source = raw && typeof raw === "object" ? raw : {};
  const type = normalizeDowntimeV2CardType(source.type, "custom");
  const fallbackId = normalizeId(`${type}-${source.title ?? index + 1}`, `card-${index + 1}`);
  const id = normalizeId(source.id, fallbackId);
  const title = String(source.title ?? getDowntimeV2CardTypeLabel(type)).trim() || getDowntimeV2CardTypeLabel(type);
  return {
    id,
    type,
    typeLabel: getDowntimeV2CardTypeLabel(type),
    title,
    prompt: String(source.prompt ?? "").trim(),
    ability: normalizeDowntimeV2Ability(source.ability, type === "craft" || type === "research" ? "int" : "cha"),
    dc: clampInt(source.dc, 5, 30, 12),
    progressTarget: clampInt(source.progressTarget, 0, 999, type === "learn" ? 8 : type === "craft" ? 10 : 0),
    costGp: clampInt(source.costGp, 0, 999, 0),
    rewardText: String(source.rewardText ?? "").trim(),
    completionName: String(source.completionName ?? "").trim(),
    createsProject: source.createsProject === true || type === "learn" || type === "craft",
    archived: source.archived === true
  };
}

export function buildDefaultDowntimeV2Cards() {
  return DOWNTIME_V2_DEFAULT_CARDS.map((card, index) => normalizeDowntimeV2Card(card, index));
}

function normalizeDowntimeV2CardLibrary(rawCards = []) {
  const source = Array.isArray(rawCards) && rawCards.length > 0 ? rawCards : buildDefaultDowntimeV2Cards();
  const cards = [];
  const seen = new Set();
  for (const rawCard of source) {
    const card = normalizeDowntimeV2Card(rawCard, cards.length);
    if (!card.id || seen.has(card.id)) continue;
    seen.add(card.id);
    cards.push(card);
  }
  return cards.length > 0 ? cards : buildDefaultDowntimeV2Cards();
}

export function buildDefaultDowntimeV2State(now = 0) {
  const cardLibrary = buildDefaultDowntimeV2Cards();
  return {
    schemaVersion: DOWNTIME_V2_SCHEMA_VERSION,
    migratedAt: now,
    legacyArchive: null,
    cardLibrary,
    activeSession: {
      id: "",
      title: "Downtime Session",
      hours: 4,
      status: "draft",
      rosterActorIds: [],
      availableCardIds: cardLibrary.map((card) => card.id),
      launchedAt: 0,
      launchedBy: "",
      launchedByUserId: ""
    },
    submissions: [],
    deliveredResults: []
  };
}

function looksLikeLegacyDowntimeState(raw = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  if (Number(raw.schemaVersion) !== DOWNTIME_V2_SCHEMA_VERSION) return true;
  return Boolean(raw.entries || raw.logs || raw.publishedAt || raw.publishedHoursGranted || raw.tuning);
}

export function normalizeDowntimeV2Session(raw = {}, cardLibrary = buildDefaultDowntimeV2Cards()) {
  const source = raw && typeof raw === "object" ? raw : {};
  const cardIds = new Set(cardLibrary.map((card) => card.id));
  const availableCardIds = normalizeList(source.availableCardIds).filter((id) => cardIds.has(id));
  const statusRaw = String(source.status ?? "draft")
    .trim()
    .toLowerCase();
  const status = statusRaw === "launched" || statusRaw === "closed" ? statusRaw : "draft";
  return {
    id: String(source.id ?? "").trim(),
    title: String(source.title ?? "Downtime Session").trim() || "Downtime Session",
    hours: clampInt(source.hours, 1, 24, 4),
    status,
    rosterActorIds: normalizeList(source.rosterActorIds),
    availableCardIds: availableCardIds.length > 0 ? availableCardIds : cardLibrary.map((card) => card.id),
    launchedAt: clampInt(source.launchedAt, 0, Number.MAX_SAFE_INTEGER, 0),
    launchedBy: String(source.launchedBy ?? "").trim(),
    launchedByUserId: String(source.launchedByUserId ?? "").trim()
  };
}

function normalizeDowntimeV2ResultDraft(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const tier = normalizeDowntimeV2Tier(source.tier);
  return {
    tier,
    tierLabel: getDowntimeV2TierLabel(tier),
    summary: String(source.summary ?? "").trim(),
    progress: clampInt(source.progress, 0, 999, 0),
    costGp: clampInt(source.costGp, 0, 999, 0),
    rewardText: String(source.rewardText ?? "").trim(),
    completionReady: source.completionReady === true,
    completionName: String(source.completionName ?? "").trim(),
    details: normalizeList(source.details, 12)
  };
}

export function normalizeDowntimeV2Submission(raw = {}, state = buildDefaultDowntimeV2State(), options = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const card = getDowntimeV2CardById(state, source.cardId);
  const now = clampInt(options.now, 0, Number.MAX_SAFE_INTEGER, 0);
  const id = String(source.id ?? options.id ?? "").trim();
  return {
    id,
    sessionId: String(source.sessionId ?? state.activeSession?.id ?? "").trim(),
    actorId: String(source.actorId ?? "").trim(),
    actorName: String(source.actorName ?? "").trim(),
    userId: String(source.userId ?? "").trim(),
    userName: String(source.userName ?? "").trim(),
    cardId: card?.id ?? String(source.cardId ?? "").trim(),
    cardType: card?.type ?? normalizeDowntimeV2CardType(source.cardType),
    cardTitle: card?.title ?? String(source.cardTitle ?? "Downtime Action").trim(),
    note: String(source.note ?? "")
      .trim()
      .slice(0, 1000),
    roll: {
      formula: String(source.roll?.formula ?? "1d20").trim() || "1d20",
      d20: clampInt(source.roll?.d20, 0, 20, 0),
      ability: normalizeDowntimeV2Ability(source.roll?.ability ?? card?.ability),
      abilityMod: clampInt(source.roll?.abilityMod, -20, 40, 0),
      proficiencyBonus: clampInt(source.roll?.proficiencyBonus, 0, 20, 0),
      total: clampInt(source.roll?.total, 0, 100, 0)
    },
    resultDraft: normalizeDowntimeV2ResultDraft(source.resultDraft),
    status:
      String(source.status ?? "pending")
        .trim()
        .toLowerCase() === "delivered"
        ? "delivered"
        : "pending",
    submittedAt: clampInt(source.submittedAt, 0, Number.MAX_SAFE_INTEGER, now),
    deliveredAt: clampInt(source.deliveredAt, 0, Number.MAX_SAFE_INTEGER, 0),
    deliveredBy: String(source.deliveredBy ?? "").trim(),
    acknowledgedAt: clampInt(source.acknowledgedAt, 0, Number.MAX_SAFE_INTEGER, 0),
    acknowledgedBy: String(source.acknowledgedBy ?? "").trim()
  };
}

export function normalizeDowntimeV2State(raw = {}, options = {}) {
  const now = clampInt(options.now, 0, Number.MAX_SAFE_INTEGER, 0);
  const defaults = buildDefaultDowntimeV2State(now);
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const legacy = looksLikeLegacyDowntimeState(source);
  const base = legacy ? defaults : { ...defaults, ...source };
  const cardLibrary = normalizeDowntimeV2CardLibrary(base.cardLibrary);
  const activeSession = normalizeDowntimeV2Session(base.activeSession, cardLibrary);
  const state = {
    schemaVersion: DOWNTIME_V2_SCHEMA_VERSION,
    migratedAt: clampInt(base.migratedAt, 0, Number.MAX_SAFE_INTEGER, now),
    legacyArchive: legacy
      ? {
          archivedAt: now,
          sourceSchemaVersion: Number(source.schemaVersion ?? 1) || 1,
          snapshot: clone(source)
        }
      : (base.legacyArchive ?? null),
    cardLibrary,
    activeSession,
    submissions: [],
    deliveredResults: []
  };
  state.submissions = (Array.isArray(base.submissions) ? base.submissions : [])
    .map((entry) => normalizeDowntimeV2Submission(entry, state))
    .filter((entry) => entry.id && entry.actorId && entry.cardId);
  state.deliveredResults = (Array.isArray(base.deliveredResults) ? base.deliveredResults : [])
    .map((entry) => normalizeDowntimeV2Submission({ ...entry, status: "delivered" }, state))
    .filter((entry) => entry.id && entry.actorId && entry.cardId)
    .slice(0, 100);
  return state;
}

export function getDowntimeV2CardById(state = {}, cardId = "") {
  const id = String(cardId ?? "").trim();
  if (!id) return null;
  return (Array.isArray(state.cardLibrary) ? state.cardLibrary : []).find((card) => card.id === id) ?? null;
}

export function getDowntimeV2AvailableCards(state = {}) {
  const session = normalizeDowntimeV2Session(state.activeSession, state.cardLibrary);
  const allowed = new Set(session.availableCardIds);
  return (Array.isArray(state.cardLibrary) ? state.cardLibrary : []).filter((card) => allowed.has(card.id));
}

export function isDowntimeV2SessionLaunched(state = {}) {
  return String(state?.activeSession?.status ?? "") === "launched" && Number(state?.activeSession?.launchedAt ?? 0) > 0;
}

export function normalizeDowntimeV2Tier(value = "success") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (["failure", "success", "strong-success", "exceptional-success"].includes(normalized)) return normalized;
  return "success";
}

export function getDowntimeV2TierFromMargin(margin = 0) {
  const safeMargin = Number.isFinite(Number(margin)) ? Number(margin) : 0;
  if (safeMargin >= 10) return "exceptional-success";
  if (safeMargin >= 5) return "strong-success";
  if (safeMargin >= 0) return "success";
  return "failure";
}

export function getDowntimeV2TierLabel(tier = "success") {
  const normalized = normalizeDowntimeV2Tier(tier);
  if (normalized === "exceptional-success") return "Exceptional Success";
  if (normalized === "strong-success") return "Strong Success";
  if (normalized === "success") return "Success";
  return "Failure";
}

function getProgressForTier(card, tier, hours = 1) {
  if (!card.createsProject && card.progressTarget <= 0) return 0;
  const base = Math.max(1, Math.ceil(clampInt(hours, 1, 24, 1) / 2));
  if (tier === "exceptional-success") return base + 3;
  if (tier === "strong-success") return base + 2;
  if (tier === "success") return base + 1;
  return Math.max(1, Math.floor(base / 2));
}

export function buildDowntimeV2ResultDraft(submission = {}, card = null, options = {}) {
  const normalizedCard = card ? normalizeDowntimeV2Card(card) : normalizeDowntimeV2Card({});
  const rollTotal = clampInt(submission?.roll?.total, 0, 100, 0);
  const tier = getDowntimeV2TierFromMargin(rollTotal - normalizedCard.dc);
  const progress = getProgressForTier(normalizedCard, tier, options.hours ?? 1);
  const completionReady = normalizedCard.progressTarget > 0 && progress >= normalizedCard.progressTarget;
  const rewardText =
    normalizedCard.rewardText ||
    (normalizedCard.createsProject
      ? "Progress recorded."
      : `${getDowntimeV2CardTypeLabel(normalizedCard.type)} result`);
  return {
    tier,
    tierLabel: getDowntimeV2TierLabel(tier),
    summary: `${normalizedCard.title} resolved as ${getDowntimeV2TierLabel(tier).toLowerCase()}.`,
    progress,
    costGp: normalizedCard.costGp,
    rewardText,
    completionReady,
    completionName: normalizedCard.completionName || normalizedCard.title,
    details: [
      `Roll ${rollTotal} vs DC ${normalizedCard.dc}.`,
      normalizedCard.createsProject
        ? `Project progress +${progress}${normalizedCard.progressTarget > 0 ? ` toward ${normalizedCard.progressTarget}` : ""}.`
        : rewardText
    ]
  };
}

export function applyDowntimeV2Submission(state = {}, rawSubmission = {}) {
  const next = normalizeDowntimeV2State(state);
  const id = String(rawSubmission?.id ?? "").trim();
  if (!id) return { state: next, submission: null, ok: false, message: "Submission id is required." };
  const normalized = normalizeDowntimeV2Submission(rawSubmission, next);
  if (!normalized.actorId) return { state: next, submission: null, ok: false, message: "Actor id is required." };
  if (!normalized.cardId) return { state: next, submission: null, ok: false, message: "Card id is required." };
  next.submissions = next.submissions.filter((entry) => entry.id !== normalized.id);
  next.submissions.unshift(normalized);
  return { state: next, submission: normalized, ok: true, message: "" };
}

export function deliverDowntimeV2Submission(state = {}, submissionId = "", options = {}) {
  const next = normalizeDowntimeV2State(state);
  const id = String(submissionId ?? "").trim();
  const index = next.submissions.findIndex((entry) => entry.id === id);
  if (index < 0) return { state: next, result: null, ok: false, message: "Submission not found." };
  const source = next.submissions[index];
  const result = normalizeDowntimeV2Submission(
    {
      ...source,
      resultDraft: {
        ...source.resultDraft,
        ...(options.resultDraft && typeof options.resultDraft === "object" ? options.resultDraft : {})
      },
      status: "delivered",
      deliveredAt: options.now ?? Date.now(),
      deliveredBy: options.deliveredBy ?? "GM"
    },
    next
  );
  next.submissions.splice(index, 1, result);
  next.deliveredResults = [result, ...next.deliveredResults.filter((entry) => entry.id !== result.id)].slice(0, 100);
  return { state: next, result, ok: true, message: "" };
}

export function acknowledgeDowntimeV2Result(state = {}, resultId = "", options = {}) {
  const next = normalizeDowntimeV2State(state);
  const id = String(resultId ?? "").trim();
  let acknowledged = null;
  const applyAck = (entry) => {
    if (entry.id !== id) return entry;
    acknowledged = {
      ...entry,
      acknowledgedAt: options.now ?? Date.now(),
      acknowledgedBy: String(options.acknowledgedBy ?? "").trim()
    };
    return acknowledged;
  };
  next.submissions = next.submissions.map(applyAck);
  next.deliveredResults = next.deliveredResults.map(applyAck);
  return {
    state: next,
    result: acknowledged,
    ok: Boolean(acknowledged),
    message: acknowledged ? "" : "Result not found."
  };
}

export function normalizeDowntimeV2ActorProjects(rawProjects = []) {
  const source = Array.isArray(rawProjects) ? rawProjects : [];
  return source
    .map((entry, index) => {
      const sourceEntry = entry && typeof entry === "object" ? entry : {};
      const type = normalizeDowntimeV2CardType(sourceEntry.type, "custom");
      const id = String(
        sourceEntry.id ?? normalizeId(`${type}-${sourceEntry.title ?? index + 1}`, `project-${index + 1}`)
      ).trim();
      if (!id) return null;
      const target = clampInt(sourceEntry.target, 0, 999, 0);
      const progress = clampInt(sourceEntry.progress, 0, 999, 0);
      const statusRaw = String(sourceEntry.status ?? "active")
        .trim()
        .toLowerCase();
      return {
        id,
        type,
        title: String(sourceEntry.title ?? getDowntimeV2CardTypeLabel(type)).trim() || getDowntimeV2CardTypeLabel(type),
        sourceCardId: String(sourceEntry.sourceCardId ?? "").trim(),
        progress,
        target,
        milestones: Array.isArray(sourceEntry.milestones) ? sourceEntry.milestones : [],
        status: statusRaw === "completed" ? "completed" : "active",
        completionItemId: String(sourceEntry.completionItemId ?? "").trim(),
        updatedAt: clampInt(sourceEntry.updatedAt, 0, Number.MAX_SAFE_INTEGER, 0)
      };
    })
    .filter(Boolean);
}

export function applyDowntimeV2ResultToActorProjects(rawProjects = [], result = {}, card = {}, options = {}) {
  const normalizedCard = normalizeDowntimeV2Card(card);
  const projects = normalizeDowntimeV2ActorProjects(rawProjects);
  if (!normalizedCard.createsProject && Number(result?.resultDraft?.progress ?? 0) <= 0) {
    return { projects, project: null, completed: false };
  }
  const progressGain = clampInt(result?.resultDraft?.progress, 0, 999, 0);
  const target = normalizedCard.progressTarget;
  const projectId = normalizeId(
    `${normalizedCard.type}-${normalizedCard.id}-${result.actorId}`,
    `${normalizedCard.id}-project`
  );
  const existingIndex = projects.findIndex((entry) => entry.id === projectId);
  const existing = existingIndex >= 0 ? projects[existingIndex] : null;
  const nextProgress = clampInt((existing?.progress ?? 0) + progressGain, 0, 999, progressGain);
  const completed = target > 0 && nextProgress >= target;
  const project = {
    id: projectId,
    type: normalizedCard.type,
    title: normalizedCard.completionName || normalizedCard.title,
    sourceCardId: normalizedCard.id,
    progress: nextProgress,
    target,
    milestones: existing?.milestones ?? [],
    status: completed ? "completed" : "active",
    completionItemId: String(options.completionItemId ?? existing?.completionItemId ?? "").trim(),
    updatedAt: options.now ?? Date.now()
  };
  if (existingIndex >= 0) projects[existingIndex] = project;
  else projects.push(project);
  return { projects, project, completed };
}
