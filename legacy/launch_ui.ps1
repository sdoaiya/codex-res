param(
  [switch]$SmokeTest
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$script:UiScriptPath = $MyInvocation.MyCommand.Path
$script:ToolRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$script:BackendPath = Join-Path $script:ToolRoot 'sync_backend.py'
$script:BackupMap = @{}
$script:LatestState = $null

function Invoke-Backend {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  if (-not (Test-Path -LiteralPath $script:BackendPath)) {
    throw "缺少后端脚本: $script:BackendPath"
  }

  $output = & py -3 $script:BackendPath @Arguments 2>&1
  $exitCode = $LASTEXITCODE
  $text = (($output | ForEach-Object { "$_" }) -join [Environment]::NewLine).Trim()
  if (-not $text) {
    throw '后端没有返回任何内容。'
  }

  try {
    $json = $text | ConvertFrom-Json
  } catch {
    throw "后端 JSON 解析失败。`r`n原始错误: $($_.Exception.Message)`r`n返回内容:`r`n$text"
  }

  if ($exitCode -ne 0 -or -not $json.ok) {
    if ($json.error) {
      throw [string]$json.error
    }
    throw "后端执行失败。`r`n$text"
  }

  return $json
}

function Append-Log {
  param([string]$Message)

  $timestamp = Get-Date -Format 'HH:mm:ss'
  $logBox.AppendText("[$timestamp] $Message`r`n")
  $logBox.SelectionStart = $logBox.TextLength
  $logBox.ScrollToCaret()
}

function Format-Counts {
  param($Counts)

  if (-not $Counts -or $Counts.Count -eq 0) {
    return '无'
  }

  return (($Counts | ForEach-Object { "$($_.provider)=$($_.count)" }) -join ', ')
}

function Format-ModelCounts {
  param($Counts)

  if (-not $Counts -or $Counts.Count -eq 0) {
    return '无'
  }

  return (($Counts | ForEach-Object { "$($_.model)=$($_.count)" }) -join ', ')
}

function Confirm-Action {
  param(
    [string]$Message,
    [string]$Title = '确认操作',
    [System.Windows.Forms.MessageBoxIcon]$Icon = [System.Windows.Forms.MessageBoxIcon]::Question
  )

  $choice = [System.Windows.Forms.MessageBox]::Show(
    $Message,
    $Title,
    [System.Windows.Forms.MessageBoxButtons]::OKCancel,
    $Icon
  )

  return $choice -eq [System.Windows.Forms.DialogResult]::OK
}

function Get-CheckedThreadIds {
  $ids = New-Object System.Collections.Generic.List[string]
  foreach ($item in $threadsView.Items) {
    if ($item.Checked -and $item.Tag) {
      [void]$ids.Add([string]$item.Tag)
    }
  }
  return $ids
}

function Set-ThreadChecks {
  param([scriptblock]$Predicate)

  foreach ($item in $threadsView.Items) {
    $item.Checked = [bool](& $Predicate $item)
  }
  Update-SelectionLabel
}

function Update-SelectionLabel {
  $checked = 0
  foreach ($item in $threadsView.Items) {
    if ($item.Checked) {
      $checked += 1
    }
  }
  $selectionLabel.Text = "已勾选: $checked / $($threadsView.Items.Count)"
}

function Add-ThreadItem {
  param($Thread)

  $statusParts = New-Object System.Collections.Generic.List[string]
  if ($Thread.sync_candidate) {
    [void]$statusParts.Add('需处理')
  }
  if ([int]$Thread.archived -ne 0) {
    [void]$statusParts.Add('归档')
  }
  if (-not $Thread.exists_in_jsonl) {
    [void]$statusParts.Add('缺 JSONL')
  }
  if (-not $Thread.exists_in_db) {
    [void]$statusParts.Add('缺 DB')
  }
  if ($statusParts.Count -eq 0) {
    [void]$statusParts.Add('正常')
  }

  $jsonlProvider = if ($Thread.jsonl_provider) { [string]$Thread.jsonl_provider } else { '-' }
  $model = if ($Thread.model) { [string]$Thread.model } else { '-' }
  $updatedAt = if ($Thread.updated_at) { [string]$Thread.updated_at } else { '-' }

  $item = New-Object System.Windows.Forms.ListViewItem([string]$Thread.title)
  $item.Tag = [string]$Thread.id
  [void]$item.SubItems.Add([string]$Thread.provider)
  [void]$item.SubItems.Add($model)
  [void]$item.SubItems.Add($jsonlProvider)
  [void]$item.SubItems.Add(($statusParts -join ', '))
  [void]$item.SubItems.Add($updatedAt)
  [void]$item.SubItems.Add([string]$Thread.cwd)
  [void]$item.SubItems.Add([string]$Thread.id)
  if ($Thread.sync_candidate) {
    $item.BackColor = [System.Drawing.Color]::FromArgb(255, 248, 230)
  }
  [void]$threadsView.Items.Add($item)
}

function Refresh-State {
  $status = Invoke-Backend @('--json', 'status')
  $script:LatestState = $status

  $providerLabel.Text = "当前 provider: $($status.current_provider)    SQLite 待同步: $($status.provider_movable_threads)    JSONL 待修复: $($status.jsonl_provider_movable_threads)"
  $modelLabel.Text = if ($status.current_model) { "当前模型: $($status.current_model)    待同步模型线程: $($status.model_movable_threads)" } else { '当前模型: 未读取到' }
  $summaryLabel.Text = "数据库线程: $($status.total_threads)    当前 provider 可见: $($status.visible_threads)    列表会话: $($status.threads.Count)"
  $pathLabel.Text = "Codex 目录: $($status.codex_home)"

  $providersView.Items.Clear()
  foreach ($row in $status.provider_counts) {
    $isCurrent = if ($row.provider -eq $status.current_provider) { '是' } else { '' }
    $item = New-Object System.Windows.Forms.ListViewItem([string]$row.provider)
    [void]$item.SubItems.Add([string]$row.count)
    [void]$item.SubItems.Add($isCurrent)
    [void]$providersView.Items.Add($item)
  }

  $threadsView.Items.Clear()
  foreach ($thread in $status.threads) {
    Add-ThreadItem $thread
  }
  Update-SelectionLabel

  $backupList.Items.Clear()
  $script:BackupMap = @{}
  foreach ($backup in $status.backups) {
    $label = "$($backup.modified_at)    $($backup.name)"
    $script:BackupMap[$label] = $backup.path
    [void]$backupList.Items.Add($label)
  }

  Append-Log "状态已刷新。provider=$($status.current_provider)，可见=$($status.visible_threads)，列表=$($status.threads.Count)。"
}

function Invoke-Sync {
  param(
    [string[]]$ThreadIds,
    [bool]$AllCandidates
  )

  $args = @('--json', 'sync')
  if (-not $patchJsonlCheck.Checked) {
    $args += '--no-jsonl-patch'
  }
  if (-not $AllCandidates) {
    foreach ($id in $ThreadIds) {
      $args += @('--thread-id', $id)
    }
  }

  $result = Invoke-Backend $args
  Append-Log "同步完成。选中/候选 $($result.selected_threads) 条，SQLite 更新 $($result.updated_rows) 条，归档复制 $($result.copied_archived_jsonl) 个，JSONL 修复 $($result.jsonl_patched) 个文件。"
  Append-Log "Provider 同步前: $(Format-Counts $result.before_counts)"
  Append-Log "Provider 同步后: $(Format-Counts $result.after_counts)"
  Append-Log "模型同步前: $(Format-ModelCounts $result.before_model_counts)"
  Append-Log "模型同步后: $(Format-ModelCounts $result.after_model_counts)"
  Append-Log "数据库备份: $($result.backup_path)"
  Refresh-State
}

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Codex 对话恢复与管理工具'
$form.StartPosition = 'CenterScreen'
$form.Size = New-Object System.Drawing.Size(1120, 780)
$form.MinimumSize = New-Object System.Drawing.Size(1040, 720)
$form.BackColor = [System.Drawing.Color]::FromArgb(244, 247, 245)
$form.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 9)

