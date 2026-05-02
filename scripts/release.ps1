param(
  [Parameter(Mandatory = $true)]
  [string]$Version,
  [string]$Message = "Release"
)

$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Test-Path "module.json")) {
  throw "module.json not found. Run this from the module repository."
}

$stableVersionPattern = '^\d+\.\d+\.\d+$'
if ($Version -notmatch $stableVersionPattern) {
  throw "Release versions must use stable semver (x.y.z). Test channel versions are blocked from the release script."
}

function Invoke-GitCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Args
  )
  & git @Args
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Args -join ' ') failed with exit code $LASTEXITCODE"
  }
}

function Invoke-GitPushWithRetry {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Args,
    [int]$Retries = 3
  )
  for ($attempt = 1; $attempt -le $Retries; $attempt++) {
    try {
      Invoke-GitCommand -Args $Args
      return
    } catch {
      if ($attempt -ge $Retries) { throw }
      Start-Sleep -Seconds (2 * $attempt)
    }
  }
}

function Update-ReadmeCurrentBuild {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ReleaseVersion
  )

  $readmePath = "README.md"
  if (-not (Test-Path $readmePath)) {
    throw "README.md not found. Release commits must keep Current Build aligned with module.json."
  }

  $readme = Get-Content -Raw $readmePath
  $pattern = 'The current repository manifest version is `[^`]+`\.'
  $replacement = "The current repository manifest version is ``$ReleaseVersion``."
  $updated = [regex]::Replace($readme, $pattern, $replacement, 1)
  if ($updated -eq $readme) {
    throw "README.md Current Build line was not found."
  }

  Set-Content -NoNewline -Path $readmePath -Value $updated
}

$proxyVars = @("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy")
$proxySnapshot = @{}
foreach ($name in $proxyVars) {
  $proxySnapshot[$name] = [Environment]::GetEnvironmentVariable($name, "Process")
}

try {
  foreach ($name in $proxyVars) {
    [Environment]::SetEnvironmentVariable($name, $null, "Process")
  }

  # Ensure git ignores any inherited proxy for GitHub in this repository.
  & git config --local http.https://github.com.proxy ""
  & git config --local http.https://github.com/.proxy ""

  Invoke-GitCommand -Args @("rev-parse", "--is-inside-work-tree")

  $raw = Get-Content -Raw "module.json"
  $module = $raw | ConvertFrom-Json
  $module.version = $Version
  $module | ConvertTo-Json -Depth 20 | Set-Content -NoNewline "module.json"
  Update-ReadmeCurrentBuild -ReleaseVersion $Version

  & node "scripts/validate-governance.mjs" "--mode" "release" "--expected-tag" "v$Version"
  if ($LASTEXITCODE -ne 0) {
    throw "Governance validation failed for release v$Version"
  }

  Invoke-GitCommand -Args @("add", "module.json", "README.md")
  Invoke-GitCommand -Args @("add", "-u")
  Invoke-GitCommand -Args @("commit", "-m", "$Message v$Version")
  Invoke-GitCommand -Args @("tag", "-a", "v$Version", "-m", "Release v$Version")

  Invoke-GitPushWithRetry -Args @("push", "origin", "main")
  Invoke-GitPushWithRetry -Args @("push", "origin", "v$Version")

  Write-Host "Released v$Version"
} finally {
  foreach ($name in $proxyVars) {
    [Environment]::SetEnvironmentVariable($name, $proxySnapshot[$name], "Process")
  }
}
