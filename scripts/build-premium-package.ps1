param(
  [Parameter(Mandatory = $true)]
  [string]$Version
)

$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Test-Path "module.premium.json")) {
  throw "Missing premium manifest. Create a local module.premium.json before building a premium package."
}
if (-not (Test-Path "module.json")) {
  throw "module.json not found. Keep a base manifest to inherit pack metadata."
}

$premiumManifestPath = "module.premium.json"
$manifest = (Get-Content -Raw $premiumManifestPath) | ConvertFrom-Json
$baseManifest = (Get-Content -Raw "module.json") | ConvertFrom-Json
$manifest.version = $Version

$basePacks = @($baseManifest.packs)
if ($basePacks.Count -gt 0 -and @($manifest.packs).Count -eq 0) {
  # Keep premium builds aligned with public pack declarations unless explicitly overridden.
  $manifest | Add-Member -MemberType NoteProperty -Name packs -Value $basePacks -Force
}

$distRoot = "dist"
$premiumRoot = Join-Path $distRoot "premium"
$staging = Join-Path $premiumRoot "staging"
$zipPath = Join-Path $premiumRoot "party-operations-premium-v$Version.zip"

if (Test-Path $staging) {
  Remove-Item $staging -Recurse -Force
}

New-Item -ItemType Directory -Path $staging -Force | Out-Null
New-Item -ItemType Directory -Path $premiumRoot -Force | Out-Null

$manifestPath = Join-Path $premiumRoot "module.json"
$manifest | ConvertTo-Json -Depth 20 | Set-Content -NoNewline $manifestPath

& node "scripts/prepare-package.mjs" --manifest $manifestPath --output $premiumRoot
if ($LASTEXITCODE -ne 0) {
  throw "prepare-package.mjs failed with exit code $LASTEXITCODE"
}

foreach ($pack in @($manifest.packs)) {
  $packPath = [string]$pack.path
  if (-not $packPath) { continue }
  $resolved = Join-Path $staging $packPath
  if (-not (Test-Path $resolved)) {
    throw "Manifest pack path missing from premium package staging: $packPath"
  }
}

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $zipPath -CompressionLevel Optimal

$hash = Get-FileHash -Path $zipPath -Algorithm SHA256
$hash | Out-File (Join-Path $premiumRoot "party-operations-premium-v$Version.sha256.txt") -Encoding utf8

Write-Host "Premium package created: $zipPath"
Write-Host "SHA256: $($hash.Hash)"
