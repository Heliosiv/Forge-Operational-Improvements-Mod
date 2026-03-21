#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import json
import shutil
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_MANIFEST = Path("packs") / "party-operations-loot-manifest.db"
DEFAULT_REPORT = Path("reports") / "loot-manifest-audit.json"
DEFAULT_DUPLICATES_CSV = Path("reports") / "loot-manifest-duplicates.csv"


@dataclass(frozen=True)
class ManifestRow:
    line_number: int
    item: dict[str, Any]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit Party Operations loot manifest JSON-lines data.")
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST, help="Path to manifest .db JSON-lines file.")
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT, help="Path to output report JSON file.")
    parser.add_argument(
        "--duplicates-csv",
        type=Path,
        default=DEFAULT_DUPLICATES_CSV,
        help="Path to duplicate review CSV output (used when --dedupe is enabled).",
    )
    parser.add_argument("--write", action="store_true", help="Write deduped output back to manifest.")
    parser.add_argument("--dedupe", action="store_true", help="Enable duplicate candidate detection and removal plan.")
    parser.add_argument("--no-backup", action="store_true", help="Skip creating a backup file before writing.")
    return parser.parse_args()


def normalize_text(value: Any) -> str:
    return str(value or "").strip().lower()


def safe_get(mapping: dict[str, Any], *path: str) -> Any:
    current: Any = mapping
    for key in path:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


def load_manifest(path: Path) -> tuple[list[ManifestRow], list[dict[str, Any]]]:
    rows: list[ManifestRow] = []
    parse_errors: list[dict[str, Any]] = []
    text = path.read_text(encoding="utf-8")
    for index, raw_line in enumerate(text.splitlines(), start=1):
        line = raw_line.strip()
        if not line:
            continue
        try:
            value = json.loads(line)
            if not isinstance(value, dict):
                raise ValueError("line is valid JSON but not an object")
            rows.append(ManifestRow(line_number=index, item=value))
        except Exception as exc:
            parse_errors.append({"line": index, "error": str(exc)})
    return rows, parse_errors


