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
    background: #080c11;
    color: #e6ecf3;
    font-family: "Segoe UI Variable Text", "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 12px;
    line-height: 1.42;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
  }

  #root {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .workbench {
    --bg-app: #0d1218;
    --bg-shell-top: #111823;
    --bg-shell-bottom: #0f151d;
    --bg-panel: #131a24;
    --bg-panel-soft: #121823;
    --bg-card: #111823;
    --bg-hover: #1a2431;
    --line: #27313f;
    --line-soft: #202a37;
    --text: #e6ecf3;
    --muted: #93a0b1;
    --accent: #2fb876;
    --accent-soft: rgba(47, 184, 118, 0.16);
    --warn: #d6a457;
    --warn-soft: rgba(214, 164, 87, 0.18);
    --danger: #d47373;
    --danger-soft: rgba(212, 115, 115, 0.18);
    --info: #79b8ff;
    --info-soft: rgba(121, 184, 255, 0.18);
    --radius: 10px;
    --r-sm: 8px;
    --s1: 4px;
    --s2: 8px;
    --s3: 11px;
    --s4: 15px;
    width: 100%;
    height: 100%;
    padding: 6px;
    background:
      radial-gradient(760px 420px at 12% -16%, rgba(84, 122, 175, 0.18), transparent 66%),
      linear-gradient(180deg, #0a0f15 0%, #080c11 100%);
    overflow: hidden;
  }

  .app-shell {
    width: 100%;
    height: 100%;
    border: 1px solid var(--line);
    border-radius: 11px;
    background: linear-gradient(180deg, var(--bg-shell-top), var(--bg-shell-bottom));
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.3);
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr) auto auto;
    gap: 7px;
    padding: var(--s2);
    overflow: hidden;
  }

  .workbench[data-busy="1"] .app-shell {
    cursor: progress;
  }

  .workbench[data-busy="1"] .chrome-bar,
  .workbench[data-busy="1"] .topbar,
  .workbench[data-busy="1"] .layout {
    pointer-events: none;
  }

  .chrome-bar {
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: #141b26;
    min-height: 32px;
    padding: 0 9px;
    display: grid;
    grid-template-columns: 60px 1fr auto;
    align-items: center;
    gap: var(--s2);
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
    background: #d27474;
  }

  .chrome-dot.yellow {
    background: #d5a85f;
  }

  .chrome-dot.green {
    background: #36c080;
  }

  .chrome-title {
    color: #e4ebf5;
    font-size: 12px;
    font-weight: 620;
    letter-spacing: 0.01em;
  }

  .chrome-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .chrome-pill {
    border: 1px solid var(--line);
    border-radius: 999px;
    background: #101722;
    color: #a6b2c2;
    padding: 2px 8px;
    font-size: 10px;
    line-height: 1.2;
    white-space: nowrap;
  }

  .topbar {
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: linear-gradient(126deg, #1b2737 0%, #1a2430 55%, #18212b 100%);
    padding: 7px 9px;
    overflow: hidden;
  }

  .topbar-head {
    align-items: center;
  }

  .topbar h1 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.01em;
    color: #f4f8fe;
    line-height: 1.25;
  }

  .topbar-tag {
    display: inline-flex;
    align-items: center;
    border: 1px solid rgba(145, 174, 211, 0.42);
    border-radius: 999px;
    background: rgba(18, 29, 43, 0.54);
    color: #bed1e7;
    padding: 2px 9px;
    font-size: 10px;
    white-space: nowrap;
  }

  .control-strip {
    margin-top: 7px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }

  .status-item {
    border: 1px solid rgba(149, 169, 195, 0.34);
    border-radius: 8px;
    background: rgba(16, 24, 35, 0.38);
    padding: 5px 7px;
    display: grid;
    gap: 1px;
  }

  .status-item span {
    color: #a5b7ce;
    font-size: 10px;
  }

  .status-item strong {
    color: #f5f9ff;
    font-size: 16px;
    line-height: 1.1;
    font-weight: 680;
  }

  .status-inline {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .status-inline strong {
    font-size: 15px;
    text-align: right;
  }

  .layout {
    min-height: 0;
    overflow: hidden;
    display: grid;
    grid-template-columns: minmax(0, 1.68fr) minmax(320px, 0.94fr);
    gap: var(--s2);
  }

  .panel {
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: linear-gradient(180deg, #141b25 0%, #121923 100%);
    padding: var(--s3);
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: auto;
    scrollbar-gutter: stable;
    overscroll-behavior: contain;
  }

  .panel h2 {
    margin: 0;
    font-size: 13px;
    font-weight: 660;
    color: #eff4fb;
  }

  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s2);
  }

  .section-title {
    margin: var(--s2) 0 var(--s1);
    color: #8d9caf;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 700;
  }

  .section-block {
    margin-top: 6px;
  }

  .panel > .action-grid.section-block {
    order: 4;
    margin-top: 6px;
    padding: 8px;
    border: 1px solid #304156;
    border-radius: 10px;
    background: linear-gradient(180deg, rgba(28, 39, 54, 0.84), rgba(18, 26, 37, 0.9));
    box-shadow:
      inset 0 0 0 1px rgba(126, 161, 206, 0.12),
      0 6px 14px rgba(0, 0, 0, 0.2);
    position: sticky;
    top: 2px;
    z-index: 5;
  }

  .panel > .card.section-block {
    order: 5;
  }

  .panel > .action-grid.section-block > .card:first-child {
    border-color: #3a516b;
    background: linear-gradient(160deg, rgba(30, 44, 62, 0.93), rgba(19, 28, 40, 0.96));
    box-shadow: inset 0 0 0 1px rgba(120, 157, 201, 0.16);
  }

  .panel > .action-grid.section-block > .card:first-child .card-head h3 {
    color: #f0f6ff;
    font-size: 13px;
  }

  .panel > .action-grid.section-block > .card:last-child {
    border-color: #2f3d50;
    background: linear-gradient(180deg, #141d28, #121923);
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
    margin-top: var(--s2);
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 5px;
  }

  .kpi {
    border: 1px solid var(--line-soft);
    border-radius: var(--r-sm);
    background: var(--bg-panel-soft);
    padding: 5px 6px;
  }

  .kpi .v {
    color: #f4f8ff;
    font-size: 16px;
    line-height: 1.08;
    font-weight: 680;
  }

  .kpi .k {
    margin-top: 2px;
    color: #92a1b5;
    font-size: 10px;
  }

  .action-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--s2);
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s1);
  }

  .danger-zone {
    border: 1px solid #4a3639;
    border-radius: var(--r-sm);
    background: linear-gradient(180deg, #22191b 0%, #1e1719 100%);
    padding: 7px;
  }

  .danger-zone-title {
    color: #f3a4a4;
    font-size: 11px;
    font-weight: 700;
  }

  .danger-zone-tip {
    margin: 3px 0 6px;
    color: #c98f8f;
    font-size: 11px;
    line-height: 1.32;
  }

  .risk-checklist {
    display: grid;
    gap: var(--s1);
  }

  .check-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s2);
    border: 1px solid var(--line-soft);
    border-radius: var(--r-sm);
    background: #131a24;
    padding: 6px 8px;
  }

  .check-row label,
  .patch-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #dbe4ee;
    font-size: 11px;
  }

  .check-state {
    color: #94a3b6;
    font-size: 10px;
    white-space: nowrap;
  }

  .risk-box {
    border: 1px solid #43383d;
    border-radius: var(--r-sm);
    background: #1b161a;
    color: #d8b5bf;
    padding: 7px 9px;
    display: grid;
    gap: 2px;
    font-size: 11px;
  }

  .thread-controls {
    margin-top: var(--s1);
    display: grid;
    grid-template-columns: 1fr 152px auto;
    gap: 5px;
    align-items: center;
  }

  .filter-row {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .table-wrap {
    margin-top: var(--s2);
    border: 1px solid var(--line);
    border-radius: var(--r-sm);
    background: #101722;
    overflow-x: auto;
    overflow-y: visible;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }

  th,
  td {
    border-bottom: 1px solid var(--line-soft);
    padding: 5px 6px;
    text-align: left;
    white-space: nowrap;
    vertical-align: middle;
  }

  th {
    position: sticky;
    top: 0;
    z-index: 1;
    color: #9eb0c7;
    font-weight: 630;
    background: #141d28;
  }

  tbody tr {
    cursor: pointer;
  }

  tbody tr:hover {
    background: #1a2431;
  }

  .row-active {
    background: #213043 !important;
  }

  .state-pill {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 1px 8px;
    font-size: 10px;
    font-weight: 690;
    letter-spacing: 0.01em;
  }

  .state-pill.ok {
    color: #7de8ac;
    background: var(--accent-soft);
  }

  .state-pill.warn {
    color: #f3cd86;
    background: var(--warn-soft);
  }

  .state-pill.danger {
    color: #f2a2a2;
    background: var(--danger-soft);
  }

  .thread-detail {
    margin-top: var(--s2);
    border: 1px solid var(--line-soft);
    border-radius: var(--r-sm);
    background: #121925;
    padding: var(--s2);
  }

  .thread-detail h3 {
    margin: 0;
    font-size: 12px;
    font-weight: 630;
  }

  .thread-meta-grid {
    margin-top: var(--s1);
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--s1);
  }

  .thread-meta-grid > div {
    border: 1px solid var(--line-soft);
    border-radius: 7px;
    background: #101723;
    padding: 6px 7px;
    display: grid;
    gap: 2px;
  }

  .thread-meta-grid span {
    color: #93a4b8;
    font-size: 10px;
  }

  .thread-meta-grid strong {
    color: #e8eef8;
    font-size: 11px;
    font-weight: 610;
  }

  .thread-meta-grid .wide {
    grid-column: span 2;
  }

  .operations-panel .cards {
    margin-top: var(--s2);
    display: grid;
    gap: var(--s2);
  }

  .card {
    border: 1px solid var(--line-soft);
    border-radius: var(--r-sm);
    background: var(--bg-card);
    padding: var(--s2);
  }

  .card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s2);
    margin-bottom: var(--s1);
  }

  .card h3 {
    margin: 0;
    font-size: 12px;
    font-weight: 630;
  }

  .card h4 {
    margin: 0 0 4px;
    font-size: 11px;
    font-weight: 620;
    color: #c9d8ea;
  }

  .card-body {
    display: grid;
    gap: var(--s1);
  }

  .mini-card {
    border: 1px solid var(--line-soft);
    border-radius: 7px;
    background: #101823;
    padding: 6px;
  }

  .mini-card p {
    margin: 0;
    color: #b6c4d8;
    font-size: 11px;
    line-height: 1.36;
  }

  .stacked {
    gap: var(--s1);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--s1);
  }

  .meta-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s2);
    color: #9aa9bd;
    font-size: 11px;
  }

  .compact-list {
    margin: 4px 0 0;
    padding-left: 16px;
    color: #bac8dc;
    font-size: 11px;
  }

  .log-box {
    border: 1px solid var(--line-soft);
    border-radius: 7px;
    background: #101722;
    overflow: hidden;
  }

  .log-row {
    display: grid;
    grid-template-columns: 110px 48px minmax(0, 1fr);
    gap: 6px;
    align-items: start;
    padding: 6px 8px;
    border-bottom: 1px solid #202a37;
    font-size: 11px;
  }

  .log-time {
    color: #8da0b8;
    font-family: "JetBrains Mono", "Cascadia Mono", "Consolas", monospace;
  }

  .log-level {
    display: inline-flex;
    justify-content: center;
    min-width: 48px;
    border-radius: 999px;
    padding: 1px 6px;
    font-size: 10px;
    font-weight: 700;
  }

  .log-message {
    color: #dbe5f2;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .log-row.info .log-level {
    color: #8ec4ff;
    background: var(--info-soft);
  }

  .log-row.success .log-level {
    color: #8ae8b3;
    background: var(--accent-soft);
  }

  .log-row.warning .log-level {
    color: #f1cb84;
    background: var(--warn-soft);
  }

  .log-row.error .log-level {
    color: #f1abab;
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
    background: #111823;
    padding: 5px 6px;
    font-size: 10px;
    color: #9cade0;
  }

  .cursor-step-state {
    margin-bottom: 2px;
    font-size: 9px;
  }

  .cursor-step.done {
    border-color: #2f5e47;
    background: rgba(47, 184, 118, 0.14);
    color: #87e8b2;
  }

  .cursor-step.current {
    border-color: #345679;
    background: rgba(121, 184, 255, 0.15);
    color: #93c8ff;
  }

  .cell-empty {
    color: #8e9fb4;
    text-align: center;
    padding: 12px;
    font-size: 11px;
  }

  .banner {
    border-radius: var(--r-sm);
    padding: 6px 8px;
    font-size: 11px;
    border: 1px solid transparent;
  }

  .banner-busy {
    color: #8fc7ff;
    background: rgba(121, 184, 255, 0.13);
    border-color: #355271;
  }

  .banner-error {
    color: #f3b3b3;
    background: rgba(212, 115, 115, 0.14);
    border-color: #5b3d42;
  }

  button,
  select,
  input {
    font: inherit;
    color: inherit;
  }

  button,
  select,
  input[type="text"] {
    -webkit-appearance: none;
    appearance: none;
  }

  button {
    border: 1px solid #334051;
    border-radius: 8px;
    background: #19222e;
    color: #d4deea;
    padding: 4px 8px;
    line-height: 1.2;
    cursor: pointer;
    transition:
      background-color 120ms ease,
      border-color 120ms ease,
      color 120ms ease,
      box-shadow 120ms ease;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  button:hover:not(:disabled) {
    border-color: #43566d;
    background: #212d3b;
  }

  button:active:not(:disabled) {
    border-color: #4f6580;
    background: #263445;
    transform: translateY(0.5px);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-soft {
    background: #19222f;
    border-color: #2d394a;
    color: #bed0e5;
  }

  .btn-primary {
    color: #e8fff3;
    border-color: #289665;
    background: #23845a;
  }

  .btn-primary:hover:not(:disabled) {
    border-color: #2eb273;
    background: #269367;
  }

  .btn-warning {
    color: #f2d4a0;
    border-color: #6a593d;
    background: #292319;
  }

  .btn-danger {
    color: #ffd6d6;
    border-color: #8d4949;
    background: #683238;
  }

  .btn-mini {
    padding: 2px 7px;
    font-size: 10px;
    line-height: 1.2;
  }

  .panel > .action-grid.section-block > .card:first-child .toolbar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 5px;
  }

  .panel > .action-grid.section-block > .card:first-child .toolbar button {
    width: 100%;
    min-height: 32px;
    padding: 5px 10px;
    font-size: 12px;
    font-weight: 620;
    border-color: #3f5268;
    background: #1f2a38;
    color: #dce8f8;
  }

  .panel > .action-grid.section-block > .card:first-child .toolbar button:hover:not(:disabled) {
    border-color: #536b86;
    background: #243245;
  }

  .panel > .action-grid.section-block > .card:first-child [data-id="sync-selected"],
  .panel > .action-grid.section-block > .card:first-child [data-id="sync-candidates"],
  .panel > .action-grid.section-block > .card:first-child [data-id="delete-selected"] {
    min-height: 34px;
    padding: 6px 11px;
    font-weight: 680;
    letter-spacing: 0.01em;
    box-shadow: 0 0 0 1px rgba(120, 158, 205, 0.26);
  }

  .panel > .action-grid.section-block > .card:first-child [data-id="sync-selected"],
  .panel > .action-grid.section-block > .card:first-child [data-id="sync-candidates"] {
    border-color: #3a638c !important;
    background: linear-gradient(180deg, #24547d, #1f496d);
    color: #eaf4ff;
  }

  .panel > .action-grid.section-block > .card:first-child [data-id="sync-selected"]:hover:not(:disabled),
  .panel > .action-grid.section-block > .card:first-child [data-id="sync-candidates"]:hover:not(:disabled) {
    border-color: #4a7bab !important;
    background: linear-gradient(180deg, #2b628f, #24547b);
  }

  .panel > .action-grid.section-block > .card:first-child [data-id="delete-selected"] {
    border-color: #8b4f57 !important;
    background: linear-gradient(180deg, #7b3e47, #6a343d);
    color: #ffe3e3;
    box-shadow: 0 0 0 1px rgba(181, 109, 119, 0.26);
  }

  .panel > .action-grid.section-block > .card:first-child [data-id="delete-selected"]:hover:not(:disabled) {
    border-color: #a7636d !important;
    background: linear-gradient(180deg, #8a4a54, #7a4049);
  }

  [data-toggle-panel][data-open="0"] {
    border-color: #303d4f;
    background: #171f2b;
    color: #9fb2c8;
  }

  .danger-outline {
    border-color: #815151 !important;
  }

  select,
  input[type="text"] {
    width: 100%;
    min-height: 28px;
    border: 1px solid #334152;
    border-radius: 8px;
    background: #111926;
    color: #e3ebf6;
    padding: 4px 7px;
  }

  input[type="checkbox"] {
    width: 13px;
    height: 13px;
    margin: 0;
    accent-color: #2fb876;
  }

  .filter-chip {
    border: 1px solid #354354;
    border-radius: 999px;
    background: #121a26;
    color: #aebbcf;
    font-size: 10px;
    padding: 4px 9px;
  }

  .filter-chip.active {
    color: #e8fff4;
    border-color: #2cab70;
    background: #1f8258;
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
    outline: 2px solid #5aa7ff;
    outline-offset: 1px;
  }

  [data-row-id]:focus-visible {
    background: #26374d !important;
  }

  .card-collapsible[data-collapsed="1"] .card-head {
    margin-bottom: 0;
  }

  ::-webkit-scrollbar {
    width: 9px;
    height: 9px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: #2a3645;
    border-radius: 999px;
    border: 2px solid transparent;
    background-clip: padding-box;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #334255;
    border: 2px solid transparent;
    background-clip: padding-box;
  }

  @media (min-width: 2560px) {
    .workbench {
      padding: 10px;
    }

    .app-shell {
      padding: 12px;
      gap: 10px;
    }

    .topbar h1 {
      font-size: 19px;
    }

    .layout {
      grid-template-columns: minmax(0, 1.84fr) minmax(430px, 0.88fr);
      gap: 12px;
    }

    .panel {
      padding: 13px;
    }

    .kpis {
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 8px;
    }

    .thread-controls {
      grid-template-columns: 1fr 188px auto;
      gap: 6px;
    }
  }

  @media (min-width: 1920px) and (max-width: 2559px) {
    .workbench {
      padding: 8px;
    }

    .app-shell {
      padding: 10px;
      gap: 8px;
    }

    .layout {
      grid-template-columns: minmax(0, 1.76fr) minmax(360px, 0.9fr);
      gap: 10px;
    }

    .panel {
      padding: 12px;
    }

    .kpis {
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 7px;
    }
  }

  @media (max-width: 1360px), (max-height: 760px) {
    .workbench {
      padding: 4px;
    }

    .app-shell {
      padding: 6px;
      gap: 5px;
    }

    .chrome-bar {
      min-height: 30px;
      padding: 0 8px;
    }

    .chrome-title {
      font-size: 11px;
    }

    .topbar {
      padding: 6px 8px;
    }

    .topbar h1 {
      font-size: 14px;
    }

    .topbar-tag {
      padding: 2px 7px;
      font-size: 9px;
    }

    .control-strip {
      margin-top: 6px;
      gap: 5px;
    }

    .status-item {
      padding: 4px 6px;
    }

    .status-item span {
      font-size: 9px;
    }

    .status-item strong,
    .status-inline strong {
      font-size: 14px;
    }

    .layout {
      grid-template-columns: minmax(0, 1.56fr) minmax(280px, 0.92fr);
      gap: 6px;
    }

    .panel {
      padding: 8px;
    }

    .operations-panel .cards {
      margin-top: 6px;
      gap: 6px;
    }

    .card {
      padding: 7px;
    }

    .kpis {
      gap: 5px;
    }

    .kpi {
      padding: 4px 6px;
    }

    .kpi .v {
      font-size: 15px;
    }

    .panel > .action-grid.section-block {
      position: relative;
      top: 0;
      z-index: 1;
      padding: 7px;
      box-shadow: inset 0 0 0 1px rgba(118, 152, 197, 0.1);
    }

    .panel > .action-grid.section-block > .card:first-child .toolbar button {
      min-height: 30px;
      font-size: 11px;
      padding: 4px 9px;
    }

    .panel > .action-grid.section-block > .card:first-child [data-id="sync-selected"],
    .panel > .action-grid.section-block > .card:first-child [data-id="sync-candidates"],
    .panel > .action-grid.section-block > .card:first-child [data-id="delete-selected"] {
      min-height: 32px;
      padding: 5px 10px;
    }

    .thread-controls {
      grid-template-columns: 1fr 120px auto;
      gap: 4px;
    }

    th,
    td {
      padding: 5px;
    }
  }

  @media (max-width: 1120px), (max-height: 700px) {
    .layout {
      grid-template-columns: 1fr;
    }

    .control-strip {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .kpis {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .action-grid {
      grid-template-columns: 1fr;
    }

    .thread-controls {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 900px), (max-height: 640px) {
    .app-shell {
      border-radius: 10px;
    }

    .chrome-right {
      display: none;
    }

    .topbar-tag {
      display: none;
    }

    .control-strip {
      grid-template-columns: 1fr;
    }

    .kpis {
      grid-template-columns: 1fr 1fr;
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

    .log-row {
      grid-template-columns: 1fr;
      gap: 3px;
    }
  }

  @media (max-width: 800px), (max-height: 600px) {
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
