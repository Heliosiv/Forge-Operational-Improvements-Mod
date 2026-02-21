param(
  [Parameter(Mandatory = $true)]
  [string]$Version,
  [Parameter(Mandatory = $true)]
  [string]$PrivateRepo,
  [string]$ManifestSource = "module.json",
  [string]$ChannelId,
  [string]$ChannelTitle,
  [string]$ChannelDescription
)

$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Test-Path $ManifestSource)) {
  throw "Manifest source not found: $ManifestSource"
}

$manifest = (Get-Content -Raw $ManifestSource) | ConvertFrom-Json
$manifest.version = $Version

if ($ChannelId) {
  $manifest.id = $ChannelId
}
if ($ChannelTitle) {
  $manifest.title = $ChannelTitle
}
if ($ChannelDescription) {
  $manifest.description = $ChannelDescription
}

$repoBase = "https://github.com/$PrivateRepo"
$manifest.url = $repoBase
$manifest.manifest = "$repoBase/releases/latest/download/module.json"
$manifest.download = "$repoBase/releases/latest/download/module.zip"

$distRoot = "dist"
$foundersRoot = Join-Path $distRoot "founders"
$staging = Join-Path $foundersRoot "staging"
$zipPath = Join-Path $foundersRoot "module.zip"
$manifestPath = Join-Path $foundersRoot "module.json"

if (Test-Path $staging) {
  Remove-Item $staging -Recurse -Force
}

New-Item -ItemType Directory -Path $staging -Force | Out-Null
New-Item -ItemType Directory -Path $foundersRoot -Force | Out-Null

$manifest | ConvertTo-Json -Depth 20 | Set-Content -NoNewline (Join-Path $staging "module.json")
$manifest | ConvertTo-Json -Depth 20 | Set-Content -NoNewline $manifestPath

Copy-Item -Path "scripts" -Destination $staging -Recurse -Force
Copy-Item -Path "styles" -Destination $staging -Recurse -Force
Copy-Item -Path "templates" -Destination $staging -Recurse -Force
if (Test-Path "packs") {
  Copy-Item -Path "packs" -Destination $staging -Recurse -Force
}

foreach ($pack in @($manifest.packs)) {
  $packPath = [string]$pack.path
  if (-not $packPath) { continue }
  $resolved = Join-Path $staging $packPath
  if (-not (Test-Path $resolved)) {
    throw "Manifest pack path missing from founders package staging: $packPath"
  }
}

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $zipPath -CompressionLevel Optimal

$hash = Get-FileHash -Path $zipPath -Algorithm SHA256
$hash | Out-File (Join-Path $foundersRoot "module.zip.sha256.txt") -Encoding utf8

Write-Host "Founders release package created: $zipPath"
Write-Host "Founders manifest created: $manifestPath"
Write-Host "SHA256: $($hash.Hash)"