$headerPanel = New-Object System.Windows.Forms.Panel
$headerPanel.Location = New-Object System.Drawing.Point(0, 0)
$headerPanel.Size = New-Object System.Drawing.Size(1120, 76)
$headerPanel.BackColor = [System.Drawing.Color]::FromArgb(22, 68, 63)
$form.Controls.Add($headerPanel)

$headerLabel = New-Object System.Windows.Forms.Label
$headerLabel.Text = 'Codex 对话恢复与管理'
$headerLabel.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 18, [System.Drawing.FontStyle]::Bold)
$headerLabel.ForeColor = [System.Drawing.Color]::White
$headerLabel.AutoSize = $true
$headerLabel.Location = New-Object System.Drawing.Point(22, 14)
$headerPanel.Controls.Add($headerLabel)

$subHeaderLabel = New-Object System.Windows.Forms.Label
$subHeaderLabel.Text = '持久修复 provider，选择迁移会话，安全删除不需要的记录'
$subHeaderLabel.ForeColor = [System.Drawing.Color]::FromArgb(202, 226, 218)
$subHeaderLabel.AutoSize = $true
$subHeaderLabel.Location = New-Object System.Drawing.Point(26, 48)
$headerPanel.Controls.Add($subHeaderLabel)

$providerLabel = New-Object System.Windows.Forms.Label
$providerLabel.Text = '当前 provider:'
$providerLabel.AutoSize = $true
$providerLabel.Location = New-Object System.Drawing.Point(22, 92)
$form.Controls.Add($providerLabel)

