from __future__ import annotations

import argparse
import json
import re
import shutil
import sqlite3
from collections import OrderedDict
from collections.abc import Iterable, Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROLLOUT_RE = re.compile(
    r"rollout-(\d{4})-(\d{2})-(\d{2})T.*-"
    r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$",
    re.IGNORECASE,
)


def default_codex_home() -> Path:
    return Path.home() / ".codex"


@dataclass
class Paths:
    codex_home: Path
    config_path: Path
    db_path: Path
    backup_dir: Path
    sessions_dir: Path
    archived_sessions_dir: Path
    deleted_dir: Path
    session_index_path: Path


@dataclass
class JsonlMeta:
    id: str
    path: Path
    provider: str | None
    model: str | None
    cwd: str | None
    source: str | None
    created_at_ms: int | None
    updated_at_ms: int | None
    title: str


def resolve_paths(codex_home: str | None) -> Paths:
    home = Path(codex_home).expanduser() if codex_home else default_codex_home()
    return Paths(
        codex_home=home,
        config_path=home / "config.toml",
        db_path=home / "state_5.sqlite",
        backup_dir=home / "history_sync_backups",
        sessions_dir=home / "sessions",
        archived_sessions_dir=home / "archived_sessions",
        deleted_dir=home / "history_sync_deleted",
        session_index_path=home / "session_index.jsonl",
    )


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def parse_current_provider(config_text: str) -> str:
    match = re.search(r"(?m)^\s*model_provider\s*=\s*['\"]([^'\"]+)['\"]", config_text)
    if not match:
        raise RuntimeError("Could not find model_provider in config.toml.")
    return match.group(1)


def parse_current_model(config_text: str) -> str | None:
    match = re.search(r"(?m)^\s*model\s*=\s*['\"]([^'\"]+)['\"]", config_text)
    return match.group(1) if match else None


@contextmanager
def connect_db(path: Path, readonly: bool = False) -> Iterator[sqlite3.Connection]:
    if readonly:
        conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True, timeout=30)
    else:
        conn = sqlite3.connect(str(path), timeout=30)
        conn.execute("PRAGMA busy_timeout = 30000")
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def get_thread_columns(conn: sqlite3.Connection) -> set[str]:
    return {str(row[1]) for row in conn.execute("PRAGMA table_info(threads)")}


def ensure_environment(paths: Paths) -> None:
    if not paths.config_path.exists():
        raise RuntimeError(f"Missing config file: {paths.config_path}")
    if not paths.db_path.exists():
        raise RuntimeError(f"Missing database file: {paths.db_path}")


def iso_to_ms(value: str | None) -> int | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return int(round(parsed.astimezone(timezone.utc).timestamp() * 1000))


def ms_to_iso(value: int | None) -> str | None:
    if value is None:
        return None
    return datetime.fromtimestamp(value / 1000, timezone.utc).isoformat(timespec="seconds")


def clean_text(value: str | None, limit: int = 120) -> str:
    if not value:
        return ""
    text = re.sub(r"\s+", " ", value).strip()
    if len(text) > limit:
        return text[: limit - 1].rstrip() + "…"
    return text


def extract_user_text(payload: dict[str, Any]) -> str:
    content = payload.get("content") or []
    parts: list[str] = []
    if isinstance(content, list):
        for item in content:
            if isinstance(item, dict) and isinstance(item.get("text"), str):
                parts.append(item["text"])
    elif isinstance(content, str):
        parts.append(content)
    return "\n".join(parts)


def is_real_user_message(text: str) -> bool:
    stripped = text.strip()
    return bool(stripped) and not stripped.startswith("<environment_context>")


def session_id_from_filename(path: Path) -> str | None:
    match = ROLLOUT_RE.match(path.name)
    return match.group(4) if match else None


def iter_jsonl_paths(paths: Paths) -> list[Path]:
    output: list[Path] = []
    if paths.sessions_dir.exists():
        output.extend(sorted(paths.sessions_dir.rglob("*.jsonl")))
    if paths.archived_sessions_dir.exists():
        output.extend(sorted(paths.archived_sessions_dir.rglob("*.jsonl")))
    return output


