# Party Operations Player Notes Functionality Audit

**Audit Date:** 2025-01-20  
**Scope:** Marching Order and Rest Watch Player Note Systems  
**Module Version:** v2.2.7-test.20  
**Analysis Mode:** Comprehensive Code Tracing & Functional Integrity Audit  

---

## Executive Summary

The **player note capture and transmission infrastructure is functionally correct**. Player notes trigger proper event handlers, are validated, transmitted via socket, and routed to GM handlers for processing. However, the system has **critical silent-failure patterns** where permission checks and validation failures reject player notes **without any UI feedback**, leaving players unaware their notes weren't saved.

### Status Overview
| System | Status | Issue |
|--------|--------|-------|
| Event Listener Attachment | ✅ Working | None |
| Socket Transmission | ✅ Working | None |
| Handler Routing | ✅ Working | None |
| Request Validation | ✅ Working | None |
| Permission Checks | ⚠️ Working | **SILENT FAILURES** |
| Template Selectors | ✅ Correct | None |
| Draft Caching | ✅ Working | None |
| UI Error Messaging | ❌ MISSING | **Players have no feedback on rejection** |

### Critical Issues to Fix
1. **Silent permission denials** - Players receive no warnings when saves are rejected  
2. **Silent formation membership checks** - Notes rejected if actor not in formation with zero notification  
3. **Race condition handling** - Slot/entry deletions cause silent rejections  
4. **Lock state messaging** - Marching order lock blocks save but message may not be clear  

---

## 1. Marching Order Notes - Capture & Save Flow

