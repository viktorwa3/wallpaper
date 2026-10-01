# Copies PIXELLAB_API_KEY from .env into the Windows user environment,
# where .mcp.json picks it up via ${PIXELLAB_API_KEY}. Re-run after changing the token,
# then fully restart VS Code.
$envFile = Join-Path $PSScriptRoot '..\.env'
$line = Get-Content $envFile | Where-Object { $_ -match '^\s*PIXELLAB_API_KEY\s*=' } | Select-Object -First 1
$token = ($line -split '=', 2)[1].Trim().Trim('"', "'")
[Environment]::SetEnvironmentVariable('PIXELLAB_API_KEY', $token, 'User')
Write-Host "PIXELLAB_API_KEY set for user (length $($token.Length)). Restart VS Code."