$modelLabel = New-Object System.Windows.Forms.Label
$modelLabel.Text = '当前模型:'
$modelLabel.AutoSize = $true
$modelLabel.Location = New-Object System.Drawing.Point(22, 116)
$form.Controls.Add($modelLabel)

$summaryLabel = New-Object System.Windows.Forms.Label
$summaryLabel.Text = '数据库线程:'
$summaryLabel.AutoSize = $true
$summaryLabel.Location = New-Object System.Drawing.Point(22, 140)
$form.Controls.Add($summaryLabel)

$pathLabel = New-Object System.Windows.Forms.Label
$pathLabel.Text = 'Codex 目录:'
$pathLabel.AutoSize = $true
$pathLabel.MaximumSize = New-Object System.Drawing.Size(1040, 0)
$pathLabel.Location = New-Object System.Drawing.Point(22, 164)
$form.Controls.Add($pathLabel)

$refreshButton = New-Object System.Windows.Forms.Button
$refreshButton.Text = '刷新'
$refreshButton.Size = New-Object System.Drawing.Size(80, 32)
$refreshButton.Location = New-Object System.Drawing.Point(22, 198)
$form.Controls.Add($refreshButton)

$selectCandidatesButton = New-Object System.Windows.Forms.Button
$selectCandidatesButton.Text = '勾选需处理'
$selectCandidatesButton.Size = New-Object System.Drawing.Size(100, 32)
$selectCandidatesButton.Location = New-Object System.Drawing.Point(112, 198)
$form.Controls.Add($selectCandidatesButton)

$selectAllButton = New-Object System.Windows.Forms.Button
$selectAllButton.Text = '全选'
$selectAllButton.Size = New-Object System.Drawing.Size(72, 32)
$selectAllButton.Location = New-Object System.Drawing.Point(222, 198)
$form.Controls.Add($selectAllButton)

$clearSelectionButton = New-Object System.Windows.Forms.Button
$clearSelectionButton.Text = '清空'
$clearSelectionButton.Size = New-Object System.Drawing.Size(72, 32)
$clearSelectionButton.Location = New-Object System.Drawing.Point(304, 198)
$form.Controls.Add($clearSelectionButton)

