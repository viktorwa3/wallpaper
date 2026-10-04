# Joins equal-size frame PNGs into one horizontal sprite sheet at 1x (the engine's `sprite` layer format).
# Usage: powershell -ExecutionPolicy Bypass -File scripts/sprite-sheet.ps1 <out.png> <frame0.png> <frame1.png> ...
param(
    [Parameter(Mandatory)][string]$Out,
    [Parameter(Mandatory, ValueFromRemainingArguments)][string[]]$Files
)
Add-Type -AssemblyName System.Drawing

$frames = $Files | ForEach-Object { [System.Drawing.Image]::FromFile((Resolve-Path $_)) }
$w = $frames[0].Width; $h = $frames[0].Height
$sheet = New-Object System.Drawing.Bitmap -ArgumentList ($w * $frames.Count), $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($sheet)
$g.Clear([System.Drawing.Color]::Transparent)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
for ($i = 0; $i -lt $frames.Count; $i++) { $g.DrawImage($frames[$i], $i * $w, 0, $w, $h) }

$outPath = [IO.Path]::GetFullPath([IO.Path]::Combine((Get-Location).Path, $Out))
$sheet.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$frames | ForEach-Object { $_.Dispose() }
$g.Dispose(); $sheet.Dispose()
Write-Host "$outPath ($($Files.Count) frames of ${w}x${h})"