def parse_jsonl_meta(path: Path) -> JsonlMeta | None:
    first_meta: dict[str, Any] | None = None
    first_user = ""
    latest_ms: int | None = None
    try:
        with path.open("r", encoding="utf-8", errors="replace") as handle:
            for line in handle:
                if not line.strip():
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue

                ts_ms = iso_to_ms(obj.get("timestamp"))
                if ts_ms is not None:
                    latest_ms = ts_ms if latest_ms is None else max(latest_ms, ts_ms)

                payload = obj.get("payload") or {}
                if obj.get("type") == "session_meta" and isinstance(payload, dict) and first_meta is None:
                    first_meta = payload
                elif obj.get("type") == "response_item" and isinstance(payload, dict):
                    if payload.get("type") == "message" and payload.get("role") == "user":
                        text = extract_user_text(payload)
                        if not first_user and is_real_user_message(text):
                            first_user = text
                elif obj.get("type") == "event_msg" and isinstance(payload, dict):
                    if payload.get("type") == "user_message":
                        text = payload.get("message") or ""
                        if not first_user and is_real_user_message(text):
                            first_user = text
    except OSError:
        return None

    if first_meta is None:
        sid = session_id_from_filename(path)
        if not sid:
            return None
        first_meta = {"id": sid}

    sid = str(first_meta.get("id") or session_id_from_filename(path) or "")
    if not sid:
        return None

    created_ms = iso_to_ms(first_meta.get("timestamp"))
    if latest_ms is None:
        latest_ms = created_ms or int(round(path.stat().st_mtime * 1000))

    return JsonlMeta(
        id=sid,
        path=path,
        provider=first_meta.get("model_provider"),
        model=first_meta.get("model"),
        cwd=first_meta.get("cwd"),
        source=first_meta.get("source"),
        created_at_ms=created_ms,
        updated_at_ms=latest_ms,
        title=clean_text(first_user) or "新对话",
    )


def collect_jsonl_meta(paths: Paths) -> dict[str, list[JsonlMeta]]:
    by_id: dict[str, list[JsonlMeta]] = {}
    for path in iter_jsonl_paths(paths):
        meta = parse_jsonl_meta(path)
        if meta:
            by_id.setdefault(meta.id, []).append(meta)
    return by_id


def best_jsonl_meta(items: list[JsonlMeta] | None) -> JsonlMeta | None:
    if not items:
        return None

    def score(item: JsonlMeta) -> tuple[int, int, str]:
        in_sessions = 1 if "sessions" in item.path.parts and "archived_sessions" not in item.path.parts else 0
        return in_sessions, item.updated_at_ms or 0, str(item.path)

    return sorted(items, key=score, reverse=True)[0]


def query_provider_counts(conn: sqlite3.Connection) -> OrderedDict[str, int]:
    counts = OrderedDict()
    for provider, count in conn.execute(
        """
        SELECT model_provider, COUNT(*)
        FROM threads
        GROUP BY model_provider
        ORDER BY COUNT(*) DESC, model_provider ASC
        """
    ):
        counts[provider or "(empty)"] = count
    return counts


def query_model_counts(conn: sqlite3.Connection) -> OrderedDict[str, int]:
    counts = OrderedDict()
    for model, count in conn.execute(
        """
        SELECT model, COUNT(*)
        FROM threads
        GROUP BY model
        ORDER BY COUNT(*) DESC, model ASC
        """
    ):
        counts[model or "(empty)"] = count
    return counts


def query_provider_model_counts(conn: sqlite3.Connection) -> list[dict[str, object]]:
    rows = []
    for provider, model, count in conn.execute(
        """
        SELECT model_provider, model, COUNT(*)
        FROM threads
        GROUP BY model_provider, model
        ORDER BY COUNT(*) DESC, model_provider ASC, model ASC
        """
    ):
        rows.append({"provider": provider or "(empty)", "model": model or "(empty)", "count": count})
    return rows


def query_cwd_counts(conn: sqlite3.Connection, limit: int = 20) -> list[dict[str, object]]:
    rows = []
    for cwd, count in conn.execute(
        """
        SELECT cwd, COUNT(*)
        FROM threads
        GROUP BY cwd
        ORDER BY COUNT(*) DESC, cwd ASC
        LIMIT ?
        """,
        (limit,),
    ):
        rows.append({"cwd": cwd or "(empty)", "count": count})
    return rows


