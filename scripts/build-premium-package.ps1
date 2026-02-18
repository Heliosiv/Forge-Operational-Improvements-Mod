param(
  [Parameter(Mandatory = $true)]
  [string]$Version
)

$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Test-Path "module.premium.json") -and -not (Test-Path "module.premium.template.json")) {
  throw "Missing premium manifest. Create module.premium.json or keep module.premium.template.json present."
}
if (-not (Test-Path "module.json")) {
  throw "module.json not found. Keep a base manifest to inherit pack metadata."
}

$premiumManifestPath = if (Test-Path "module.premium.json") { "module.premium.json" } else { "module.premium.template.json" }
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

$manifest | ConvertTo-Json -Depth 20 | Set-Content -NoNewline (Join-Path $staging "module.json")

Copy-Item -Path "scripts" -Destination $staging -Recurse -Force
Copy-Item -Path "styles" -Destination $staging -Recurse -Force
Copy-Item -Path "templates" -Destination $staging -Recurse -Force
if (Test-Path "packs") {
  Copy-Item -Path "packs" -Destination $staging -Recurse -Force
}

foreach ($pack in @($manifest.packs)) {
  $packPath = String($pack.path)
  if (-not $packPath) { continue }
  $resolved = Join-Path $staging $packPath
  if (-not (Test-Path $resolved)) {
    throw "Manifest pack path missing from premium package staging: $packPath"
  }
}

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$stagingRoot = (Resolve-Path $staging).Path
$files = Get-ChildItem -Path $staging -Recurse -File
$stream = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::CreateNew)
try {
  $archive = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Create, $false)
  foreach ($file in $files) {
    $relative = $file.FullName.Substring($stagingRoot.Length).TrimStart('\\', '/')
    $entryName = $relative.Replace('\\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, $entryName, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
  $archive.Dispose()
} finally {
  $stream.Dispose()
}

$hash = Get-FileHash -Path $zipPath -Algorithm SHA256
$hash | Out-File (Join-Path $premiumRoot "party-operations-premium-v$Version.sha256.txt") -Encoding utf8

Write-Host "Premium package created: $zipPath"
Write-Host "SHA256: $($hash.Hash)"
