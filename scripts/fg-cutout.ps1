# Cuts the sky out of a background: flood-fills from the top edge through the given sky colours and makes
# those pixels transparent. The result is drawn above "far" layers (distant smoke) so they pass behind the ruins.
# The lavender distant city (4a7099) is not in the sky list, so far smoke also rises from behind it.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/fg-cutout.ps1 <bg.png> <out.png> [-Sky 060812,060712,...]
param(
    [Parameter(Mandatory)][string]$In,
    [Parameter(Mandatory)][string]$Out,
    [string[]]$Sky = @('060812', '060712', '070c1b', '0b1123', '0e1627', '142a36', '1e434f', '1a3541', '304556', '79c0dd')
)
Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile((Resolve-Path $In))
$w = $src.Width; $h = $src.Height
$bmp = New-Object System.Drawing.Bitmap -ArgumentList $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp); $g.DrawImage($src, 0, 0, $w, $h); $g.Dispose(); $src.Dispose()

$rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
$data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, $bmp.PixelFormat)
$px = New-Object int[] ($w * $h)
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $px, 0, $px.Length)

$skySet = New-Object 'System.Collections.Generic.HashSet[int]'
foreach ($c in $Sky) { [void]$skySet.Add([int]('0x' + $c) -bor 0xFF000000) }

$seen = New-Object bool[] ($w * $h)
$queue = New-Object 'System.Collections.Generic.Queue[int]'
for ($x = 0; $x -lt $w; $x++) { if ($skySet.Contains($px[$x])) { $seen[$x] = $true; $queue.Enqueue($x) } }
while ($queue.Count) {
    $i = $queue.Dequeue(); $x = $i % $w; $y = [Math]::Floor($i / $w)
    $px[$i] = 0
    foreach ($n in @($(if ($x -gt 0) { $i - 1 }), $(if ($x -lt $w - 1) { $i + 1 }), $(if ($y -gt 0) { $i - $w }), $(if ($y -lt $h - 1) { $i + $w }))) {
        if ($null -ne $n -and -not $seen[$n] -and $skySet.Contains($px[$n])) { $seen[$n] = $true; $queue.Enqueue($n) }
    }
}

# Drop leftover specks (distant-city dither between the ruins): opaque islands smaller than MinIsland pixels.
$MinIsland = 60
$label = New-Object bool[] ($w * $h)
for ($s = 0; $s -lt $px.Length; $s++) {
    if ($px[$s] -eq 0 -or $label[$s]) { continue }
    $island = New-Object 'System.Collections.Generic.List[int]'
    $queue.Enqueue($s); $label[$s] = $true
    while ($queue.Count) {
        $i = $queue.Dequeue(); $island.Add($i); $x = $i % $w; $y = [Math]::Floor($i / $w)
        foreach ($n in @($(if ($x -gt 0) { $i - 1 }), $(if ($x -lt $w - 1) { $i + 1 }), $(if ($y -gt 0) { $i - $w }), $(if ($y -lt $h - 1) { $i + $w }))) {
            if ($null -ne $n -and -not $label[$n] -and $px[$n] -ne 0) { $label[$n] = $true; $queue.Enqueue($n) }
        }
    }
    if ($island.Count -lt $MinIsland) { foreach ($i in $island) { $px[$i] = 0 } }
}

[System.Runtime.InteropServices.Marshal]::Copy($px, 0, $data.Scan0, $px.Length)
$bmp.UnlockBits($data)
$outPath = [IO.Path]::GetFullPath([IO.Path]::Combine((Get-Location).Path, $Out))
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
Write-Host $outPath