def count_mismatched(conn: sqlite3.Connection, column: str, expected: str | None) -> int:
    if not expected:
        return 0
    return int(
        conn.execute(
            f"SELECT COUNT(*) FROM threads WHERE {column} IS NULL OR {column} <> ?",
            (expected,),
        ).fetchone()[0]
    )


def count_sync_candidates(
    conn: sqlite3.Connection,
    *,
    current_provider: str,
    current_model: str | None,
    columns: set[str],
) -> int:
    where_parts = ["model_provider IS NULL OR model_provider <> ?"]
    params: list[str] = [current_provider]
    if "model" in columns and current_model:
        where_parts.append("model IS NULL OR model <> ?")
        params.append(current_model)
    where_sql = " OR ".join(f"({part})" for part in where_parts)
    return int(conn.execute(f"SELECT COUNT(*) FROM threads WHERE {where_sql}", params).fetchone()[0])


def list_backups(paths: Paths, limit: int = 20) -> list[dict[str, str]]:
    if not paths.backup_dir.exists():
        return []
    files = sorted(
        paths.backup_dir.glob("state_5.sqlite.*.bak"),
        key=lambda item: item.stat().st_mtime,
        reverse=True,
    )
    output = []
    for item in files[:limit]:
        output.append(
            {
                "name": item.name,
                "path": str(item),
                "modified_at": datetime.fromtimestamp(item.stat().st_mtime).isoformat(timespec="seconds"),
            }
        )
    return output


def row_value(row: sqlite3.Row | None, column: str, default: Any = None) -> Any:
    if row is None:
        return default
    try:
        return row[column]
    except (IndexError, KeyError):
        return default


def normalize_cwd(value: str | None) -> str:
    if not value:
        return ""
    prefix = "\\\\?\\"
    return value[len(prefix) :] if value.startswith(prefix) else value


def query_threads(paths: Paths, current_provider: str, current_model: str | None) -> list[dict[str, object]]:
    jsonl_by_id = collect_jsonl_meta(paths)
    rows_by_id: dict[str, sqlite3.Row] = {}
    columns: set[str] = set()
    with connect_db(paths.db_path, readonly=True) as conn:
        columns = get_thread_columns(conn)
        for row in conn.execute("SELECT * FROM threads"):
            rows_by_id[str(row["id"])] = row

    all_ids = set(rows_by_id) | set(jsonl_by_id)
    output: list[dict[str, object]] = []
    for sid in sorted(all_ids):
        row = rows_by_id.get(sid)
        meta = best_jsonl_meta(jsonl_by_id.get(sid))
        provider = row_value(row, "model_provider", None) or (meta.provider if meta else None) or ""
        model = row_value(row, "model", None) if "model" in columns else None
        model = model or (meta.model if meta else None) or ""
        title = clean_text(row_value(row, "title", None) or (meta.title if meta else None) or "新对话")
        updated_ms = row_value(row, "updated_at_ms", None)
        if updated_ms is None:
            updated_at = row_value(row, "updated_at", None)
            updated_ms = int(updated_at) * 1000 if updated_at else None
        updated_ms = int(updated_ms or (meta.updated_at_ms if meta else 0) or 0)
        cwd = normalize_cwd(row_value(row, "cwd", None) or (meta.cwd if meta else None))
        archived = int(row_value(row, "archived", 0) or 0)
        jsonl_provider = meta.provider if meta else None
        jsonl_model = meta.model if meta else None
        db_mismatch = provider != current_provider or bool(current_model and "model" in columns and model != current_model)
        jsonl_mismatch = bool(jsonl_provider and jsonl_provider != current_provider)
        if current_model and jsonl_model:
            jsonl_mismatch = jsonl_mismatch or jsonl_model != current_model
        output.append(
            {
                "id": sid,
                "title": title,
                "provider": provider,
                "model": model,
                "jsonl_provider": jsonl_provider or "",
                "jsonl_model": jsonl_model or "",
                "cwd": cwd,
                "archived": archived,
                "source": row_value(row, "source", None) or (meta.source if meta else "") or "",
                "updated_at_ms": updated_ms,
                "updated_at": ms_to_iso(updated_ms),
                "rollout_path": str(row_value(row, "rollout_path", None) or (meta.path if meta else "") or ""),
                "jsonl_count": len(jsonl_by_id.get(sid, [])),
                "exists_in_db": row is not None,
                "exists_in_jsonl": meta is not None,
                "sync_candidate": db_mismatch or jsonl_mismatch or archived != 0,
            }
        )
    output.sort(key=lambda item: (int(item["updated_at_ms"]), str(item["id"])), reverse=True)
    return output