def quality_score(item: dict[str, Any]) -> int:
    score = 0
    if normalize_text(item.get("_id")):
        score += 15
    if normalize_text(item.get("name")):
        score += 10
    if normalize_text(item.get("type")):
        score += 8

    identifier = normalize_text(safe_get(item, "system", "identifier"))
    if identifier:
        score += 25

    description_value = str(safe_get(item, "system", "description", "value") or "")
    if description_value.strip():
        score += min(25, len(description_value.strip()) // 30)

    if normalize_text(item.get("img")):
        score += 5

    flags = item.get("flags")
    if isinstance(flags, dict) and flags:
        score += 6

    return score


def choose_keep(rows: list[ManifestRow]) -> ManifestRow:
    return sorted(rows, key=lambda row: (-quality_score(row.item), row.line_number))[0]


def build_duplicate_groups(rows: list[ManifestRow]) -> dict[str, list[list[ManifestRow]]]:
    by_id: dict[str, list[ManifestRow]] = defaultdict(list)
    by_identifier: dict[str, list[ManifestRow]] = defaultdict(list)
    by_name_type: dict[str, list[ManifestRow]] = defaultdict(list)

    for row in rows:
        item = row.item
        item_id = normalize_text(item.get("_id"))
        if item_id:
            by_id[item_id].append(row)

        identifier = normalize_text(safe_get(item, "system", "identifier"))
        if identifier:
            by_identifier[identifier].append(row)

        name = normalize_text(item.get("name"))
        item_type = normalize_text(item.get("type"))
        if name and item_type:
            by_name_type[f"{name}::{item_type}"].append(row)

    groups = {
        "id": [group for group in by_id.values() if len(group) > 1],
        "identifier": [group for group in by_identifier.values() if len(group) > 1],
        "nameType": [group for group in by_name_type.values() if len(group) > 1],
    }
    return groups


def dedupe_by_priority(rows: list[ManifestRow], groups: dict[str, list[list[ManifestRow]]]) -> tuple[list[ManifestRow], list[dict[str, Any]]]:
    drop_lines: set[int] = set()
    planned: list[dict[str, Any]] = []

    for category, category_groups in groups.items():
        for group in category_groups:
            active_group = [row for row in group if row.line_number not in drop_lines]
            if len(active_group) <= 1:
                continue
            keep = choose_keep(active_group)
            removed = [row for row in active_group if row.line_number != keep.line_number]
            for row in removed:
                drop_lines.add(row.line_number)
            planned.append(
                {
                    "category": category,
                    "key": {
                        "id": normalize_text(keep.item.get("_id")),
                        "identifier": normalize_text(safe_get(keep.item, "system", "identifier")),
                        "name": str(keep.item.get("name") or ""),
                        "type": str(keep.item.get("type") or ""),
                    },
                    "keep": {
                        "line": keep.line_number,
                        "score": quality_score(keep.item),
                        "id": keep.item.get("_id"),
                        "name": keep.item.get("name"),
                    },
                    "drop": [
                        {
                            "line": row.line_number,
                            "score": quality_score(row.item),
                            "id": row.item.get("_id"),
                            "name": row.item.get("name"),
                        }
                        for row in removed
                    ],
                }
            )

    kept_rows = [row for row in rows if row.line_number not in drop_lines]
    return kept_rows, planned


def write_manifest(path: Path, rows: list[ManifestRow], create_backup: bool) -> Path | None:
    backup_path: Path | None = None
    if create_backup:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        backup_path = path.with_suffix(path.suffix + f".bak-{timestamp}")
        shutil.copy2(path, backup_path)

    output = "\n".join(json.dumps(row.item, ensure_ascii=False, separators=(",", ":")) for row in rows)
    path.write_text(f"{output}\n", encoding="utf-8")
    return backup_path


def summarize(rows: list[ManifestRow], parse_errors: list[dict[str, Any]]) -> dict[str, Any]:
    type_counter = Counter(normalize_text(row.item.get("type")) or "(missing)" for row in rows)
    missing_id = sum(1 for row in rows if not normalize_text(row.item.get("_id")))
    missing_name = sum(1 for row in rows if not normalize_text(row.item.get("name")))
    missing_type = sum(1 for row in rows if not normalize_text(row.item.get("type")))
    missing_identifier = sum(1 for row in rows if not normalize_text(safe_get(row.item, "system", "identifier")))

    return {
        "rows": len(rows),
        "parseErrors": len(parse_errors),
        "missing": {
            "_id": missing_id,
            "name": missing_name,
            "type": missing_type,
            "system.identifier": missing_identifier,
        },
        "types": dict(sorted(type_counter.items(), key=lambda item: item[0])),
    }


def write_duplicates_csv(path: Path, dedupe_plan: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(
            [
                "category",
                "key_id",
                "key_identifier",
                "key_name",
                "key_type",
                "decision",
                "line",
                "score",
                "id",
                "name",
            ]
        )

        for action in dedupe_plan:
            key = action.get("key") or {}
            keep = action.get("keep") or {}
            drops = action.get("drop") or []
            writer.writerow(
                [
                    action.get("category", ""),
                    key.get("id", ""),
                    key.get("identifier", ""),
                    key.get("name", ""),
                    key.get("type", ""),
                    "keep",
                    keep.get("line", ""),
                    keep.get("score", ""),
                    keep.get("id", ""),
                    keep.get("name", ""),
                ]
            )
            for drop in drops:
                writer.writerow(
                    [
                        action.get("category", ""),
                        key.get("id", ""),
                        key.get("identifier", ""),
                        key.get("name", ""),
                        key.get("type", ""),
                        "drop",
                        drop.get("line", ""),
                        drop.get("score", ""),
                        drop.get("id", ""),
                        drop.get("name", ""),
                    ]
                )


def main() -> int:
    args = parse_args()
    manifest_path = args.manifest.resolve()
    report_path = args.report.resolve()
    duplicates_csv_path = args.duplicates_csv.resolve()

    if not manifest_path.exists():
        print(f"Manifest not found: {manifest_path}", file=sys.stderr)
        return 1

    rows, parse_errors = load_manifest(manifest_path)
    duplicate_groups = build_duplicate_groups(rows)
    dedupe_preview = {
        "id": len(duplicate_groups["id"]),
        "identifier": len(duplicate_groups["identifier"]),
        "nameType": len(duplicate_groups["nameType"]),
    }

    next_rows = rows
    dedupe_plan: list[dict[str, Any]] = []
    backup_path: Path | None = None
    wrote_manifest = False

    if args.dedupe:
        next_rows, dedupe_plan = dedupe_by_priority(rows, duplicate_groups)
        write_duplicates_csv(duplicates_csv_path, dedupe_plan)
        if args.write:
            backup_path = write_manifest(manifest_path, next_rows, create_backup=not args.no_backup)
            wrote_manifest = True

    summary = summarize(rows, parse_errors)
    result = {
        "manifest": str(manifest_path),
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "summary": summary,
        "duplicates": dedupe_preview,
        "dedupe": {
            "enabled": bool(args.dedupe),
            "write": bool(args.write and args.dedupe),
            "duplicatesCsv": str(duplicates_csv_path) if args.dedupe else "",
            "inputRows": len(rows),
            "outputRows": len(next_rows),
            "removedRows": max(0, len(rows) - len(next_rows)),
            "plannedActions": dedupe_plan,
            "backup": str(backup_path) if backup_path else "",
        },
        "parseErrors": parse_errors,
    }

    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"MANIFEST={manifest_path}")
    print(f"REPORT={report_path}")
    print(f"ROWS={len(rows)}")
    print(f"PARSE_ERRORS={len(parse_errors)}")
    print(f"DUPLICATE_GROUPS_ID={dedupe_preview['id']}")
    print(f"DUPLICATE_GROUPS_IDENTIFIER={dedupe_preview['identifier']}")
    print(f"DUPLICATE_GROUPS_NAMETYPE={dedupe_preview['nameType']}")
    if args.dedupe:
        print(f"DUPLICATES_CSV={duplicates_csv_path}")
        print(f"DEDUPE_OUTPUT_ROWS={len(next_rows)}")
        print(f"DEDUPE_REMOVED_ROWS={max(0, len(rows) - len(next_rows))}")
        print(f"DEDUPE_WRITE={str(wrote_manifest).lower()}")
        if backup_path:
            print(f"BACKUP={backup_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
