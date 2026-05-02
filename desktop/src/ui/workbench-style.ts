export const WORKBENCH_STYLE_ID = "codex-recovery-workbench-style";

export const WORKBENCH_STYLE = `
  :root {
    color-scheme: dark;
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #0b0e12;
    color: #e8edf3;
    font-family: "Segoe UI Variable Text", "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 12px;
    line-height: 1.4;
  }

  #root {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .workbench {
    --bg-app: #0f1217;
    --bg-panel: #181d24;
    --bg-panel-2: #151a21;
    --bg-hover: #1f252e;
    --line: #2b313a;
    --line-soft: #242a32;
    --text: #e8edf3;
    --muted: #9ca6b5;
    --accent: #1fc77a;
    --accent-soft: rgba(31, 199, 122, 0.14);
    --warn: #d1a351;
    --warn-soft: rgba(209, 163, 81, 0.14);
    --danger: #d76a6a;
    --danger-soft: rgba(215, 106, 106, 0.15);
    --info: #6db3ff;
    --info-soft: rgba(109, 179, 255, 0.15);
    --radius: 10px;
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    width: 100%;
    height: 100%;
    padding: 8px;
    background:
      radial-gradient(1000px 560px at 10% -20%, rgba(71, 102, 151, 0.18), transparent 65%),
      linear-gradient(180deg, #0c1016, #0a0d12);
    overflow: hidden;
  }

  .workbench.density-standard {
    --space-2: 10px;
    --space-3: 14px;
    --space-4: 18px;
  }

  .workbench.density-compact {
    --space-1: 3px;
    --space-2: 7px;
    --space-3: 10px;
    --space-4: 14px;
    --radius: 8px;
  }

  .app-shell {
    width: 100%;
    height: 100%;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: linear-gradient(180deg, #10151c, #0f141b);
    box-shadow: 0 20px 45px rgba(0, 0, 0, 0.45);
    display: grid;
    grid-template-rows: auto auto 1fr auto;
    gap: var(--space-2);
    padding: var(--space-2);
    overflow: hidden;
  }

  .workbench[data-busy="1"] .app-shell {
    cursor: progress;
  }

  .workbench[data-busy="1"] .chrome-bar,
  .workbench[data-busy="1"] .topbar,
  .workbench[data-busy="1"] .layout {
    pointer-events: none;
    opacity: 0.9;
  }

  .chrome-bar {
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: #151a22;
    min-height: 38px;
    padding: 0 var(--space-2);
    display: grid;
    grid-template-columns: 64px 1fr auto;
    align-items: center;
    gap: var(--space-2);
  }

  .chrome-left {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .chrome-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.2);
    display: inline-block;
  }

  .chrome-dot.red {
    background: #d46a6a;
  }

  .chrome-dot.yellow {
    background: #d2a45c;
  }

  .chrome-dot.green {
    background: #30bf7e;
  }

  .chrome-title {
    color: #dfe6ef;
    font-size: 12px;
    font-weight: 620;
  }

  .chrome-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .chrome-pill {
    border: 1px solid var(--line);
    border-radius: 999px;
    background: #0f141b;
    color: #aab4c2;
    padding: 2px 8px;
    font-size: 10px;
  }

  .topbar {
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: linear-gradient(120deg, #1a2230 0%, #1b2732 70%, #19252d 100%);
    padding: var(--space-2);
    overflow: hidden;
  }

  .topbar h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0.01em;
    color: #f3f7fc;
  }

  .topbar p {
    margin: 4px 0 0;
    color: #a9b7ca;
    font-size: 11px;
    display: none;
  }

  .control-strip {
    margin-top: var(--space-2);
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1.2fr;
    gap: var(--space-2);
  }

  .status-item {
    border: 1px solid rgba(157, 175, 200, 0.32);
    border-radius: 8px;
    background: rgba(17, 24, 34, 0.36);
    padding: 6px 8px;
    display: grid;
    gap: 1px;
  }

  .status-item span {
    color: #9db0c8;
    font-size: 10px;
  }

  .status-item strong {
    color: #f5f8fd;
    font-size: 22px;
    line-height: 1.1;
    font-weight: 650;
  }

  .density-control .density-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .density-control select {
    display: none;
  }

  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1.75fr) minmax(320px, 0.95fr);
    gap: var(--space-2);
    min-height: 0;
    overflow: hidden;
  }

  .panel {
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: linear-gradient(180deg, #171c24, #151a21);
    padding: var(--space-3);
    min-height: 0;
    overflow: auto;
  }

  .panel h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 650;
    color: #eff4fb;
  }

  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .section-title {
    margin: var(--space-2) 0 var(--space-1);
    color: #8d9caf;
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-weight: 700;
  }

  .muted {
    color: var(--muted);
    font-size: 11px;
  }

  .path-line {
    margin-top: 5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .kpis {
    margin-top: var(--space-2);
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-1);
  }

  .kpi {
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    background: #141922;
    padding: 7px;
  }

  .kpi .v {
    color: #f4f7fd;
    font-size: 19px;
    line-height: 1.08;
    font-weight: 680;
  }

  .kpi .k {
    margin-top: 2px;
    color: #92a0b2;
    font-size: 10px;
  }

  .action-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2);
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .danger-zone {
    border: 1px solid #4a3234;
    border-radius: 8px;
    background: linear-gradient(180deg, #221a1c, #1f1719);
    padding: 7px;
  }

  .danger-zone-title {
    color: #f09797;
    font-size: 11px;
    font-weight: 700;
  }

  .danger-zone-tip {
    margin: 3px 0 6px;
    color: #c88787;
    font-size: 11px;
    line-height: 1.3;
  }

  .risk-checklist {
    display: grid;
    gap: var(--space-1);
  }

  .check-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    background: #141a22;
    padding: 6px 8px;
  }

  .check-row label,
  .patch-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #d9e2ec;
    font-size: 11px;
  }

  .check-state {
    color: #93a1b3;
    font-size: 10px;
  }

  .risk-box {
    border: 1px solid #41343a;
    border-radius: 8px;
    background: #1c161a;
    color: #d8b0bd;
    padding: 7px 9px;
    display: grid;
    gap: 2px;
    font-size: 11px;
  }

  .thread-controls {
    margin-top: var(--space-1);
    display: grid;
    grid-template-columns: 1fr 160px auto;
    gap: var(--space-1);
    align-items: center;
  }

  .filter-row {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .kbd-hint {
    grid-column: 1 / -1;
    color: #8896a8;
    font-size: 10px;
  }

  .table-wrap {
    margin-top: var(--space-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    background: #11161e;
    overflow: auto;
    max-height: 280px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }

  th,
  td {
    border-bottom: 1px solid var(--line-soft);
    padding: 6px;
    text-align: left;
    white-space: nowrap;
    vertical-align: middle;
  }

  th {
    position: sticky;
    top: 0;
    z-index: 1;
    color: #9eb0c7;
    font-weight: 620;
    background: #151c26;
  }

  tbody tr {
    cursor: pointer;
  }

  tbody tr:hover {
    background: #1b222e;
  }

  .row-active {
    background: #202b3a !important;
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
    color: #7ae8ac;
    background: rgba(31, 199, 122, 0.16);
  }

  .state-pill.warn {
    color: #f3cf83;
    background: rgba(209, 163, 81, 0.16);
  }

  .state-pill.danger {
    color: #f2a0a0;
    background: rgba(215, 106, 106, 0.16);
  }

  .thread-detail {
    margin-top: var(--space-2);
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    background: #141922;
    padding: var(--space-2);
  }

  .thread-detail h3 {
    margin: 0;
    font-size: 12px;
    font-weight: 620;
  }

  .thread-meta-grid {
    margin-top: var(--space-1);
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-1);
  }

  .thread-meta-grid > div {
    border: 1px solid var(--line-soft);
    border-radius: 7px;
    background: #111722;
    padding: 7px;
    display: grid;
    gap: 2px;
  }

  .thread-meta-grid span {
    color: #93a3b7;
    font-size: 10px;
  }

  .thread-meta-grid strong {
    color: #e7edf7;
    font-size: 11px;
    font-weight: 600;
  }

  .thread-meta-grid .wide {
    grid-column: span 2;
  }

  .operations-panel .cards {
    margin-top: var(--space-2);
    display: grid;
    gap: var(--space-2);
  }

  .card {
    border: 1px solid var(--line-soft);
    border-radius: 8px;
    background: #131922;
    padding: var(--space-2);
  }

  .card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    margin-bottom: var(--space-1);
  }

  .card h3 {
    margin: 0;
    font-size: 12px;
    font-weight: 620;
  }

  .card h4 {
    margin: 0 0 3px;
    font-size: 11px;
    font-weight: 620;
    color: #c8d6e9;
  }

  .card-body {
    display: grid;
    gap: var(--space-1);
  }

  .mini-card {
    border: 1px solid var(--line-soft);
    border-radius: 7px;
    background: #0f151e;
    padding: 6px;
  }

  .mini-card p {
    margin: 0;
    color: #b4c2d5;
    font-size: 11px;
    line-height: 1.4;
  }

  .stacked {
    gap: var(--space-1);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-1);
  }

  .meta-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    color: #9aa8bc;
    font-size: 11px;
  }

  .compact-list {
    margin: 4px 0 0;
    padding-left: 16px;
    color: #b8c6d9;
    font-size: 11px;
  }

  .log-box {
    border: 1px solid var(--line);
    border-radius: 7px;
    background: #10161f;
    max-height: 180px;
    overflow: auto;
  }

  .log-row {
    display: grid;
    grid-template-columns: 120px 50px minmax(0, 1fr);
    gap: 6px;
    align-items: start;
    padding: 6px 8px;
    border-bottom: 1px solid #212833;
    font-size: 11px;
  }

  .log-time {
    color: #8ea0b8;
    font-family: "JetBrains Mono", "Cascadia Mono", "Consolas", monospace;
  }

  .log-level {
    display: inline-flex;
    justify-content: center;
    min-width: 50px;
    border-radius: 999px;
    padding: 1px 6px;
    font-size: 10px;
    font-weight: 700;
  }

  .log-message {
    color: #dbe4f1;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .log-row.info .log-level {
    color: #8cc5ff;
    background: var(--info-soft);
  }

  .log-row.success .log-level {
    color: #85e8b3;
    background: var(--accent-soft);
  }

  .log-row.warning .log-level {
    color: #f0cc82;
    background: var(--warn-soft);
  }

  .log-row.error .log-level {
    color: #f0aaaa;
    background: var(--danger-soft);
  }

  .cursor-steps {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 4px;
  }

  .cursor-step {
    border: 1px solid var(--line);
    border-radius: 7px;
    background: #111720;
    padding: 5px 6px;
    font-size: 10px;
    color: #9aabbe;
  }

  .cursor-step-state {
    margin-bottom: 2px;
    font-size: 9px;
  }

  .cursor-step.done {
    border-color: #2f5b47;
    background: rgba(31, 199, 122, 0.12);
    color: #83e7b0;
  }

  .cursor-step.current {
    border-color: #2f4f74;
    background: rgba(109, 179, 255, 0.14);
    color: #8fc2ff;
  }

  .cell-empty {
    color: #8f9fb3;
    text-align: center;
    padding: 12px;
    font-size: 11px;
  }

  .banner {
    border-radius: 8px;
    padding: 7px 9px;
    font-size: 11px;
  }

  .banner-busy {
    color: #8bc6ff;
    background: rgba(109, 179, 255, 0.14);
    border: 1px solid #334d6d;
  }

  .banner-error {
    color: #f3b1b1;
    background: rgba(215, 106, 106, 0.15);
    border: 1px solid #5a3a3f;
  }

  button,
  select,
  input {
    font: inherit;
  }

  button {
    border: 1px solid #35404d;
    border-radius: 8px;
    background: #1b222c;
    color: #d5deea;
    padding: 4px 9px;
    cursor: pointer;
    transition: background-color 90ms ease, border-color 90ms ease, color 90ms ease;
  }

  button:hover:not(:disabled) {
    border-color: #445267;
    background: #222b37;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-soft {
    background: #1a212c;
    border-color: #2f3947;
    color: #bfd0e4;
  }

  .btn-primary {
    color: #dffff0;
    border-color: #208a5d;
    background: #1d7f56;
  }

  .btn-primary:hover:not(:disabled) {
    border-color: #25a06b;
    background: #229364;
  }

  .btn-warning {
    color: #f3d19a;
    border-color: #6a5637;
    background: #2a2419;
  }

  .btn-danger {
    color: #ffd4d4;
    border-color: #8b4444;
    background: #662f33;
  }

  .btn-mini {
    padding: 2px 7px;
    font-size: 10px;
    line-height: 1.2;
  }

  [data-density-mode][data-active="1"] {
    border-color: #2ca56d;
    background: #208a5d;
    color: #eafff3;
  }

  [data-toggle-panel][data-open="0"] {
    border-color: #33404e;
    background: #171d26;
    color: #9eb0c5;
  }

  .danger-outline {
    border-color: #815151 !important;
  }

  select,
  input[type="text"] {
    width: 100%;
    min-height: 28px;
    border: 1px solid #364250;
    border-radius: 8px;
    background: #121821;
    color: #e2e9f3;
    padding: 4px 7px;
  }

  input[type="checkbox"] {
    width: 13px;
    height: 13px;
    margin: 0;
    accent-color: #21b772;
  }

  .filter-chip {
    border: 1px solid #364250;
    border-radius: 999px;
    background: #131a23;
    color: #aab7ca;
    font-size: 10px;
    padding: 4px 9px;
  }

  .filter-chip.active {
    color: #e8fff4;
    border-color: #2ca56d;
    background: #1d7f56;
  }

  .mono {
    font-family: "JetBrains Mono", "Cascadia Mono", "Consolas", monospace;
    font-size: 10px;
  }

  [data-row-id] {
    outline: none;
  }

  button:focus-visible,
  select:focus-visible,
  input:focus-visible,
  [data-row-id]:focus-visible {
    outline: 2px solid #5aa6ff;
    outline-offset: 1px;
  }

  [data-row-id]:focus-visible {
    background: #26344a !important;
  }

  .card-collapsible[data-collapsed="1"] .card-head {
    margin-bottom: 0;
  }

  @media (max-width: 1180px) {
    .layout {
      grid-template-columns: 1fr;
    }

    .control-strip {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .kpis {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .thread-controls {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 760px), (max-height: 560px) {
    .workbench {
      padding: 4px;
    }

    .app-shell {
      padding: 6px;
      border-radius: 8px;
    }

    .chrome-left {
      display: none;
    }

    .chrome-bar {
      grid-template-columns: 1fr auto;
      min-height: 34px;
    }

    .topbar h1 {
      font-size: 17px;
    }

    .status-item strong {
      font-size: 18px;
    }

    .action-grid {
      grid-template-columns: 1fr;
    }

    .thread-meta-grid {
      grid-template-columns: 1fr;
    }

    .thread-meta-grid .wide {
      grid-column: span 1;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .table-wrap {
      max-height: 220px;
    }

    .log-row {
      grid-template-columns: 1fr;
      gap: 3px;
    }
  }

  @media (max-width: 640px), (max-height: 500px) {
    .chrome-right {
      display: none;
    }

    .control-strip {
      grid-template-columns: 1fr;
    }

    .kpis {
      grid-template-columns: 1fr 1fr;
    }

    .density-control .density-actions {
      grid-template-columns: 1fr 1fr;
    }

    table th:nth-child(4),
    table td:nth-child(4),
    table th:nth-child(5),
    table td:nth-child(5),
    table th:nth-child(8),
    table td:nth-child(8),
    table th:nth-child(9),
    table td:nth-child(9) {
      display: none;
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