def get_status(paths: Paths) -> dict[str, object]:
    ensure_environment(paths)
    config_text = read_text(paths.config_path)
    current_provider = parse_current_provider(config_text)
    current_model = parse_current_model(config_text)

    with connect_db(paths.db_path, readonly=True) as conn:
        columns = get_thread_columns(conn)
        counts = query_provider_counts(conn)
        model_counts = query_model_counts(conn) if "model" in columns else OrderedDict()
        provider_model_counts = query_provider_model_counts(conn) if "model" in columns else []
        cwd_counts = query_cwd_counts(conn) if "cwd" in columns else []
        total_threads = conn.execute("SELECT COUNT(*) FROM threads").fetchone()[0]
        provider_movable = count_mismatched(conn, "model_provider", current_provider)
        model_movable = count_mismatched(conn, "model", current_model) if "model" in columns else None
        moved_if_sync = count_sync_candidates(
            conn,
            current_provider=current_provider,
            current_model=current_model,
            columns=columns,
        )

    threads = query_threads(paths, current_provider, current_model)
    jsonl_provider_movable = sum(1 for item in threads if item["jsonl_provider"] and item["jsonl_provider"] != current_provider)

    return {
        "codex_home": str(paths.codex_home),
        "config_path": str(paths.config_path),
        "db_path": str(paths.db_path),
        "backup_dir": str(paths.backup_dir),
        "sessions_dir": str(paths.sessions_dir),
        "archived_sessions_dir": str(paths.archived_sessions_dir),
        "deleted_dir": str(paths.deleted_dir),
        "current_provider": current_provider,
        "current_model": current_model,
        "total_threads": total_threads,
        "visible_threads": sum(1 for item in threads if item["provider"] == current_provider and int(item["archived"]) == 0),
        "movable_threads": moved_if_sync,
        "jsonl_provider_movable_threads": jsonl_provider_movable,
        "provider_movable_threads": provider_movable,
        "model_movable_threads": model_movable,
        "provider_counts": [{"provider": key, "count": value} for key, value in counts.items()],
        "model_counts": [{"model": key, "count": value} for key, value in model_counts.items()],
        "provider_model_counts": provider_model_counts,
        "cwd_counts": cwd_counts,
        "backups": list_backups(paths),
        "threads": threads,
    }


def make_backup(paths: Paths, label: str) -> Path:
    paths.backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_path = paths.backup_dir / f"state_5.sqlite.{label}.{timestamp}.bak"
    with connect_db(paths.db_path, readonly=True) as source, connect_db(backup_path, readonly=False) as target:
        source.backup(target)
    return backup_path


def checkpoint(conn: sqlite3.Connection) -> tuple[int, int, int]:
    row = conn.execute("PRAGMA wal_checkpoint(FULL)").fetchone()
    return int(row[0]), int(row[1]), int(row[2])


def placeholders(values: Iterable[str]) -> str:
    return ", ".join("?" for _ in values)


def backup_jsonl(path: Path, paths: Paths, label: str) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    try:
        relative = path.resolve().relative_to(paths.codex_home.resolve())
        backup_name = "__".join(relative.parts)
    except ValueError:
        backup_name = path.name
    destination = paths.backup_dir / "jsonl" / f"{backup_name}.{label}.{timestamp}.bak"
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, destination)
    return destination


def patch_jsonl_header(path: Path, paths: Paths, provider: str, model: str | None) -> bool:
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    changed = False
    patched = False
    new_lines: list[str] = []
    for line in lines:
        if not patched and line.strip():
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                new_lines.append(line)
                continue
            payload = obj.get("payload")
            if obj.get("type") == "session_meta" and isinstance(payload, dict):
                patched = True
                if payload.get("model_provider") != provider:
                    payload["model_provider"] = provider
                    changed = True
                if model and payload.get("model") != model:
                    payload["model"] = model
                    changed = True
                if changed:
                    line = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
        new_lines.append(line)

    if not changed:
        return False
    backup_jsonl(path, paths, "pre-provider-patch")
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    tmp_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
    tmp_path.replace(path)
    return True