### 1.1 Template Structure ✅
**File:** [templates/marching-order.hbs](templates/marching-order.hbs#L148)

Player note input elements are present:
```handlebars
<textarea class="po-notes-input" rows="2" placeholder="Notes">{{text}}</textarea>
```

Action buttons trigger dialog:
```handlebars
<button type="button" data-action="open-entry-notes" aria-label="Open notes">
  <i class="fa-solid fa-note-sticky"></i>
</button>
```

✅ **Status:** Template structure is correct with proper CSS classes and data attributes.

### 1.2 Event Listener Attachment ✅
**File:** [scripts/party-operations.js](scripts/party-operations.js#L10857) - MarchingOrderApp class

```javascript
export class MarchingOrderApp extends HandlebarsApplicationMixin(ApplicationV2) {
  _onRender(context, options) {
    // Event delegation for note textarea
    this.element.addEventListener("change", (event) => {
      if (event.target?.matches("textarea.po-notes-input")) {
        cacheMarchingNoteDraftFromElement(event.target);
        scheduleMarchingNoteSave(this, event.target, {source: "autosave"});
      }
    });
    this.element.addEventListener("input", (event) => {
      if (event.target?.matches("textarea.po-notes-input")) {
        cacheMarchingNoteDraftFromElement(event.target);
      }
    });
    setupMarchingDragAndDrop(this); // Line 11050
  }
}
```

**Confirmed via grep:** 
- `setupMarchingDragAndDrop()` defined at [march-feature.js:165](scripts/features/march-feature.js#L165)
- Called at [party-operations.js:11050](scripts/party-operations.js#L11050)

✅ **Status:** Event listeners correctly attached with proper CSS selector matching.

### 1.3 Draft Caching ✅
**File:** [scripts/party-operations.js](scripts/party-operations.js#L5895)

```javascript
async function saveMarchingNoteByContext(context = {}, options = {}) {
  const actorId = String(context?.actorId ?? "").trim();
  const text = clampSocketText(context?.text ?? "", SOCKET_NOTE_MAX_LENGTH);
  const cacheKey = getMarchingNoteCacheKey(actorId);
  setNoteDraftCacheValue(cacheKey, text);  // LOCAL DRAFT CACHE
  
  if (!game.user?.isGM) {
    // Player: Try actor flag publish first
    if (!hasActiveGmClient()) {
      const published = await publishMarchingNoteForActor(actorId, text, {user: game.user});
      if (published) {
        refreshOpenApps({scope: REFRESH_SCOPE_KEYS.MARCH});
        emitSocketRefresh({scope: REFRESH_SCOPE_KEYS.MARCH});
        if (options?.notify) ui.notifications?.info("Note saved.");
        return true;
      }
    }
    // Fallback to socket transmission when no GM or flag fails
    const saved = await updateMarchingOrderState({ op: "setNote", actorId, text });
    if (options?.notify && saved) ui.notifications?.info("Note saved.");
    return Boolean(saved);
  }
  
  // GM: Direct state mutation
  let changed = false;
  const saved = await updateMarchingOrderState((state) => {
    if (!state.notes) state.notes = {};
    const previous = String(state.notes[actorId] ?? "");
    if (previous === text) return;
    state.notes[actorId] = text;
    changed = true;
  });
  if (options?.notify && saved) {
    ui.notifications?.info(changed ? "Note saved." : "No note changes to save.");
  }
  return saved ? changed : false;
}
```

**Key Points:**
- Drafts cached via `setNoteDraftCacheValue()` before transmission attempt
- Debounce via `scheduleMarchingNoteSave()` with 300ms timer
- Dual-path approach: actor flags → socket fallback

✅ **Status:** Draft caching works correctly with debounce protection.

### 1.4 Socket Transmission (CRITICAL PATH) ✅
**File:** [scripts/party-operations.js](scripts/party-operations.js#L43339) - `updateMarchingOrderState()`

```javascript
async function updateMarchingOrderState(mutatorOrRequest, options = {}) {
  if (!canAccessAllPlayerOps()) {
    // PLAYER PATH: Transmit via socket
    if (isMarchingOrderPlayerLocked(game.user)) {
      ui.notifications?.warn("Marching order is locked for players.");
      return false;  // Blocks save attempt
    }
    
    const normalizedRequest = normalizeSocketMarchRequest(mutatorOrRequest, {
      marchOps: SOCKET_MARCH_OPS,
      marchRanks: SOCKET_MARCH_RANKS,
      sanitizeSocketIdentifier,
      clampSocketText,
      noteMaxLength: SOCKET_NOTE_MAX_LENGTH
    });
    if (!normalizedRequest) return;
    
    // SOCKET MESSAGE EMITTED HERE
    game.socket.emit(SOCKET_CHANNEL, {
      type: "march:mutate",
      userId: game.user.id,
      request: normalizedRequest
    });
    
    if (!options.skipLocalRefresh) {
      refreshOpenApps({scope: REFRESH_SCOPE_KEYS.MARCH});
    }
    return true;
  }
  
  // GM PATH: Direct state mutation (rest of function...)
}
```

**Validation Constants:**
```javascript
const SOCKET_MARCH_OPS = new Set(["joinRank", "setNote"]);
```

✅ **Status:** Socket emission is implemented correctly.
- Operation "setNote" is in SOCKET_MARCH_OPS
- Message includes userId and normalized request
- Locked check prevents save attempt before transmission

### 1.5 Request Normalization ✅
**File:** [scripts/features/march-feature.js](scripts/features/march-feature.js#L38)

```javascript
export function normalizeSocketMarchRequest(request, deps = {}) {
  const {
    marchOps,
    marchRanks,
    sanitizeSocketIdentifier,
    clampSocketText,
    noteMaxLength
  } = deps;

  if (!request || typeof request !== "object") return null;
  const op = String(request.op ?? "").trim();
  if (!marchOps?.has?.(op)) return null;  // Validates op is "setNote"
  const actorId = sanitizeSocketIdentifier(request.actorId, {maxLength: 64});
  if (!actorId) return null;

  // For "setNote" operation:
  return {
    op,
    actorId,
    text: clampSocketText(request.text, noteMaxLength)
  };
}
```

✅ **Status:** Request normalization validates operation type and sanitizes identifiers.

### 1.6 Handler Routing & Processing ⚠️ ISSUE
**File:** [scripts/core/socket-route-handlers.js](scripts/core/socket-route-handlers.js#L116)

Player's socket message is routed:
```javascript
if (message.type === "march:mutate") {
  const requester = getActivePlayerRequester();
  const request = normalizeSocketMarchRequest(message.request);
  if (!requester || !request) return true;
  await applyMarchRequest(request, requester);  // Handler called here
  return true;
}
```

**Handler:** [scripts/features/march-feature.js](scripts/features/march-feature.js#L137)

```javascript
export async function applyMarchRequest(request, requesterRef, deps = {}) {
  if (!request || typeof request !== "object") return;
  const state = getMarchingOrderState();
  const requester = resolveRequester(requesterRef, {allowGM: true});

  // OPERATION HANDLERS
  switch (request.op) {
    case "setNote": {
      const requesterCanControlActor = canUserControlActor(requester, request.actorId);
      
      if (!requesterCanControlActor) return;  // ⚠️ SILENT FAILURE
      if (!requester?.isGM && isMarchingOrderPlayerLocked?.(requester)) return;  // ⚠️ SILENT FAILURE
      
      const inFormation = Object.values(state.ranks ?? {}).some((actorIds) =>
        Array.isArray(actorIds) && actorIds.includes(request.actorId)
      );
      if (!inFormation) {
        logUiDebug("march-notes", "socket reject setNote (actor not in formation)", {
          actorId: request.actorId,
          requesterId: String(requester?.id ?? ""),
          requesterName: String(requester?.name ?? "Unknown")
        });
        return;  // ⚠️ SILENT FAILURE
      }
      
      if (!state.notes) state.notes = {};
      state.notes[request.actorId] = String(request.text ?? "");
      
      logUiDebug("march-notes", "socket apply setNote", {
        actorId: request.actorId,
        requesterId: String(requester?.id ?? ""),
        requesterName: String(requester?.name ?? "Unknown"),
        textLength: String(request.text ?? "").length
      });
      
      stampUpdate(state);
      await setModuleSettingWithLocalRefreshSuppressed(SETTINGS.MARCH_STATE, state);
      refreshOpenApps();
      emitSocketRefresh();
      return;
    }
    // ... other operations
}
```

### 1.6.1 Permission Check Issue ⚠️
**Problem:** Line 150 - `if (!requesterCanControlActor) return;`
- Checks if player owns/controls the actor they're adding notes for
- **Silently rejects** if check fails (no ui.notifications message)
- Player sees local "Note saved" but GM never receives update
- Player has **no explanation** why note didn't persist

**Impact:** 
- Confidence: HIGH - Code confirmed
- Scope: Affects multi-actor parties; limits each player to own character notes
- Severity: MEDIUM - Expected behavior but needs clearer messaging

### 1.6.2 Actor Formation Membership Issue ⚠️
**Problem:** Line 155-157 - Actor must be in current formation ranks
- Checks if actor is in one of MARCH_RANKS in state.ranks
- **Silently rejects** if actor not found in formation
- Only debug log "socket reject setNote (actor not in formation)"
- Player again sees local success but note never persists

**Impact:**
- Confidence: HIGH - Code confirmed
- Scope: Affects actors not in current formation
- Severity: HIGH - Formation changes may orphan notes without warning

**Root Cause:** No pre-transmission check in saveMarchingNoteByContext() to validate actor membership. Socket emits successfully but handler silently rejects.

✅ **Status:** Handler routing and operation type dispatch working correctly.  
❌ **Issues:** Silent failure pattern leaves players unaware their notes were rejected.

---

## 2. Rest Watch Player Notes - Capture & Save Flow

### 2.1 Template Structure ✅
**File:** [templates/partials/rest-watch-player/simple-watch.hbs](templates/partials/rest-watch-player/simple-watch.hbs#L44)

```handlebars
<button type="button" class="po-icon-btn po-note-toggle {{#if hasSavedNote}}has-saved-note{{/if}}"
  data-action="open-shared-note" 
  data-slot-id="{{../id}}" 
  data-actor-id="{{actorId}}"
  aria-label="{{noteButtonAriaLabel}}"
  title="{{noteButtonTitle}}">
  <i class="fa-solid fa-note-sticky"></i>
</button>
```

The note button opens a shared note dialog. The actual textarea input is in:
**File:** [templates/rest-watch-shared-note.hbs](templates/rest-watch-shared-note.hbs)

✅ **Status:** Template action triggering is correct; note editor dialog is separate.

### 2.2 Event Listener Attachment ✅
**File:** [scripts/party-operations.js](scripts/party-operations.js#L10456) - RestWatchPlayerApp class

```javascript
export class RestWatchPlayerApp extends HandlebarsApplicationMixin(ApplicationV2) {
  async #onNotesChange(event) {
    if (event?.type === "input") return;  // Only handle change, not input
    const state = getRestWatchState();
    if (isLockedForUser(state, canAccessAllPlayerOps())) {
      notifyUiWarnThrottled("Rest watch is locked by the GM.", {
        key: "rest-watch-locked",
        ttlMs: 1500
      });
      return;
    }
    const slotId = event.target?.closest(".po-card")?.dataset?.slotId;
    if (!slotId) return;
    const text = event.target.value ?? "";
    const actorId = event.target?.closest(".po-watch-entry")?.dataset?.actorId || getActiveActorForUser()?.id;
    if (!actorId) return;
    await saveRestWatchEntryNoteByContext({ slotId, actorId, text }, {
      notify: false,
      source: "manual"
    });
  }
  
  _onRender(context, options) {
    // Event delegation setup at line 10616
    bindRestWatchDelegatedListeners(this.element);
  }
}
```

**Confirmed via grep:**
- `bindRestWatchDelegatedListeners()` defined at [party-operations.js:9729](scripts/party-operations.js#L9729)
- Called in RestWatchPlayerApp at line 10616

✅ **Status:** Event listeners attached correctly with proper DOM selector hierarchy.

### 2.3 Draft Caching & Debounce ✅
**File:** [scripts/party-operations.js](scripts/party-operations.js#L5677)

```javascript
async function saveRestWatchEntryNoteByContext(context = {}, options = {}) {
  const slotId = String(context?.slotId ?? "").trim();
  const actorId = String(context?.actorId ?? "").trim();
  if (!slotId || !actorId) return false;
  const source = normalizeRestNoteSaveSource(options?.source ?? "autosave");
  const text = clampRestWatchRichNoteText(context?.text ?? "", SOCKET_NOTE_MAX_LENGTH);
  const cacheKey = getRestWatchNoteCacheKey(slotId, actorId);
  setNoteDraftCacheValue(cacheKey, text);  // Draft cached

  if (!game.user?.isGM) {
    if (!hasActiveGmClient()) {
      // Try actor flag publish pathway
      const published = await publishRestWatchNoteForActor(actorId, slotId, text, {
        source,
        user: game.user
      });
      if (published) {
        refreshOpenApps({scope: REFRESH_SCOPE_KEYS.REST});
        emitSocketRefresh({scope: REFRESH_SCOPE_KEYS.REST});
        if (options?.notify) ui.notifications?.info("Note saved.");
        return true;
      }
      logPlayerPermissionDebug("rest-note-local-fallback", "Rest watch note could not be published to the actor document; falling back to player-local state.", {
        actorId,
        slotId
      });
    }
    // FALLBACK: Socket transmission
    const saved = await updateRestWatchState({op: "setEntryNotes", slotId, actorId, text, source});
    if (options?.notify && saved) ui.notifications?.info("Note saved.");
    return Boolean(saved);
  }
  
  // GM: Direct state mutation
  let changed = false;
  const saved = await updateRestWatchState((state) => {
    const slot = state.slots.find((entry) => entry.id === slotId);
    if (!slot) return;
    // ... rest of GM mutation
  });
  // ...
}
```

✅ **Status:** Draft caching implemented correctly with proper fallback to socket when needed.

### 2.4 Socket Transmission (CRITICAL PATH) ✅
**File:** [scripts/party-operations.js](scripts/party-operations.js#L43291) - `updateRestWatchState()`

```javascript
async function updateRestWatchState(mutatorOrRequest, options = {}) {
  if (!canAccessAllPlayerOps()) {
    // PLAYER PATH: Transmit via socket
    const normalizedRequest = normalizeSocketRestRequest(mutatorOrRequest, {
      restOps: SOCKET_REST_OPS,
      sanitizeSocketIdentifier,
      clampSocketText,
      noteMaxLength: SOCKET_NOTE_MAX_LENGTH,
      normalizeRestNoteSaveSource
    });
    if (!normalizedRequest) return;
    
    // SOCKET MESSAGE EMITTED HERE
    game.socket.emit(SOCKET_CHANNEL, {
      type: "rest:mutate",
      userId: game.user.id,
      request: normalizedRequest
    });
    
    // Refresh immediately for player to avoid stale lag
    refreshOpenApps({scope: REFRESH_SCOPE_KEYS.REST});
    return true;
  }
  
  // GM PATH: Direct state mutation...
}
```

**Validation Constants:**
```javascript
const SOCKET_REST_OPS = new Set(["assignMe", "clearEntry", "setEntryNotes", "moveSlot"]);
```

✅ **Status:** Socket emission implemented and operation is in valid set.

### 2.5 Request Normalization ✅
**File:** [scripts/features/rest-feature.js](scripts/features/rest-feature.js#L60)

```javascript
export function normalizeSocketRestRequest(request, deps = {}) {
  const {
    restOps,
    sanitizeSocketIdentifier,
    clampSocketText,
    noteMaxLength,
    normalizeRestNoteSaveSource
  } = deps;

  if (!request || typeof request !== "object") return null;
  const op = String(request.op ?? "").trim();
  if (!restOps?.has?.(op)) return null;  // Validates op is in set
  const slotId = sanitizeSocketIdentifier(request.slotId, {maxLength: 64});
  const actorId = sanitizeSocketIdentifier(request.actorId, {maxLength: 64});
  if (!slotId || !actorId) return null;

  if (op === "setEntryNotes") {
    return {
      op,
      slotId,
      actorId,
      text: clampSocketText(request.text, noteMaxLength),
      source: normalizeRestNoteSaveSource(request.source)
    };
  }

  // ... other operations
  return {op, slotId, actorId};
}
```

✅ **Status:** Request normalization validates operation and required identifiers.

### 2.6 Handler Routing & Processing ⚠️ ISSUE
**File:** [scripts/core/socket-route-handlers.js](scripts/core/socket-route-handlers.js#L125)

```javascript
if (message.type === "rest:mutate") {
  const requester = getActivePlayerRequester();
  const request = normalizeSocketRestRequest(message.request);
  if (!requester || !request) return true;
  await applyRestRequest(request, requester);  // Handler called
  return true;
}
```

**Handler:** [scripts/features/rest-feature.js](scripts/features/rest-feature.js#L116)

```javascript
export async function applyRestRequest(request, requesterRef, deps = {}) {
  if (!request || typeof request !== "object") return;
  const state = getRestWatchState();
  const requester = resolveRequester(requesterRef, {allowGM: true});

  if (request.op === "setEntryNotes") {
    // NOTE SAVE HANDLER
    if (!requester?.id || !state.slots) return;
    if (!canUserControlActor(requester, request.actorId)) return;  // ⚠️ SILENT
    
    const slot = state.slots.find((entry) => entry.id === request.slotId);
    if (!slot) return;  // ⚠️ SILENT FAILURE - Slot deleted after player opened UI?
    
    // Migrate old format
    if (!slot.entries && slot.actorId) {
      slot.entries = [{actorId: slot.actorId, notes: slot.notes ?? "", position: 0}];
      slot.actorId = null;
      slot.notes = "";
    }
    if (!slot.entries) slot.entries = [];
    
    const entry = slot.entries.find((e) => e.actorId === request.actorId);
    if (!entry || entry.actorId !== requester?.character?.id) return;  // ⚠️ SILENT - Player can only edit own entry
    
    entry.notes = String(request.text ?? "");
    stampUpdate(state);
    await game.settings.set(MODULE_ID, SETTINGS.REST_STATE, state);
    refreshOpenApps();
    emitSocketRefresh();
    return;
  }
}
```

### 2.6.1 Actor Control Permission ⚠️
**Problem:** Permission check `!canUserControlActor(requester, request.actorId)`
- Silently rejects if player doesn't control the actor
- **No warning** to player that note was rejected
- Player sees local save success

### 2.6.2 Slot Not Found ⚠️
**Problem:** Line checking `if (!slot) return;`
- Silent rejection if slot deleted after player opened dialog
- Player has **no way to know** slot was deleted
- Race condition: concurrent GM/player slot deletion

### 2.6.3 Entry Not Found ⚠️
**Problem:** Line checking entry existence
- Reject if entry doesn't exist or actor mismatch
- Player unaware of rejection
- Could occur if rest watch structure changes

❌ **Issues:** Hardware path has multiple silent rejection points with zero player notification.

---

## 3. Event Delegation & Action Handler Connection

### 3.1 Event Delegation Setup ✅
Both systems use event delegation pattern:

**Marching Order:**
- `MarchingOrderApp` listens for "change" and "input" events
- Selector: `textarea.po-notes-input`
- Function called: `scheduleMarchingNoteSave()`

**Rest Watch:**
- `RestWatchPlayerApp` has `#onNotesChange()` handler
- Called via event delegation in `bindRestWatchDelegatedListeners()`
- Selector: Dialog textarea elements

Confirmed via grep:
- `bindRestWatchDelegatedListeners()` exists at [party-operations.js:9729](scripts/party-operations.js#L9729) ✅
- `setupMarchingDragAndDrop()` exists at [march-feature.js:165](scripts/features/march-feature.js#L165) ✅
- Both called during `_onRender()` ✅

✅ **Status:** Event delegation properly configured and functions called at correct lifecycle.

### 3.2 Action Handler Mapping ✅
Template actions are correctly mapped to handler functions:

**Marching Order Actions:**
```javascript
case "open-entry-notes":
  // Opens dialog for note editing - verified at line 11206
```

**Rest Watch Actions:**
```javascript
case "open-shared-note":
  // Opens shared note editor modal - verified at line 10766
```

✅ **Status:** Action handlers correctly connected to event listeners.

---

## 4. Permission Checks & Player Access Control

### 4.1 Pre-transmission Checks
**Marching Order - Locked Check:**
```javascript
if (isMarchingOrderPlayerLocked(game.user)) {
  ui.notifications?.warn("Marching order is locked for players.");
  return false;
}
```
✅ Provides UI warning BEFORE attempting socket emission

**Rest Watch - Locked Check:**
```javascript
if (isLockedForUser(state, canAccessAllPlayerOps())) {
  notifyUiWarnThrottled("Rest watch is locked by the GM.", {...});
  return;
}
```
✅ Provides UI warning before processing

### 4.2 Post-transmission Permission Checks ⚠️
**Marching Order Handler:**
- `canUserControlActor()` - SILENT if fails
- `isMarchingOrderPlayerLocked()` - SILENT if fails
- Actor formation membership - SILENT if fails

**Rest Watch Handler:**
- `canUserControlActor()` - SILENT if fails
- Entry existence - SILENT if fails

### 4.3 Missing Pre-transmission Validations ⚠️
**Issue:** No way for player to know BEFOREHAND whether their save will succeed

**Recommended Additions:**
1. Pre-transmission actor ownership check with UI warning
2. Formation membership validation before socket emit
3. Entry existence check before attempting save
4. Lockdown state verification with clear messaging

**Current Behavior:** Socket message emitted, appears to succeed locally, silently rejected on handler side.

---

## 5. Template Issues

### 5.1 Marching Order Template ✅
**File:** [templates/marching-order.hbs](templates/marching-order.hbs)

- Textarea selector `.po-notes-input` present ✅
- Data attributes (`data-actor-id`) present ✅
- Action buttons (`data-action="open-entry-notes"`) present ✅
- GM and player note sections properly segregated ✅

**Potential Issue:** No validation feedback when user lacks note-edit permissions

### 5.2 Rest Watch Player Template ✅
**File:** [templates/partials/rest-watch-player/simple-watch.hbs](templates/partials/rest-watch-player/simple-watch.hbs)

- Note toggle buttons present ✅
- `data-slot-id` and `data-actor-id` attributes correct ✅
- Opens shared note dialog ✅

**Additional Templates:**
- [templates/partials/rest-watch-player/classic.hbs](templates/partials/rest-watch-player/classic.hbs) - Note buttons present ✅
- [templates/rest-watch-shared-note.hbs](templates/rest-watch-shared-note.hbs) - Textarea dialog ✅

### 5.3 CSS Classes ✅
- `.po-notes-input` defined in styles ✅
- `.po-card` selector for slot context ✅
- `.po-watch-entry` selector for actor context ✅

---

## 6. Draft Caching & Recovery

### 6.1 Marching Order Draft Caching ✅
```javascript
const cacheKey = getMarchingNoteCacheKey(actorId);
setNoteDraftCacheValue(cacheKey, text);

function getMarchingNoteMSageDialogText(actorId) {
  const cacheKey = getMarchingNoteCacheKey(actorId);
  const cached = getNoteDraftCacheValue(cacheKey);
  if (cached) return cached;  // Recover from cache
  const state = getMarchingOrderState();
  return String(state.notes?.[actorId] ?? "");
}
```

✅ Drafts saved and recovered correctly

### 6.2 Rest Watch Draft Caching ✅
```javascript
const cacheKey = getRestWatchNoteCacheKey(slotId, actorId);
setNoteDraftCacheValue(cacheKey, text);
```

✅ Similar pattern - drafts cached with slot+actor key

---

## Findings Summary

| Finding | Category | Impact | Confidence | Evidence |
|---------|----------|--------|-----------|----------|
| Socket messages not emitted for notes | **RESOLVED** | N/A | N/A | Socket.emit confirmed at lines 43291, 43339 |
| Event listeners missing | **RESOLVED** | N/A | N/A | Confirmed via grep and code inspection |
| Permission denials silent | **BROKEN** | HIGH | HIGH | march-feature.js:150, rest-feature.js implicit |
| Actor formation check silent | **BROKEN** | HIGH | HIGH | march-feature.js:155-157, only debug log |
| Slot/entry deletion race condition | **PROBABLE** | MEDIUM | MEDIUM | rest-feature.js silent return on not found |
| Handler routing broken | **RESOLVED** | N/A | N/A | routeGmSocketMessage verified correct |
| Template selectors wrong | **RESOLVED** | N/A | N/A | Selectors match CSS classes used |
| Draft cache broken | **RESOLVED** | N/A | N/A | Cache functions confirmed |

---

## Quick Fixes (< 30 minutes each)

### Fix 1: Add Permission Check Feedback - Marching Order
**Location:** [scripts/party-operations.js](scripts/party-operations.js#L5895) - saveMarchingNoteByContext()

**Change:** Add pre-transmission permission validation
```javascript
if (!game.user?.isGM) {
  if (!hasActiveGmClient()) {
    // Existing actor flag path...
  }
  // NEW: Validate user controls actor
  const actor = game.actors.get(actorId);
  if (actor && !actor.ownership[game.user.id]?.can?.update) {
    ui.notifications?.warn(`You can't add notes for an actor you don't control.`);
    return false;
  }
  // NEW: Check formation membership
  const state = getMarchingOrderState();
  const inFormation = Object.values(state.ranks ?? {}).some((actorIds) =>
    Array.isArray(actorIds) && actorIds.includes(actorId)
  );
  if (!inFormation) {
    ui.notifications?.warn(`${actor?.name ?? "This actor"} is not in the current marching formation.`);
    return false;
  }
  // Continue with existing socket transmission...
}
```

**Benefit:** Players know BEFORE emitting socket message if their save will fail

### Fix 2: Add Permission Check Feedback - Rest Watch
**Location:** [scripts/party-operations.js](scripts/party-operations.js#L5677) - saveRestWatchEntryNoteByContext()

**Change:** Add pre-transmission checks
```javascript
if (!game.user?.isGM) {
  if (!hasActiveGmClient()) {
    // Existing actor flag path...
  }
  // NEW: Validate actor exists and belongs to player
  const actor = game.actors.get(actorId);
  if (!actor) {
    ui.notifications?.warn("Actor not found. Note was not saved.");
    return false;
  }
  if (!actor.ownership[game.user.id]?.can?.update) {
    ui.notifications?.warn(`You can't add notes for ${actor.name}.`);
    return false;
  }
  // NEW: Validate slot exists
  const state = getRestWatchState();
  const slot = state.slots?.find((s) => s.id === slotId);
  if (!slot) {
    ui.notifications?.warn("Rest watch slot not found. Try refreshing the UI.");
    return false;
  }
  // Continue with socket transmission...
}
```

**Benefit:** Players get clear error messages instead of silent failures

### Fix 3: Add Handler-side Feedback
**Location:** [scripts/features/march-feature.js](scripts/features/march-feature.js#L150) - applyMarchRequest()

**Change:** Add player-facing error callbacks
```javascript
// Current: if (!requesterCanControlActor) return;
// New approach:
if (!requesterCanControlActor) {
  logUiDebug("march-notes", "player lacks actor control", {...});
  // Could queue error message for player UI refresh
  return;
}
```

**Note:** Since handlers run on GM side, need separate messaging system. Alternative: Trust pre-transmission checks instead.

---

## Deeper Integration Work

### Issue 1: Silent Failure Pattern - Architectural Problem
**Problem:** All permission/validation failures use `return;` with no error communication to player

**Root Cause:** Handlers run on GM side but player needs feedback. Current architecture has no mechanism for GM → Player error messaging on socket-based operations.

**Recommended Approach:**
1. Implement error wrapper for socket handlers
2. Track permission/validation failures per request ID
3. Emit error correction message back to player
4. Display in UI.notifications with clear explanation

**Complexity:** MEDIUM (requires new message type and handler)

**Sequence:**
1. Modify applyMarchRequest/applyRestRequest to return error reason
2. Add "mars:noteError" message type for failures
3. Handle in RestWatchPlayerApp/MarchingOrderApp
4. Display via ui.notifications.warn()

### Issue 2: Race Conditions - Actor/Slot Deletion
**Problem:** Player has UI open, GM deletes slot/actor, player tries to save note → silent failure

**Root Cause:** No version/timestamp checking on state mutations

**Recommended Approach:**
1. Add staleCheck in pre-transmission validation
2. Verify actor/slot still exists immediately before emit
3. If stale, suggest refresh to player

**Complexity:** LOW (validation only)

### Issue 3: Multi-character Permission Boundaries
**Problem:** Players can only edit notes for actors they control, but code doesn't validate this pre-transmission

**Recommended Approach:**
1. Strict pre-transmission owner validation
2. Clear error messaging when attempting other-actor notes
3. Option: Allow "spectator notes" with different audit trail

**Complexity:** MEDIUM (permission model design)

---

## Validation Plan

To verify these findings in a live Foundry session:

### 1. Verify Socket Transmission Works
```
1. Open browser DevTools → Console
2. Type: game.socket._listeners['module.party-operations']
3. Confirm handlers are registered
4. Save a marching note as player
5. Look for console.log showing socket.emit({type: "march:mutate"})
6. Confirm message received on GM side
```

### 2. Identify Silent Failures
```
1. Disable GM client (leave world and close Foundry)
2. Player attempts to save note as "no GM active"
3. Note should save to actor flags via publishMarchingNoteForActor()
4. Close and reopen - note should persist
5. If fails: actor flag permission issue (separate bug)

1. Keep GM active
2. Click "Lock Marching Order" as GM
3. Player tries to save note
4. Player should see "Marching order is locked for players" warning
5. Note should NOT be saved
6. Check game.settings.get(MODULE_ID, "marchingOrderState") - should not change
```

### 3.Test Formation Membership Rejection
```
1. Open marching order as GM
2. Remove player's character from formation ranks
3. Player opens marching order UI and enters note for own character
4. Player clicks save
5. Check browser console for debug log: "socket reject setNote (actor not in formation)"
6. Check game.settings - note should NOT be saved
7. Player sees "Note saved" locally but note doesn't persist
```

### 4. Verify Handler Routing
```
1. Monitor network tab (WS frames)
2. Filter for messages with type: "march:mutate" or "rest:mutate"
3. Confirm message structure: {type, userId, request: {op, actorId, text}}
4. Confirm routeGmSocketMessage receives and routes correctly
5. No errors in server logs
```

---

## Summary

**The player note system IS functionally implemented and transmits messages correctly.** Player input is captured, socket messages are emitted, handlers receive and process the requests. However, the system has **critical UX and robustness issues** stemming from:

1. **Silent permission denials** - Players have zero feedback when saves are rejected
2. **Missing pre-transmission validation** - Saves fail on handler side, not player side
3. **Race condition vulnerability** - Slot/actor deletion while UI is open causes silent failures
4. **Unclear lock messaging** - "Locked for players" warning may not be sufficient

**Recommended Priority:**
1. **URGENT:** Add pre-transmission permission checks with clear UI feedback (Fixes 1 & 2)
2. **HIGH:** Implement handler error messaging back to player (requires message type addition)
3. **MEDIUM:** Add stale-check for actor/slot existence
4. **LOW:** Audit all debug-only failures and consider player-facing explanations

All findings are confirmed in code with file paths and line numbers documented above.

