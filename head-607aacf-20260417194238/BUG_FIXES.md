# Party Operations - Bug Fixes And Current Build Notes

## Build Status

- Released build line: `2.2.4-test.6`
- Release date: March 9, 2026
- Compatibility: Foundry VTT `12` through `13`
- Breaking changes in this build line: none expected

## Included In The Current Build Line

These fixes are already part of the current `2.2.x` build line:

- Reputation refresh and trade rollback fixes.
- GM merchant showcase visibility fixes.
- Gather flow and GM merchant visibility fixes.
- SOP note sync fixes.
- Built item import fixes.

## 2.2.4-test.6 Highlights

The current released build expanded the module around the unified Operations and GM workflows:

- GM Audio workspace support for scanning, previewing, hiding, restoring, and mixing shared audio tracks.
- Environment page updates and GM quick-action coverage.
- Rest Watch and Loot template refinements for the current layout pass.
- Player handler updates tied to the current operations flow.

These changes are included in `2.2.4-test.6`.

### 1. Audio filter options now use the active catalog

The filter option builder now receives the current scanned catalog instead of relying on a default lookup. This keeps tag counts and filter choices aligned with the catalog the GM is actively viewing.

### 2. Tag chip filters were added to the GM Audio library and mix browser

The Audio workspace now supports multi-select tag filters in both places where GMs browse tracks:

- Library view
- Mix track browser

This makes it much faster to isolate tracks for a specific scene style or content type.

### 3. Search is now more forgiving

Audio search now checks:

- Track name
- Tags
- Category
- Subcategory

The matching logic is more tolerant than a plain exact substring search, so short partial terms and fuzzy tag-oriented searches behave better.

### 4. Mix suggestions now respect the same filters as the library

The mix track browser now applies the current audio filters to:

- Suggested tracks
- All tracks

That means the queue-building view stays consistent with the library curation view instead of showing an unrelated result set.

### 5. Clearing or changing filters resets mix browser paging

Filter changes now reset the browser page state. This avoids empty-looking result pages after changing the search or toggling tags while viewing paginated mix candidates.

## Testing Focus For This Build

- Scan a fresh audio library and confirm tag chips reflect the scanned catalog.
- Filter by search, kind, usage, and one or more tag chips.
- Clear filters and confirm the full result set returns.
- Open the Mix Table and verify the same filters affect both `Suggested` and `All Tracks`.
- Bulk-add visible tracks from the filtered browser.
- Hide and restore tracks without corrupting the visible counts.

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for planned work beyond the current build line.