def patch_jsonl_for_threads(paths: Paths, thread_ids: set[str], provider: str, model: str | None) -> int:
    changed = 0
    jsonl_by_id = collect_jsonl_meta(paths)
    for sid in sorted(thread_ids):
        for meta in jsonl_by_id.get(sid, []):
            if meta.path.exists() and patch_jsonl_header(meta.path, paths, provider, model):
                changed += 1
    return changed


def archived_destination(paths: Paths, meta: JsonlMeta) -> Path:
    match = ROLLOUT_RE.match(meta.path.name)
    if match:
        year, month, day = match.group(1), match.group(2), match.group(3)
    elif meta.created_at_ms:
        dt = datetime.fromtimestamp(meta.created_at_ms / 1000, timezone.utc)
        year, month, day = f"{dt.year:04d}", f"{dt.month:02d}", f"{dt.day:02d}"
    else:
        dt = datetime.now()
        year, month, day = f"{dt.year:04d}", f"{dt.month:02d}", f"{dt.day:02d}"
    return paths.sessions_dir / year / month / day / meta.path.name


def ensure_jsonl_in_sessions(paths: Paths, thread_ids: set[str]) -> tuple[dict[str, Path], int]:
    jsonl_by_id = collect_jsonl_meta(paths)
    rollout_paths: dict[str, Path] = {}
    copied = 0
    for sid in sorted(thread_ids):
        metas = jsonl_by_id.get(sid, [])
        session_meta = next(
            (
                item
                for item in metas
                if "sessions" in item.path.parts and "archived_sessions" not in item.path.parts and item.path.exists()
            ),
            None,
        )
        if session_meta:
            rollout_paths[sid] = session_meta.path
            continue

        archived_meta = next((item for item in metas if "archived_sessions" in item.path.parts and item.path.exists()), None)
        if not archived_meta:
            continue
        destination = archived_destination(paths, archived_meta)
        if not destination.exists():
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(archived_meta.path, destination)
            copied += 1
        rollout_paths[sid] = destination
    return rollout_paths, copied


def selected_or_candidate_ids(
    paths: Paths,
    selected_ids: list[str],
    current_provider: str,
    current_model: str | None,
) -> set[str]:
    if selected_ids:
        return set(selected_ids)
    return {str(item["id"]) for item in query_threads(paths, current_provider, current_model) if item["sync_candidate"]}


