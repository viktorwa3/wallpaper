# Tiles PNGs into one labelled sheet with integer nearest-neighbour scaling, for comparing candidates.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/contact-sheet.ps1 [-Scale 3] [-Columns 4] <out.png> <file1.png> <file2.png> ...
param(
    [Parameter(Mandatory)][string]$Out,
    [Parameter(Mandatory, ValueFromRemainingArguments)][string[]]$Files,
    [int]$Scale = 3,
    [int]$Columns = 4
)
Add-Type -AssemblyName System.Drawing

$images = $Files | ForEach-Object { [System.Drawing.Image]::FromFile((Resolve-Path $_)) }
[int]$cellW = ($images | ForEach-Object { $_.Width } | Measure-Object -Maximum).Maximum * $Scale
[int]$cellH = ($images | ForEach-Object { $_.Height } | Measure-Object -Maximum).Maximum * $Scale + 16
[int]$rows = [Math]::Ceiling($images.Count / $Columns)

$sheet = New-Object System.Drawing.Bitmap -ArgumentList ([int]($cellW * [Math]::Min($Columns, $images.Count))), ([int]($cellH * $rows))
$g = [System.Drawing.Graphics]::FromImage($sheet)
$g.Clear([System.Drawing.Color]::FromArgb(24, 26, 32))
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$font = New-Object System.Drawing.Font 'Consolas', 9

for ($i = 0; $i -lt $images.Count; $i++) {
    $x = ($i % $Columns) * $cellW
    $y = [int][Math]::Floor($i / $Columns) * $cellH
    $img = $images[$i]
    $g.DrawImage($img, $x, $y + 16, $img.Width * $Scale, $img.Height * $Scale)
    $g.DrawString([IO.Path]::GetFileNameWithoutExtension($Files[$i]), $font, [System.Drawing.Brushes]::White, $x + 2, $y + 1)
}

$sheet.Save((Join-Path (Get-Location) $Out), [System.Drawing.Imaging.ImageFormat]::Png)
$images | ForEach-Object { $_.Dispose() }
$g.Dispose(); $sheet.Dispose()
Write-Host $Out