$syncSelectedButton = New-Object System.Windows.Forms.Button
$syncSelectedButton.Text = '同步选中'
$syncSelectedButton.Size = New-Object System.Drawing.Size(108, 32)
$syncSelectedButton.Location = New-Object System.Drawing.Point(398, 198)
$syncSelectedButton.BackColor = [System.Drawing.Color]::FromArgb(30, 104, 89)
$syncSelectedButton.ForeColor = [System.Drawing.Color]::White
$syncSelectedButton.FlatStyle = 'Flat'
$form.Controls.Add($syncSelectedButton)

$syncAllButton = New-Object System.Windows.Forms.Button
$syncAllButton.Text = '同步全部需处理'
$syncAllButton.Size = New-Object System.Drawing.Size(128, 32)
$syncAllButton.Location = New-Object System.Drawing.Point(516, 198)
$syncAllButton.BackColor = [System.Drawing.Color]::FromArgb(31, 82, 144)
$syncAllButton.ForeColor = [System.Drawing.Color]::White
$syncAllButton.FlatStyle = 'Flat'
$form.Controls.Add($syncAllButton)

$deleteSelectedButton = New-Object System.Windows.Forms.Button
$deleteSelectedButton.Text = '删除选中'
$deleteSelectedButton.Size = New-Object System.Drawing.Size(108, 32)
$deleteSelectedButton.Location = New-Object System.Drawing.Point(654, 198)
$deleteSelectedButton.BackColor = [System.Drawing.Color]::FromArgb(162, 52, 44)
$deleteSelectedButton.ForeColor = [System.Drawing.Color]::White
$deleteSelectedButton.FlatStyle = 'Flat'
$form.Controls.Add($deleteSelectedButton)

$patchJsonlCheck = New-Object System.Windows.Forms.CheckBox
$patchJsonlCheck.Text = '同步时修复 JSONL 头部（防止 Cursor 重建后再次消失）'
$patchJsonlCheck.Checked = $true
$patchJsonlCheck.AutoSize = $true
$patchJsonlCheck.Location = New-Object System.Drawing.Point(782, 204)
$form.Controls.Add($patchJsonlCheck)

$threadsBox = New-Object System.Windows.Forms.GroupBox
$threadsBox.Text = '会话列表（勾选后可迁移或删除）'
$threadsBox.Location = New-Object System.Drawing.Point(22, 242)
$threadsBox.Size = New-Object System.Drawing.Size(1060, 270)
$form.Controls.Add($threadsBox)

$selectionLabel = New-Object System.Windows.Forms.Label
$selectionLabel.Text = '已勾选: 0'
$selectionLabel.AutoSize = $true
$selectionLabel.Location = New-Object System.Drawing.Point(850, 0)
$threadsBox.Controls.Add($selectionLabel)

$threadsView = New-Object System.Windows.Forms.ListView
$threadsView.View = 'Details'
$threadsView.CheckBoxes = $true
$threadsView.FullRowSelect = $true
$threadsView.GridLines = $true
$threadsView.Location = New-Object System.Drawing.Point(12, 24)
$threadsView.Size = New-Object System.Drawing.Size(1036, 234)
[void]$threadsView.Columns.Add('标题', 260)
[void]$threadsView.Columns.Add('SQLite Provider', 105)
[void]$threadsView.Columns.Add('模型', 90)
[void]$threadsView.Columns.Add('JSONL Provider', 105)
[void]$threadsView.Columns.Add('状态', 85)
[void]$threadsView.Columns.Add('更新时间', 145)
[void]$threadsView.Columns.Add('工作目录', 160)
[void]$threadsView.Columns.Add('ID', 220)
$threadsBox.Controls.Add($threadsView)

$providersBox = New-Object System.Windows.Forms.GroupBox
$providersBox.Text = 'Provider 统计'
$providersBox.Location = New-Object System.Drawing.Point(22, 524)
$providersBox.Size = New-Object System.Drawing.Size(330, 110)
$form.Controls.Add($providersBox)