def sync_to_current_provider(
    paths: Paths,
    *,
    thread_ids: list[str] | None = None,
    patch_jsonl: bool = True,
) -> dict[str, object]:
    status_before = get_status(paths)
    current_provider = str(status_before["current_provider"])
    current_model = status_before.get("current_model")
    current_model = str(current_model) if current_model else None
    selected_ids = selected_or_candidate_ids(paths, thread_ids or [], current_provider, current_model)
    backup_path = make_backup(paths, "pre-sync")
    rollout_paths, copied_jsonl = ensure_jsonl_in_sessions(paths, selected_ids)

    with connect_db(paths.db_path, readonly=False) as conn:
        columns = get_thread_columns(conn)
        before_counts = query_provider_counts(conn)
        before_model_counts = query_model_counts(conn) if "model" in columns else OrderedDict()

        set_parts = ["model_provider = ?"]
        set_params: list[Any] = [current_provider]
        synced_fields = ["model_provider"]
        if "model" in columns and current_model:
            set_parts.append("model = ?")
            set_params.append(current_model)
            synced_fields.append("model")
        if "archived" in columns:
            set_parts.append("archived = 0")
            if "archived_at" in columns:
                set_parts.append("archived_at = NULL")
            synced_fields.append("archived")

        if selected_ids:
            id_list = sorted(selected_ids)
            where_sql = f"id IN ({placeholders(id_list)})"
            where_params: list[Any] = id_list
        else:
            where_sql = "1 = 0"
            where_params = []

        updated_rows = conn.execute(
            f"UPDATE threads SET {', '.join(set_parts)} WHERE {where_sql}",
            (*set_params, *where_params),
        ).rowcount
        if "rollout_path" in columns:
            for sid, rollout_path in rollout_paths.items():
                conn.execute("UPDATE threads SET rollout_path = ? WHERE id = ?", (str(rollout_path), sid))
        conn.commit()
        checkpoint_result = checkpoint(conn)
        after_counts = query_provider_counts(conn)
        after_model_counts = query_model_counts(conn) if "model" in columns else OrderedDict()

    jsonl_patched = patch_jsonl_for_threads(paths, selected_ids, current_provider, current_model) if patch_jsonl else 0

    return {
        "action": "sync",
        "current_provider": current_provider,
        "current_model": current_model,
        "synced_fields": synced_fields,
        "selected_threads": len(selected_ids),
        "updated_rows": updated_rows,
        "copied_archived_jsonl": copied_jsonl,
        "jsonl_patched": jsonl_patched,
        "provider_movable_threads": status_before["provider_movable_threads"],
        "model_movable_threads": status_before["model_movable_threads"],
        "backup_path": str(backup_path),
        "before_counts": [{"provider": key, "count": value} for key, value in before_counts.items()],
        "after_counts": [{"provider": key, "count": value} for key, value in after_counts.items()],
        "before_model_counts": [{"model": key, "count": value} for key, value in before_model_counts.items()],
        "after_model_counts": [{"model": key, "count": value} for key, value in after_model_counts.items()],
        "checkpoint": {
            "busy": checkpoint_result[0],
            "log_frames": checkpoint_result[1],
            "checkpointed_frames": checkpoint_result[2],
        },
    }


def resolve_backup(paths: Paths, requested_path: str | None) -> Path:
    if requested_path:
        backup = Path(requested_path).expanduser()
    else:
        backups = list_backups(paths, limit=1)
        if not backups:
            raise RuntimeError("No backup files were found.")
        backup = Path(backups[0]["path"])
    if not backup.exists():
        raise RuntimeError(f"Backup file does not exist: {backup}")
    return backup


def restore_backup(paths: Paths, backup_path: str | None) -> dict[str, object]:
    ensure_environment(paths)
    chosen_backup = resolve_backup(paths, backup_path)
    restore_snapshot = make_backup(paths, "pre-restore")

    with connect_db(chosen_backup, readonly=True) as source, connect_db(paths.db_path, readonly=False) as target:
        source.backup(target)
        checkpoint_result = checkpoint(target)

    status_after = get_status(paths)
    return {
        "action": "restore",
        "restored_from": str(chosen_backup),
        "safety_backup": str(restore_snapshot),
        "checkpoint": {
            "busy": checkpoint_result[0],
            "log_frames": checkpoint_result[1],
            "checkpointed_frames": checkpoint_result[2],
        },
        "status": status_after,
    }


def is_inside(child: Path, parent: Path) -> bool:
    try:
        child.resolve().relative_to(parent.resolve())
        return True
    except ValueError:
        return False


def move_jsonl_to_deleted(paths: Paths, path: Path, batch_dir: Path) -> Path | None:
    if not path.exists() or not is_inside(path, paths.codex_home):
        return None
    try:
        relative = path.resolve().relative_to(paths.codex_home.resolve())
    except ValueError:
        relative = Path(path.name)
    destination = batch_dir / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        destination = destination.with_name(destination.name + "." + datetime.now().strftime("%H%M%S%f"))
    shutil.move(str(path), str(destination))
    return destination


def remove_from_session_index(paths: Paths, deleted_ids: set[str]) -> int:
    if not paths.session_index_path.exists():
        return 0
    kept: list[str] = []
    removed = 0
    for line in paths.session_index_path.read_text(encoding="utf-8", errors="replace").splitlines():
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            kept.append(line)
            continue
        if obj.get("id") in deleted_ids:
            removed += 1
            continue
        kept.append(line)
    tmp_path = paths.session_index_path.with_suffix(paths.session_index_path.suffix + ".tmp")
    tmp_path.write_text("\n".join(kept) + ("\n" if kept else ""), encoding="utf-8")
    tmp_path.replace(paths.session_index_path)
    return removed


