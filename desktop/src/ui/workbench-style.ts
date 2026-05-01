export const WORKBENCH_STYLE = `
  :root {
    --wb-bg: #eef3f9;
    --wb-panel: #ffffff;
    --wb-card: #f9fcff;
    --wb-line: #dbe5f0;
    --wb-line-soft: #e8f0f8;
    --wb-text: #10273d;
    --wb-muted: #5f7388;
    --wb-brand: #1a5ea8;
    --wb-brand-strong: #144578;
    --wb-brand-soft: #eaf3ff;
    --wb-ok: #207849;
    --wb-ok-soft: #ebf9f1;
    --wb-warn: #ae6d1d;
    --wb-warn-soft: #fff3e5;
    --wb-danger: #b53b35;
    --wb-danger-soft: #fff0ef;
    --wb-info: #1f5ea8;
    --wb-info-soft: #edf5ff;
    --wb-shadow: 0 16px 30px rgba(13, 28, 42, 0.08);
    --wb-space-1: 6px;
    --wb-space-2: 10px;
    --wb-space-3: 14px;
    --wb-space-4: 18px;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    color: var(--wb-text);
    background: var(--wb-bg);
    font-family: "Avenir Next", "Segoe UI Variable Text", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  }

  .workbench {
    min-height: 100vh;
    background:
      radial-gradient(1100px 520px at -6% -9%, #d8ebff 0%, transparent 58%),
      radial-gradient(820px 420px at 104% -10%, #e8fff3 0%, transparent 56%),
      var(--wb-bg);
    color: var(--wb-text);
    padding: var(--wb-space-4);
  }

  .hero {
    border-radius: 18px;
    color: #f7fbff;
    padding: 20px 24px;
    background: linear-gradient(132deg, #153a62 0%, #1d557f 50%, #2f765f 100%);
    box-shadow: 0 22px 42px rgba(16, 28, 45, 0.25);
    animation: wbFadeIn 260ms ease-out;
  }

  .hero h1 {
    margin: 0;
    font-size: 30px;
    letter-spacing: 0.3px;
  }

  .hero p {
    margin: var(--wb-space-2) 0 0;
    font-size: 13px;
    color: rgba(247, 251, 255, 0.88);
  }

  .status-strip {
    margin-top: var(--wb-space-2);
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--wb-space-1);
  }

  .status-item {
    border: 1px solid rgba(210, 228, 247, 0.62);
    border-radius: 10px;
    background: rgba(245, 251, 255, 0.34);
    padding: 8px 10px;
    display: grid;
    gap: 2px;
  }

  .status-item span {
    font-size: 11px;
    color: rgba(238, 248, 255, 0.86);
  }

  .status-item strong {
    font-size: 13px;
    color: #ffffff;
    font-weight: 600;
  }

  .layout {
    margin-top: var(--wb-space-3);
    display: grid;
    grid-template-columns: minmax(0, 1.9fr) minmax(360px, 1fr);
    gap: var(--wb-space-3);
  }

  .panel {
    background: var(--wb-panel);
    border: 1px solid var(--wb-line);
    border-radius: 14px;
    box-shadow: var(--wb-shadow);
    padding: var(--wb-space-3);
    animation: wbFadeIn 320ms ease-out;
  }

  .panel h2 {
    margin: 0;
    font-size: 20px;
  }

  .muted {
    color: var(--wb-muted);
    font-size: 12px;
  }

  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .section-title {
    margin: 14px 0 8px;
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #4e677f;
    font-weight: 700;
  }

  .kpis {
    margin-top: var(--wb-space-2);
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: var(--wb-space-1);
  }

  .kpi {
    border: 1px solid var(--wb-line-soft);
    border-radius: 11px;
    background: var(--wb-card);
    padding: 8px;
  }

  .kpi .v {
    color: var(--wb-brand-strong);
    font-size: 22px;
    font-weight: 700;
    line-height: 1.1;
  }

  .kpi .k {
    margin-top: 2px;
    color: var(--wb-muted);
    font-size: 11px;
  }

  .action-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--wb-space-1);
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
    border: 1px solid #efc7c5;
    border-radius: 10px;
    background: #fff7f7;
    padding: 10px;
  }

  .danger-zone-title {
    color: #a23430;
    font-size: 12px;
    font-weight: 700;
  }

  .danger-zone-tip {
    margin: 6px 0 8px;
    color: #8f3732;
    font-size: 12px;
    line-height: 1.45;
  }

  .controls {
    margin-top: var(--wb-space-2);
    display: grid;
    gap: var(--wb-space-1);
  }

  .controls label {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: var(--wb-text);
    font-size: 12px;
  }

  .controls input[type="checkbox"] {
    width: 14px;
    height: 14px;
    margin: 0;
  }

  .risk-box {
    border: 1px solid #f0dbd8;
    border-radius: 10px;
    background: #fff8f7;
    color: #97332f;
    padding: 8px 10px;
    font-size: 12px;
    line-height: 1.45;
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
    font-size: 12px;
    line-height: 1.4;
  }

  .table-wrap {
    margin-top: var(--wb-space-2);
    border: 1px solid var(--wb-line);
    border-radius: 10px;
    overflow: auto;
    max-height: 430px;
    background: #fff;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  th,
  td {
    border-bottom: 1px solid var(--wb-line-soft);
    padding: 8px;
    text-align: left;
    white-space: nowrap;
    vertical-align: middle;
  }

  th {
    position: sticky;
    top: 0;
    z-index: 1;
    color: #4f6073;
    font-weight: 600;
    background: #f6fbff;
  }

  tbody tr {
    cursor: pointer;
    transition: background-color 120ms ease;
  }

  tbody tr:hover {
    background: #f8fbff;
  }

  .row-active {
    background: #eaf4ff !important;
  }

  .state-pill {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 2px 9px;
    font-size: 11px;
    font-weight: 700;
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
    border-radius: 10px;
    background: #fbfdff;
    padding: var(--wb-space-2);
  }

  .thread-detail h3 {
    margin: 0;
    font-size: 14px;
  }

  .thread-meta-grid {
    margin-top: var(--wb-space-1);
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--wb-space-1);
  }

  .thread-meta-grid > div {
    border: 1px solid var(--wb-line-soft);
    border-radius: 9px;
    background: #fff;
    padding: 8px;
    display: grid;
    gap: 3px;
  }

  .thread-meta-grid > div span {
    color: var(--wb-muted);
    font-size: 11px;
  }

  .thread-meta-grid > div strong {
    color: var(--wb-text);
    font-size: 12px;
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
    border-radius: 10px;
    background: var(--wb-card);
    padding: var(--wb-space-2);
  }

  .card h3 {
    margin: 0 0 var(--wb-space-1);
    font-size: 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--wb-space-2);
  }

  .log-box {
    border: 1px solid var(--wb-line);
    border-radius: 10px;
    max-height: 280px;
    overflow: auto;
    background: #f8fbff;
  }

  .log-row {
    display: grid;
    grid-template-columns: 154px 66px minmax(0, 1fr);
    align-items: start;
    gap: 8px;
    padding: 8px 10px;
    border-bottom: 1px solid #eaf0f6;
    font-size: 12px;
  }

  .log-time {
    color: #445b72;
    font-family: "JetBrains Mono", "Cascadia Mono", "Consolas", monospace;
  }

  .log-level {
    display: inline-flex;
    justify-content: center;
    min-width: 56px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border: 1px solid transparent;
  }

  .log-message {
    color: var(--wb-text);
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.45;
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
    border-radius: 9px;
    background: #fff;
    padding: 8px;
    font-size: 11px;
    color: #506074;
  }

  .cursor-step-state {
    margin-bottom: 2px;
    font-size: 10px;
    letter-spacing: 0.2px;
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
    padding: 14px;
  }

  .banner {
    margin-top: var(--wb-space-2);
    border-radius: 10px;
    padding: 9px 12px;
    font-size: 13px;
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
    border: 1px solid #ccdae8;
    border-radius: 9px;
    background: #fff;
    color: var(--wb-text);
    padding: 6px 10px;
    cursor: pointer;
    transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease, background-color 120ms ease;
  }

  button:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: #95afcb;
    box-shadow: 0 6px 14px rgba(36, 61, 86, 0.12);
  }

  button:focus-visible,
  select:focus-visible,
  input:focus-visible {
    outline: 3px solid #2f7dd2;
    outline-offset: 2px;
  }

  [data-row-id] {
    outline: none;
  }

  [data-row-id]:focus-visible,
  .filter-chip:focus-visible {
    outline: 3px solid #2f7dd2;
    outline-offset: 2px;
  }

  [data-row-id]:focus-visible {
    background: #e1efff !important;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .btn-soft {
    border-color: #c6d8eb;
    background: #f6fbff;
    color: #1f537e;
  }

  .btn-soft:hover:not(:disabled) {
    border-color: #a8c4df;
    background: #eef6ff;
  }

  .btn-primary {
    color: #fff;
    border-color: var(--wb-brand);
    background: var(--wb-brand);
  }

  .btn-primary:hover:not(:disabled) {
    border-color: #1f70c3;
    background: #1f70c3;
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
    border-color: #ca3f39;
    background: #ca3f39;
  }

  .danger-outline {
    border-color: #d96f69 !important;
    box-shadow: 0 0 0 2px rgba(212, 74, 66, 0.14);
  }

  select,
  input[type="text"] {
    width: 100%;
    border: 1px solid #ccdae8;
    border-radius: 8px;
    background: #fff;
    color: var(--wb-text);
    padding: 6px 8px;
  }

  .mono {
    font-family: "JetBrains Mono", "Cascadia Mono", "Consolas", monospace;
    font-size: 11px;
  }

  .filter-chip {
    border: 1px solid #cfdae8;
    border-radius: 999px;
    background: #fff;
    font-size: 12px;
    padding: 5px 10px;
  }

  .filter-chip.active {
    color: #fff;
    border-color: var(--wb-brand);
    background: var(--wb-brand);
  }

  ul.compact-list {
    margin: 4px 0 0;
    padding-left: 18px;
    font-size: 12px;
    color: #385066;
  }

  .meta-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--wb-muted);
  }

  @keyframes wbFadeIn {
    from {
      opacity: 0;
      transform: translateY(7px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 1280px) {
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
      gap: 5px;
    }
  }
`;