$providersView = New-Object System.Windows.Forms.ListView
$providersView.View = 'Details'
$providersView.FullRowSelect = $true
$providersView.GridLines = $true
$providersView.Location = New-Object System.Drawing.Point(12, 24)
$providersView.Size = New-Object System.Drawing.Size(306, 74)
[void]$providersView.Columns.Add('Provider', 150)
[void]$providersView.Columns.Add('线程数', 70)
[void]$providersView.Columns.Add('当前', 60)
$providersBox.Controls.Add($providersView)

$backupsBox = New-Object System.Windows.Forms.GroupBox
$backupsBox.Text = '备份'
$backupsBox.Location = New-Object System.Drawing.Point(370, 524)
$backupsBox.Size = New-Object System.Drawing.Size(350, 110)
$form.Controls.Add($backupsBox)

$backupList = New-Object System.Windows.Forms.ListBox
$backupList.Location = New-Object System.Drawing.Point(12, 22)
$backupList.Size = New-Object System.Drawing.Size(326, 48)
$backupsBox.Controls.Add($backupList)

$restoreButton = New-Object System.Windows.Forms.Button
$restoreButton.Text = '恢复选中备份'
$restoreButton.Size = New-Object System.Drawing.Size(112, 28)
$restoreButton.Location = New-Object System.Drawing.Point(12, 76)
$backupsBox.Controls.Add($restoreButton)

$restoreLatestButton = New-Object System.Windows.Forms.Button
$restoreLatestButton.Text = '恢复最新'
$restoreLatestButton.Size = New-Object System.Drawing.Size(86, 28)
$restoreLatestButton.Location = New-Object System.Drawing.Point(134, 76)
$backupsBox.Controls.Add($restoreLatestButton)

$backupButton = New-Object System.Windows.Forms.Button
$backupButton.Text = '手动备份'
$backupButton.Size = New-Object System.Drawing.Size(86, 28)
$backupButton.Location = New-Object System.Drawing.Point(230, 76)
$backupsBox.Controls.Add($backupButton)

$utilityBox = New-Object System.Windows.Forms.GroupBox
$utilityBox.Text = '工具'
$utilityBox.Location = New-Object System.Drawing.Point(738, 524)
$utilityBox.Size = New-Object System.Drawing.Size(344, 110)
$form.Controls.Add($utilityBox)

$openBackupsButton = New-Object System.Windows.Forms.Button
$openBackupsButton.Text = '打开备份目录'
$openBackupsButton.Size = New-Object System.Drawing.Size(112, 30)
$openBackupsButton.Location = New-Object System.Drawing.Point(14, 26)
$utilityBox.Controls.Add($openBackupsButton)

$openDeletedButton = New-Object System.Windows.Forms.Button
$openDeletedButton.Text = '打开删除目录'
$openDeletedButton.Size = New-Object System.Drawing.Size(112, 30)
$openDeletedButton.Location = New-Object System.Drawing.Point(138, 26)
$utilityBox.Controls.Add($openDeletedButton)

$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Multiline = $true
$logBox.ScrollBars = 'Vertical'
$logBox.ReadOnly = $true
$logBox.Location = New-Object System.Drawing.Point(22, 648)
$logBox.Size = New-Object System.Drawing.Size(1060, 76)
$logBox.BackColor = [System.Drawing.Color]::White
$form.Controls.Add($logBox)

$threadsView.Add_ItemChecked({
  Update-SelectionLabel
})

$refreshButton.Add_Click({
  try {
    Refresh-State
  } catch {
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, '刷新失败', 'OK', 'Error') | Out-Null
    Append-Log "刷新失败: $($_.Exception.Message)"
  }
})

$selectCandidatesButton.Add_Click({
  Set-ThreadChecks { param($item) $item.SubItems[4].Text -ne '正常' }
})

$selectAllButton.Add_Click({
  Set-ThreadChecks { param($item) $true }
})

$clearSelectionButton.Add_Click({
  Set-ThreadChecks { param($item) $false }
})