def delete_threads(paths: Paths, thread_ids: list[str], dry_run: bool = False) -> dict[str, object]:
    ensure_environment(paths)
    if not thread_ids:
        raise RuntimeError("No thread ids were provided for deletion.")
    selected_ids = set(thread_ids)
    jsonl_by_id = collect_jsonl_meta(paths)
    matched_paths = [meta.path for sid in selected_ids for meta in jsonl_by_id.get(sid, [])]

    if dry_run:
        return {
            "action": "delete",
            "dry_run": True,
            "selected_threads": len(selected_ids),
            "matched_jsonl_files": len(matched_paths),
            "thread_ids": sorted(selected_ids),
        }

    backup_path = make_backup(paths, "pre-delete")
    batch_dir = paths.deleted_dir / datetime.now().strftime("%Y%m%d-%H%M%S")
    moved_paths = []
    for path in matched_paths:
        moved = move_jsonl_to_deleted(paths, path, batch_dir)
        if moved:
            moved_paths.append(str(moved))

    with connect_db(paths.db_path, readonly=False) as conn:
        id_list = sorted(selected_ids)
        deleted_rows = conn.execute(
            f"DELETE FROM threads WHERE id IN ({placeholders(id_list)})",
            id_list,
        ).rowcount
        conn.commit()
        checkpoint_result = checkpoint(conn)

    removed_index_rows = remove_from_session_index(paths, selected_ids)
    return {
        "action": "delete",
        "dry_run": False,
        "selected_threads": len(selected_ids),
        "deleted_db_rows": deleted_rows,
        "moved_jsonl_files": len(moved_paths),
        "removed_index_rows": removed_index_rows,
        "backup_path": str(backup_path),
        "deleted_dir": str(batch_dir),
        "moved_paths": moved_paths,
        "checkpoint": {
            "busy": checkpoint_result[0],
            "log_frames": checkpoint_result[1],
            "checkpointed_frames": checkpoint_result[2],
        },
    }


def to_json(payload: dict[str, object]) -> str:
    return json.dumps(payload, ensure_ascii=False, indent=2)


def main() -> int:
    parser = argparse.ArgumentParser(description="Codex history sync helper")
    parser.add_argument("--codex-home", help="Override Codex home directory")
    parser.add_argument("--json", action="store_true", help="Emit JSON output")

    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("status", help="Show current provider/thread status")
    sync_parser = subparsers.add_parser("sync", help="Move thread providers to the current provider")
    sync_parser.add_argument("--thread-id", action="append", default=[], help="Only sync this thread id; repeatable")
    sync_parser.add_argument("--no-jsonl-patch", action="store_true", help="Only update SQLite, not JSONL headers")
    restore_parser = subparsers.add_parser("restore", help="Restore from a backup")
    restore_parser.add_argument("--backup", help="Backup file path; newest backup is used when omitted")
    delete_parser = subparsers.add_parser("delete", help="Move selected conversations to a local deleted folder")
    delete_parser.add_argument("--thread-id", action="append", default=[], help="Thread id to delete; repeatable")
    delete_parser.add_argument("--dry-run", action="store_true", help="Preview deletion without writing")
    subparsers.add_parser("backup", help="Create a manual backup")

    args = parser.parse_args()
    paths = resolve_paths(args.codex_home)

    try:
        if args.command == "status":
            payload = get_status(paths)
        elif args.command == "sync":
            payload = sync_to_current_provider(
                paths,
                thread_ids=args.thread_id,
                patch_jsonl=not args.no_jsonl_patch,
            )
        elif args.command == "restore":
            payload = restore_backup(paths, args.backup)
        elif args.command == "delete":
            payload = delete_threads(paths, args.thread_id, dry_run=args.dry_run)
        elif args.command == "backup":
            ensure_environment(paths)
            payload = {"action": "backup", "backup_path": str(make_backup(paths, "manual"))}
        else:
            raise RuntimeError(f"Unsupported command: {args.command}")
    except Exception as exc:
        error_payload = {"ok": False, "error": str(exc)}
        if args.json:
            print(to_json(error_payload))
        else:
            print(error_payload["error"])
        return 1

    if isinstance(payload, dict):
        payload["ok"] = True

    if args.json:
        print(to_json(payload))
    else:
        print(payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
