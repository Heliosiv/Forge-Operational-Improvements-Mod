param(
  [Parameter(Mandatory = $true)]
  [string]$Version
)

$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Test-Path "module.premium.json") -and -not (Test-Path "module.premium.template.json")) {
  throw "Missing premium manifest. Create module.premium.json or keep module.premium.template.json present."
}

$premiumManifestPath = if (Test-Path "module.premium.json") { "module.premium.json" } else { "module.premium.template.json" }
$manifest = (Get-Content -Raw $premiumManifestPath) | ConvertFrom-Json
$manifest.version = $Version

$distRoot = "dist"
$premiumRoot = Join-Path $distRoot "premium"
$staging = Join-Path $premiumRoot "staging"
$zipPath = Join-Path $premiumRoot "party-operations-premium-v$Version.zip"

if (Test-Path $staging) {
  Remove-Item $staging -Recurse -Force
}

New-Item -ItemType Directory -Path $staging -Force | Out-Null
New-Item -ItemType Directory -Path $premiumRoot -Force | Out-Null

$manifest | ConvertTo-Json -Depth 20 | Set-Content -NoNewline (Join-Path $staging "module.json")

Copy-Item -Path "scripts" -Destination $staging -Recurse -Force
Copy-Item -Path "styles" -Destination $staging -Recurse -Force
Copy-Item -Path "templates" -Destination $staging -Recurse -Force

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $zipPath -Force

$hash = Get-FileHash -Path $zipPath -Algorithm SHA256
$hash | Out-File (Join-Path $premiumRoot "party-operations-premium-v$Version.sha256.txt") -Encoding utf8

Write-Host "Premium package created: $zipPath"
Write-Host "SHA256: $($hash.Hash)"
