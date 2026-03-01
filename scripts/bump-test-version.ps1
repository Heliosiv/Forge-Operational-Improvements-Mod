param(
  [string]$ManifestPath = "module.json",
  [string]$SecondaryManifestPath = "module.copy.test.json",
  [switch]$ApplySecondary
)

$ErrorActionPreference = "Stop"

function Get-NextTestVersion {
  param([string]$CurrentVersion)

  $value = [string]$CurrentVersion
  if ($null -eq $value) { $value = "" }
  $value = $value.Trim()
  if ($value -match '^(?<base>.+-test\.)(?<num>\d+)$') {
    $base = $Matches["base"]
    $num = [int]$Matches["num"] + 1
    return "$base$num"
  }

  if ($value -match '^(?<base>.+)$') {
    return "$($Matches["base"])-test.1"
  }

  throw "Unable to parse current version."
}

function Update-ManifestVersion {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$NextVersion
  )

  if (-not (Test-Path $Path)) {
    throw "Manifest not found: $Path"
  }

  $raw = Get-Content -Raw $Path
  $manifest = $raw | ConvertFrom-Json
  $manifest.version = $NextVersion
  $manifest | ConvertTo-Json -Depth 20 | Set-Content -NoNewline $Path
}

if (-not (Test-Path $ManifestPath)) {
  throw "Manifest not found: $ManifestPath"
}

$currentRaw = Get-Content -Raw $ManifestPath
$currentManifest = $currentRaw | ConvertFrom-Json
$currentVersion = [string]$currentManifest.version
if ($null -eq $currentVersion) { $currentVersion = "" }
$currentVersion = $currentVersion.Trim()
$nextVersion = Get-NextTestVersion -CurrentVersion $currentVersion

Update-ManifestVersion -Path $ManifestPath -NextVersion $nextVersion

if ($ApplySecondary -and (Test-Path $SecondaryManifestPath)) {
  Update-ManifestVersion -Path $SecondaryManifestPath -NextVersion $nextVersion
}

Write-Output $nextVersion
