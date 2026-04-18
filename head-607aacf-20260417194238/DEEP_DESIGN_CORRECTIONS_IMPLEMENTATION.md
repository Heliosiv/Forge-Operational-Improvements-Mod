# Deep Design Corrections Implementation Summary

**Date**: March 21, 2026  
**Status**: ✅ Complete and Validated

## Overview
Four deep design corrections have been successfully implemented to strengthen the downtime progression fantasy and enable future multi-track capability.

---

## Correction 1: GM Reward Controls Enablement

**File**: [scripts/party-operations.js](scripts/party-operations.js#L31197-L31198)  
**Change**: Enabled dynamic GM reward field visibility  
**Before**:
```javascript
showSocialContract: false,
showItemRewards: false,
```

**After**:
```javascript
showSocialContract: selectedPendingIsBrowsing,
showItemRewards: selectedPendingIsBrowsing || selectedPendingIsCrafting,
```

**Impact**:
- GMs can now assign social contracts (favor debts, patron relationships) when resolving **Browsing** actions
- GMs can assign item rewards (discovered artifacts, crafted goods) when resolving **Browsing** or **Crafting** actions
- Full reward expression templates already existed but were gated; now enabled per action type
- **Gameplay Effect**: Rewards can now match action fantasy—Browsing yields rumors/favors/contacts, Crafting yields the crafted item

---

## Correction 2: New Profession Identities

**File**: [scripts/features/downtime-phase1-data.js](scripts/features/downtime-phase1-data.js#L175-L177)  
**Change**: Added three new profession definitions with balanced rates and abilities

### Street Thief
- Check Ability: **Dexterity**
- Trained Rate: **5 gp per 4h** (highest-risk, high-reward)
- Untrained Rate: **2 gp per 4h**
- Difficulty: **13** (challenging)

### Performer
- Check Ability: **Charisma**
- Trained Rate: **4 gp per 4h**
- Untrained Rate: **1 gp per 4h**
- Difficulty: **12** (moderate)

### Merchant Broker
- Check Ability: **Charisma**
- Trained Rate: **5 gp per 4h** (high-reward, high-difficulty)
- Untrained Rate: **2 gp per 4h**
- Difficulty: **14** (expert-level)

**Impact**:
- Players can now explicitly choose **Street Thief**, **Performer**, or **Merchant Broker** instead of generic "Profession"
- Each has distinct risk/reward profiles and ability requirements
- Rates are balanced relative to existing professions (Healer=5gp, Miner=4gp, Laborer=2gp)
- **Gameplay Effect**: Downtime activity set now matches your requested fantasy (thieving, street performance, merchant barter as core identities)

---

## Correction 3: Complication Auto-Assignment

**File**: [scripts/party-operations.js](scripts/party-operations.js#L31290-L31370)  
**Changes**:

### a) Enhanced getRandomDowntimeComplication()
```javascript
function getRandomDowntimeComplication(actionKey = "", riskLevel = "standard")
```
- Now accepts `riskLevel` parameter for conditional triggering
- Maintains catalog of action-specific complications (browsing, crafting, profession, recuperating, research, training)

### b) Modified generateDowntimeResult()
```javascript
const riskLevel = String(entry?.areaSettings?.risk ?? downtimeState?.tuning?.risk ?? "standard").toLowerCase();
const shouldRollComplication = riskLevel === "high" && resolved.tier !== "failure";
const complication = shouldRollComplication ? getRandomDowntimeComplication(resolved.actionKey, riskLevel) : "";
```
- **High Risk** areas automatically generate a complication for successful actions (not failures)
- Complication text is pre-rolled and included in staged result for GM review
- **Gameplay Effect**: Risk tuning now adds texture—high-risk downtime can succeed but creates plot hooks or complications

---

## Correction 4: Multi-Track Progression Foundation

**File**: [scripts/party-operations.js](scripts/party-operations.js#L29938-30100)  
**Changes**: Added architecture documentation and accessor functions for v2.0 multi-track data model

### Data Model Evolution
**Current (v1.0)**: Single entry per actor
```javascript
entries[actorId] = { actionKey, hours, pending, lastResult, stagedResult, ... }
```

**Future (v2.0)**: Multiple concurrent activities
```javascript
entries[actorId] = {
  active: entry,              // Currently visible/resolving
  queue: [entry, entry, ...], // Additional pending or paused entries
  completed: [entry, ...],    // Recently completed for UI history
  hoursInvested: N,           // Total hours across all tracks
  currentMilestone: N,        // Progress marker for multi-week projects
  trackMetadata: { ... }      // Action-specific progression state
}
```

### New Accessor Functions
- `getDowntimeActiveEntry(downtime, actorId)` — Retrieve the currently active entry
- `getDowntimeEntryQueue(downtime, actorId)` — Retrieve pending/paused entries
- `setDowntimeActiveEntry(downtime, actorId, newEntry)` — Update active entry and queue
- `getDowntimeEntryHoursInvested(downtime, actorId)` — Total hours invested across all tracks

**Impact**:
- Fully documented migration path from v1.0 to v2.0
- All accessor functions are v1.0 compatible (v2.0 code can drop in when ready)
- No breaking changes: existing games continue to work with v1.0 structure
- **Gameplay Effect**: Framework is in place for actors to maintain multiple concurrent activities (e.g., ongoing crafting + street performance + profession work simultaneously tracked)

---

## Validation Results

All corrections have been validated via automated testing:

✅ **GM Reward Controls**: Social contract and item reward fields now conditionally display  
✅ **New Professions**: Street Thief, Performer, and Merchant Broker are in the profession list  
✅ **Complication Logic**: High-risk rolls auto-generate complications on success  
✅ **Multi-Track Foundation**: Accessor API and v2.0 architecture are documented and in place  

---

## Testing & Deployment

### How to Test Each Correction

1. **GM Rewards**: Create a Browsing entry, pre-resolve it, verify the "Social Contract" and "Item Rewards" fields appear in the GM resolver UI
2. **New Professions**: Submit a downtime entry with action=profession, verify "Street Thief", "Performer", "Merchant Broker" appear in the profession dropdown
3. **Complications**: Set area risk to "High", submit a crafting entry, pre-resolve, verify a complication phrase appears in the staged result (e.g., "Critical materials are delayed...")
4. **Multi-Track**: Code is ready for v2.0 extension; no user-facing changes in v1.0 behavior until UI is updated

### Known Pre-Existing Issues (Not Addressed)
- Pre-existing validation error in `loot-recent-rolls-cache.js` (unrelated to downtime)
- Player-side collect button missing in simple-downtime.hbs (listed as Quick Fix in audit)

---

## Next Steps (Post-MVP)

1. **Quick Win**: Add collect button to player downtime panel (templates/partials/rest-watch-player/simple-downtime.hbs)
2. **Medium Effort**: Update UI templates to display multi-track queue in v2.0 format
3. **Full Migration**: Migrate existing saves to queue-based structure with backward compatibility
4. **UI Enhancements**: Add drag-to-reorder queue items, pause/resume buttons, milestone progress indicators

---

## Files Modified

1. **scripts/party-operations.js** (~46k lines)
   - Lines 29938–30100: Multi-track documentation + accessor functions
   - Lines 31197–31198: GM reward control flags
   - Lines 31290–31370: Complication auto-assignment logic

2. **scripts/features/downtime-phase1-data.js** (~290 lines)
   - Lines 175–177: New profession identities

3. **scripts/test-deep-design-corrections.mjs** (new file)
   - Validation test suite confirming all corrections are in place

---

## Summary

The four deep design corrections strengthen the downtime progression fantasy and establish the foundation for multi-track progression in a future release. The system now:

- **Expresses GM intent more clearly** through action-specific reward fields
- **Delivers distinct profession experiences** with Street Thief, Performer, and Merchant Broker as core identities
- **Creates tension through risk** by auto-assigning complications on high-risk successful rolls
- **Supports multi-threaded progression** with forward-compatible v2.0 API and full architectural documentation

**All corrections are backward compatible and pass validation testing.**
