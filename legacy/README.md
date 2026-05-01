# Codex History Restore

一个 Windows 本地工具，用于恢复 Cursor/Codex 切换中转站、API、provider 或模型后“聊天记录还在文件里，但侧边栏看不到”的问题。

核心修复点：新版 Cursor/Codex 可能会在启动时根据 `sessions/*.jsonl` 重新生成 `state_5.sqlite`。如果工具只改 SQLite，Cursor 一打开就可能把 provider 又还原成旧值，历史记录会再次消失。本工具默认同时修复 SQLite 和 JSONL 头部 provider，从源头避免反复消失。

## 功能

- 查看当前 `config.toml` 里的 provider/model。
- 查看 SQLite 和 JSONL 中的历史会话列表。
- 一键同步全部需要处理的会话到当前 provider/model。
- 勾选部分会话，只迁移选中的聊天记录。
- 默认修复 JSONL 头部 `session_meta.payload.model_provider`，防止 Cursor 重建数据库后再次隐藏。
- 勾选并删除不需要的对话记录。
- 删除前自动备份数据库，并把 JSONL 移动到 `history_sync_deleted`，不直接粉碎文件。
- 手动备份、从备份恢复、打开备份目录、打开删除目录。

## 适用场景

- 切换了 Cursor/Codex 的中转站或 OpenAI-compatible API。
- 切换了 `model_provider` 或模型名。
- 本地 `C:\Users\<你>\.codex\sessions` 里还有 JSONL，但 Cursor/Codex 侧边栏不显示。
- 需要选择性迁移一部分旧聊天，而不是全部迁移。
- 需要清理某些旧对话记录。

## 不适用场景

- 本地 `sessions` 目录已经被彻底删除。
- 云端账号之间的聊天记录同步。
- 不同电脑之间自动迁移完整 Codex 环境。

## 环境要求

- Windows
- PowerShell 5.1 或更高版本
- Python 3.8+，并且可以通过 `py -3` 调用
- 本机存在 Codex 数据目录，通常是 `%USERPROFILE%\.codex`

## 快速使用

最简单方式：双击运行：

```text
启动图形界面.bat
```

启动图形界面：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\launch_ui.ps1
```

查看当前状态：

```powershell
py -3 .\sync_backend.py --json status
```

同步全部需要处理的会话：

```powershell
py -3 .\sync_backend.py --json sync
```

只同步指定会话：

```powershell
py -3 .\sync_backend.py --json sync --thread-id 019dc52a-cc11-71b1-b9bc-fd9e3a226ace
```

只改 SQLite，不修 JSONL 头部：

```powershell
py -3 .\sync_backend.py --json sync --no-jsonl-patch
```

删除指定会话：

```powershell
py -3 .\sync_backend.py --json delete --thread-id 019dc52a-cc11-71b1-b9bc-fd9e3a226ace
```

预览删除：

```powershell
py -3 .\sync_backend.py --json delete --dry-run --thread-id 019dc52a-cc11-71b1-b9bc-fd9e3a226ace
```

手动备份数据库：

```powershell
py -3 .\sync_backend.py --json backup
```

从最新备份恢复：

```powershell
py -3 .\sync_backend.py --json restore
```

运行测试：

```powershell
py -3 -m unittest discover -s tests -v
```

## 使用建议

- 同步、删除或恢复前，先完全退出 Cursor/Codex。
- 推荐默认勾选“同步时修复 JSONL 头部”，否则 Cursor 下次启动仍可能按旧 provider 重建数据库。
- 删除功能会把 JSONL 移动到 `%USERPROFILE%\.codex\history_sync_deleted`，如果误删，可以先去该目录找回文件。
- 数据库备份默认保存在 `%USERPROFILE%\.codex\history_sync_backups`。

## 文件说明

- `sync_backend.py`：扫描、同步、备份、恢复、删除的后端逻辑。
- `launch_ui.ps1`：Windows 图形界面。
- `tests/test_sync_backend.py`：后端单元测试。

## 安全说明

本工具会直接操作本机 Codex 的 SQLite 数据库和 JSONL 会话文件。所有同步、恢复、删除操作都会先创建数据库备份；JSONL provider 修复前也会备份原文件；删除会移动 JSONL 到回收目录而不是直接粉碎。仍建议使用前先确认本地 `.codex` 目录状态。
