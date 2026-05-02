export const WORKBENCH_STYLE_ID = "codex-recovery-workbench-style";

export const WORKBENCH_STYLE = `
  :root {
    --wb-bg: #edf1f6;
    --wb-bg-2: #f3f6fa;
    --wb-shell: #f7f9fc;
    --wb-panel: #ffffff;
    --wb-panel-2: #f9fbfe;
    --wb-line: #d4deea;
    --wb-line-soft: #e5ecf5;
    --wb-text: #132437;
    --wb-muted: #63768c;
    --wb-brand: #205d9f;
    --wb-brand-soft: #ebf2fc;
    --wb-ok: #1f7449;
    --wb-ok-soft: #ebf8f0;
    --wb-warn: #9f631f;
    --wb-warn-soft: #fff3e4;
    --wb-danger: #ad3b36;
    --wb-danger-soft: #fff0ef;
    --wb-info: #225a98;
    --wb-info-soft: #edf5ff;
    --wb-shadow-soft: 0 3px 10px rgba(11, 26, 42, 0.05);
    --wb-shadow-hard: 0 8px 18px rgba(11, 26, 42, 0.06);
    --wb-space-1: 4px;
    --wb-space-2: 8px;
    --wb-space-3: 12px;
    --wb-space-4: 16px;
    --wb-space-5: 20px;
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    color: var(--wb-text);
    background: var(--wb-bg);
    font-family: "SF Pro Text", "Segoe UI Variable Text", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 13px;
  }

  .workbench {
    min-height: 100vh;
    background:
      radial-gradient(920px 480px at -14% -18%, rgba(91, 140, 196, 0.08), transparent 68%),
      linear-gradient(180deg, var(--wb-bg), var(--wb-bg-2));
    padding: var(--wb-space-2);
  }

  .app-shell {
    width: 100%;
    min-height: calc(100vh - var(--wb-space-4));
    border-radius: 12px;
    border: 1px solid #d5dfeb;
    background:
      linear-gradient(180deg, #f9fbfe 0%, #f5f8fc 100%),
      var(--wb-shell);
    box-shadow: var(--wb-shadow-hard);
    padding: var(--wb-space-3);
  }

  .chrome-bar {
    height: 40px;
    border: 1px solid #d4deeb;
    border-radius: 10px;
    background: linear-gradient(180deg, #fbfdff, #f0f4f9);
    display: grid;
    grid-template-columns: 180px 1fr auto;
    align-items: center;
    padding: 0 10px;
    margin-bottom: var(--wb-space-2);
  }

  .chrome-left {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .chrome-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    display: inline-block;
  }

  .chrome-dot.red {
    background: #ef6259;
  }

  .chrome-dot.yellow {
    background: #f1c14f;
  }

  .chrome-dot.green {
    background: #5ac575;
  }

  .chrome-title {
    text-align: center;
    font-size: 12px;
    font-weight: 620;
    color: #3f5164;
    letter-spacing: 0.02em;
  }

  .chrome-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .chrome-pill {
    border: 1px solid #d5dfeb;
    border-radius: 999px;
    background: #ffffff;
    color: #4b6076;
    font-size: 10px;
    padding: 2px 8px;
  }

  .topbar {
    border-radius: 10px;
    border: 1px solid #d7e0ec;
    background: linear-gradient(140deg, #193656 0%, #214667 60%, #245f5f 100%);
    color: #eef5ff;
    padding: 10px 12px;
  }

  .topbar h1 {
    margin: 0;
    font-size: 17px;
    line-height: 1.25;
    letter-spacing: 0.02em;
    font-weight: 650;
  }

  .topbar p {
    margin: 6px 0 0;
    font-size: 11px;
    color: rgba(238, 245, 255, 0.88);
  }

  .status-strip {
    margin-top: 8px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--wb-space-2);
  }

  .status-item {
    border: 1px solid rgba(196, 219, 244, 0.45);
    border-radius: 8px;
    background: rgba(246, 250, 255, 0.14);
    padding: 6px 8px;
    display: grid;
    gap: 1px;
  }

  .status-item span {
    font-size: 10px;
    color: rgba(226, 238, 252, 0.9);
  }

  .status-item strong {
    font-size: 12px;
    color: #ffffff;
    font-weight: 600;
  }

  .layout {
    margin-top: var(--wb-space-3);
    display: grid;
    grid-template-columns: minmax(0, 2.2fr) minmax(360px, 0.95fr);
    gap: var(--wb-space-3);
  }

  .panel {
    background: var(--wb-panel);
    border: 1px solid var(--wb-line);
    border-radius: 9px;
    box-shadow: var(--wb-shadow-soft);
    padding: var(--wb-space-3);
  }

  .panel h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 640;
  }

  .muted {
    color: var(--wb-muted);
    font-size: 11px;
  }

  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }

  .section-title {
    margin: 12px 0 7px;
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #5a6d83;
    font-weight: 700;
  }

  .kpis {
    margin-top: var(--wb-space-2);
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: var(--wb-space-2);
  }

  .kpi {
    border: 1px solid var(--wb-line-soft);
    border-radius: 8px;
    background: var(--wb-panel-2);
    padding: 7px;
  }

  .kpi .v {
    color: #183a5f;
    font-size: 18px;
    font-weight: 680;
    line-height: 1.1;
  }

  .kpi .k {
    margin-top: 1px;
    color: var(--wb-muted);
    font-size: 10px;
  }

  .action-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--wb-space-2);
  }

  .toolbar {
    margin-top: var(--wb-space-1);
    display: flex;
    flex-wrap: wrap;
    gap: var(--wb-space-1);
  }

  .action-grid .toolbar {
    margin-top: 0;
  }

  .danger-zone {
    border: 1px solid #e8ced0;
    border-radius: 8px;
    background: linear-gradient(180deg, #fffaf9, #fffefe);
    padding: 9px;
  }

  .danger-zone-title {
    color: #9a312c;
    font-size: 11px;
    font-weight: 700;
  }

  .danger-zone-tip {
    margin: 5px 0 7px;
    color: #8f3732;
    font-size: 11px;
    line-height: 1.38;
  }

  .controls {
    margin-top: var(--wb-space-2);
    display: grid;
    gap: var(--wb-space-1);
  }

  .controls label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--wb-text);
    font-size: 11px;
  }

  .controls input[type="checkbox"] {
    width: 13px;
    height: 13px;
    margin: 0;
  }

  .risk-box {
    border: 1px solid #f0dbd8;
    border-radius: 8px;
    background: #fff8f7;
    color: #97332f;
    padding: 7px 9px;
    font-size: 11px;
    line-height: 1.42;
  }

  .thread-controls {
    margin-top: var(--wb-space-2);
    display: grid;
    grid-template-columns: 1.1fr repeat(3, minmax(0, 0.65fr));
    gap: var(--wb-space-1);
  }

  .filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--wb-space-1);
  }

  .kbd-hint {
    grid-column: 1 / -1;
    color: var(--wb-muted);
    font-size: 11px;
    line-height: 1.35;
  }

  .table-wrap {
    margin-top: var(--wb-space-2);
    border: 1px solid var(--wb-line);
    border-radius: 8px;
    overflow: auto;
    max-height: 430px;
    background: #fff;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }

  th,
  td {
    border-bottom: 1px solid var(--wb-line-soft);
    padding: 7px 6px;
    text-align: left;
    white-space: nowrap;
    vertical-align: middle;
  }

  th {
    position: sticky;
    top: 0;
    z-index: 1;
    color: #4f6073;
    font-weight: 620;
    background: #f5f9fe;
  }

  tbody tr {
    cursor: pointer;
  }

  tbody tr:hover {
    background: #f7fbff;
  }

  .row-active {
    background: #e9f2ff !important;
  }

  .state-pill {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 1px 8px;
    font-size: 10px;
    font-weight: 680;
  }

  .state-pill.ok {
    color: var(--wb-ok);
    background: var(--wb-ok-soft);
  }

  .state-pill.warn {
    color: var(--wb-warn);
    background: var(--wb-warn-soft);
  }

  .state-pill.danger {
    color: var(--wb-danger);
    background: var(--wb-danger-soft);
  }

  .thread-detail {
    margin-top: var(--wb-space-2);
    border: 1px solid var(--wb-line-soft);
    border-radius: 8px;
    background: #fbfdff;
    padding: var(--wb-space-2);
  }

  .thread-detail h3 {
    margin: 0;
    font-size: 12px;
    font-weight: 620;
  }

  .thread-meta-grid {
    margin-top: var(--wb-space-1);
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--wb-space-1);
  }

  .thread-meta-grid > div {
    border: 1px solid var(--wb-line-soft);
    border-radius: 7px;
    background: #fff;
    padding: 7px;
    display: grid;
    gap: 2px;
  }

  .thread-meta-grid > div span {
    color: var(--wb-muted);
    font-size: 10px;
  }

  .thread-meta-grid > div strong {
    color: var(--wb-text);
    font-size: 11px;
    font-weight: 600;
  }

  .thread-meta-grid .wide {
    grid-column: span 2;
  }

  .cards {
    margin-top: var(--wb-space-2);
    display: grid;
    gap: var(--wb-space-2);
  }

  .card {
    border: 1px solid var(--wb-line-soft);
    border-radius: 8px;
    background: #fafcff;
    padding: var(--wb-space-2);
  }

  .card h3 {
    margin: 0 0 var(--wb-space-1);
    font-size: 12px;
    font-weight: 620;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .card p {
    margin: 0;
    font-size: 11px;
    line-height: 1.45;
    color: #2d445d;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--wb-space-2);
  }

  .log-box {
    border: 1px solid var(--wb-line);
    border-radius: 8px;
    max-height: 280px;
    overflow: auto;
    background: #f8fbff;
  }

  .log-row {
    display: grid;
    grid-template-columns: 138px 58px minmax(0, 1fr);
    align-items: start;
    gap: 7px;
    padding: 7px 9px;
    border-bottom: 1px solid #e9f0f7;
    font-size: 11px;
  }

  .log-time {
    color: #445b72;
    font-family: "JetBrains Mono", "Cascadia Mono", "Consolas", monospace;
  }

  .log-level {
    display: inline-flex;
    justify-content: center;
    min-width: 52px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    border: 1px solid transparent;
  }

  .log-message {
    color: var(--wb-text);
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.4;
  }

  .log-row.info .log-level {
    color: var(--wb-info);
    background: var(--wb-info-soft);
    border-color: #cfe1fb;
  }

  .log-row.success .log-level {
    color: var(--wb-ok);
    background: var(--wb-ok-soft);
    border-color: #cde6d8;
  }

  .log-row.warning .log-level {
    color: var(--wb-warn);
    background: var(--wb-warn-soft);
    border-color: #f1ddbf;
  }

  .log-row.error .log-level {
    color: var(--wb-danger);
    background: var(--wb-danger-soft);
    border-color: #f0cdc9;
  }

  .cursor-steps {
    margin-top: var(--wb-space-2);
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--wb-space-1);
  }

  .cursor-step {
    border: 1px solid var(--wb-line);
    border-radius: 7px;
    background: #fff;
    padding: 6px;
    font-size: 10px;
    color: #506074;
  }

  .cursor-step-state {
    margin-bottom: 1px;
    font-size: 9px;
    letter-spacing: 0.03em;
  }

  .cursor-step.done {
    color: var(--wb-ok);
    border-color: #cde7d9;
    background: var(--wb-ok-soft);
  }

  .cursor-step.current {
    color: var(--wb-info);
    border-color: #c9ddfb;
    background: var(--wb-info-soft);
  }

  .cell-empty {
    color: #728295;
    text-align: center;
    padding: 12px;
    font-size: 11px;
  }

  .banner {
    margin-top: var(--wb-space-2);
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 11px;
  }

  .banner-busy {
    color: var(--wb-info);
    background: var(--wb-info-soft);
    border: 1px solid #cfe1fb;
  }

  .banner-error {
    color: var(--wb-danger);
    background: var(--wb-danger-soft);
    border: 1px solid #f1d0cc;
  }

  button,
  select,
  input {
    font: inherit;
  }

  button {
    border: 1px solid #c7d5e5;
    border-radius: 7px;
    background: #fff;
    color: var(--wb-text);
    padding: 5px 9px;
    cursor: pointer;
    transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
  }

  button:hover:not(:disabled) {
    border-color: #a7bfd7;
    background: #f4f9ff;
  }

  button:focus-visible,
  select:focus-visible,
  input:focus-visible {
    outline: 2px solid #2f7dd2;
    outline-offset: 1px;
  }

  [data-row-id] {
    outline: none;
  }

  [data-row-id]:focus-visible,
  .filter-chip:focus-visible {
    outline: 2px solid #2f7dd2;
    outline-offset: 1px;
  }

  [data-row-id]:focus-visible {
    background: #e1efff !important;
  }

  button:disabled {
    opacity: 0.54;
    cursor: not-allowed;
  }

  .btn-soft {
    border-color: #c6d8eb;
    background: #f6fbff;
    color: #1f537e;
  }

  .btn-soft:hover:not(:disabled) {
    border-color: #a8c4df;
    background: #edf5ff;
  }

  .btn-primary {
    color: #fff;
    border-color: var(--wb-brand);
    background: var(--wb-brand);
  }

  .btn-primary:hover:not(:disabled) {
    border-color: #1d6dbc;
    background: #1d6dbc;
  }

  .btn-warning {
    color: #7a4e1a;
    border-color: #ebd8b2;
    background: #fff8ea;
  }

  .btn-warning:hover:not(:disabled) {
    border-color: #d6bb85;
    background: #fff2d9;
  }

  .btn-danger {
    color: #fff;
    border-color: var(--wb-danger);
    background: var(--wb-danger);
  }

  .btn-danger:hover:not(:disabled) {
    border-color: #c9403a;
    background: #c9403a;
  }

  .danger-outline {
    border-color: #cd746f !important;
  }

  select,
  input[type="text"] {
    width: 100%;
    border: 1px solid #ccdae8;
    border-radius: 6px;
    background: #fff;
    color: var(--wb-text);
    padding: 5px 7px;
    min-height: 30px;
  }

  .mono {
    font-family: "JetBrains Mono", "Cascadia Mono", "Consolas", monospace;
    font-size: 10px;
  }

  .filter-chip {
    border: 1px solid #cfdae8;
    border-radius: 999px;
    background: #fff;
    font-size: 10px;
    padding: 4px 9px;
  }

  .filter-chip.active {
    color: #fff;
    border-color: var(--wb-brand);
    background: var(--wb-brand);
  }

  ul.compact-list {
    margin: 4px 0 0;
    padding-left: 16px;
    font-size: 11px;
    color: #385066;
  }

  .meta-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--wb-muted);
  }

  .panel,
  .card,
  .kpi,
  .status-item,
  .danger-zone,
  .risk-box {
    transition: border-color 140ms ease, background-color 140ms ease;
  }

  @media (max-width: 1280px) {
    .app-shell {
      padding: var(--wb-space-3);
      min-height: calc(100vh - var(--wb-space-3));
    }

    .chrome-bar {
      grid-template-columns: 120px 1fr;
      height: auto;
      row-gap: 6px;
      padding: 8px 10px;
    }

    .chrome-right {
      grid-column: 1 / -1;
      justify-content: flex-end;
    }

    .layout {
      grid-template-columns: 1fr;
    }

    .status-strip {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .kpis {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .thread-controls {
      grid-template-columns: 1fr;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .thread-meta-grid {
      grid-template-columns: 1fr;
    }

    .thread-meta-grid .wide {
      grid-column: span 1;
    }

    .action-grid {
      grid-template-columns: 1fr;
    }

    .log-row {
      grid-template-columns: 1fr;
      gap: 4px;
    }
  }

  @media (max-width: 860px) {
    .workbench {
      padding: 4px;
    }

    .app-shell {
      border-radius: 8px;
      padding: 8px;
    }

    .chrome-title {
      text-align: left;
    }

    .topbar {
      padding: 9px 10px;
    }
  }
`;

export function ensureWorkbenchStyle(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(WORKBENCH_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = WORKBENCH_STYLE_ID;
  style.textContent = WORKBENCH_STYLE;
  document.head.append(style);
}
