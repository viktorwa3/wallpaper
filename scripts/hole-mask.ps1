# Builds a canvas-sized mask for a layer's `mask` option: opaque above row -Above, and below it only where the
# background has one of the "hole" colours inside the boxes x0..x1, y0..y1 (e.g. dark window openings fire bursts from).
# -Above 0 gives a mask of the openings only (for a glow inside the windows).
# -Funnel N: instead of the whole area above -Above, open a soft funnel over each box: as wide as the box at -Above,
# widening by N px per row upwards, edges fading over -Soft px — flames leaving a window get no hard step at its top.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/hole-mask.ps1 <bg.png> <out.png> -Box "36,149,56,169;157,150,167,166" -Above 149 [-Colors 02030d,...]
param(
    [Parameter(Mandatory)][string]$In,
    [Parameter(Mandatory)][string]$Out,
    [Parameter(Mandatory)][string]$Box,
    [Parameter(Mandatory)][int]$Above,
    [string]$Colors = "02030d,03040f,00010a,000005,000001,060712",
    [double]$Funnel = 0,
    [int]$Soft = 4
)
Add-Type -AssemblyName System.Drawing

$bg = [System.Drawing.Bitmap]::FromFile((Resolve-Path $In))
$w = $bg.Width; $h = $bg.Height
$set = New-Object 'System.Collections.Generic.HashSet[string]'
foreach ($c in ($Colors -split ",")) { [void]$set.Add($c.ToLower()) }

$mask = New-Object System.Drawing.Bitmap -ArgumentList $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($mask)
if ($Above -gt 0 -and $Funnel -le 0) { $g.FillRectangle([System.Drawing.Brushes]::White, 0, 0, $w, $Above) }
$g.Dispose()
if ($Above -gt 0 -and $Funnel -gt 0) {
    foreach ($one in ($Box -split ';')) {
        $b = [int[]]($one -split ',')
        $cx = ($b[0] + $b[2]) / 2; $half = ($b[2] - $b[0]) / 2 + 0.5
        for ($y = $Above - 1; $y -ge 0; $y--) {
            $hw = $half + ($Above - $y) * $Funnel
            for ($x = [Math]::Max(0, [int][Math]::Floor($cx - $hw - $Soft)); $x -le [Math]::Min($w - 1, [int][Math]::Ceiling($cx + $hw + $Soft)); $x++) {
                $a = [Math]::Min(1, [Math]::Max(0, ($hw + $Soft - [Math]::Abs($x + 0.5 - ($cx + 0.5))) / $Soft))
                if ($a -le 0) { continue }
                $old = $mask.GetPixel($x, $y).A
                $na = [Math]::Max($old, [int](255 * $a))
                $mask.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($na, 255, 255, 255))
            }
        }
    }
}
$white = [System.Drawing.Color]::White
foreach ($one in ($Box -split ';')) {
    $b = [int[]]($one -split ',')
    for ($y = [Math]::Max($b[1], $Above); $y -le $b[3]; $y++) {
        for ($x = $b[0]; $x -le $b[2]; $x++) {
            $c = $bg.GetPixel($x, $y)
            if ($set.Contains(('{0:x2}{1:x2}{2:x2}' -f $c.R, $c.G, $c.B))) { $mask.SetPixel($x, $y, $white) }
        }
    }
}
$bg.Dispose()
$outPath = [IO.Path]::GetFullPath([IO.Path]::Combine((Get-Location).Path, $Out))
$mask.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png); $mask.Dispose()
Write-Host $outPath
