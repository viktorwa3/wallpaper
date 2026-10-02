# Removes isolated single pixels (e.g. stars the model added to the sky) above a given row.
# A pixel is isolated when it differs from all 4 neighbours while those neighbours agree
# with each other closely enough to count as one flat area; it is replaced by its left neighbour.
# -FlatAboveY N: additionally fill rows 0..N-1 with each row's most common colour (wipes 2px blobs in a flat sky).
# Usage: powershell -ExecutionPolicy Bypass -File scripts/despeckle.ps1 <in.png> <out.png> [-MaxY 120] [-FlatAboveY 0]
param(
    [Parameter(Mandatory)][string]$In,
    [Parameter(Mandatory)][string]$Out,
    [int]$MaxY = 120,
    [int]$FlatAboveY = 0
)
Add-Type -AssemblyName System.Drawing

function Dist($a, $b) { [Math]::Abs($a.R - $b.R) + [Math]::Abs($a.G - $b.G) + [Math]::Abs($a.B - $b.B) }

$src = [System.Drawing.Bitmap]::FromFile((Resolve-Path $In))
$bmp = New-Object System.Drawing.Bitmap $src
$src.Dispose()

$fixed = 0
for ($y = 0; $y -lt $FlatAboveY; $y++) {
    $count = @{}
    for ($x = 0; $x -lt $bmp.Width; $x++) { $count[$bmp.GetPixel($x, $y).ToArgb()]++ }
    $mode = [System.Drawing.Color]::FromArgb(($count.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 1).Key)
    for ($x = 0; $x -lt $bmp.Width; $x++) { if ($bmp.GetPixel($x, $y).ToArgb() -ne $mode.ToArgb()) { $bmp.SetPixel($x, $y, $mode); $fixed++ } }
}
$colors = @{}
for ($y = 1; $y -lt [Math]::Min($MaxY, $bmp.Height - 1); $y++) {
    for ($x = 1; $x -lt $bmp.Width - 1; $x++) {
        $c = $bmp.GetPixel($x, $y)
        $l = $bmp.GetPixel($x - 1, $y); $r = $bmp.GetPixel($x + 1, $y)
        $u = $bmp.GetPixel($x, $y - 1); $d = $bmp.GetPixel($x, $y + 1)
        $flat = (Dist $l $r) -le 24 -and (Dist $u $d) -le 48 -and (Dist $l $u) -le 48
        $odd = (Dist $c $l) -gt 24 -and (Dist $c $r) -gt 24 -and (Dist $c $u) -gt 24 -and (Dist $c $d) -gt 24
        if ($flat -and $odd) { $bmp.SetPixel($x, $y, $l); $fixed++ }
    }
}
for ($y = 0; $y -lt $bmp.Height; $y++) { for ($x = 0; $x -lt $bmp.Width; $x++) { $colors[$bmp.GetPixel($x, $y).ToArgb()] = 1 } }

$bmp.Save((Join-Path (Get-Location) $Out), [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "fixed $fixed pixels, $($colors.Count) colors in result"
