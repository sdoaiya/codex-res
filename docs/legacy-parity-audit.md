# legacy 功能对照审计（Work E）

## 1. 审计范围与方法

- 对照基线：`legacy/README.md`、`legacy/sync_backend.py`、`legacy/launch_ui.ps1`
- 现状代码：`packages/core/`、`desktop/electron/`、`desktop/src/`
- 审计目标：确认“原项目功能保留度”、识别缺口，并给出下一轮改造优先级建议
- 约束：本次仅做审计，不改业务逻辑

---

## 2. 功能对照清单

| 原项目能力（legacy） | 新项目对应实现 | 覆盖结论 | 说明 |
| --- | --- | --- | --- |
| 扫描并识别 Codex 环境（`.codex`、`config.toml`、`state_5.sqlite`） | `packages/core/src/services/scan-environments.ts` | 已覆盖 | 保留自动扫描，默认本地路径。 |
| 读取当前 provider/model 与线程状态 | `packages/core/src/services/codex-console.ts#getCodexStatus` | 已覆盖 | 包含 provider/model、threads、统计信息。 |
| 会话列表展示（DB/JSONL 对照、缺失标记、归档标记） | `codex-console.ts` + `desktop/src/ui/workbench-render.ts` | 已覆盖 | 支持状态标记、线程筛选、详情查看。 |
| 同步选中会话到当前 provider/model | `codex-console.ts#syncCodexThreads` + IPC `codex.sync` | 已覆盖 | 支持选中 ID 同步。 |
| 同步全部需处理会话 | `codex-console.ts#syncCodexThreads`（无 threadIds） | 已覆盖 | 与 legacy “同步全部需处理”一致。 |
| 同步时可选 JSONL 头修复开关 | `patchJsonlHeaders` 参数 + UI 勾选项 | 已覆盖 | 行为与 legacy 基本一致。 |
| archived_sessions 回填 sessions | `codex-console.ts#ensureJsonlInSessions` | 已覆盖 | 同步前自动补位。 |
| 删除会话（先备份 DB，再删 DB，再移动 JSONL，再清 session_index） | `codex-console.ts#deleteCodexThreads` | 已覆盖 | 删除链路完整保留。 |
| 删除预览（dry-run） | `codex-console.ts#deleteCodexThreads(dryRun)` + `desktop/src/ui/workbench-render.ts` | 已覆盖（摘要级） | 前端已展示删除预览摘要（会话数、JSONL 匹配数、索引影响等）；暂未展示文件级明细路径。 |
| 手动备份 DB | `codex-console.ts#createCodexBackup` + IPC `codex.backup-create` | 已覆盖 | 行为保留。 |
| 从备份恢复（指定/最新） | `codex-console.ts#restoreCodexBackup` + UI 备份选择 | 已覆盖 | 支持选中恢复与“最新恢复”。 |
| 打开备份目录、打开删除目录 | IPC `codex.open-backup`、`codex.open-deleted` | 已覆盖 | 与 legacy 工具按钮一致。 |
| 操作确认与日志输出 | `desktop/src/App.ts` + `workbench-render.ts` | 已覆盖 | 有风险确认、confirm、操作日志。 |
| Cursor 侧诊断/修复链路 | `repair-engine.ts` + UI Cursor Lane | 新增能力 | 非 legacy 原生能力；是本项目扩展。 |

---

## 3. 主要缺口与风险

### P0（高优先级，先做）

1. 备份与锁库稳健性弱于 legacy  
当前 `codex-console.ts` 备份主要用 `fs.copyFile`，而 legacy 使用 SQLite backup + checkpoint 策略。对 WAL/占用场景，现实现更容易出现“备份一致性或锁冲突体验差”的问题。

2. Cursor 修复语义需要更严格贴合“元数据修复，不伪造核心数据”  
`repair-engine.ts` 中会写入默认 `composerData/checkpointId` 占位数据；虽然对 `bubble` 缺失做了不可恢复判断，但仍建议把“补齐规则”进一步收敛为最小真实元数据修复，避免“看起来修好但语义不实”的情况。

3. 删除前预览仍缺文件级细节  
前端已接入 dry-run 预览摘要并可见展示，但相较 legacy 的深度排查场景，仍缺“受影响文件路径清单”等更细粒度信息。

### P1（中优先级，提升清晰度与可操作性）

1. 原项目“状态清晰度”尚未完全平移  
legacy 顶部直接给出 `SQLite 待同步 / JSONL 待修复 / 当前 provider` 等关键诊断信号；新 UI 虽有 KPI，但对新手可解释性偏弱，建议恢复“一眼可判定”的诊断条。

2. 语言与术语一致性  
当前 UI 中英混合（如 `Need Sync`、`Backup Workbench` 等），与 legacy 中文引导风格不一致，影响“功能清晰”感知。

3. Codex 主链路与 Cursor 侧链路的心智模型未完全统一  
当前一部分走 `codex-console`，另一部分走 `repair-engine`，用户不容易理解“哪个是主流程、哪个是扩展流程”。

### P2（低优先级，工程完善）

1. 桌面端自动化验证覆盖不足  
`desktop` 目前主要是 `app-model` 测试，缺少 UI 冒烟（扫描→诊断→预览→执行→验证）自动检查。

2. 审计与诊断导出能力可补  
建议增加“导出诊断 JSON / 操作报告”的显式入口，便于回溯和协作排查。

---

## 4. 下一轮改造建议（按优先级）

### 第一轮（P0）

1. 统一 DB 备份策略为 SQLite 原生 backup 流程，并补锁库提示（含“请先关闭 Cursor/Codex”与占用进程信息）。  
2. 收紧 Cursor 修复写入策略：只写必要关联键，禁止写入会误导的默认业务载荷。  
3. 在删除/同步前新增“可读预览面板”，明确显示影响范围与回滚点。

### 第二轮（P1）

1. 重建 legacy 风格“诊断总览条”：当前 provider/model、SQLite 待同步数、JSONL 待修复数、可见线程数。  
2. 全面中文化核心操作文案，并把危险操作区（同步/删除/恢复）视觉分组强化。  
3. 明确主流程分区：Codex 主修复链路与 Cursor 元数据修复链路分栏并给出边界提示。

### 第三轮（P2）

1. 增加桌面端烟测脚本（至少一条 Codex 全流程 + 一条 Cursor 全流程）。  
2. 增加“导出诊断 JSON/操作报告”入口，支持用户反馈与问题复现。

---

## 5. 结论

- 从“原项目核心功能保持”看：**主能力已基本覆盖**（扫描、状态、同步、删除、备份、恢复、目录打开均在）。  
- 从“清晰度与可审计性”看：**存在明显产品层缺口**（预览可见性、状态直观度、文案一致性、锁库稳健性）。  
- 建议按上面的 P0→P1→P2 顺序推进，优先把稳定性和可解释性补齐，再做界面精修与自动化收口。
