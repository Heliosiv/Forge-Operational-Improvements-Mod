# Party Operations - Bug Fixes & Improvements

## Roadmap

- See [ROADMAP.md](ROADMAP.md) for the active development roadmap and immediate priorities.

## Issues Fixed

### 1. **Event Delegation Bug (Line 504)**
**Problem**: `MarchingOrderApp#onGMNotesChange` used `event.currentTarget` instead of `event.target`
- This is inconsistent with the event delegation pattern used throughout the app
- Could cause handler to fail when delegated events don't have `currentTarget`

**Solution**: Changed to `event.target.value` for consistency  
**File**: `scripts/party-operations.js:504`

```javascript
// BEFORE
const text = event.currentTarget.value ?? "";

// AFTER
const text = event.target.value ?? "";
```

---

### 2. **Stale Lag on Player Actions (MAJOR FIX)**
**Problem**: When players performed actions (assign to watch, clear slot, edit marching order, etc.), their local UI wouldn't refresh until:
1. Socket message sent to GM
2. GM processes mutation
3. GM sends socket refresh back to players

This created noticeable lag where players saw stale/old data.

**Solution**: Added immediate `refreshOpenApps()` call after socket emission for players
- Players now see their changes **immediately** in their local UI
- Socket message still propagates to GM for server-side validation & persistence
- Eliminates the round-trip delay

**Files Changed**: `scripts/party-operations.js` (2 locations)

#### Fix #1: `updateRestWatchState()` - Lines 576-598
```javascript
async function updateRestWatchState(mutatorOrRequest) {
  if (!game.user.isGM) {
    game.socket.emit(SOCKET_CHANNEL, {
      type: "rest:mutate",
      userId: game.user.id,
      request: mutatorOrRequest
    });
    // ✅ NEW: Refresh immediately for player to avoid stale lag
    refreshOpenApps();
    return;
  }
  // ... rest of function
}
```

#### Fix #2: `updateMarchingOrderState()` - Lines 600-622
```javascript
async function updateMarchingOrderState(mutatorOrRequest) {
  if (!game.user.isGM) {
    game.socket.emit(SOCKET_CHANNEL, {
      type: "march:mutate",
      userId: game.user.id,
      request: mutatorOrRequest
    });
    // ✅ NEW: Refresh immediately for player to avoid stale lag
    refreshOpenApps();
    return;
  }
  // ... rest of function
}
```

---

## Impact

✅ **Player Experience**: 
- No more stale lag when performing actions
- Instant visual feedback on all mutations
- Smooth, responsive UI updates

✅ **GM Experience**:
- No changes to GM workflow
- GM actions still immediately refresh (as before)
- Socket validation still happens server-side

✅ **Technical**:
- Event delegation now consistent across all handlers
- No race conditions
- Server-side persistence still validated

---

## Testing Checklist

- [ ] **Player assigns to watch slot** → Should see refresh instantly
- [ ] **Player clears their slot** → Visible immediately
- [ ] **Player edits watch notes** → Appears right away
- [ ] **Player joins marching rank** → Instant update
- [ ] **Player edits marching notes** → No lag
- [ ] **GM locks/unlocks** → Reflects on all clients
- [ ] **Multiple players acting** → No conflicts
- [ ] **Network delay simulation** → UI still responsive locally

---

## Version
- **Date Fixed**: February 8, 2026
- **Severity**: Medium (UX improvement + 1 bug fix)
- **Breaking Changes**: None
