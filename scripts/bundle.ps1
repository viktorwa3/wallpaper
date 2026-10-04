# Bundles a wallpaper into a self-contained folder + zip for Lively Wallpaper (it imports one folder / zip, so the
# ../../ references to engine/ and shared/ are flattened). Output: dist/<name>/ and dist/<name>.zip.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/bundle.ps1 <wallpaper-name> [-Title "Ruined City"] [-Desc "..."]
param(
    [Parameter(Mandatory)][string]$Name,
    [string]$Title,
    [string]$Desc = ''
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$src = Join-Path $root "wallpapers\$Name"
if (-not (Test-Path $src)) { throw "No wallpaper '$Name' in wallpapers/" }
$dist = Join-Path $root "dist\$Name"
if (Test-Path $dist) { Remove-Item -Recurse -Force $dist }
New-Item -ItemType Directory -Force $dist | Out-Null

# Engine and shared assets (shared drafts are not shipped).
New-Item -ItemType Directory -Force "$dist\engine", "$dist\shared\assets" | Out-Null
Copy-Item "$root\engine\engine.js", "$root\engine\style.css" "$dist\engine"
Copy-Item "$root\shared\assets\*.png" "$dist\shared\assets"

# The wallpaper's own assets, without raw animation frames (sheets are built from them).
Copy-Item -Recurse "$src\assets" "$dist\assets"
Get-ChildItem -Recurse -Directory "$dist\assets" -Filter frames | Remove-Item -Recurse -Force

# Page + scene with flattened paths. Explicit UTF-8 (no BOM) both ways: PowerShell 5 reads files as ANSI by default,
# which mangled non-ASCII characters in scene.js and the bundled page rendered black.
$utf8 = New-Object System.Text.UTF8Encoding $false
function Copy-Rewritten($from, $to, $pattern, $with) {
    [IO.File]::WriteAllText($to, ([IO.File]::ReadAllText($from, $utf8) -replace $pattern, $with), $utf8)
}
Copy-Rewritten "$src\index.html" "$dist\index.html" '\.\./\.\./engine/' 'engine/'
Copy-Rewritten "$src\scene.js" "$dist\scene.js" '\.\./\.\./shared/' 'shared/'

# Thumbnail: render the bundle itself with headless Edge (also proves the flattened paths work), shrink to 480x270.
if (-not $Title) { $Title = ([IO.File]::ReadAllText("$src\index.html", $utf8) | Select-String '<title>(.*?)</title>').Matches[0].Groups[1].Value }
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") |
    Where-Object { Test-Path $_ } | Select-Object -First 1
$shot = Join-Path $env:TEMP "bundle_$Name.png"
$url = "file:///$($dist.Replace('\', '/'))/index.html"
Start-Process -FilePath $edge -Wait -WindowStyle Hidden -ArgumentList @(
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--virtual-time-budget=3000',
    '--window-size=2560,1440', "--screenshot=`"$shot`"", "`"$url`"")
$full = [System.Drawing.Image]::FromFile($shot)
$thumb = New-Object System.Drawing.Bitmap 480, 270
$g = [System.Drawing.Graphics]::FromImage($thumb)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($full, 0, 0, 480, 270)
$thumb.Save("$dist\thumbnail.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $thumb.Dispose(); $full.Dispose()
Copy-Item $shot "$dist\preview.png"

# Lively metadata (Type 1 = web page).
[ordered]@{
    AppVersion = '1.0.0.0'; Title = $Title; Thumbnail = 'thumbnail.png'; Preview = 'preview.png'; Desc = $Desc
    Author = ''; License = ''; Contact = ''; Type = 1; FileName = 'index.html'; Arguments = $null; IsAbsolutePath = $false
} | ConvertTo-Json | ForEach-Object { [IO.File]::WriteAllText("$dist\LivelyInfo.json", $_, $utf8) }

$zip = "$dist.zip"
if (Test-Path $zip) { Remove-Item -Force $zip }
Compress-Archive -Path "$dist\*" -DestinationPath $zip
$size = [Math]::Round((Get-Item $zip).Length / 1KB)

# Preview page: every bundle in dist/ running live side by side, with a full-screen link each. Open dist/preview.html.
$cards = Get-ChildItem -Directory (Join-Path $root 'dist') | Where-Object { Test-Path "$($_.FullName)\LivelyInfo.json" } | ForEach-Object {
    $info = [IO.File]::ReadAllText("$($_.FullName)\LivelyInfo.json", $utf8) | ConvertFrom-Json
    $n = $_.Name
    @"
  <section>
    <h2>$($info.Title) <a href="$n/index.html">full screen</a> <a href="$n.zip">zip</a></h2>
    <p>$($info.Desc)</p>
    <iframe src="$n/index.html" title="$($info.Title)"></iframe>
  </section>
"@
}
$page = @"
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Wallpaper Preview</title>
<style>
  body { margin: 0; padding: 24px; background: #0b0d12; color: #d8dce6; font: 14px/1.4 system-ui, sans-serif; }
  section { max-width: 1280px; margin: 0 auto 32px; }
  h2 { font-size: 18px; margin: 0 0 4px; }
  h2 a { font-size: 13px; font-weight: normal; color: #8fb4ff; margin-left: 12px; }
  p { margin: 0 0 10px; color: #8a90a0; }
  iframe { width: 100%; aspect-ratio: 16 / 9; border: 1px solid #222838; background: #000; display: block; }
</style>
</head>
<body>
$($cards -join "`n")
</body>
</html>
"@
[IO.File]::WriteAllText((Join-Path $root 'dist\preview.html'), $page, $utf8)

Write-Host "$dist`n$zip (${size} KB)`nscreenshot: $shot`npreview: $(Join-Path $root 'dist\preview.html')"