$syncSelectedButton.Add_Click({
  try {
    $ids = Get-CheckedThreadIds
    if ($ids.Count -le 0) {
      [System.Windows.Forms.MessageBox]::Show('请先在会话列表里勾选要迁移的记录。', '未选择会话', 'OK', 'Warning') | Out-Null
      return
    }
    if (-not $script:LatestState) {
      Refresh-State
    }
    $message = "请先完全关闭 Cursor/Codex，再继续同步。`r`n`r`n将同步选中的 $($ids.Count) 条会话到当前 provider/model。`r`nprovider: $($script:LatestState.current_provider)`r`nmodel: $($script:LatestState.current_model)`r`n`r`n会先备份数据库；如果勾选了 JSONL 修复，也会备份并修正会话文件头部。"
    if (-not (Confirm-Action -Message $message -Title '确认同步选中会话')) {
      Append-Log '用户取消了同步选中会话。'
      return
    }
    Invoke-Sync -ThreadIds $ids -AllCandidates $false
    [System.Windows.Forms.MessageBox]::Show('选中会话同步完成。建议重启 Cursor。', '同步完成', 'OK', 'Information') | Out-Null
  } catch {
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, '同步失败', 'OK', 'Error') | Out-Null
    Append-Log "同步失败: $($_.Exception.Message)"
  }
})

$syncAllButton.Add_Click({
  try {
    if (-not $script:LatestState) {
      Refresh-State
    }
    $message = "请先完全关闭 Cursor/Codex，再继续同步。`r`n`r`n将同步全部需处理会话到当前 provider/model。`r`nprovider: $($script:LatestState.current_provider)`r`nmodel: $($script:LatestState.current_model)`r`n`r`n会先备份数据库；默认也会修复 JSONL 头部，避免 Cursor 重建后再次消失。"
    if (-not (Confirm-Action -Message $message -Title '确认同步全部需处理会话')) {
      Append-Log '用户取消了同步全部候选。'
      return
    }
    Invoke-Sync -ThreadIds @() -AllCandidates $true
    [System.Windows.Forms.MessageBox]::Show('全部需处理会话同步完成。建议重启 Cursor。', '同步完成', 'OK', 'Information') | Out-Null
  } catch {
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, '同步失败', 'OK', 'Error') | Out-Null
    Append-Log "同步失败: $($_.Exception.Message)"
  }
})

$deleteSelectedButton.Add_Click({
  try {
    $ids = Get-CheckedThreadIds
    if ($ids.Count -le 0) {
      [System.Windows.Forms.MessageBox]::Show('请先勾选要删除的对话记录。', '未选择会话', 'OK', 'Warning') | Out-Null
      return
    }
    $message = "危险操作：将删除选中的 $($ids.Count) 条会话记录。`r`n`r`n实际行为：`r`n1. 先备份 state_5.sqlite`r`n2. 从 SQLite threads 表删除选中 ID`r`n3. 从 session_index.jsonl 移除索引`r`n4. 将 JSONL 文件移动到 history_sync_deleted，不直接粉碎`r`n`r`n请先关闭 Cursor/Codex。"
    if (-not (Confirm-Action -Message $message -Title '确认删除选中会话' -Icon ([System.Windows.Forms.MessageBoxIcon]::Warning))) {
      Append-Log '用户取消了删除。'
      return
    }

    $args = @('--json', 'delete')
    foreach ($id in $ids) {
      $args += @('--thread-id', $id)
    }
    $result = Invoke-Backend $args
    Append-Log "删除完成。SQLite 删除 $($result.deleted_db_rows) 条，移动 JSONL $($result.moved_jsonl_files) 个，移除索引 $($result.removed_index_rows) 条。"
    Append-Log "数据库备份: $($result.backup_path)"
    Append-Log "删除目录: $($result.deleted_dir)"
    Refresh-State
    [System.Windows.Forms.MessageBox]::Show('删除完成。JSONL 已移动到删除目录，可手工找回。', '删除完成', 'OK', 'Information') | Out-Null
  } catch {
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, '删除失败', 'OK', 'Error') | Out-Null
    Append-Log "删除失败: $($_.Exception.Message)"
  }
})

