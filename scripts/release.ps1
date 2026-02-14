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

git rev-parse --is-inside-work-tree | Out-Null

$raw = Get-Content -Raw "module.json"
$module = $raw | ConvertFrom-Json
$module.version = $Version
$module | ConvertTo-Json -Depth 20 | Set-Content -NoNewline "module.json"

git add module.json
git add -u

git commit -m "$Message v$Version"
git tag -a "v$Version" -m "Release v$Version"
git push origin main
git push origin "v$Version"

Write-Host "Released v$Version"