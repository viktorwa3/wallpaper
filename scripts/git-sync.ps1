# Commits all changes, rebases on the remote and pushes.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/git-sync.ps1 ["commit message"]
param([string]$Message = "sync $(Get-Date -Format 'yyyy-MM-dd HH:mm')")

$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

function Invoke-Git { & git.exe @args; if ($LASTEXITCODE -ne 0) { throw "git $args failed" } }

Invoke-Git add -A

# Safety net: never push the token.
if (& git.exe diff --cached --name-only | Where-Object { $_ -match '(^|/)\.env$' }) {
    Invoke-Git reset -q -- .env
    throw ".env was staged - check .gitignore. Nothing committed."
}

& git.exe diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
    Invoke-Git commit -m $Message
} else {
    Write-Host "Nothing to commit."
}

$branch = & git.exe rev-parse --abbrev-ref HEAD
Invoke-Git pull --rebase origin $branch
Invoke-Git push origin $branch
Write-Host "Synced $branch."
