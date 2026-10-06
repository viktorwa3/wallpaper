# Renders a wallpaper with headless Edge at 2560x1440 and saves a PNG.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/screenshot.ps1 <wallpaper-name> [out.png] [-Grid] [-Query "head=264&lift=40"] [-Dist]
# -Ms N = how many ms of (virtual) time pass before the shot, to catch a moment of an animation (default 3000).
# -Dist renders the Lively bundle dist/<name>/ (scripts/bundle.ps1) instead of wallpapers/<name>/.
param([Parameter(Mandatory)][string]$Name, [string]$Out, [switch]$Grid, [string]$Query, [switch]$Dist, [int]$Ms = 3000)

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
if (-not $Out) { $Out = Join-Path $env:TEMP "$Name.png" }
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") |
    Where-Object { Test-Path $_ } | Select-Object -First 1
$parts = @($Query, $(if ($Grid) { 'grid' })) | Where-Object { $_ }
$dir = if ($Dist) { "dist/$Name" } else { "wallpapers/$Name" }
$url = "file:///$($root.Path.Replace('\', '/'))/$dir/index.html" + $(if ($parts) { '?' + ($parts -join '&') } else { '' })

# Start-Process -Wait: calling msedge directly returns before the PNG is written.
Start-Process -FilePath $edge -Wait -WindowStyle Hidden -ArgumentList @(
    '--headless=new', '--disable-gpu', '--hide-scrollbars', "--virtual-time-budget=$Ms",
    '--window-size=2560,1440', "--screenshot=`"$Out`"", "`"$url`"")
Write-Host $Out