$backupButton.Add_Click({
  try {
    $result = Invoke-Backend @('--json', 'backup')
    Append-Log "手动备份完成: $($result.backup_path)"
    Refresh-State
  } catch {
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, '备份失败', 'OK', 'Error') | Out-Null
    Append-Log "备份失败: $($_.Exception.Message)"
  }
})

$openBackupsButton.Add_Click({
  try {
    if (-not $script:LatestState) {
      Refresh-State
    }
    $folder = $script:LatestState.backup_dir
    if (-not (Test-Path -LiteralPath $folder)) {
      New-Item -ItemType Directory -Force -Path $folder | Out-Null
    }
    Start-Process explorer.exe $folder
    Append-Log "已打开备份目录: $folder"
  } catch {
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, '打开目录失败', 'OK', 'Error') | Out-Null
    Append-Log "打开备份目录失败: $($_.Exception.Message)"
  }
})

$openDeletedButton.Add_Click({
  try {
    if (-not $script:LatestState) {
      Refresh-State
    }
    $folder = $script:LatestState.deleted_dir
    if (-not (Test-Path -LiteralPath $folder)) {
      New-Item -ItemType Directory -Force -Path $folder | Out-Null
    }
    Start-Process explorer.exe $folder
    Append-Log "已打开删除目录: $folder"
  } catch {
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, '打开目录失败', 'OK', 'Error') | Out-Null
    Append-Log "打开删除目录失败: $($_.Exception.Message)"
  }
})

$restoreButton.Add_Click({
  try {
    if ($backupList.SelectedItem -eq $null) {
      [System.Windows.Forms.MessageBox]::Show('先在备份列表里选一个备份。', '未选择备份', 'OK', 'Warning') | Out-Null
      return
    }
    $selectedLabel = [string]$backupList.SelectedItem
    $backupPath = $script:BackupMap[$selectedLabel]
    if (-not $backupPath) {
      throw '无法解析选中的备份路径。'
    }

    $message = "请先关闭 Cursor/Codex，再继续恢复。`r`n`r`n将恢复这个备份：`r`n$backupPath`r`n`r`n恢复前会再自动生成一份安全备份。"
    if (-not (Confirm-Action -Message $message -Title '确认恢复')) {
      Append-Log '用户取消了恢复。'
      return
    }

    $result = Invoke-Backend @('--json', 'restore', '--backup', $backupPath)
    Append-Log "恢复完成。来源备份: $($result.restored_from)"
    Append-Log "恢复前安全备份: $($result.safety_backup)"
    Refresh-State
    [System.Windows.Forms.MessageBox]::Show('恢复完成。建议重启 Cursor/Codex。', '恢复完成', 'OK', 'Information') | Out-Null
  } catch {
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, '恢复失败', 'OK', 'Error') | Out-Null
    Append-Log "恢复失败: $($_.Exception.Message)"
  }
})

$restoreLatestButton.Add_Click({
  try {
    if (-not (Confirm-Action -Message '请先关闭 Cursor/Codex，再继续恢复。将会恢复最新备份，并在恢复前再做一次安全备份。' -Title '确认恢复最新备份')) {
      Append-Log '用户取消了恢复最新备份。'
      return
    }

    $result = Invoke-Backend @('--json', 'restore')
    Append-Log "已恢复最新备份: $($result.restored_from)"
    Append-Log "恢复前安全备份: $($result.safety_backup)"
    Refresh-State
    [System.Windows.Forms.MessageBox]::Show('恢复完成。建议重启 Cursor/Codex。', '恢复完成', 'OK', 'Information') | Out-Null
  } catch {
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, '恢复失败', 'OK', 'Error') | Out-Null
    Append-Log "恢复失败: $($_.Exception.Message)"
  }
})

try {
  Refresh-State
} catch {
  Append-Log "初始化状态失败: $($_.Exception.Message)"
  [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, '启动失败', 'OK', 'Error') | Out-Null
}

if ($SmokeTest) {
  Write-Output 'Smoke test OK'
  exit 0
}

[void]$form.ShowDialog()


